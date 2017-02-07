var wobot = require('wobot');
var poll = {};
var counterYes = 0;
var counterAll = 0;
var botname = 'pollbot';

var bot = new wobot.Bot({
  jid: '',
  password: '',
  name: 'PollBot'
});

bot.connect();

bot.onConnect(function() {
  console.log('Connected to [' + bot.jid + '] with the name ' + bot.name);
});

bot.on('connect', function() {
  this.join('');
});

bot.onInvite(function(room) {
  console.log('Invited to ' + room);
  bot.join(room);
  console.log('Joined ' + room);
  // bot.message(room, 'PollBot a rejoint le salon. Tapez \'!' + botname + ' help\' pour afficher la liste des commandes.');
});

bot.onMessage(/.*/, function(chan, user, message) {
  if (message.substr(0, botname.length + 1) === ("!" + botname)) {
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
        counterYes = 0;
        counterAll = 0;
        bot.message(chan, user + ' a démarré un vote. Qui veut venir à la Via Roma ? Répondez par "oui" ou "non"');

        poll[chan] = {}
        break;

      case "results": // End the current poll and display results
        if (isPollRunning(chan)) {
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
          bot.message(chan, 'Aucun vote en cours.');
        }
        break;

      case "total": // Display current results
        if (isPollRunning(chan)) {
          var keys =  Object.keys(poll[chan]);
          var values = keys.join(', ');
          bot.message(chan, 'Pour l\'instant ' + counterYes + ' personnes ont dit "oui" sur un total de ' + counterAll + ' personnes');
          bot.message(chan, 'Ces personnes sont ' + values);
        } else {
          bot.message(chan, "Aucun vote en cours.");
        }
        break;

      case "add": // Add manually a contributor to the poll
        if (isPollRunning(chan)) {
          if (arguments.length > 1) {
            var user = arguments[1];
            var users = Object.keys(poll[chan]);
            if (!users.includes(user)) {
              poll[chan][user] = true;
              counterAll++;
              counterYes++;
              bot.message(chan, user + ' a été ajouté au vote.');
            } else {
              bot.message(chan, "Erreur : l'utilisateur avec le nom \'" + user + "\' a déjà été ajouté.");
            }
            // TODO
            // if (userToAdd not already logged)
            // add userToAdd entry
            // counterAll++
            //---- optional (because default is yes) -----
            // if (userToAdd's vote is yes)
            //then counterYes++
            //--------------------------------------------
            // else message 'no user with this name'
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
            var user = arguments[1];
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
            } else {
              bot.message(chan, "Aucun utilisateur avec le nom \'" + user + "\'");
            }
            // TODO
            // if (userToRemove already logged)
            // remove userToRemove entry
            // counterAll--
            // if (userToRemove's vote was yes)
            //then counterYes--
            // else message 'no user with this name'
            bot.message(chan, user + ' a été supprimé au vote.');
          } else {
            bot.message(chan, "Valeur attendue en argument de cette commande.")
          }
        }  else {
          bot.message(chan, "Aucun vote en cours.");
        }
        break;

      default :
        bot.message(chan, "Commande inconnue.  Tapez \'!" + botname + " help\' pour afficher la liste des commandes.");
        break;
    }
  } else if (isPollRunning(chan)) {
    bot.message(chan, "message = " + message);
    if (message === 'oui' || message === 'yes' || message === 'yep' || message === 'ouep' || message === 'moi') { // "yes" vote
      var users = Object.keys(poll[chan]);
      if (users.includes(user) && !poll[chan][user]) { // "contains" ou "includes" ?
        counterYes++;
        bot.message(chan, user + " a changé d'avis et passé à \"oui\"");
      } else {
        counterAll++;
      }
      poll[chan][user] = true;
      // if (user already logged && its previous vote was 'no')
      // then message saying user changed his mind
      // and counterYes++
      // else
      // counterAll++


      // counterYes++;
      // counterAll++;

    } else if (message === 'non' || message === 'no' || message === 'nope') { // "no" vote
      var users = Object.keys(poll[chan]);
      if (users.includes(user) {
        if poll[chan][user]) {
          counterYes--;
          bot.message(chan, user + " a changé d'avis et passé à \"non\"");
        }
      } else {
        counterAll++;
      }
      poll[chan][user] = false;
      // if (user already logged && its previous vote was 'yes')
      // then message saying user changed his mind
      // and counterYes--
      // else
      // counterAll++

      // poll[chan][user] = false;
      // counterAll++;
    }
  }

});

function isPollRunning(chan) {
  return poll[chan] !== undefined;
}

function getHelpCommands() {
  return 'Commandes PollBot'
  + '\n' + '!vote : Démarre le vote'
  + '\n' + '!results : Termine le vote et affiche les résultats'
  + '\n' + '!total : Affiche les résultats temporaires d\'un vote en cours'
  + '\n' + '!add : Ajoute manuellement un utilisateur (pour ceux qui n\'ont pas HipChat)'
  + '\n' + '!remove : Supprime manuellement un utilisateur préalablement ajouté';
}
