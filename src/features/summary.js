const unfluff = require('unfluff');
const axios = require('axios');

const AYLIEN_TEXT_ENDPOINT = 'https://aylien-text.p.rapidapi.com';

const aylienApi = axios.create({
  baseURL: AYLIEN_TEXT_ENDPOINT,
  headers: { 'X-RapidAPI-Key': process.env.AYLIEN_TEXT_API_KEY },
});

module.exports = controller => {
  const re = /^(summarise|summarize|summary) `?<(.+)>`?$/i;
  let respondedForTitle;

  controller.hears(re, ['message', 'direct_message'], async (bot, message) => {
    const [, , url] = message.text.match(re);
    if (!url) {
      return;
    }
    try {
      const { data } = await axios(url);
      const { title, text } = unfluff(data);
      const summary = await aylienApi.get('/summarize', {
        params: {
          title,
          text,
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
