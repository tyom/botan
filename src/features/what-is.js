const { block, object, TEXT_FORMAT_MRKDWN } = require('slack-block-kit');
const { text } = object;
const { section, context } = block;

const URBAN_DICTIONARY_ENDPOINT = 'http://api.urbandictionary.com/v0/define';

function define(term) {
  return fetch(`${URBAN_DICTIONARY_ENDPOINT}?term=${term}`).then(res =>
    res.json(),
  );
}

module.exports = controller => {
  const re = /^(what is|what’s)\s?a? (.+)\?$/i;

  controller.hears(re, ['message', 'direct_message'], async (bot, message) => {
    const [, , term] = message.text.match(re);
    try {
      const { list } = await define(term);
      if (!list.length) {
        const { user } = await bot.api.users.info({ user: message.user });
        return bot.reply(message, `Haven’t a clue, ${user.name}.`);
      }
      const randomResult = list[Math.floor(Math.random() * list.length)];

      await bot.reply(message, {
        blocks: [
          section(
            text(`*${term}*\n${randomResult.definition}`, TEXT_FORMAT_MRKDWN),
          ),
          context([text(randomResult.example)]),
        ],
      });
    } catch (error) {
      console.error(error.message);
    }
  });
};
