# node-usbmux

Node-usbmux is an iOS usbmuxd client library inspired by [tcprelay.py](https://github.com/rcg4u/iphonessh)


## What is usbmuxd?

All USB communication with iOS devices (including communication from iTunes) is handled by the usbmux daemon. When a device is plugged in, usbmuxd connects to it and acts as a middleman for communicating with the device, multiplexing TCP like connections to sockets on the device. (USB multiplexer = usbmux)


## What does node-usbmux do?

Node-usbmux provides tcp connections to sockets on iOS devices via USB.

Installed globally, node-usbmux's CLI lets you create TCP relays that tunnel traffic from localhost through USB to the device. (useful for accessing ssh or veency over usb)

The obvious advantages of a USB connection over a wifi connection are speed, not having to be on the same network, device doesn't need to be unlocked to maintain connection, etc.


## Install

```
npm install [-g] usbmux
```

Prerequisites: iTunes or [libimobiledevice](http://www.libimobiledevice.org/)


## CLI Usage

Node-usbmux adds the `irelay` command:

```sh
# Relay localhost:2222 to port 22 on device through USB
# (so you can ssh root@localhost -p 2222)
irelay 22:2222

# Relay multiple port pairs, extra verbose mode
irelay 22:2222 1234:1234 -vv

# Specify a device with -u, --udid option
irelay 22:2222 1234:1234 --udid=12345abcde12345abcde12345abcde12345abcde

# Show UDIDs of attached devices
irelay listen

# More info
irelay --help
```


## Module Usage

```javascript
var usbmux = require('usbmux');

// usbmux.Relay()
// usbmux.createListener()
// usbmux.getTunnel()
// usbmux.devices

```

### new usbmux.Relay(devicePort, relayPort[, options])
Create a tcp relay that pipes a local port to an attached iOS device port.

- devicePort {integer} - Destination port on device
- relayPort {integer} - Local port to start tcp server on
- options {object}
  - options.timeout - Search time (in ms) before emitting warning
  - options.udid - UDID of specific device to connect to

```javascript
// Ex:
var relay = new usbmux.Relay(22, 2222)
  .on('error', function(err) {})
  .on('ready', function(udid) {
    // A USB device is connected and ready to be relayed to
  })
  ...

// you can stop the relay when done
relay.stop();
```

##### EVENTS:

**error** - _err {Error}_ <br/>
Fires when there is an error:
- with the relay's TCP server (like EADDRINUSE), or
- from usbmuxd

**warning** - _err {Error}_ <br/>
When a relay starts it will check for connected devices. If there isn't a device ready within the time limit (default 1s), the relay will issue a warning (but will continue to search for and use connected devices).

**ready** - _UDID {string}_ <br/>
Fires when a connected device is first detected by the relay

**attached** - _UDID {string}_ <br/>
Fires when a USB device is attached (or first detected)

**detached** - _UDID {string}_ <br/>
Fires when a USB device is detached

**connect** <br/>
Fires when a new connection is made to the relay's TCP server

**disconnect** <br/>
Fires when a connection to the relay's TCP server is ended

**close** <br/>
Fires when the relay's TCP server is closes (the net.Server event)


### usbmux.createListener()
Connects to usbmuxd and listens for iOS devices <br/>
Returns a normal net.Socket connection with two added events:

```javascript
// Ex:
var listener = new usbmux.createListener()
  .on('error', function(err) {})
  .on('attached', function(udid) {})
  .on('detached', function(udid) {});

// listener is just a net.Socket connection to usbmuxd
assert(listener instanceof net.Socket);
listener.end();
```

##### EVENTS:

**attached** - _UDID {string}_ <br/>
Fires when a USB device is attached (or first detected)

**detached** - _UDID {string}_ <br/>
Fires when a USB device is detached


### usbmux.getTunnel(devicePort[, options])
Get a tunneled connection to port on device within a timeout period <br/>
Returns a promise that resolves a net.Socket connection to the requested port

- devicePort {integer} - Destination port on device
- options {object}
  - options.timeout - Search time (in ms) before failing with error
  - options.udid - UDID of specific device to connect to

```javascript
// Ex:
usbmux.getTunnel(1234)
  .then(function(tunnel) {
    // tunnel is just a net.Socket connection to the device port
    // you can write / .on('data') it like normal
    assert(tunnel instanceof net.Socket);
    tunnel.write('hello');
  })
  .catch(function(err) {
    console.err(err);
    // "Tunnel failed, Err #3: Port isn't available or open"
  });
```


### usbmux.devices
Currently connected USB devices, keyed by UDIDs

```javascript
// Ex:
listener.on('attached', function(udid) {
  console.log(usbmux.devices[udid]);
});

// {
//   ConnectionType: 'USB',
//   DeviceID: 19,
//   LocationID: 0,
//   ProductID: 4776,
//   SerialNumber: '22226dd59aaac687f555f8521f8ffddac32d394b'
// }
```


## Tests

```
npm test
```

Some of the tests require an attached device since that was easier than implementing an entire mock usbmuxd. These tests connect to device port 22 by default, but you can set a different port with the env var `TESTPORT`.


## How does usbmuxd work?

Usbmuxd operates over TCP and accepts two different requests: `listen` and `connect`.

A `listen` request asks usbmuxd to turn the current tcp connection into a dedicated notification pipe, sending notifications about devices as they are attached and detached.

A `connect` request asks usbmuxd to turn the current tcp connection into a tunneled connection to a port on the device. Connect requests need a DeviceID, which you get from the listener notifications.

Each request must be sent in a new tcp connection, i.e. you can't send a listen request and a connect request in the same connection. Because of this, you'll always need at least two connections open, one listening for device status and one actually connecting to devices.


## Usbmuxd protocol

Usbmux messages are composed of a header and a payload plist.

There used to be a [binary](https://www.theiphonewiki.com/wiki/Usbmux) version of the protocol, but it isn't used anymore. There is no documentation for usbmuxd, so this understanding is borrowed from looking at the implementation in [tcprelay.py](https://github.com/rcg4u/iphonessh).

##### Header:

Four 32-bit unsigned LE integers (in order):
<br/> _Length:_ length of the header + plist (16 + plist.length)
<br/> _Version:_ 0 for binary version, 1 for plist version
<br/> _Request:_ always 8 (taken from tcprelay.py)
<br/> _Tag:_ always 1 (taken from tcprelay.py)

##### Listen:

```plist
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>MessageType</key>
    <string>Listen</string>
    <key>ClientVersionString</key>
    <string>node-usbmux</string>
    <key>ProgName</key>
    <string>node-usbmux</string>
  </dict>
</plist>
```

##### Connect:

```plist
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>MessageType</key>
    <string>Connect</string>
    <key>ClientVersionString</key>
    <string>node-usbmux</string>
    <key>ProgName</key>
    <string>node-usbmux</string>
    <key>DeviceID</key>
    <integer>3</integer>
    <key>PortNumber</key>
    <integer>5632</integer>
  </dict>
</plist>
```

It's important to note that the PortNumber must be byte-swapped to be network-endian. So port 22 in this example ends up being sent as 5632.

##### Response:

```plist
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>MessageType</key>
    <string>Result</string>
    <key>Number</key>
    <integer>0</integer>
  </dict>
</plist>
```

The `Number` field indicates status. 0 is success, other numbers indicate an error:
- 0: Success
- 2: Device requested isn't connected
- 3: Port requested isn't available \ open
- 5: Malformed request


## License

The MIT License (MIT)

Copyright (c) 2015 Sterling DeMille &lt;sterlingdemille@gmail.com&gt;

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.