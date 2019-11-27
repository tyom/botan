/**
 * Tell a joke from a few categories
 * Categories: Any, Dark, Programming, Miscellaneous
 * @example
 * tell me a joke
 * tell me a programming joke.
 */

const { upperFirst } = require('lodash');
const axios = require('axios');
const jokeApi = axios.create({
  baseURL: 'https://sv443.net/jokeapi/category/',
});

module.exports = controller => {
  const re = /^tell me a(\s+\w+)?\s+joke\.?$/i;

  controller.hears(re, ['message', 'direct_message'], async (bot, message) => {
    const [, category = 'any'] = message.text.match(re);
    const jokeCategory = ['any', 'dark', 'programming'].includes(
      category.trim().toLowerCase(),
    )
      ? upperFirst(category.trim())
      : 'Miscellaneous';

    try {
      const { data } = await jokeApi.get(jokeCategory);
      const { type, joke, setup, delivery } = data;

      if (type === 'twopart') {
        await bot.reply(message, `*${setup}*\n${delivery}`);
      } else {
        await bot.reply(message, joke);
      }
    } catch (error) {
      console.error(error.message);
    }
  });
};
