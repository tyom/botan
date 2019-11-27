let getState;
let setState;

if (process.env.JSONSTORE_URL || process.env.JSONSTORE_ENCRYPT_KEY) {
  ({ getState, setState } = require('./state'));
}

function install(controller) {
  if (process.env.SLACK_BOT_TOKEN) {
    console.log('✓ Using as single instance with SLACK_BOT_TOKEN.');
    return;
  }
  if (!setState) {
    console.log(`
      To install bot token and bot user ID need to be stored.
      This is done using jsonstore.io service. The data is encrypted
      using the key set in environment variable.
    `);
    return;
  }

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
}

async function getTokenForTeam(teamId) {
  if (!getState) {
    return;
  }
  try {
    const { botToken } = await getState(teamId);
    return botToken;
  } catch (error) {
    console.log('Failed to get team token for', teamId);
  }
}

async function getBotUserByTeam(teamId) {
  if (!getState) {
    return;
  }
  try {
    const { botUserId } = await getState(teamId);
    return botUserId;
  } catch (error) {
    console.log('Failed to get team token for', teamId);
  }
}

module.exports = {
  install,
  getTokenForTeam,
  getBotUserByTeam,
};
