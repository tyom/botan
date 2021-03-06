/**
 * Get a random Darwin Award story
 * @example
 * darwin me
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { block, object, TEXT_FORMAT_MRKDWN } = require('slack-block-kit');
const { text } = object;
const { section } = block;

const RANDOM_ARTICLE_URL = 'https://darwinawards.com/cgi/random.pl';

function getTitle($heading) {
  let title = '';

  $heading[0].children.forEach(child => {
    if (child.type === 'text') {
      title += child.data;
    }
  });

  const subtitle = $heading
    .find('.smalltext')
    .text()
    .trim()
    .split('\n')
    .join(', ');

  return {
    title: title.trim(),
    subtitle: subtitle,
  };
}

async function getDarwinAwardsStory(url) {
  const { data, request } = await axios(url);
  const storyUrl = request.res.responseUrl;

  const trimmedData = data
    .replace(/.*<!--\s+story_text_begin\s+-->/s, '')
    .replace(/<!--\s+begin ranking block\s+-->.*/s, '');

  const $h2 = cheerio.load(data)('h2');
  const $ = cheerio.load(trimmedData);

  $('table').remove();

  const story = $.text()
    .replace(/([\n]{3,}\s*)/g, '\n\n')
    .trim();
  const { title, subtitle } = getTitle($h2);

  return {
    title,
    subtitle,
    story,
    url: storyUrl,
  };
}

module.exports = controller => {
  const re = /^darwin me$/i;

  controller.hears(re, ['message', 'direct_message'], async (bot, message) => {
    try {
      const { title, subtitle, story } = await getDarwinAwardsStory(
        RANDOM_ARTICLE_URL,
      );
      await bot.reply(message, `${title}\n\n${subtitle}\n\n${story}`);
    } catch (error) {
      console.error(error.message);
    }
  });
};
