/**
 * DuckDuckGo Instant Answers
 * Use DDG api to get short summaries for topics
 * @example
 * describe World Wide Web
 * @alias
 * ddg
 */

const { duckIt } = require('node-duckduckgo');
const { isString } = require('lodash');
const { block, object, TEXT_FORMAT_MRKDWN } = require('slack-block-kit');
const { text } = object;
const { section, divider, context, image } = block;

module.exports = controller => {
  const re = /^(describe|ddg) (.*)$/i;

  controller.hears(
    re,
    ['message', 'direct_message', 'mention'],
    async (bot, message) => {
      const [, , query] = message.text.match(re);

      try {
        const { data } = await duckIt(query, {
          parentalFilter: 'Deactivated',
        });
        const {
          Heading,
          Abstract,
          AbstractURL,
          Image,
          Infobox,
          Results = [],
          RelatedTopics = [],
        } = data;

        if (!Heading || !Abstract) {
          if (RelatedTopics.length) {
            const examples = RelatedTopics.filter(({ FirstURL }) => FirstURL)
              .map(({ FirstURL }) =>
                FirstURL.replace(/^.*\/(\w+).*/, '$1').replace(/_/g, ' '),
              )
              .filter(e => e.toLowerCase() !== query.toLowerCase())
              .map(e => `*${e}*`)
              .join(', ');
            return bot.say({
              blocks: [
                section(
                  text(
                    `*${query}* is too ambiguous. Try to narrow it down.`,
                    TEXT_FORMAT_MRKDWN,
                  ),
                ),
                context([text(`Examples: ${examples}...`, TEXT_FORMAT_MRKDWN)]),
              ],
            });
          }
          await bot.reply(message, `I’ve nothing on *${query}*.`);
        }
        const resultsData = Results.map(({ FirstURL, Text }) =>
          text(`<${FirstURL}|${Text}>`, TEXT_FORMAT_MRKDWN),
        ).slice(0, 10);
        const infoboxData =
          Infobox && Infobox.content && Infobox.content.length
            ? Infobox.content
                .filter(c => isString(c.label) && isString(c.value))
                .map(c => text(`${c.label}: *${c.value}*`, TEXT_FORMAT_MRKDWN))
                .slice(0, 10)
            : [];

        const heading =
          Heading && AbstractURL
            ? `*<${AbstractURL}|${Heading}>*\n`
            : `*${Heading}*\n` || '';
        const abstract = Abstract || '';

        const blocks = [
          section(
            text(`${heading}${abstract}`, TEXT_FORMAT_MRKDWN),
            Image
              ? {
                  accessory: image(Image, Heading),
                }
              : undefined,
          ),
        ];

        if (resultsData.length) {
          blocks.push(context(resultsData));
        }

        if (infoboxData.length) {
          blocks.push(divider(), context(infoboxData));
        }

        await bot.reply(message, { blocks });
      } catch (error) {
        console.error(error);
      }
    },
  );
};
