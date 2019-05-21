const { get, truncate } = require('lodash');
const axios = require('axios');
const {
  block,
  element,
  object,
  TEXT_FORMAT_MRKDWN,
} = require('slack-block-kit');
const { overflow } = element;
const { text, option } = object;
const { section, context } = block;

const ubApi = axios.create({
  baseURL: 'http://api.urbandictionary.com/v0',
});

async function define(term) {
  try {
    const { data } = await ubApi.get(`define?term=${encodeURIComponent(term)}`);
    return data;
  } catch (error) {
    console.error(error);
  }
}

async function getDefinitionById(id) {
  try {
    const { data } = await ubApi.get(`define?defid=${id}`);
    return get(data, 'list', [])[0];
  } catch (error) {
    console.error(error);
  }
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

function getRandomItem(list) {
  return list[Math.floor(Math.random() * list.length)];
}

module.exports = controller => {
  const re = /^(what is|what’s)\s?a? (.+)\?$/i;

  controller.hears(re, ['message', 'direct_message'], async (bot, message) => {
    const [, , term] = message.text.match(re);
    try {
      const { list } = await define(term);
      const exactMatches = list.filter(x => x.word.toLowerCase() === term.toLowerCase());
      
      if (!exactMatches.length) {
        const { user } = await bot.api.users.info({ user: message.user });
        return bot.reply(message, `Haven’t a clue, ${user.name}.`);
      }
      // const relevantList = exactMatches.length ? exactMatches : list;
      const randomResult = getRandomItem(exactMatches);
      const otherDefinitions = exactMatches
        .filter(d => d.defid !== randomResult.defid)
        .slice(0, 5);
      const result = list.find(x => x.word.toLowerCase() === term.toLowerCase())

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
      return bot.reply(message, constructResponse(definition));
    } catch (error) {
      console.error(error);
    }
  });
};
