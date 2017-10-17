// -----------------------------------------------------------------------------
// Module definition
// -----------------------------------------------------------------------------
module.exports.name = 'PollPlugin';



// -----------------------------------------------------------------------------
// Dependencies
// -----------------------------------------------------------------------------
const logger = require('loglevel').getLogger(module.exports.name);
const loglevelMessagePrefix = require('loglevel-message-prefix');

const logHelper = require('../utils/LogHelper');


// -----------------------------------------------------------------------------
// loglevel setup
// -----------------------------------------------------------------------------
// You can change the logging level of each module individually for easier debugging
//logger.setLevel('debug');
logger.setLevel(logHelper.level);
loglevelMessagePrefix(logger, logHelper.logLevelMessagePrefix(module.exports.name));



// -----------------------------------------------------------------------------
// Wobot plugin definition
// -----------------------------------------------------------------------------
const baseCommand = '!poll'
const condition = new RegExp(`^${baseCommand}(?=$| )(?: (\\w+))?(?: (.*))?$`, 'i');

module.exports.load = function load(bot) {
  // Logging
  logHelper.functionCall(logger, arguments.callee.name);
  
  // Hook event handlers
  bot.onMessage(condition, onCommandMessage);
  bot.onPrivateMessage(condition, onPrivateCommandMessage);
  bot.onMessage(onMessage);
}



// -----------------------------------------------------------------------------
// Poll class
// -----------------------------------------------------------------------------
class Poll {
  constructor(name, isRestaurantPoll) {
    this.name = name;
    this.isRestaurantPoll = isRestaurantPoll;
    this.isOpen = true;
    this.participants = [];
  }
  
  close() {
    this.isOpen = false;
  }
  
  addParticipant(participantName, mentionName) {
    // Safeguard
    let participant = this.getParticipant({name: participantName });
    if (participant !== undefined) {
      return false;
    }
    
    // Add participant to list
    this.participants.push(new Participant(participantName, mentionName));
    return true;
  }
  
  updateParticipantVehicle(participantName, vehicle) {
    // Safeguard
    let participant = this.getParticipant({name: participantName });
    if (participant === undefined) {
      return false;
    }
    
    // Update participant's vehicle
    participant.vehicle = vehicle;
    return true;
  }
  
  removeParticipant(participantOrMentionName) {
    // Safeguard
    let participant = this.getParticipant({ name: participantOrMentionName, mentionName: participantOrMentionName });
    if (participant === undefined) {
      return false;
    }
    
    // Remove participant from list and return participant
    this.participants.splice(this.participants.indexOf(participant), 1);
    return participant;
  }
  
  getParticipant( { name, mentionName } = {} ) {
    // Safeguard
    if (name === undefined && mentionName === undefined) {
      logger.error(`Invalid parameters provided to ${arguments.callee.name}()`);
      return;
    }
    
    return this.participants.find(participant => (name !== undefined && participant.name === name) || (mentionName !== undefined && participant.mentionName === mentionName));
  }
  
  getParticipantNames() {
    return this.participants.map(participant => participant.name);
  }
  
  getParticipantMentions() {
    let participantsWithMentionNames = this.participants.filter(participant => participant.mentionName !== undefined);
    return participantsWithMentionNames.map(participant => participant.mentionName);
  }
  
  getParticipantVehicles() {
    let participantsWithVehicles = this.participants.filter(participant => participant.vehicle !== undefined);
    return participantsWithVehicles.map(participant => ({ 'name': participant.name, 'vehicle': participant.vehicle }));
  }
  
  getResults() {
    let answer = `Résultats ${(this.isOpen) ? "temporaires" : "finaux"} pour le sondage "${this.name}" :`;
    if (this.participants.length <= 0) {
      answer += "\nÀ première vue, personne... :/";
    }
    else {
      answer += `\n${this.participants.length} participant${(this.participants.length > 1) ? 's' : ''} : ${this.getParticipantNames().join(', ')}`;
      
      if (this.isRestaurantPoll) {
        let vehicles = this.getParticipantVehicles();
        if (vehicles.length <= 0) {
          answer += "\nAucun véhicule... il va falloir marcher !";
        }
        else {
          let vehiclesList = vehicles.map(({ name, vehicle }) => `${name} (${vehicle.nbSlots})`).join(', ');
          answer += `\n${vehicles.length} véhicule${(vehicles.length > 1) ? 's' : ''} : ${vehiclesList}`;
          
          let totalSlots = vehicles.reduce((total, { name, vehicle }) => total + vehicle.nbSlots, 0);
          let missingSlots = this.participants.length - totalSlots;
          if (missingSlots > 0) {
            answer += `\nAttention : il manque ${missingSlots} place${(missingSlots > 1) ? 's' : ''} !`;
          }
        }
      }
    }
    return answer;
  }
  
  getPersonInCharge() {
    let answer = '';
    let participantsWithMentionNames = this.participants.filter(participant => participant.mentionName !== undefined);
    
    if (participantsWithMentionNames.length <= 0) {
      answer += "Il semble qu'aucun des participants ne soit un utilisateur HipChat (ajouts manuels...?). Il faudra donc désigner un G.O. vous-mêmes...!";
    }
    else {
      let personInCharge = participantsWithMentionNames[Math.floor(Math.random() * participantsWithMentionNames.length)];
      answer += `Aujourd'hui, ${personInCharge.mentionName} sera G.O. ; en charge de la réservation, de la répartition des véhicules, et du départ en bon ordre de tout le monde.`;
      answer += '\nPour ses efforts, le G.O. aura le privilège de choisir sa place à table :)';
    }
    
    return answer;
  }
}



// -----------------------------------------------------------------------------
// Participant class
// -----------------------------------------------------------------------------
class Participant {
  constructor(name, mentionName, vehicle) {
    this.name = name;
    this.mentionName = mentionName;
    this.vehicle = vehicle;
  }
  
  equal(other) {
    return this.name === other.name;
  }
}



// -----------------------------------------------------------------------------
// Vehicle class
// -----------------------------------------------------------------------------
class Vehicle {
  constructor(nbSlots) {
    this.nbSlots = nbSlots;
  }
}



// -----------------------------------------------------------------------------
// Command class
// -----------------------------------------------------------------------------
class Command {
  constructor(name, handler, usage, description) {
    this.name = name;
    this.handler = handler;
    this.usage = `${baseCommand} ${usage}`;
    this.description = description;
  }
}



// -----------------------------------------------------------------------------
// Commands
// -----------------------------------------------------------------------------
// Dispatcher
const dispatch = function(commandName, roomJid, sender, params, availableCommands) {
  // Logging
  logHelper.functionCallDebug(logger, arguments.callee.name, {'commandName': commandName, 'roomJid': roomJid, 'sender': sender, 'params': params});
  
  // Sanitize params
  if (params !== undefined) {
    params = params.trim();
    if (params.length === 0) { params = undefined };
  }
  
  // Dispatch command to its handler
  let command = availableCommands.find(command => command.name === commandName);
  if (command !== undefined) {
    command.handler.call(this, roomJid, sender, params);
  }
  else {
    unknown.call(this, roomJid, sender, params);
  }
}

// Command handlers
// All command handlers must conform to the dispatcher definition
const unknown = function(roomJid, sender, params) {
  // Logging
  logHelper.functionCallDebug(logger, arguments.callee.name, {'roomJid': roomJid, 'sender': sender, 'params': params});
  
  // Display standard "unknown command" string
  this.message(roomJid, `Commande inconnue ! Pour voir la liste des commandes disponibles : ${helpCommand.usage}`);
}

const malformedCommand = function(roomJid, sender, params) {
  // Logging
  logHelper.functionCallDebug(logger, arguments.callee.name, {'roomJid': roomJid, 'sender': sender, 'params': params});
  
  // Display standard "malformed parameters" string
  this.message(roomJid, `Paramètres illégaux ou manquants pour cette commande ! Pour voir la syntaxe des commandes disponibles : ${helpCommand.usage}`);
}

const help = function(roomJid, sender, params) {
  // Logging
  logHelper.functionCallDebug(logger, arguments.callee.name, {'roomJid': roomJid, 'sender': sender, 'params': params});
  
  // If asking for help with a specific command, deliver it
  let answer = '';
  if (params !== undefined) {
    let command = publicCommands.find(command => command.name === params);
    if (command !== undefined) {
      answer += `${command.usage} : ${command.description}`;
    }
    else {
      unknown.call(this, roomJid, sender, params);
    }
  }
  
  // Else display command list
  else {
    answer = 'Liste des commandes disponibles dans les salons publics :';
    for (const command of publicCommands) {
      answer += `\n  ${command.usage} : ${command.description}`;
    }
  }
  
  this.message(sender.jid, answer);
}

const question = function(roomJid, sender, params) {
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

const restaurant = function(roomJid, sender, params) {
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
  let poll = new Poll(name, isRestaurantPoll);
  
  // Clear existing closed poll, if there is one
  if (hasPoll(roomJid)) {
    delete polls[roomJid];
  }
  
  polls[roomJid] = poll;
  logger.info(`Starting a new poll "${poll.name}" in room`, roomJid);
  let answer = `Nouveau sondage : "${name}"`;
  let vehiclePrompt = ' Si vous avez une voiture précisez "voiture X places", et si vous allez en vélo précisez "vélo".';
  answer += `\nRépondez par "oui" pour participer.${(isRestaurantPoll) ? vehiclePrompt : ''} Si vous changez d'avis, utilisez "annulation" pour vous retirer du sondage.`;
  this.message(roomJid, answer);
}

const close = function(roomJid, sender, params) {
  // Logging
  logHelper.functionCallDebug(logger, arguments.callee.name, {'roomJid': roomJid, 'sender': sender, 'params': params});
  
  // Safeguard
  if (!hasPollRunning(roomJid)) {
    let answer = 'Aucun sondage en cours. Il faut en lancer un avant...! :)'
    if (hasPoll) { answer += `\nPour les résultats du dernier sondage, utiliser la commande : ${resultsCommand.usage}`; }
    
    this.message(roomJid, answer);
    return;
  }
  
  // Close poll and display final list of participants
  let poll = polls[roomJid];
  logger.info(`Closing poll "${poll.name}" in room`, roomJid);
  poll.close();
  this.message(roomJid, poll.getResults());
  
  if (poll.isRestaurantPoll && poll.participants.length >= 0) {
    this.message(roomJid, poll.getPersonInCharge());
  }
}

const results = function(roomJid, sender, params) {
  // Logging
  logHelper.functionCallDebug(logger, arguments.callee.name, {'roomJid': roomJid, 'sender': sender, 'params': params});
  
  // Safeguard
  if (!hasPoll(roomJid)) {
    this.message(roomJid, 'Aucun sondage en cours. Il faut en lancer un avant...! :)');
    return;
  }
  
  // Display current list of participants
  let poll = polls[roomJid];
  logger.info(`Displaying list of participants to poll "${poll.name}" in room`, roomJid);
  this.message(roomJid, poll.getResults());
}

const ping = function(roomJid, sender, params) {
  // Logging
  logHelper.functionCallDebug(logger, arguments.callee.name, {'roomJid': roomJid, 'sender': sender, 'params': params});
  
  // Safeguard
  if (!hasPoll(roomJid)) {
    this.message(roomJid, 'Aucun sondage disponible. Il faut en créer un avant...! :)');
    return;
  }
  
  // Ping current list of participants
  let poll = polls[roomJid];
  logger.info(`Ping current list of participants to poll "${poll.name}" in room`, roomJid);
  this.message(roomJid, `Ping ${poll.getParticipantMentions().join(' ')}`);
}

const add = function(roomJid, sender, params) {
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
  let poll = polls[roomJid];
  let participantOrMentionName = params;
  logger.info('Manually adding', participantOrMentionName, 'to participants in room', roomJid);
  
  // Try to match participantOrMentionName with an existing HipChat user.
  let participant = this.getUser({ name: participantOrMentionName, mentionName: participantOrMentionName }, false);
  
  // If we couldn't get a match, add given name 'as is'
  if (participant === undefined) {
    participant = { 'name': participantOrMentionName };
  }
  
  // Helper variable for pretty printing
  let participantPrintedName = participant.mentionName !== undefined ? participant.mentionName : participant.name;
  
  if (poll.addParticipant(participant.name, participant.mentionName)) {
    // If we got a match, user will be pinged via his mentionName
    this.message(roomJid, `${participantPrintedName} a été ajouté à la liste des participants.`);
  }
  else {
    this.message(roomJid, `${participantPrintedName} participe déjà !`);
  }
}

const remove = function(roomJid, sender, params) {
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
  let poll = polls[roomJid];
  let participantOrMentionName = params;
  logger.info('Manually removing', participantOrMentionName, 'from participants in room', roomJid);
  
  participant = poll.removeParticipant(participantOrMentionName);
  if (participant !== false) {
    // If participant was a HipChat user, he will be pinged via his mentionName
    this.message(roomJid, `${participant.mentionName !== undefined ? participant.mentionName : participant.name} a été retiré de la liste des participants.`);
  }
  else {
    this.message(roomJid, `"${participantOrMentionName}" ne correspond à aucun participant existant.`);
  }
}

// List of available commands, associated to their handlers
const helpCommand = new Command('help', help, 'help', `Affiche la liste des commandes disponibles.`);
const questionCommand = new Command('question', question, 'question <question>', `Démarre un nouveau sondage de type "Question".`);
const restaurantCommand = new Command('restaurant', restaurant, 'restaurant <question>', `Démarre un nouveau sondage de type "Restaurant" (si non précisé, par défaut c'est Via Roma).`);
const closeCommand = new Command('close', close, 'close', `Clôt le sondage, affiche les résultats, et désigne un responsable (dans le cas d'un sondage de type "Restaurant".`);
const resultsCommand = new Command('results', results, 'results', `Affiche les résultats du sondage (en cours ou dernier sondage).`);
const pingCommand = new Command('ping', ping, 'ping', `Notifie tous les participants du sondage (en cours ou dernier sondage).`);
const addCommand = new Command('add', add, 'add <Bidule Truc>', `Ajoute manuellement "Bidule Truc" à la liste des partipants du sondage en cours. Si c'est un utilisateur HipChat, il sera notifié lors des "${pingCommand.usage}" et peut modifier son enregistrement/véhicule sans avoir à se ré-enregistrer.`);
const removeCommand = new Command('remove', remove, 'remove <Bidule Truc>', `Supprime manuellement "Bidule Truc" de la liste des participants du sondage en cours. Au besoin, vous pouvez également l'utiliser pour annuler la réservation d'un collègue qui s'est enregistré mais n'a plus accès à HipChat (réunion, etc.).`);

// Public commands: available in public rooms
const publicCommands = [
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
const privateCommands = [
  helpCommand,
]



// -----------------------------------------------------------------------------
// Global variables
// -----------------------------------------------------------------------------
const polls = {};
const acceptConditions = new RegExp('^(yes|oui|yep|ouep|moi|ja)', 'i');
const bikeConditions = new RegExp('bike|v[eé]lo', 'i');
const carConditions = new RegExp('voiture ?([1-9]\\d*) ?places?', 'i');
const cancelConditions = new RegExp('^(cancel|annulation)', 'i');



// -----------------------------------------------------------------------------
// Event handlers
// -----------------------------------------------------------------------------
const onCommandMessage = function(roomJid, senderName, message, matches) {
  // Logging
  logHelper.functionCallDebug(logger, arguments.callee.name, {'roomJid': roomJid, 'senderName': senderName, 'message': message, 'matches': matches}, {'matches': matches});

  // Dispatch command to its handler
  let [command, params] = [matches[1], matches[2]];
  dispatch.call(this, command, roomJid, this.getUser({ name: senderName }), params, publicCommands);
};

const onPrivateCommandMessage = function(senderJid, message, matches) {
  // Logging
  logHelper.functionCallDebug(logger, arguments.callee.name, {'senderJid': senderJid, 'message': message, 'matches': matches}, {'matches': matches});
  
  // Dispatch command to its handler
  let [command, params] = [matches[1], matches[2]];
  dispatch.call(this, command, senderJid, this.getUser({ jid: senderJid }), params, privateCommands);
};

const onMessage = function(roomJid, senderName, message) {
  // Logging
  logHelper.functionCallDebug(logger, arguments.callee.name, {'roomJid': roomJid, 'senderName': senderName, 'message': message});
  
  // Safeguard
  if (!hasPollRunning(roomJid)) {
    return;
  }
  
  // Register a new participant
  let poll = polls[roomJid];
  let participant = this.getUser({ name: senderName });
  
  if (acceptConditions.test(message)) {
    if (poll.addParticipant(participant.name, participant.mentionName)) {
      logger.info('Adding', participant.name, 'to participants in room', roomJid);
      this.message(participant.jid, `Vous avez été ajouté à la liste des participants pour le sondage "${poll.name}" !`);
    }
  }
  
  // Cancellation of a previously registered participant
  else if (cancelConditions.test(message)) {
    if (poll.removeParticipant(participant.name)) {
      logger.info('Cancelling', participant.name, 'participation in room', roomJid);
      this.message(participant.jid, `Vous avez été retiré de la liste des participants pour le sondage "${poll.name}" !`);
    }
  }
  
  // If poll is of type "Restaurant", check for vehicles
  if (poll.isRestaurantPoll) {
    let vehicle = undefined;
    if (bikeConditions.test(message)) {
      vehicle = new Vehicle(1);
    }
    if (carConditions.test(message)) {
      let nbSlots = message.match(carConditions)[1];
      vehicle = new Vehicle(nbSlots);
    }
    
    // Update vehicle status if user was registered
    if (vehicle !== undefined) {
      if (poll.updateParticipantVehicle(participant.name, vehicle)) {
        logger.info('Updating', participant.name, "'s vehicle in room", roomJid);
        this.message(participant.jid, `Votre véhicule (${vehicle.nbSlots} places) a bien été enregistré :)`);
      }
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