/**
 * Give a summary to a web article
 * Use Aylien
 * @example
 * summarise https://www.bbc.co.uk/news/world-australia-48305001
 * @alias
 * summarize, summary, tldr
 */

const { truncate } = require('lodash');
const unfluff = require('unfluff');
const axios = require('axios');

const aylienApi = axios.create({
  baseURL: 'https://aylien-text.p.rapidapi.com',
  headers: { 'X-RapidAPI-Key': process.env.AYLIEN_TEXT_API_KEY },
});

module.exports = controller => {
  const re = /^(summarise|summarize|summary|tldr) `?<(.+)>`?$/i;
  let respondedForTitle;

  controller.hears(re, ['message', 'direct_message'], async (bot, message) => {
    const [, , url] = message.text.match(re);
    if (!url) {
      return;
    }
    try {
      const { data } = await axios(url);
      const { title, text } = unfluff(data);
      if (!text) {
        await bot.reply(message, 'There appears to be no text. Maybe it requires JS?');
        return;
      }
      // The maximum text size is limited in the API
      // const truncatedText = text.slice(0, 5200).trim();
      const truncatedText = truncate(text, {
        length: 5200,
        separator: /\./,
        omission: '.',
      });
      const summary = await aylienApi.get('/summarize', {
        params: {
          title,
          text: truncatedText,
        },
      });
      if (respondedForTitle !== title) {
        await bot.reply(message, summary.data.sentences.join(' '));
        respondedForTitle = title;
      }
    } catch (error) {
      console.error(error);
    }
  });
};
