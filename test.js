var usbmux = require('./');

var listener = usbmux.createListener()
  .on('attached', function(udid) {
    console.log('Device attached: %s', udid);
    createSocket(udid);
  })
  .on('detached', function(udid) {
    console.log('Device detached: %s', udid);
  })
  .on('error', function(err) {
    console.log(err);
  });


function createSocket(udid) {
  usbmux.getTunnel(10022, {udid: udid})
    .then(function(tunnel) {
      console.log('Tunnel created on %s', udid);

      tunnel.on('close', function() {
        console.log('Tunnel closed on %s', udid);
      });

      tunnel.write('hello');
    })
    .catch(function(err) {
      console.log(err);
    });
}
