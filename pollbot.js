var wobot = require('wobot');
var poll = {};
var counterYes = 0;
var counterNo = 0;

var bot = new wobot.Bot({
  jid: '',
  password: '',
  name: 'PollBot'
});
bot.connect();

bot.onConnect(function() {
	console.log('Connected to ' + bot.jid + ' with the name ' + bot.name);
});

bot.on('connect', function() {
  this.join('');
});

bot.onInvite(function(room) {
	console.log('Invited to ' + room);
	bot.join(room);
});

bot.onMessage(/.*/, function(chan, from, message) {
	if (message.substr(0, 5) === '!vote') { // Start a poll
    counterYes = 0;
    counterNo = 0;
		message = message.substr(6);
		bot.message(chan, from + ' a démarré un vote. Qui veut venir à la Via Roma ? Répondez par "oui" ou "non"');

		poll[chan] = {}

	} else if (message === '!results') { // End the current poll and display results
		if (poll[chan] !== undefined) {

			var keys =  Object.keys(poll[chan]);

      var values = keys.join(', ');
			// for (var i = 0; i < keys.length; i++) {
      //   values += keys[i] + ', ';
			// 	// bot.message(chan, keys[i] + ': ' + poll[chan][keys[i]]);
			// }
      bot.message(chan, "Vote terminé ! Liste : " + values);
      bot.message(chan, 'Soit un total de ' + counterYes + ' personnes. Merci à tous !');

			delete poll[chan];
		} else {
			bot.message(chan, 'No poll was active.');
		}
	}  else if (message === '!total') { // Display current results
    bot.message(chan, 'Pour l\'instant ' + counterYes + ' personnes ont dit "oui"');
  } else if (message === '!add') { // Add manually a contributor to the poll
    // TO DO
    bot.message(chan, message + ' a été ajouté au vote.');
  } else if (message === '!remove') { // Remove manually a contributor (previously added) from the poll
    // TO DO
  }  else { // Vote
		if (message === 'oui' || message === 'yes' || message === 'yep' || message === 'ouep' || message === 'moi') { // Vote yes
      poll[chan][from] = true;
      counterYes++;

		} else if (message === 'non' || message === 'no' || message === 'nope') { // Vote no
      poll[chan][from] = false;
      counterNo++;
		}
	}
});
