/**
 * Get quote from bash.org
 * Either a random or matching a keyword
 * @example
 * bash me
 * bash me society
 */

const { JSDOM } = require('jsdom');
const { shuffle } = require('lodash');
const axios = require('axios');

const QUOTE_SELECTOR = 'table .quote + .qt';

function getQuotesOnPage(doc) {
  const page = new JSDOM(doc);
  const quotes = [...page.window.document.querySelectorAll(QUOTE_SELECTOR)].map(
    q => q.textContent,
  );
  return shuffle(quotes);
}

async function getRandomResult(cache = {}) {
  if (!Array.isArray(cache.__RANDOM__) || !cache.__RANDOM__.length) {
    try {
      cache.__RANDOM__ = await axios('http://bash.org/?random').then(res =>
        getQuotesOnPage(res.data),
      );
    } catch (error) {
      console.error(error.message);
    }
  }
  const result = cache.__RANDOM__.pop();
  console.log(`bash: cached results: ${cache.__RANDOM__.length} quotes.`);
  return result;
}

async function getSearchResult(cache = {}, term) {
  if (!Array.isArray(cache[term]) || !cache[term].length) {
    try {
      cache[term] = await axios(`http://bash.org/?search=${term}&show=100`).then(res =>
        getQuotesOnPage(res.data),
      );
    } catch (error) {
      console.error(error.message);
    }
  }
  const result = cache[term].pop();
  console.log(`bash: cached search results: ${cache[term].length} quotes.`);
  return result;
}

function createCache(store = {}) {
  return (key, value) => (store[key] = value);
}

module.exports = async controller => {
  const re = /^bash me\s?(\w+)?$/i;
  let receivedMessageId;

  const cache = createCache();

  controller.hears(re, ['message', 'direct_message'], async (bot, message) => {
    // avoid duplicate retries due to async delay
    if (receivedMessageId === message.incoming_message.id) {
      return;
    }
    const [, term = ''] = message.text.match(re);

    if (term) {
      const result = await getSearchResult(cache, term);
      receivedMessageId = message.incoming_message.id;
      
      return bot.reply(message, result);
    }

    const result = await getRandomResult(cache);
    return bot.reply(message, result);
  });
};
