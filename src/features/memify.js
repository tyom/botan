require('dotenv').config();
const axios = require('axios');
const qs = require('querystring');
const btoa = require('btoa');
const {
  block,
  element,
  object,
  TEXT_FORMAT_MRKDWN,
} = require('slack-block-kit');
const { text } = object;
const { button } = element;
const { section, context, actions, divider, image } = block;

const MEMIFY_PRESET_URL = 'https://api.npoint.io/2f966781e0441822585d';
const MEMIFY_ENDPOINT = 'https://memify.tyom.dev/r/';
const ACTION_BLOCK_ID = 'memify-actions';

function buildBlockFromPresetItem(command, overlayText) {
  const processedText = overlayText
    ? encodeURIComponent(overlayText)
    : '[text]';
  return function([presetKey, content]) {
    const preset = command.slice(1) !== presetKey ? ` :${presetKey}` : '';
    return [
      divider(),
      section(
        text(
          `*${content.name}*\n\n\`${command}${preset} ${processedText}\``,
          TEXT_FORMAT_MRKDWN,
        ),
        {
          accessory: image(content.bgr.url, content.name),
        },
      ),
    ];
  };
}

function buildMemeSelection({
  command,
  preset = {},
  overlayText = '',
  presetKey,
}) {
  // Remove other themes from the preset if presetKey is given
  // (commands with presetUrl/preset in query params)
  const sections = Object.entries(preset).filter(
    ([p]) => !presetKey || p === presetKey,
  );
  const images = [].concat(
    ...sections.map(buildBlockFromPresetItem(command, overlayText)),
  );
  const actionButtons = sections.map(([presetKey, content]) =>
    button(presetKey, content.name),
  );

  return {
    blocks: [
      section(text('This preset contains the following themes:')),
      overlayText &&
        context([text(`Using the text: *${overlayText}*`, TEXT_FORMAT_MRKDWN)]),
      ...images,
    ]
      .concat(
        overlayText
          ? [
              section(text('Select the image to render:')),
              actions(actionButtons, {
                blockId: ACTION_BLOCK_ID,
              }),
            ]
          : [],
      )
      .filter(Boolean),
  };
}

function getPresetData(url) {
  if (!url) {
    console.log('MEMIFY_PRESET_URL env variable is not set.');
    return {};
  }
  return axios(url).then(res => res.data);
}

function getMemifyUrl(presetKey, presetUrl, text) {
  const path = `${presetKey}?presetUrl=${encodeURIComponent(
    presetUrl,
  )}&text=${encodeURIComponent(text)}`;
  const processedPath = process.env.ENCODE_URL ? btoa(path) : path;
  return MEMIFY_ENDPOINT + processedPath;
}

function createImageResponse(url, altText, titleText = '') {
  return {
    blocks: [
      image(url, altText, {
        titleText,
      }),
    ],
  };
}

module.exports = async controller => {
  const overlayTextCache = {};
  let requestQuery = {};

  controller.http.on('request', req => {
    requestQuery = req.query;
  });

  controller.on('slash_command', async (bot, message) => {
    let memifyPreset;
    const [, preset = '', overlayText = ''] =
      message.text.match(/^\s*(:[\w-]+)?\s*(.*)/) || [];
    const options = {
      presetUrl: MEMIFY_PRESET_URL,
      preset: preset.replace(/^:/, ''),
      overlayText: overlayText || overlayTextCache[message.user],
      ...requestQuery,
    };

    if (!options.presetUrl) {
      return;
    }
    try {
      memifyPreset = await getPresetData(options.presetUrl);
    } catch (error) {
      throw new Error(`Failed to get preset data: ${error.message}`);
    }

    overlayTextCache[message.user] = options.overlayText;

    // All set, get the image
    if (options.preset && options.overlayText) {
      await bot.say(
        createImageResponse(
          getMemifyUrl(options.preset, options.presetUrl, options.overlayText),
          options.overlayText,
          options.overlayText,
        ),
      );
      // Clear cache
      overlayTextCache[message.user] = '';
      return;
    }

    // Bits missing, show preset details
    await bot.replyEphemeral(
      message,
      buildMemeSelection({
        command: message.command,
        preset: memifyPreset,
        presetKey: requestQuery.preset,
        overlayText: options.overlayText,
      }),
    );
  });

  controller.on('block_actions', async (bot, message) => {
    const action = message.actions[0];

    if (action.block_id !== ACTION_BLOCK_ID) {
      return;
    }

    const textOverlay = overlayTextCache[message.user];

    if (!textOverlay) {
      console.warn('> No `overlayText`');
      return;
    }

    const user = message.incoming_message.channelData.user;
    await bot.replyInteractive(
      message,
      `Hey ${user.name}, your meme '${
        action.text.text
      }' with text \`${textOverlay}\`:`,
    );
    await bot.say(
      createImageResponse(
        getMemifyUrl(action.action_id, MEMIFY_PRESET_URL, textOverlay),
        textOverlay,
        textOverlay,
      ),
    );
    // Clear cache
    overlayTextCache[message.user] = '';
  });

  controller.on('message_action', async (bot, action) => {
    const { presetUrl, preset } = qs.parse(action.callback_id);
    const textOverlay = action.message.text;

    await bot.say(
      createImageResponse(
        getMemifyUrl(preset, presetUrl, textOverlay),
        textOverlay,
        textOverlay,
      ),
    );
  });
};
