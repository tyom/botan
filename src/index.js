require('dotenv').config();

const { Botkit } = require('botkit');
const {
  SlackAdapter,
  SlackMessageTypeMiddleware,
  SlackEventMiddleware,
} = require('botbuilder-adapter-slack');
const { MongoDbStorage } = require('botbuilder-storage-mongodb');

const storage = process.env.MONGO_URI
  ? new MongoDbStorage({
      url: process.env.MONGO_URI,
      database: 'botan',
    })
  : null;

const adapter = new SlackAdapter({
  clientSigningSecret: process.env.SLACK_SIGNING_SECRET,
  botToken: process.env.BOT_TOKEN,
});

// Use SlackEventMiddleware to emit events that match their
// original Slack event types.
adapter.use(new SlackEventMiddleware());
// Use SlackMessageType middleware to further classify messages as
// direct_message, direct_mention, or mention
adapter.use(new SlackMessageTypeMiddleware());

const controller = new Botkit({ adapter, storage });

controller.ready(() => {
  controller.loadModules(`${__dirname}/features`);
});

if (process.env.DEBUG) {
  controller.middleware.send.use(function(bot, message, next) {
    console.log('SENT: ', message);
    next();
  });
}
