require('dotenv').config();
const axios = require('axios');
const qs = require('querystring');
const btoa = require('btoa');
const {
  divider,
  buildActionButtons,
  buildMarkdownSection,
  buildMarkdownImageSection,
} = require('../slack/block-builder');

function buildBlockFromPresetItem(command, overlayText) {
  const text = overlayText ? encodeURIComponent(overlayText) : '[text]';
  return function([alias, content]) {
    const preset = command.slice(1) !== alias ? ` :${alias}` : '';
    return [
      divider,
      buildMarkdownImageSection(
        `*${content.name}*\n\n\`${command}${preset} ${text}\``,
        {
          url: content.bgr.url,
          altText: content.name,
        }
      ),
    ];
  };
}

function buildButtonFromPresetItem([alias, content]) {
  return { text: content.name, value: alias };
}

function buildMemeSelection({ command, preset = {}, text, presetKey }) {
  // Remove other themes from the preset if presetKey is given
  // (commands with presetUrl/preset in query params)
  const sections = Object.entries(preset).filter(([p]) => !presetKey || p === presetKey);
  const images = [].concat(
    ...sections.map(buildBlockFromPresetItem(command, text))
  );
  const actionButtons = sections.map(buildButtonFromPresetItem);

  return {
    blocks: [
      buildMarkdownSection('This preset contains the following themes:'),
      text && buildMarkdownSection(`Using the text: _${text}_`),
      ...images,
    ]
      .concat(
        text
          ? [
              buildMarkdownSection('Select the image to render:'),
              buildActionButtons(actionButtons),
            ]
          : []
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

function getMemifyUrl(alias, presetUrl, text) {
  const path = `${alias}?presetUrl=${presetUrl}&text=${text}`;
  const processedPath = process.env.ENCODE_URL ? btoa(path) : path;
  return process.env.MEMIFY_ENDPOINT + processedPath;
}

function createMessageWithImage(text, imageUrl) {
  return {
    attachments: [{ text, image_url: imageUrl }],
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
    const [, preset = '', text = ''] =
      message.text.match(/^\s*(:[\w-]+)?\s*(.*)/) || [];
    const options = {
      presetUrl: process.env.MEMIFY_PRESET_URL,
      preset: preset.replace(/^:/, ''),
      text: text || overlayTextCache[message.user],
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

    overlayTextCache[message.user] = options.text;

    // All set, get the image
    if (options.preset && options.text) {
      await bot.reply(
        message,
        createMessageWithImage(
          options.text,
          getMemifyUrl(options.preset, options.presetUrl, options.text)
        )
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
        text: options.text,
      })
    );
  });

  controller.on('block_actions', async (bot, message) => {
    const { value, text } = message.actions[0];
    const textOverlay = overlayTextCache[message.user];

    if (!textOverlay) {
      console.warn('> No `overlayText`');
      return;
    }

    const user = message.incoming_message.channelData.user;
    await bot.replyInteractive(
      message,
      `Hey ${user.name}, your meme '${text.text}' with text \`${textOverlay}\`:`
    );
    await bot.reply(
      message,
      createMessageWithImage(
        textOverlay,
        getMemifyUrl(value, process.env.MEMIFY_PRESET_URL, textOverlay)
      )
    );
    // Clear cache
    overlayTextCache[message.user] = '';
  });

  controller.on('message_action', async (bot, action) => {
    const { presetUrl, alias } = qs.parse(action.callback_id);
    const text = action.message.text;

    await bot.replyPublic(
      action,
      createMessageWithImage(text, getMemifyUrl(alias, presetUrl, text))
    );
  });
};
