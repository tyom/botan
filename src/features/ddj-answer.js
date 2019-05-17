const { duckIt } = require('node-duckduckgo');
const { isString } = require('lodash');
const { block, object, TEXT_FORMAT_MRKDWN } = require('slack-block-kit');
const { text } = object;
const { section, context, image } = block;

module.exports = controller => {
  const re = /^(describe|ddg) (.*)$/i;

  controller.hears(
    re,
    ['message', 'direct_message', 'mention'],
    async (bot, message) => {
      const [, , query] = message.text.match(re);

      try {
        const { data } = await duckIt(query, { parentalFilter: 'Deactivated' });
        const {
          Heading,
          Abstract,
          AbstractURL,
          Image,
          Infobox = { content: [] },
          Results = [],
          RelatedTopics = [],
        } = data;

        if (!Heading || !Abstract) {
          if (RelatedTopics.length) {
            return bot.say(`*${query}* is too ambiguous. Try to narrow it down.`);
          }
          return bot.say(`I’ve nothing for *${query}*.`);
        }
        const resultsData = Results.map(({ FirstURL, Text }) =>
          text(`<${FirstURL}|${Text}>`, TEXT_FORMAT_MRKDWN),
        );
        const infoboxData = Infobox.content
          .filter(c => isString(c.label) && isString(c.value))
          .map(c => text(`${c.label}: *${c.value}*`, TEXT_FORMAT_MRKDWN));

        const heading =
          Heading && AbstractURL
            ? `*<${AbstractURL}|${Heading}>*\n`
            : `*${Heading}*\n` || '';
        const abstract = Abstract || '';

        await bot.say({
          blocks: [
            section(text(`${heading}${abstract}`, TEXT_FORMAT_MRKDWN)),
            resultsData.length && context(resultsData),
            infoboxData.length && context(infoboxData),
            Image && image(Image, Heading),
          ].filter(Boolean),
        });
      } catch (error) {
        console.error(error);
      }
    },
  );
};
