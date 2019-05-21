# Botan the Slack bot

A generic Slack bot built with [BotKit](https://botkit.ai).

## Configuration

First make sure `.env` file is configured.

### Distributable app
To run this bot as distributable app 
(single app that can be installed to multiple teams) you'll need to set `SLACK_CLIENT_ID`
and `SLACK_CLIENT_SECRET`. `REDIRECT_URI` needs to be set to your apps URL (make sure the
path is `/install/auth`).

When using this methods the app will need to store bot token and channel ID, for this
you'll need to set `JSONSTORE_URL` and `JSONSTORE_ENCRYPT_KEY`. The data will be stored
in a [jsonstore.io](https://www.jsonstore.io) collection and encrypted using the key.

### Single instance
To run this bot as a single team instance you'll only need `SLACK_BOT_TOKEN` which can
be obtained by installing the app from app manager.

Both methods require `SLACK_SIGNING_SECRET` which is used to verify that your app is
sending the requests.

`ENCODE_URL` base64-encodes URLs sent to Memify service.

`AYLIEN_TEXT_API_KEY` needs to be set to use summary feature which is using
[Aylien Text Analysis API](https://aylien.com/text-api/sdks/). You can subscribe to
a generous free tier with [RapidAPI](https://rapidapi.com/aylien/api/text-analysis).

`DEBUG=true` will log communication to console to help you understand what's being sent
from Slack to the bot.

## Development

Check out the repo and run the app in dev mode:

```
yarn dev
```

The app will run on `PORT` defined in `.env` file. To use this app in Slack you'll need
to expose it to the outside world via a tunnel. You can use localtunnel which is provided
with the app. Run `yarn tunnel`. Or [ngrok](https://ngrok.com) which I find more stable,
but the free version doesn't support custom subdomain aliases.

Once the tunnel is set up, go to Slack app configuration and set request URL for different
features to point to the tunneled app. Make sure the path is set to `/api/messages`.

The bot uses interactive components, slash commands and event subscriptions. Also subscribe
to Bot events, such as `app_mention`, `message.channels`, `message.groups` etc.

## Deployment

This bot has been tested with [Glitch](https://glitch.com) which is a great service for small
projects like this. You can import from and export directly to GitHub repo and it automatically
restarts on changes. It's very easy to play with and devlop this app directly from Glitch.

See [Botan's Glitch page](https://glitch.com/~iambotan).
