const { truncate } = require('lodash');
const {
  block,
  element,
  object,
  TEXT_FORMAT_MRKDWN,
} = require('slack-block-kit');
const { overflow } = element;
const { text, option } = object;
const { section, context } = block;

const URBAN_DICTIONARY_ENDPOINT = 'http://api.urbandictionary.com/v0/define';

function define(term) {
  return fetch(`${URBAN_DICTIONARY_ENDPOINT}?term=${term}`).then(res =>
    res.json(),
  );
}

function getDefinitionById(id) {
  return fetch(`${URBAN_DICTIONARY_ENDPOINT}?defid=${id}`)
    .then(res => res.json())
    .then(({ list = [] }) => list[0]);
}

function constructResponse(defineObj, otherDefinitions = []) {
  if (!defineObj) {
    return;
  }
  const overflowOptions = otherDefinitions.map(d =>
    option(truncate(d.definition, { length: 50 }), d.defid.toString()),
  );

  const menu = otherDefinitions.length
    ? {
        blockId: 'ub-other-definitions',
        accessory: overflow('ub-definition', overflowOptions),
      }
    : undefined;

  return {
    blocks: [
      section(
        text(
          `*${defineObj.word}*\n${defineObj.definition}`,
          TEXT_FORMAT_MRKDWN,
        ),
        menu,
      ),
      context([text(defineObj.example)]),
    ],
  };
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
      const otherDefinitions = list
        .filter(d => d.defid !== randomResult.defid)
        .slice(0, 5);

      await bot.reply(
        message,
        constructResponse(randomResult, otherDefinitions),
      );
    } catch (error) {
      console.error(error);
    }
  });

  controller.on('block_actions', async (bot, message) => {
    const action = message.actions[0];
    if (action.block_id !== 'ub-other-definitions') {
      return;
    }
    try {
      const definition = await getDefinitionById(action.selected_option.value);
      bot.reply(message, constructResponse(definition));
    } catch (error) {
      console.error(error);
    }
  });
};
