/**
 * Insult user
 * @example
 * insult Freddy
 */

const axios = require('axios');

const insultApi = axios.create({
  baseURL: 'https://evilinsult.com',
  params: {
    lang: 'en',
    type: 'json',
  }
});

module.exports = controller => {
  const re = /^insult (\w+)$/i;

  controller.hears(re, ['message', 'direct_message'], async (bot, message) => {
    const [, name] = message.text.match(re);
    if (!name) {
      return;
    }
    try {
      const { user } = await bot.api.users.info({ user: message.user });
      const { data } = await insultApi.get('/generate_insult.php');
      const nameToInsult = name.toLowerCase() === 'botan' ? user.name : name;
      await bot.reply(message, `${nameToInsult}, ${data.insult.toLowerCase()}`);
    } catch (error) {
      console.error(error.message);
    }
  });
};
