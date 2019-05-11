require('dotenv').config();
const fetch = require('node-fetch');
const qs = require('querystring');
const btoa = require('btoa');
const {
  divider,
  buildActionButtons,
  buildMarkdownSection,
  buildMarkdownImageSection,
} = require('../block-builder');

const slashCommandName = process.env.MEMIFY_COMMAND_NAME || '/memify';

function buildBlockFromPresetItem(overlayText) {
  return function([alias, content]) {
    return [
      divider,
      buildMarkdownImageSection(
        `*${
          content.name
        }*\n\n\`${slashCommandName} :${alias} ${encodeURIComponent(
          overlayText
        )}\``,
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
  if (!overlayText) {
    return;
  }
  const sections = Object.entries(preset);
  const images = [].concat(
    ...sections.map(buildBlockFromPresetItem(overlayText))
  );
  const actionButtons = sections.map(buildButtonFromPresetItem);

  return {
    blocks: [
      buildMarkdownSection('This preset contains the following themes:'),
      ...images,
      buildMarkdownSection('Pick one:'),
      buildActionButtons(actionButtons),
    ],
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

module.exports = async controller => {
  let memifyPreset = await getPresetData(process.env.MEMIFY_PRESET_URL);

  const overlayTextCache = {};
  let requestQuery = {};

  controller.http.on('request', req => {
    requestQuery = req.query;
  });

  // Intercept other slash commands and map them to /memify
  controller.middleware.ingest.use((bot, message, next) => {
    if (!message.command || message.command === slashCommandName) {
      return next();
    }
    const queryString = qs.stringify(requestQuery);
    message.text = `${message.command.replace('/', ':')} ${
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
    const [, preset = '', text] = message.text.match(/^\s*(:[\w-]+)?\s*(.*)/) || [];
    const [, requestOptionsString] = text.match(/{{(.*)}}/) || [];
    const requestOptions = qs.parse(requestOptionsString);

    const options = {
      presetUrl: process.env.MEMIFY_PRESET_URL,
      preset: preset.replace(/^:/, ''),
      text: text.replace(/{{.*}}/, ''),
      ...requestOptions,
    };

    if (options.preset && options.text) {
      await bot.reply(
        message,
        getMemifyUrl(options.preset, options.presetUrl, options.text)
      );
      return;
    }
    if (!message.text) {
      await bot.replyEphemeral(
        message,
        `Add some text to overlay on the image. You’ll pick the image later.\n\`${
          message.command
        } Text to overlay\``
      );
      return;
    }

    overlayTextCache[message.user] = message.text;
    await bot.replyEphemeral(
      message,
      buildMemeSelection(memifyPreset, overlayTextCache[message.user])
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
      getMemifyUrl(value, process.env.MEMIFY_PRESET_URL, textOverlay)
    );
  });
};
