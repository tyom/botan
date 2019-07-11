/**
 * Use mimify.tyom.dev to create an image with caption
 * Use =memeId to pick an image, followed by caption text. = sign is identifier.
 * If memeId is omitted, the caption text will be temporarily stored and the
 * list of available images in preset will be shown with the ability to select
 * one to place the text on.
 * @example
 * /memify Goes onto image
 * /memify =R0m7W1A4q7P5oeoDZLr9 Goes onto image
 */

const qs = require('querystring');
const {
  block,
  element,
  object,
  TEXT_FORMAT_MRKDWN,
} = require('slack-block-kit');
const {
  getDocumentFromCloud,
  getAllDocumentsFromCloudByIds,
} = require('../memify-db');

const { text } = object;
const { button } = element;
const { section, context, actions, divider, image } = block;

const MEMIFY_ENDPOINT = 'https://memify.tyom.dev';
const ACTION_BLOCK_ID = 'memify-actions';

function buildBlockFromPresetItem(command, caption) {
  const captionText = caption ? encodeURIComponent(caption) : '[caption]';
  return meme => {
    return [
      divider(),
      section(
        text(
          `*<${getMemeUrl({ memeId: meme.id, caption })}|${
            meme.title
          }>*\n\n\`${command} =${meme.id} ${captionText}\``,
          TEXT_FORMAT_MRKDWN,
        ),
        {
          accessory: image(meme.image.src, meme.title),
        },
      ),
    ];
  };
}

function buildMemeSelection({
  command,
  preset = {},
  items = [],
  caption = '',
}) {
  const images = [].concat(
    ...items.map(buildBlockFromPresetItem(command, caption)),
  );
  const actionButtons = items.map(meme => button(meme.id, meme.title));

  return {
    blocks: [
      section(
        text(
          `<${getPresetUrl({ presetId: preset.id, caption })}|${
            preset.title
          }> preset contains ${items.length} items:`,
          TEXT_FORMAT_MRKDWN,
        ),
      ),
      ...images,
      context([
        text(
          `Start with *${command}*, add *=memeId* followed by *caption*. If memeId is omitted but caption is given, the caption will be remembered and another interactive message pops up to pick the image for the caption.`,
          TEXT_FORMAT_MRKDWN,
        ),
      ]),
    ]
      .concat(
        caption
          ? [
              context([text(`> *${caption}*`, TEXT_FORMAT_MRKDWN)]),
              section(text('Render on:')),
              actions(actionButtons, {
                blockId: ACTION_BLOCK_ID,
              }),
            ]
          : [],
      )
      .filter(Boolean),
  };
}

function getMemeRenderUrl({ memeId, caption }) {
  return `${MEMIFY_ENDPOINT}/r/${memeId}?text=${encodeURIComponent(caption)}`;
}

function getPresetUrl({ presetId, memeId, caption }) {
  const memePath = memeId ? `/${memeId}` : '';
  return `${MEMIFY_ENDPOINT}/#/preset/${presetId}${memePath}?text=${caption}`;
}

function getMemeUrl({ memeId, caption }) {
  return `${MEMIFY_ENDPOINT}/#/${memeId}?text=${caption}`;
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
  const captionCache = {};
  let requestQuery = {};
  let receivedMessageId;

  controller.http.on('request', req => {
    requestQuery = req.query;
  });

  controller.on('slash_command', async (bot, message) => {
    // avoid duplicate retries due to async delay
    if (receivedMessageId === message.incoming_message.id) {
      return;
    }
    const [, memeIdCapture = '', caption = ''] =
      message.text.match(/^\s*(=[\w-]+)?\s*(.*)/) || [];
    const memeId = requestQuery.memeId || memeIdCapture.replace(/^=/, '');
    const presetId = requestQuery.presetId || process.env.MEMIFY_PRESET_ID;

    captionCache[message.user] = caption;

    // Render meme
    if (memeId) {
      captionCache[message.user] = '';
      return bot.say(
        createImageResponse(
          getMemeRenderUrl({ memeId, caption }),
          caption,
          caption,
        ),
      );
    }

    // Show preset items
    if (presetId) {
      const cloudPreset = await getDocumentFromCloud('presets', presetId);
      const cloudPresetMemes = await getAllDocumentsFromCloudByIds(
        'memes',
        cloudPreset.memes,
      );
      return bot.replyEphemeral(
        message,
        buildMemeSelection({
          command: message.command,
          preset: cloudPreset,
          items: cloudPresetMemes,
          caption,
        }),
      );
    }

    throw new Error(
      '`presetId` is not set. Either use MEMIFY_PRESET_ID env var or pass inline as query param.',
    );
  });

  controller.on('block_actions', (bot, message) => {
    const action = message.actions[0];

    if (action.block_id !== ACTION_BLOCK_ID) {
      return;
    }

    const caption = captionCache[message.user];

    if (!caption) {
      console.warn('No `overlayText`');
      return;
    }

    // Clear cache
    captionCache[message.user] = '';
    receivedMessageId = message.incoming_message.id;
    
    return bot.say(
      createImageResponse(
        getMemeRenderUrl({ memeId: action.action_id, caption }),
        caption,
        caption,
      ),
    );
  });

  controller.on('message_action', (bot, action) => {
    const { memeId } = qs.parse(action.callback_id);
    const caption = action.message.text;

    return bot.say(
      createImageResponse(
        getMemeRenderUrl({ memeId, caption }),
        caption,
        caption,
      ),
    );
  });
};
