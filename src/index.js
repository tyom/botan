require('dotenv').config();

const { Botkit } = require('botkit');
const {
  SlackAdapter,
  SlackMessageTypeMiddleware,
  SlackEventMiddleware,
} = require('botbuilder-adapter-slack');
const debug = require('./debug');
const { getState, setState } = require('./state');

const adapter = new SlackAdapter({
  // Bot user OAuth access token for single team app
  botToken: process.env.SLACK_BOT_TOKEN,
  // App credentials found in Basic Information used for OAuth authentication
  clientId: process.env.SLACK_CLIENT_ID,
  clientSecret: process.env.SLACK_CLIENT_SECRET,
  clientSigningSecret: process.env.SLACK_SIGNING_SECRET,
  scopes: ['bot', 'commands', 'chat:write:bot'],
  redirectUri: process.env.REDIRECT_URI,
  // Functions required for use in multi-team app
  // which retrieve team-specific info
  getTokenForTeam: getTokenForTeam,
  getBotUserByTeam: getBotUserByTeam,
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
});

controller.webserver.get('/install', (req, res) => {
  res.redirect(controller.adapter.getInstallLink());
});

controller.webserver.get('/install/auth', async (req, res) => {
  try {
    const results = await controller.adapter.validateOauthCode(req.query.code);
    console.log('OAUTH DETAILS:', results);

    await setState(results.team_id, {
      botToken: results.bot.bot_access_token,
      botUserId: results.bot.bot_user_id,
    });

    res.json('Success! Bot installed.');
  } catch (error) {
    console.error('OAUTH ERROR:', error);
    res.status(401);
    res.send(error.message);
  }
});

async function getTokenForTeam(teamId) {
  try {
    const { botToken } = await getState(teamId);
    return botToken;
  } catch (error) {
    console.log('Failed to get team token for', teamId);
  }
}

async function getBotUserByTeam(teamId) {
  try {
    const { botUserId } = await getState(teamId);
    return botUserId;
  } catch (error) {
    console.log('Failed to get team token for', teamId);
  }
}

if (process.env.DEBUG) {
  debug.logIngest(controller);
}
