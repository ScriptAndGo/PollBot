var wobot = require('wobot');
var poll = {};
var counterYes = 0;
var counterAll = 0;
var botname = 'pollbot';
var fs = require('fs');
var yesValues = ['oui', 'yes', 'yep', 'ouep', 'moi'];
var noValues = ['no'];

var credentials = fs.readFileSync('credentials', 'utf-8');
var credentialsArray = credentials.split("\r\n");
var jabber_id = credentialsArray[0];
var bot_password = credentialsArray[1];
var room = credentialsArray = credentialsArray[2];

var bot = new wobot.Bot({
  jid: jabber_id,
  password: bot_password,
  name: 'PollBot'
});

bot.connect();

bot.onConnect(function() {
  console.log('Connected to [' + bot.jid + '] with the name ' + bot.name);
});

bot.on('connect', function() {
  this.join(room);
});

bot.onInvite(function(room) {
  console.log('Invited to ' + room);
  bot.join(room);
  console.log('Joined ' + room);
  // bot.message(room, 'PollBot a rejoint le salon. Tapez \'!' + botname + ' help\' pour afficher la liste des commandes.');
});

bot.onMessage(/.*/, function(chan, user, message) {
  if (message.toLowerCase() === 'salut ' + botname) {
    bot.message(chan, 'Salut ' + user + ' ! Un petit vote ?');
  } else if (message.substr(0, botname.length + 1) === ("!" + botname)) {
    message = message.substr(botname.length + 2).trim();
    var arguments = message.split(" ");
    var command = arguments[0];
    switch(command)
    {
      case "help":
        var help = getHelpCommands();
        bot.message(chan, help);
        break;

      case "vote": // Start a poll
        if (isPollRunning(chan)) {
          bot.message(chan, "Vote déjà en cours ! Arrêtez le vote en cours avec la commande !results");
          return;
        }
        // Initialize poll
        counterYes = 0;
        counterAll = 0;
        poll[chan] = {};

        bot.message(chan, user + ' a démarré un vote. Qui pour un Via Roma ce midi ? Répondez par "oui" ou "non"');
        break;

      case "results": // End the current poll and display results
        if (isPollRunning(chan)) {
          var values = allYesResults(chan);
          bot.message(chan, "Vote terminé ! Liste : " + values);
          bot.message(chan, 'Soit un total de ' + counterYes + ' personnes. Merci à tous !');

          delete poll[chan];
        } else {
          bot.message(chan, 'Aucun vote en cours.');
        }
        break;

      case "total": // Display current results
        if (isPollRunning(chan)) {
          var values = allYesResults(chan);
          bot.message(chan, 'Pour l\'instant ' + counterYes + ' personnes ont dit "oui" sur un total de ' + counterAll + ' personnes');
          bot.message(chan, 'Ces personnes sont ' + values);
        } else {
          bot.message(chan, "Aucun vote en cours.");
        }
        break;

      case "add": // Add manually a contributor to the poll
        if (isPollRunning(chan)) {
          if (arguments.length > 1) {
            var user = arguments.slice(1).join(' ');
            var users = Object.keys(poll[chan]);
            if (!users.includes(user)) {
              poll[chan][user] = true;
              counterAll++;
              counterYes++;
              bot.message(chan, user + ' a été ajouté au vote.');
            } else {
              bot.message(chan, "Erreur : l'utilisateur avec le nom \'" + user + "\' a déjà été ajouté.");
            }
            //---- optional (because default is yes) -----
            // if (userToAdd's vote is yes)
            //then counterYes++
            //--------------------------------------------
          } else {
            bot.message(chan, "Valeur attendue en argument de cette commande.")
          }
        } else {
          bot.message(chan, "Aucun vote en cours.");
        }
        break;

      case "remove": // Remove manually a contributor (previously added) from the poll
        if (isPollRunning(chan)) {
          if (arguments.length > 1) {
            var user = arguments.slice(1).join(' ');
            var users = Object.keys(poll[chan]);
            if (users.includes(user)) {
              var vote_value = poll[chan][user];
              var index = users.indexOf(user);
              users.splice(index, 1);
              delete poll[chan][user];
              counterAll--;
              if (vote_value) {
                counterYes--;
              }
              bot.message(chan, user + ' a été supprimé du vote.');
            } else {
              bot.message(chan, "Aucun utilisateur avec le nom \'" + user + "\'");
            }
          } else {
            bot.message(chan, "Valeur attendue en argument de cette commande.")
          }
        }  else {
          bot.message(chan, "Aucun vote en cours.");
        }
        break;
	  case "go":
	    if (isPollRunning(chan)) {
	      var values = allYesResultsRaw(chan);
		  var formattedvalues = values.map(function(x){
			  return '@' + x.replace(' ', '');
		  });
		  bot.message(chan, 'Go ! ' + formattedvalues.join(' '));
		}
		break;

      default :
        bot.message(chan, "Commande inconnue.  Tapez \'!" + botname + " help\' pour afficher la liste des commandes.");
        break;
    }
  } else if (isPollRunning(chan)) {
	console.log('[' + user + '] said \'' + message + '\'');
    if (startsWith(message, yesValues)) { // "yes" vote
      var users = Object.keys(poll[chan]);
      if (users.includes(user)) { // if user already contributed
        if (!poll[chan][user]) { // and if its vote was 'no'
          counterYes++; // then update the 'yes' counter
          bot.message(chan, user + " a changé d'avis et est passé à \"oui\"");
        }
      } else { // if user did not contribute, update lists
        counterYes++;
        counterAll++;
      }
      poll[chan][user] = true; // set the user vote to 'yes'
	  console.log('[' + user + '] added to \'yes\' list');
    } else if (startsWith(message, noValues)) { // "no" vote
      var users = Object.keys(poll[chan]);
      if (users.includes(user)) { // if user already contributed
        if (poll[chan][user]) { // and if its vote was 'yes'
          counterYes--; // then update the 'yes' counter
          bot.message(chan, user + " a changé d'avis et est passé à \"non\"");
        }
      } else { // if user did not contribute, update lists
        counterAll++;
      }
      poll[chan][user] = false; // set the user vote to 'no'
	  console.log('[' + user + '] added to \'no\' list');
    }
  }

});

function allYesResults(chan) {
  return allYesResultsRaw(chan).join(', ');
}

function allYesResultsRaw(chan) {
  var values = Object.keys(poll[chan]);
  var result = [];
  for (var i = 0; i < values.length; i++) {
    if (poll[chan][values[i]]) {
      result.push(values[i]);
    }
  }
  return result;
}

function startsWith(message, values) {
  for (var i = 0; i < values.length; i++) {
	if (message.startsWith(values[i])) {
	  return true;
	}
  }
  return false;
}

function isPollRunning(chan) {
  return poll[chan] !== undefined;
}

function getHelpCommands() {
  return 'Commandes PollBot'
  + '\n!' + botname + ' vote : Démarre le vote'
  + '\n!' + botname + ' results : Termine le vote et affiche les résultats'
  + '\n!' + botname + ' total : Affiche les résultats temporaires d\'un vote en cours'
  + '\n!' + botname + ' add : Ajoute manuellement un utilisateur (pour ceux qui n\'ont pas HipChat)'
  + '\n!' + botname + ' remove : Supprime manuellement un utilisateur préalablement ajouté';
}
