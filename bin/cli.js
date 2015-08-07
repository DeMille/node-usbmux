#!/usr/bin/env node
var usbmux;

var argv = require('yargs')
  .usage('Usage: irelay <port:port> [options]')
  .demand(1)
  .option('u', {
    alias : 'udid',
    describe: 'Specify device to connect to by UDID',
    type: 'string'
  })
  .command('listen', 'Listen for attached devices')
  .option('v', {
    alias : 'verbose',
    describe: 'Output debugging info',
    count: 'verbose'
  })
  .version(function() {
    return require('../package').version;
  })
  .help('h')
    .alias('h', 'help')
  .example('irelay 22:2222', 'Pipe localhost:2222 to port 22 on device')
  .example('irelay 22:2222 1234:1234', 'Pipe multiple ports')
  .example('irelay listen', 'Show UDIDs of attached devices')
  .argv;

/**
 * Shows debugging info only for verbosity = 1
 * @param {*...} arguments
 */
function info() {
  if (argv.verbose !== 1) return;
  var args = Array.prototype.slice.call(arguments);
  if (!args[args.length-1]) args.pop(); // if last arg is undefined, remove it
  console.log.apply(console, args);
}

/**
 * Panic!
 * @param {*...} arguments
 */
function panic() {
  console.error('');
  console.error.apply(console, arguments);
  console.error('');
  process.exit();
}

/**
 * Error handler for listener and relay
 * @param  {Error} err
 */
function onErr(err) {
  // local port is in use
  if (err.code === 'EADDRINUSE') {
    panic('Local port is in use \nFailing...');
  }
  // usbmux not there
  if (err.code === 'ECONNREFUSED' || err.code === 'EADDRNOTAVAIL') {
    panic('Usbmuxd not found at', usbmux.address, '\nFailing...');
  }
  // other
  panic('%s \nFailing...', err);
}

/**
 * Listen for and report connected devices
 */
function listenForDevices() {
  console.log('Listening for connected devices... \n');

  usbmux.createListener()
    .on('error', onErr)
    .on('attached', function(udid) {
      console.log('Device found: ', udid);
    })
    .on('detached', function(udid) {
      console.log('Device removed: ', udid);
    });
}

/**
 * Parse port arg string into array of ints (ie, '22:2222' -> [22, 2222])
 * @param  {string} arg
 * @return {integer[]}
 */
function parsePorts(arg) {
  // coerce and split
  var ports = ('' + arg).split(':');
  if (ports.length !== 2) {
    panic('Error parsing ports.');
  }

  // parse ints
  var devicePort = Number((ports[0] === '') ? NaN : ports[0])
    , relayPort = Number((ports[1] === '') ? NaN : ports[1]);

  // NaN check em
  if (devicePort !== devicePort || relayPort !== relayPort) {
    panic('Error parsing ports.');
  }

  return [devicePort, relayPort];
}

/**
 * Start a new relay from a pair of given ports
 * @param  {integer[]} portPair - [devicePort, relayPort]
 */
function startRelay(portPair) {
  var devicePort = portPair[0]
    , relayPort = portPair[1];

  console.log('Starting relay from local port: %s -> device port: %s',
    relayPort, devicePort);

  new usbmux.Relay(devicePort, relayPort, {udid: argv.udid})
    .on('error', onErr)
    .on('warning', console.log.bind(console, 'Warning: device not found...'))
    .on('ready',      info.bind(this, 'Device ready: '))
    .on('attached',   info.bind(this, 'Device attached: '))
    .on('detached',   info.bind(this, 'Device detached: '))
    .on('connect',    info.bind(this, 'New connection to relay started.'))
    .on('disconnect', info.bind(this, 'Connection to relay closed.'))
    .on('close',      info.bind(this, 'Relay has closed.'));
}

// Set debugging env vars if extra verbose (needs to be set before requiring)
if (argv.verbose >= 2) process.env.DEBUG = 'usbmux:*';
usbmux = require('../lib/usbmux');

// Either listen or start relays
(argv._[0] === 'listen')
  ? listenForDevices()
  : argv._.map(parsePorts).forEach(startRelay);