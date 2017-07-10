# PollBot

A HipChat bot for simple question polls and restaurant polls, using [cjoudrey/wobot](https://github.com/cjoudrey/wobot/).

## Installation
- Install [node.js](https://nodejs.org/en/download/): `choco install nodejs-lts`
- Clone this repository
- Install dependencies by running `npm install wobot loglevel loglevel-message-prefix sprintf-js` in project root
- Create a bot account on your HipChat server, if there's not one already
- Create a file named `credentials` next to `PollBot.js`, with the following information separated by whitespace of your choice (newline, spaces, etc.):
  - `jid`: Account's Jabber ID (obtained from HipChat account settings)
  - `password`: Account's password
  - (Optional) `defaultRoom`: Jabber name of room to join automatically on connect
- Run `node PollBot.js`: the bot should now be connected to the server
- Invite the bot to the room of your choice (or use `defaultRoom` above)

## Running as a service on Windows
- Install global dependency: `npm install -g node-windows`
- Link in project root: `npm link node-windows`
- Run `node WindowsService.js`: service should now be added to Services list and automatically started
- If you want to remove PollBot from Services: edit `WindowsService.js`, comment `svc.install()` and uncomment `svc.uninstall()`, and run the script again.

## Usage
Type `!poll help` in private message or in any room with the bot to get a list of available commands.

## Future
* Add a schedule manager to allow for automatic poll start/close.
