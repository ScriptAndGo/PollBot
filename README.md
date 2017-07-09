# PollBot

A HipChat bot for simple question polls and restaurant polls, originally inspired from [NFesquet/PollBot](https://github.com/NFesquet/PollBot) and using [cjoudrey/wobot](https://github.com/cjoudrey/wobot/).

## Installation
- Install [node.js](https://nodejs.org/en/download/): `choco install nodejs-lts`
- Install dependencies: `npm install wobot loglevel loglevel-message-prefix sprintf-js`
- Clone this repository
- Create a bot account on your HipChat server, if there's not one already
- Create a file named `credentials` next to `pollbot.js`, with the following information separated by whitespace of your choice (newline, spaces, etc.):
  - `jid`: Account's Jabber ID (obtained from HipChat account settings)
  - `password`: Account's password
  - (Optional) `defaultRoom`: Jabber name of room to join automatically on connect
- Run `node pollbot.js`: the bot should now be connected to the server
- Invite the bot to the room of your choice (or use `defaultRoom` above)

## Usage
Type `!poll help` in private message or in any room with the bot to get a list of available commands.

## Future
* Add a schedule manager to allow for automatic poll start/close.