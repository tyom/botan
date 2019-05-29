const { block, object, TEXT_FORMAT_MRKDWN } = require('slack-block-kit');
const { text } = object;
const { section, divider, context } = block;

module.exports = {
  blocks: [
    section(
      text(
        'I understand certain commands that should be sent as discrete messages:',
        TEXT_FORMAT_MRKDWN,
      ),
    ),
    divider(),
    section(text('*`insult [name]`*\n', TEXT_FORMAT_MRKDWN)),
    section(text('Insult the user [name].')),
    context([text('e.g. `insult bob`', TEXT_FORMAT_MRKDWN)]),
    divider(),
    section(text('*`tell me a ([category]) joke`*', TEXT_FORMAT_MRKDWN)),
    section(
      text(
        '[category] can be one of `any`, `programming`, `dark` or `miscellaneous`. If omitted `any` is picked. For anything not matching the list `miscellaneous` is picked.',
        TEXT_FORMAT_MRKDWN,
      ),
    ),
    section(text('Tell a random joke by category.')),
    context([text('e.g. `tell me a programming joke`', TEXT_FORMAT_MRKDWN)]),
    divider(),
    section(
      text(
        '*`what is (a) [term]?`* or *`what’s (a) [term]?`*',
        TEXT_FORMAT_MRKDWN,
      ),
    ),
    section(
      text(
        'Get a definition for a [term] from UrbanDictionary.com. For multiple definitions a random one is selected.',
      ),
    ),
    context([text('e.g. `what is bot?`', TEXT_FORMAT_MRKDWN)]),
    divider(),
    section(
      text(
        '*`describe [term]`* or *`ddg [term]`*',
        TEXT_FORMAT_MRKDWN,
      ),
    ),
    section(
      text(
        'Get a summary for [term] using DuckDuckGo’s Instant Answers.',
      ),
    ),
    context([text('e.g. `describe mars planet`', TEXT_FORMAT_MRKDWN)]),
    divider(),
    section(
      text(
        '*`summarise`* or *`summarize`* or *`summary`* or *`tldr [url]`*',
        TEXT_FORMAT_MRKDWN,
      ),
    ),
    section(
      text(
        'Get a summary for web page URL. Wrap URL in tilde (`) to prevent unfurling',
      ),
    ),
    context([text('e.g. `summarise https://www.bbc.co.uk/news/world-australia-48305001`', TEXT_FORMAT_MRKDWN)]),

    divider(),
    section(text('*`/memify =memeId [text]`*', TEXT_FORMAT_MRKDWN)),
    section(
      text(
        'Slash command to place [text] caption on an image from preset. To get a list of images in preset run `/memify` or `/memify [text]',
      ),
    ),
    context([text('e.g. `/memify =V9ZgwxBuviSgF609tzQ1 I’m not alone`', TEXT_FORMAT_MRKDWN)]),
  ],
};
