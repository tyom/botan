const divider = {
  type: 'divider',
};

function buildMarkdown(text) {
  return {
    type: 'mrkdwn',
    text,
  };
}

function buildImage({ url, altText }) {
  return {
    type: 'image',
    image_url: url,
    alt_text: altText,
  };
}

function buildButton({ text, value }) {
  return {
    type: 'button',
    text: {
      type: 'plain_text',
      text: text,
      emoji: true,
    },
    value: value,
  };
}

function buildMarkdownSection(text) {
  return {
    type: 'section',
    text: buildMarkdown(text),
  };
}

function buildMarkdownImageSection(text = '', { url, altText = '' }) {
  return {
    type: 'section',
    text: buildMarkdown(text),
    accessory: buildImage({ url, altText }),
  };
}

function buildActionButtons(buttons) {
  return {
    type: 'actions',
    elements: buttons.map(buildButton),
  };
}

module.exports = {
  divider,
  buildActionButtons,
  buildMarkdownSection,
  buildMarkdownImageSection,
};
