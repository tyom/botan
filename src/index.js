const { Botkit } = require('botkit');
const {
  SlackAdapter,
  SlackMessageTypeMiddleware,
  SlackEventMiddleware,
} = require('botbuilder-adapter-slack');
const { install, getTokenForTeam, getBotUserByTeam } = require('./install');
const { logIngest } = require('./debug');
const help = require('./help');

const {
  SLACK_BOT_TOKEN,
  SLACK_CLIENT_ID,
  SLACK_CLIENT_SECRET,
  SLACK_SIGNING_SECRET,
  REDIRECT_URI,
  DEBUG,
} = process.env;

const adapter = new SlackAdapter({
  // Bot user OAuth access token for single team app
  botToken: SLACK_BOT_TOKEN,
  // App credentials found in Basic Information used for OAuth authentication
  clientId: SLACK_CLIENT_ID,
  clientSecret: SLACK_CLIENT_SECRET,
  clientSigningSecret: SLACK_SIGNING_SECRET,
  scopes: ['bot', 'commands', 'chat:write:bot'],
  redirectUri: REDIRECT_URI,
  // Functions required for use in multi-team app
  // which retrieve team-specific info
  getTokenForTeam,
  getBotUserByTeam,
});

// Use SlackEventMiddleware to emit events that match their
// original Slack event types.
adapter.use(new SlackEventMiddleware());
// Use SlackMessageType middleware to further classify messages as
// direct_message, direct_mention, or mention
adapter.use(new SlackMessageTypeMiddleware());

const controller = new Botkit({ adapter });

controller.ready(() => {
  controller.loadModules(`${__dirname}/features`);
  controller.hears(
    /^help$/,
    ['direct_mention', 'direct_message'],
    async (bot) => {
      await bot.say(help);
    },
  );
});

install(controller);

if (DEBUG) {
  logIngest(controller);
}
