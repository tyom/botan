/**
 * Generate rhymes
 * @example
 * rhyme me rap
 */

const axios = require('axios');

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

const RHYME_SCHEMES = {
  couplet: 'Couplet (AABB)',
  alternate: 'Alternate (ABAB)',
  enclosed: 'Enclosed rhyme (ABBA)',
  monorhyme: 'Monorhyme (AAAA)',
  cinquain: 'Cinquain (ABABB)',
  mccarroncouplet: 'McCarron Couplet (AABBAB)',
  limerick: 'Limerick (AABBA)',
  ottavarima: 'Ottava rima (ABABABCC)',
  rhymeroyal: 'Rhyme royal (ABABBCC)',
  rubaiyat: 'Rubaiyat (AABA)',
  simplefourline: 'Simple 4-line (ABCB)',
};

const RHYME_GENRES = {
  rap: 'song:rap',
  sonet: 'verse:sonet',
  nursery: 'song:nursery',
  search: 'search:phrase',
  news: 'news:headline',
};

module.exports = controller => {
  const re = /^rhyme me(\s+?\w+)?(\s+\w+)?$/i;

  controller.hears(re, ['message', 'direct_message'], async (bot, message) => {
    const [, genreMatch = '', schemeMatch = ''] = message.text.match(re);
    const genreKey = genreMatch.trim();
    const schemeKey = schemeMatch.trim();

    const genreKeys = Object.keys(RHYME_GENRES);
    const schemeKeys = Object.keys(RHYME_SCHEMES);
    const schemeValue = schemeKeys.includes(schemeKey)
      ? schemeKey
      : schemeKeys[0];

    if (genreKey === 'help') {
      await bot.say(
        `\`rhyme me [genre] [scheme=couplet]\`\nGenres: ${genreKeys
          .map(x => `\`${x}\``)
          .join(', ')}.\nSchemes: ${schemeKeys
          .map(x => `\`${x}\``)
          .join(', ')}.`,
      );
      return;
    }

    if (!genreKeys.includes(genreKey)) {
      await bot.say(
        `Specify genre. Available genres: ${genreKeys
          .map(x => `\`${x}\``)
          .join(', ')}.`,
      );
      return;
    }

    try {
      const requestData = `action=rhyme_last&scheme=${schemeValue}&genre=${RHYME_GENRES[genreKey]}`;
      const { data } = await axios({
        url: 'https://www.rhymebuster.com/wp-admin/admin-ajax.php',
        method: 'post',
        data: requestData,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
        },
      });
      const lines = data.map(x => x.line);
      await bot.changeContext(message.reference);
      await bot.reply(message, lines.join('\n'));
    } catch (error) {
      console.error(error);
    }
  });
};
