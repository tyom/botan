const { upperFirst } = require('lodash');
const JOKES_ENDPOINT = 'https://sv443.net/jokeapi/category/{category}';

module.exports = controller => {
  const re = /^tell me a(\s+\w+)?\s+joke\.?$/i;

  controller.hears(re, ['message', 'direct_message'], async (bot, message) => {
    const [, category = 'any'] = message.text.match(re);
    const jokeCategory = ['any', 'dark', 'programming']
      .includes(category.trim().toLowerCase())
        ? upperFirst(category.trim())
        : 'Miscellaneous';
    
    try {
      const { type, joke, setup, delivery } = await fetch(
        JOKES_ENDPOINT.replace('{category}', jokeCategory)
      ).then(res => res.json());
      if (type === 'twopart') {
       await bot.reply(message, `*${setup}*\n${delivery}`);
      } else {
        await bot.reply(message, joke);
      }
      // await bot.reply(message, `${nameToInsult}, ${insult.toLowerCase()}`);
    } catch (error) {
      console.error(error.message);
    }
  });
};

