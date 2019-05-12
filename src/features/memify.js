require('dotenv').config();
const fetch = require('node-fetch');
const qs = require('querystring');
const btoa = require('btoa');
const {
  divider,
  buildActionButtons,
  buildMarkdownSection,
  buildMarkdownImageSection,
} = require('../slack/block-builder');

const slashCommandName = process.env.MEMIFY_COMMAND_NAME || '/memify';
const aliasCommandPrefix = '/=';

function buildBlockFromPresetItem(overlayText) {
  const text = overlayText ? encodeURIComponent(overlayText) : '[text]';
  return function([alias, content]) {
    return [
      divider,
      buildMarkdownImageSection(
        `*${content.name}*\n\n\`${slashCommandName} :${alias} ${text}\``,
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

function buildMemeSelection(preset = {}, overlayText) {
  const sections = Object.entries(preset);
  const images = [].concat(
    ...sections.map(buildBlockFromPresetItem(overlayText))
  );
  const actionButtons = sections.map(buildButtonFromPresetItem);

  return {
    blocks: [
      buildMarkdownSection('This preset contains the following themes:'),
      ...images,
    ].concat(
      overlayText
        ? [buildMarkdownSection('Pick one:'), buildActionButtons(actionButtons)]
        : []
    ),
  };
}

async function getPresetData(url) {
  if (!url) {
    console.log('MEMIFY_PRESET_URL env variable is not set.');
    return {};
  }
  try {
    return fetch(url).then(res => res.json());
  } catch (error) {
    console.error(error);
  }
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

  // Intercept other slash commands and map them to /memify
  controller.middleware.ingest.use((bot, message, next) => {
    if (!message.command || !message.command.startsWith(aliasCommandPrefix)) {
      return next();
    }
    const queryString = qs.stringify(requestQuery);
    message.text = `${message.command.replace(aliasCommandPrefix, ':')} ${
      message.text
    } {{${queryString}}}`;
    message.command = slashCommandName;
    next();
  });

  controller.on('slash_command', async (bot, message) => {
    if (message.command !== slashCommandName) {
      return;
    }

    // Slash commands with inline options come in format
    // /command text to pass to renderer {{inline=options&custom=settings}}
    const [, preset = '', text = ''] =
      message.text.match(/^\s*(:[\w-]+)?\s*(.*)/) || [];
    const [, requestOptionsString] = text.match(/{{(.*)}}/) || [];
    const requestOptions = qs.parse(requestOptionsString);
    const cleanedText = text.replace(/{{.*}}/, '').trim();

    const options = {
      presetUrl: process.env.MEMIFY_PRESET_URL,
      preset: preset.replace(/^:/, ''),
      text: overlayTextCache[message.user] || cleanedText,
      ...requestOptions,
    };

    const memifyPreset = await getPresetData(options.presetUrl);
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
      buildMemeSelection(memifyPreset, options.text)
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
        text,
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
      createMessageWithImage(
        text,
        getMemifyUrl(alias, presetUrl, text)
      )
    );
  });
};
