// -----------------------------------------------------------------------------
// Module definition
// -----------------------------------------------------------------------------
module.exports.name = 'PollPlugin';



// -----------------------------------------------------------------------------
// Dependencies
// -----------------------------------------------------------------------------
var sprintf = require("sprintf-js").sprintf;
var logger = require('loglevel').getLogger(module.exports.name);
var loglevelMessagePrefix = require('loglevel-message-prefix');

var logHelper = require('../utils/LogHelper');


// -----------------------------------------------------------------------------
// loglevel definition
// -----------------------------------------------------------------------------
// You can change the logging level of each module individually for easier debugging
//logger.setLevel('debug');
logger.setLevel(logHelper.level);
loglevelMessagePrefix(logger, logHelper.logLevelMessagePrefix(module.exports.name));



// -----------------------------------------------------------------------------
// Wobot plugin definition
// -----------------------------------------------------------------------------
var baseCommand = '!poll'
var condition = new RegExp('^' + baseCommand + '(?=$| )(?: (\\w+))?(?: (.*))?$', 'i');

module.exports.load = function onLoadPlugin(bot) {
  // Logging
  logHelper.functionCall(logger, arguments.callee.name);
  
  // Hook event handlers
  bot.onMessage(condition, onCommandMessage);
  bot.onPrivateMessage(condition, onPrivateCommandMessage);
  bot.onMessage(onMessage);
};



// -----------------------------------------------------------------------------
// Poll class
// -----------------------------------------------------------------------------
function Poll(name, isRestaurantPoll) {
  var self = this;
  self.name = name;
  self.isRestaurantPoll = isRestaurantPoll;
  self.isOpen = true;
  self.participants = [];
  
  self.close = function close() {
    self.isOpen = false;
  }
  
  self.addParticipant = function addParticipant(participantName, mentionName) {
    // Safeguard
    var participant = self.getParticipantByName(participantName);
    if (participant !== undefined) {
      return false;
    }
    
    // Add participant to list
    self.participants.push(new Participant(participantName, mentionName));
    return true;
  }
  
  self.updateParticipantVehicle = function updateParticipantVehicle(participantName, vehicle) {
    // Safeguard
    var participant = self.getParticipantByName(participantName);
    if (participant === undefined) {
      return false;
    }
    
    // Update participant's vehicle
    participant.vehicle = vehicle;
    return true;
  }
  
  self.removeParticipant = function removeParticipant(participantName) {
    // Safeguard
    var participant = self.getParticipantByName(participantName);
    if (participant === undefined) {
      return false;
    }
    
    // Remove participant from list
    self.participants.splice(self.participants.indexOf(participant), 1);
    return true;
  }
  
  self.getParticipantByName = function getParticipantByName(name) {
    return self.participants.find(function (participant) { return participant.name === name; });
  }
  
  self.getParticipantNames = function getParticipantsName() {
    return self.participants.map(function(participant) {
      return participant.name;
    });
  }
  
  self.getParticipantMentions = function getParticipantMentions() {
    var participantsWithMentionNames = self.participants.filter(function (participant) { return participant.mentionName !== undefined; });    
    return participantsWithMentionNames.map(function(participant) {
      return participant.mentionName;
    });
  }
  
  self.getParticipantVehicles = function getParticipantVehicles() {
    var participantsWithVehicles = self.participants.filter(function (participant) { return participant.vehicle !== undefined; });    
    return participantsWithVehicles.map(function(participant) {
      return { 'name': participant.name, 'vehicle': participant.vehicle };
    });
  }
  
  self.getResults = function getResults() {
    var answer = sprintf('Résultats %s pour le sondage "%s" :', (self.isOpen) ? "temporaires" : "finaux", self.name);
    if (self.participants.length <= 0) {
      answer += "\nÀ première vue, personne... :/";
    }
    else {
      answer += sprintf('\n%d participant%s : %s', self.participants.length, (self.participants.length > 1) ? 's' : '', self.getParticipantNames().join(', '));
      
      if (self.isRestaurantPoll) {
        var vehicles = self.getParticipantVehicles();
        if (vehicles.length <= 0) {
          answer += "\nAucun véhicule... il va falloir marcher !";
        }
        else {
          var vehiclesList = vehicles.map(function({ name, vehicle }) { return sprintf('%s (%s)', name, vehicle.nbSlots) }).join(', ');
          answer += sprintf('\n%d véhicule%s : %s', vehicles.length, (vehicles.length > 1) ? 's' : '', vehiclesList);
          
          var totalSlots = vehicles.reduce(function(total, { name, vehicle }) { return total + vehicle.nbSlots }, 0);
          var missingSlots = self.participants.length - totalSlots;
          console.log(missingSlots);
          if (missingSlots > 0) {
            answer += sprintf('\nAttention : il manque %d places !', missingSlots);
          }
        }
      }
    }
    return answer;
  }
  
  self.getPersonInCharge = function getPersonInCharge() {
    var personInCharge = self.participants[Math.floor(Math.random() * self.participants.length)];
    answer = sprintf("Aujourd'hui, %s sera G.O. ; en charge de la réservation, de la répartition des véhicules, et du départ en bon ordre de tout le monde.", personInCharge.mentionName);
    answer += '\nPour ses efforts, il aura le privilège de choisir sa place à table :)';
    return answer;
  }
}



// -----------------------------------------------------------------------------
// Participant class
// -----------------------------------------------------------------------------
function Participant(name, mentionName, vehicle) {
  var self = this;
  self.name = name;
  self.mentionName = mentionName;
  self.vehicle = vehicle;
}

Participant.prototype.equal = function (other) {
  return this.name === other.name;
}



// -----------------------------------------------------------------------------
// Vehicle class
// -----------------------------------------------------------------------------
function Vehicle(nbSlots) {
  var self = this;
  self.nbSlots = nbSlots;
}



// -----------------------------------------------------------------------------
// Command class
// -----------------------------------------------------------------------------
function Command(name, handler, usage, description) {
  var self = this;
  self.name = name;
  self.handler = handler;
  self.usage = sprintf('%s %s', baseCommand, usage);
  self.description = description;
}



// -----------------------------------------------------------------------------
// Commands
// -----------------------------------------------------------------------------
// Dispatcher
var dispatch = function dispatch(commandName, roomJid, sender, params, availableCommands) {
  // Logging
  logHelper.functionCallDebug(logger, arguments.callee.name, {'commandName': commandName, 'roomJid': roomJid, 'sender': sender, 'params': params});
  
  // Dispatch command to its handler
  var command = availableCommands.find(function (command) { return command.name === commandName; })
  if (command !== undefined) {
    command.handler.call(this, roomJid, sender, params);
  }
  else {
    unknown.call(this, roomJid, sender, params);
  }
}

// Command handlers
// All command handlers must conform to the dispatcher definition
var unknown = function unknown(roomJid, sender, params) {
  // Logging
  logHelper.functionCallDebug(logger, arguments.callee.name, {'roomJid': roomJid, 'sender': sender, 'params': params});
  
  // Display standard "unknown command" string
  this.message(roomJid, sprintf('Commande inconnue ! Pour voir la liste des commandes disponibles : %s', helpCommand.usage));
}

var malformedCommand = function malformedCommand(roomJid, sender, params) {
  // Logging
  logHelper.functionCallDebug(logger, arguments.callee.name, {'roomJid': roomJid, 'sender': sender, 'params': params});
  
  // Display standard "malformed parameters" string
  this.message(roomJid, sprintf('Paramètres illégaux ou manquants pour cette commande ! Pour voir la syntaxe des commandes disponibles : %s', helpCommand.usage));
}

var help = function help(roomJid, sender, params) {
  // Logging
  logHelper.functionCallDebug(logger, arguments.callee.name, {'roomJid': roomJid, 'sender': sender, 'params': params});
  
  // If asking for help with a specific command, deliver it
  var answer = '';
  if (params !== undefined) {
    var command = publicCommands.find(function (command) { return command.name === params; })
    if (command !== undefined) {
      answer += sprintf('%s : %s', command.usage, command.description);
    }
    else {
      unknown.call(this, roomJid, sender, params);
    }
  }
  
  // Else display command list
  else {
    answer = 'Liste des commandes disponibles dans les salons publics :';
    publicCommands.forEach(function(command) {
      answer += sprintf('\n  %s : %s', command.usage, command.description);
    });
  }
  
  this.message(sender.jid, answer);
}

var question = function question(roomJid, sender, params) {
  // Logging
  logHelper.functionCallDebug(logger, arguments.callee.name, {'roomJid': roomJid, 'sender': sender, 'params': params});
  
  // Safeguards
  if (hasPollRunning(roomJid)) {
    this.message(roomJid, "Un sondage est déjà en cours ici ! Il faut le terminer avant d'en lancer un nouveau...");
    return;
  }
  
  if (params === undefined) {
    malformedCommand.call(this, roomJid, sender, params);
    return;
  }
  
  // Start poll
  startPoll.call(this, roomJid, params, false);
}

var restaurant = function restaurant(roomJid, sender, params) {
  // Logging
  logHelper.functionCallDebug(logger, arguments.callee.name, {'roomJid': roomJid, 'sender': sender, 'params': params});
  
  // Safeguards
  if (hasPollRunning(roomJid)) {
    this.message(roomJid, "Un sondage est déjà en cours ici ! Il faut le terminer avant d'en lancer un nouveau...");
    return;
  }
  
  if (params === undefined) {
    params = 'Qui pour un Via Roma ce midi ?';
  }
  
  // Start poll
  startPoll.call(this, roomJid, params, true);
}

function startPoll(roomJid, name, isRestaurantPoll) {
  var poll = new Poll(name, isRestaurantPoll);
  
  // Clear existing closed poll, if there is one
  if (hasPoll(roomJid)) {
    delete polls[roomJid];
  }
  
  polls[roomJid] = poll;
  logger.info('Starting a new poll', '"' + poll.name + '"', 'in room', roomJid);
  var answer = sprintf('Nouveau sondage : "%s"', name);
  var vehiclePrompt = ' Si vous avez une voiture précisez "voiture X places", et si vous allez en vélo précisez "vélo."';
  answer += sprintf(`\nRépondez par "oui" pour participer.%s Si vous changez d'avis, utilisez "annulation" pour vous retirer du sondage.`, (isRestaurantPoll) ? vehiclePrompt : '' );
  this.message(roomJid, answer);
}

var close = function close(roomJid, sender, params) {
  // Logging
  logHelper.functionCallDebug(logger, arguments.callee.name, {'roomJid': roomJid, 'sender': sender, 'params': params});
  
  // Safeguard
  if (!hasPollRunning(roomJid)) {
    var answer = 'Aucun sondage en cours. Il faut en lancer un avant...! :)'
    if (hasPoll) { answer += sprintf('\nPour les résultats du dernier sondage, utiliser la commande : %s', resultsCommand.usage); }
    
    this.message(roomJid, answer);
    return;
  }
  
  // Close poll and display final list of participants
  var poll = polls[roomJid];
  logger.info('Closing poll', '"' + poll.name + '"', 'in room', roomJid);
  poll.close();
  this.message(roomJid, poll.getResults());
  
  if (poll.isRestaurantPoll) {
    this.message(roomJid, poll.getPersonInCharge());
  }
}

var results = function results(roomJid, sender, params) {
  // Logging
  logHelper.functionCallDebug(logger, arguments.callee.name, {'roomJid': roomJid, 'sender': sender, 'params': params});
  
  // Safeguard
  if (!hasPoll(roomJid)) {
    this.message(roomJid, 'Aucun sondage en cours. Il faut en lancer un avant...! :)');
    return;
  }
  
  // Display current list of participants
  var poll = polls[roomJid];
  logger.info('Displaying list of participants to poll', '"' + poll.name + '"', 'in room', roomJid);
  this.message(roomJid, poll.getResults());
}

var ping = function ping(roomJid, sender, params) {
  // Logging
  logHelper.functionCallDebug(logger, arguments.callee.name, {'roomJid': roomJid, 'sender': sender, 'params': params});
  
  // Safeguard
  if (!hasPoll(roomJid)) {
    this.message(roomJid, 'Aucun sondage disponible. Il faut en créer un avant...! :)');
    return;
  }
  
  // Ping current list of participants
  var poll = polls[roomJid];
  logger.info('Ping current list of participants to poll', '"' + poll.name + '"', 'in room', roomJid);  
  this.message(roomJid, 'Ping ' + poll.getParticipantMentions().join(' '));
}

var add = function add(roomJid, sender, params) {
  // Logging
  logHelper.functionCallDebug(logger, arguments.callee.name, {'roomJid': roomJid, 'sender': sender, 'params': params});
  
  // Safeguards
  if (!hasPollRunning(roomJid)) {
    this.message(roomJid, 'Aucun sondage en cours. Il faut en lancer un avant...! :)');
    return;
  }
  
  if (params === undefined) {
    malformedCommand.call(this, roomJid, sender, params);
    return;
  }
  
  // Add user to participants
  var poll = polls[roomJid];
  var participantName = params;
  logger.info('Manually adding', participantName, 'to participants in room', roomJid);
  
  // Try to get user info, if possible
  var participant = this.getUserByName(participantName)
  if (participant === undefined) {
    participant = { 'name': participantName, 'mention_name': undefined }
  }
  
  if (poll.addParticipant(participant.name, participant.mention_name)) {
    this.message(roomJid, sprintf('"%s" a été ajouté à la liste des participants.', participantName));
  }
  else {
    this.message(roomJid, sprintf('"%s" participe déjà !', participantName));
  }
}

var remove = function remove(roomJid, sender, params) {
  // Logging
  logHelper.functionCallDebug(logger, arguments.callee.name, {'roomJid': roomJid, 'sender': sender, 'params': params});
  
  // Safeguards
  if (!hasPollRunning(roomJid)) {
    this.message(roomJid, 'Aucun sondage en cours. Il faut en lancer un avant...! :)');
    return;
  }
  
  if (params === undefined) {
    malformedCommand.call(this, roomJid, sender, params);
    return;
  }
  
  // Remove user from participants
  var poll = polls[roomJid];
  var participantName = params;
  logger.info('Manually removing', participantName, 'from participants in room', roomJid);
  
  if (poll.removeParticipant(participantName)) {
    this.message(roomJid, sprintf('"%s" a été retiré de la liste des participants.', participantName));
  }
  else {
    this.message(roomJid, sprintf('"%s" ne correspond à aucun participant existant.', participantName));
  }
}

// List of available commands, associated to their handlers
var helpCommand = new Command('help', help, 'help', `Affiche la liste des commandes disponibles.`);
var questionCommand = new Command('question', question, 'question <question>', `Démarre un nouveau sondage de type "Question".`);
var restaurantCommand = new Command('restaurant', restaurant, 'restaurant <question>', `Démarre un nouveau sondage de type "Restaurant" (si non précisé, par défaut c'est Via Roma).`);
var closeCommand = new Command('close', close, 'close', `Clôt le sondage, affiche les résultats, et désigne un responsable (dans le cas d'un sondage de type "Restaurant".`);
var resultsCommand = new Command('results', results, 'results', `Affiche les résultats du sondage (en cours ou dernier sondage).`);
var pingCommand = new Command('ping', ping, 'ping', `Notifie tous les participants du sondage (en cours ou dernier sondage).`);
var addCommand = new Command('add', add, 'add <Bidule Truc>', sprintf(`Ajoute manuellement "Bidule Truc" à la liste des partipants du sondage en cours. Si c'est un utilisateur HipChat, il sera notifié lors des "%s" et peut modifier son enregistrement/véhicule sans avoir à se ré-enregistrer.`, pingCommand.usage));
var removeCommand = new Command('remove', remove, 'remove <Bidule Truc>', `Supprime manuellement "Bidule Truc" de la liste des participants du sondage en cours. Au besoin, vous pouvez également l'utiliser pour annuler la réservation d'un collègue qui s'est enregistré mais n'a plus accès à HipChat (réunion, etc.).`);

// Public commands: available in public rooms
var publicCommands = [
  helpCommand,
  questionCommand,
  restaurantCommand,
  closeCommand,
  resultsCommand,
  pingCommand,
  addCommand,
  removeCommand,
]

// Private commands: available in private chats
var privateCommands = [
  helpCommand,
]



// -----------------------------------------------------------------------------
// Global variables
// -----------------------------------------------------------------------------
var polls = {};
var acceptConditions = new RegExp('^(yes|oui|yep|ouep|moi|ja)');
var bikeConditions = new RegExp('bike|v[eé]lo');
var carConditions = new RegExp('voiture ?([1-9]\\d*) ?places?');
var cancelConditions = new RegExp('^(cancel|annulation)');



// -----------------------------------------------------------------------------
// Event handlers
// -----------------------------------------------------------------------------
var onCommandMessage = function onCommandMessage(roomJid, senderName, message, matches) {
  // Logging
  logHelper.functionCallDebug(logger, arguments.callee.name, {'roomJid': roomJid, 'senderName': senderName, 'message': message, 'matches': matches}, {'matches': matches});

  // Dispatch command to its handler
  var [command, params] = [matches[1], matches[2]];
  dispatch.call(this, command, roomJid, this.getUserByName(senderName), params, publicCommands);
};

var onPrivateCommandMessage = function onPrivateCommandMessage(senderJid, message, matches) {
  // Logging
  logHelper.functionCallDebug(logger, arguments.callee.name, {'senderJid': senderJid, 'message': message, 'matches': matches}, {'matches': matches});
  
  // Dispatch command to its handler
  var [command, params] = [matches[1], matches[2]];
  dispatch.call(this, command, senderJid, this.getUserByJid(senderJid), params, privateCommands);
};

var onMessage = function onMessage(roomJid, senderName, message) {
  // Logging
  logHelper.functionCallDebug(logger, arguments.callee.name, {'roomJid': roomJid, 'senderName': senderName, 'message': message});
  
  // Safeguard
  if (!hasPollRunning(roomJid)) {
    return;
  }
  
  // Register a new participant
  var poll = polls[roomJid];
  var participant = this.getUserByName(senderName);
  
  if (acceptConditions.test(message)) {
    if (poll.addParticipant(participant.name, participant.mention_name)) {
      logger.info('Adding', participant.name, 'to participants in room', roomJid);
    }
    else {
      logger.info(participant.name, 'was already registered in room', roomJid);
    }
  }
  
  // Cancellation of a previously registered participant
  else if (cancelConditions.test(message)) {
    if (poll.removeParticipant(participant.name)) {
      logger.info('Cancelling', participant.name, 'participation in room', roomJid);
      this.message(roomJid, sprintf('%s a été retiré de la liste des participants.', participant.name));
    }
  }
  
  // Update vehicle status if user was registered
  var vehicle = undefined;
  if (bikeConditions.test(message)) {
    vehicle = new Vehicle(1);
  }
  if (carConditions.test(message)) {
    var nbSlots = message.match(carConditions)[1];
    vehicle = new Vehicle(nbSlots);
  }
  if (vehicle !== undefined) {
    if (poll.updateParticipantVehicle(participant.name, vehicle)) {
      logger.info('Updating', participant.name, "'s vehicle in room", roomJid);
    }
  }
  
};

// -----------------------------------------------------------------------------
// Utils
// -----------------------------------------------------------------------------
function hasPoll(roomJid) {
  return polls[roomJid] !== undefined;
}

function hasPollRunning(roomJid) {
  return hasPoll(roomJid) && polls[roomJid].isOpen;
}

function startsWith(message, conditions) {
  var match = false;
  message = message.toLowerCase();
  
  conditions.forEach(function (condition) {
    if (message.startsWith(condition)) { match = true; }
  });
  
  return match;
}