const GENERATOR_ENDPOINT = 'https://evilinsult.com/generate_insult.php?lang=en&type=json';

module.exports = controller => {
  const re = /^insult (\w+)$/i;

  controller.hears(re, ['message', 'direct_message'], async (bot, message) => {
    const [, name] = message.text.match(re);
    if (!name) {
      return;
    }
    try {
      const { user } = await bot.api.users.info({ user: message.user });
      const { insult } = await fetch(GENERATOR_ENDPOINT).then(res => res.json());
      const nameToInsult = name.toLowerCase() === 'botan' ? user.name : name;
      await bot.reply(message, `${nameToInsult}, ${insult.toLowerCase()}`);
    } catch (error) {
      console.error(error.message);
    }
  });
};