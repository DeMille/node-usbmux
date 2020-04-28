var net = require('net')
  , should = require('should')
  , rewire = require('rewire');

var usbmux = rewire('../lib/usbmux.js')
  , protocol = usbmux.__get__('protocol');

// tests connect to port 22 on attached ios device (or set env var)
var port = process.env.TESTPORT || 22;

//
// TESTS AND EXPECTED RESULTS
//

var tests = {

  // for testing protocol.listen
  listen: 'gwEAAAEAAAAIAAAAAQAAADw/eG1sIHZlcnNpb249IjEuMCIgZW5jb2Rpbmc9IlVURi04Ij8+CjwhRE9DVFlQRSBwbGlzdCBQVUJMSUMgIi0vL0FwcGxlLy9EVEQgUExJU1QgMS4wLy9FTiIgImh0dHA6Ly93d3cuYXBwbGUuY29tL0RURHMvUHJvcGVydHlMaXN0LTEuMC5kdGQiPgo8cGxpc3QgdmVyc2lvbj0iMS4wIj4KICA8ZGljdD4KICAgIDxrZXk+TWVzc2FnZVR5cGU8L2tleT4KICAgIDxzdHJpbmc+TGlzdGVuPC9zdHJpbmc+CiAgICA8a2V5PkNsaWVudFZlcnNpb25TdHJpbmc8L2tleT4KICAgIDxzdHJpbmc+bm9kZS11c2JtdXg8L3N0cmluZz4KICAgIDxrZXk+UHJvZ05hbWU8L2tleT4KICAgIDxzdHJpbmc+bm9kZS11c2JtdXg8L3N0cmluZz4KICA8L2RpY3Q+CjwvcGxpc3Q+',

  // for testing
  // - protocol.connect(12, 22)
  // - protocol.connect(21, 1234)
  connect: {
    _12_22: '7AEAAAEAAAAIAAAAAQAAADw/eG1sIHZlcnNpb249IjEuMCIgZW5jb2Rpbmc9IlVURi04Ij8+CjwhRE9DVFlQRSBwbGlzdCBQVUJMSUMgIi0vL0FwcGxlLy9EVEQgUExJU1QgMS4wLy9FTiIgImh0dHA6Ly93d3cuYXBwbGUuY29tL0RURHMvUHJvcGVydHlMaXN0LTEuMC5kdGQiPgo8cGxpc3QgdmVyc2lvbj0iMS4wIj4KICA8ZGljdD4KICAgIDxrZXk+TWVzc2FnZVR5cGU8L2tleT4KICAgIDxzdHJpbmc+Q29ubmVjdDwvc3RyaW5nPgogICAgPGtleT5DbGllbnRWZXJzaW9uU3RyaW5nPC9rZXk+CiAgICA8c3RyaW5nPm5vZGUtdXNibXV4PC9zdHJpbmc+CiAgICA8a2V5PlByb2dOYW1lPC9rZXk+CiAgICA8c3RyaW5nPm5vZGUtdXNibXV4PC9zdHJpbmc+CiAgICA8a2V5PkRldmljZUlEPC9rZXk+CiAgICA8aW50ZWdlcj4xMjwvaW50ZWdlcj4KICAgIDxrZXk+UG9ydE51bWJlcjwva2V5PgogICAgPGludGVnZXI+NTYzMjwvaW50ZWdlcj4KICA8L2RpY3Q+CjwvcGxpc3Q+',
    _21_1234: '7QEAAAEAAAAIAAAAAQAAADw/eG1sIHZlcnNpb249IjEuMCIgZW5jb2Rpbmc9IlVURi04Ij8+CjwhRE9DVFlQRSBwbGlzdCBQVUJMSUMgIi0vL0FwcGxlLy9EVEQgUExJU1QgMS4wLy9FTiIgImh0dHA6Ly93d3cuYXBwbGUuY29tL0RURHMvUHJvcGVydHlMaXN0LTEuMC5kdGQiPgo8cGxpc3QgdmVyc2lvbj0iMS4wIj4KICA8ZGljdD4KICAgIDxrZXk+TWVzc2FnZVR5cGU8L2tleT4KICAgIDxzdHJpbmc+Q29ubmVjdDwvc3RyaW5nPgogICAgPGtleT5DbGllbnRWZXJzaW9uU3RyaW5nPC9rZXk+CiAgICA8c3RyaW5nPm5vZGUtdXNibXV4PC9zdHJpbmc+CiAgICA8a2V5PlByb2dOYW1lPC9rZXk+CiAgICA8c3RyaW5nPm5vZGUtdXNibXV4PC9zdHJpbmc+CiAgICA8a2V5PkRldmljZUlEPC9rZXk+CiAgICA8aW50ZWdlcj4yMTwvaW50ZWdlcj4KICAgIDxrZXk+UG9ydE51bWJlcjwva2V5PgogICAgPGludGVnZXI+NTM3NjQ8L2ludGVnZXI+CiAgPC9kaWN0Pgo8L3BsaXN0Pg=='
  },

  // for testing the message parser
  makeParser: {

    // a confirmation message
    confirmation: {
      msg: {
        MessageType: 'Result',
        Number: 0
      },
      data: new Buffer('JgEAAAEAAAAIAAAAAQAAADw/eG1sIHZlcnNpb249IjEuMCIgZW5jb2Rpbmc9IlVURi04Ij8+CjwhRE9DVFlQRSBwbGlzdCBQVUJMSUMgIi0vL0FwcGxlLy9EVEQgUExJU1QgMS4wLy9FTiIgImh0dHA6Ly93d3cuYXBwbGUuY29tL0RURHMvUHJvcGVydHlMaXN0LTEuMC5kdGQiPgo8cGxpc3QgdmVyc2lvbj0iMS4wIj4KPGRpY3Q+Cgk8a2V5Pk1lc3NhZ2VUeXBlPC9rZXk+Cgk8c3RyaW5nPlJlc3VsdDwvc3RyaW5nPgoJPGtleT5OdW1iZXI8L2tleT4KCTxpbnRlZ2VyPjA8L2ludGVnZXI+CjwvZGljdD4KPC9wbGlzdD4K', 'base64')
    },

    // a device report message
    device: {
      msg: {
        DeviceID: 7,
        MessageType: 'Attached',
        Properties: {
          ConnectionType: 'USB',
          DeviceID: 7,
          LocationID: 0,
          ProductID: 4776,
          SerialNumber: '22226dd59068c222f46522221f8222da222d394b'
        }
      },
      data: new Buffer('qAIAAAAAAAAAAAAAAAAAADw/eG1sIHZlcnNpb249IjEuMCIgZW5jb2Rpbmc9IlVURi04Ij8+CjwhRE9DVFlQRSBwbGlzdCBQVUJMSUMgIi0vL0FwcGxlLy9EVEQgUExJU1QgMS4wLy9FTiIgImh0dHA6Ly93d3cuYXBwbGUuY29tL0RURHMvUHJvcGVydHlMaXN0LTEuMC5kdGQiPgo8cGxpc3QgdmVyc2lvbj0iMS4wIj4KICA8ZGljdD4KICAgIDxrZXk+RGV2aWNlSUQ8L2tleT4KICAgIDxpbnRlZ2VyPjc8L2ludGVnZXI+CiAgICA8a2V5Pk1lc3NhZ2VUeXBlPC9rZXk+CiAgICA8c3RyaW5nPkF0dGFjaGVkPC9zdHJpbmc+CiAgICA8a2V5PlByb3BlcnRpZXM8L2tleT4KICAgIDxkaWN0PgogICAgICA8a2V5PkNvbm5lY3Rpb25UeXBlPC9rZXk+CiAgICAgIDxzdHJpbmc+VVNCPC9zdHJpbmc+CiAgICAgIDxrZXk+RGV2aWNlSUQ8L2tleT4KICAgICAgPGludGVnZXI+NzwvaW50ZWdlcj4KICAgICAgPGtleT5Mb2NhdGlvbklEPC9rZXk+CiAgICAgIDxpbnRlZ2VyPjA8L2ludGVnZXI+CiAgICAgIDxrZXk+UHJvZHVjdElEPC9rZXk+CiAgICAgIDxpbnRlZ2VyPjQ3NzY8L2ludGVnZXI+CiAgICAgIDxrZXk+U2VyaWFsTnVtYmVyPC9rZXk+CiAgICAgIDxzdHJpbmc+MjIyMjZkZDU5MDY4YzIyMmY0NjUyMjIyMWY4MjIyZGEyMjJkMzk0Yjwvc3RyaW5nPgogICAgPC9kaWN0PgogIDwvZGljdD4KPC9wbGlzdD4=', 'base64')
    }
  }
};

//
// RUNNER
//

// Test the building and parsing of usbmuxd messages
//
describe('protocol', function() {

  // Test packing a listen request obj -> a usbmuxd msg with header
  // Comparing against a known working example
  //
  describe('.listen', function() {
    it('matches test buffer', function() {
      protocol.listen.toString('base64').should.be
        .eql(tests.listen);
    });
  });

  // Test packing a connect request obj -> a usbmuxd msg with header
  // Compare against known working examples
  //
  describe('.connect()', function() {
    it('connect(12, 22)', function() {
      protocol.connect(12, 22).toString('base64').should.be
        .eql(tests.connect._12_22);
    });
    it('connect(21, 1234)', function() {
      protocol.connect(21, 1234).toString('base64').should.be
        .eql(tests.connect._21_1234);
    });
  });

  // Test parse function, comparing known data & messages
  //
  // This is probably the most important test because there's a few cases that
  // need to be handled and everything breaks if the messages don't get parsed
  // correctly.
  //
  describe('.parse()', function() {

    //
    // Case 1: a whole message
    //

    /**
     * Test conversion of one data buf -> one usbmuxd message
     *
     * @param {string}   messageType - 'confirmation' or 'device'
     * @param {Function} done
     */
    function one_data_to_one_msg(messageType, done) {
      var test = tests.makeParser[messageType].data
        , expected = tests.makeParser[messageType].msg;

      var build = protocol.makeParser(function(msg) {
        msg.should.eql(expected);
        done();
      });

      build(test);
    }

    describe('where 1 data event makes up 1 complete msg', function() {
      it('confirmation msg', function(done) {
        one_data_to_one_msg('confirmation', done);
      });

      it('device report msg', function(done) {
        one_data_to_one_msg('device', done);
      });
    });

    //
    // Case 2: messages broken up across data events
    //

    /**
     * Test conversion of multiple data buf -> one usbmuxd message
     *
     * @param {string}   messageType - 'confirmation' or 'device'
     * @param {integer}  numSegments - Number of segments to break data buf into
     * @param {Function} done
     */
    function more_datas_to_one_msg(messageType, numSegments, done) {
      var test = tests.makeParser[messageType].data
        , expected = tests.makeParser[messageType].msg;

      var build = protocol.makeParser(function(msg) {
        msg.should.eql(expected);
        done();
      });

      for (var i = 0; i < numSegments; i++) {
        var previous = (test.length / numSegments) * i
          , next = (test.length / numSegments) * (i + 1);

        build(test.slice(previous, next));
      }
    }

    describe('where >1 data events make up 1 complete msg', function() {
      it('confirmation msg (split in 2)', function(done) {
        more_datas_to_one_msg('confirmation', 2, done);
      });

      it('device report msg (split in 3)', function(done) {
        more_datas_to_one_msg('device', 3, done);
      });
    });

    //
    // Case 3: multiple messages (w/ headers) in a data event
    //

    /**
     * Call cb after getting called n times
     *
     * Accumulates return values in array each time its called, then passes to cb
     *
     * @param {integer}  n - Number of times to call
     * @param {Function} done
     */
    function callAfter(n, cb) {
      var count = 0
        , acc = [];

      return function(item) {
        count++;
        acc.push(item);
        if (count === n) cb(acc);
      };
    }

    /**
     * Test conversion of one data buf -> multiple usbmuxd messages
     *
     * @param {string[]} messageTypes - [] of 'confirmation's or 'device's
     * @param {Function} done
     */
    function one_data_to_many_msg(messageTypes, done) {
      var test = Buffer.concat(
        messageTypes.map(function(messageType) {
          return tests.makeParser[messageType].data;
        })
      );

      var expected = messageTypes.map(function(messageType) {
        return tests.makeParser[messageType].msg;
      });

      var onFinished = callAfter(messageTypes.length, function(msgs) {
        msgs.should.eql(expected);
        done();
      });

      var build = protocol.makeParser(onFinished);

      build(test);
    }

    describe('where 1 data event makes up >1 complete msg', function() {
      it('confirmation + report', function(done) {
        one_data_to_many_msg(['confirmation', 'device'], done);
      });

      it('report + report', function(done) {
        one_data_to_many_msg(['device', 'device'], done);
      });

      it('confirmation + report + report', function(done) {
        one_data_to_many_msg(['confirmation', 'device', 'device'], done);
      });
    });

  });
});

// From here on testing depends on a real plugged in device; its just easier to
// test the methods directly than mock out a tcp connection with fake buffers.
//
// These methods make up the core, so if they pass the rest of the module is
// probably in good shape.
//

describe('createListener()', function() {
  it('fires attached event when a device is plugged in', function(done) {
    const listener = usbmux.createListener()
      .on('error', done)
      .on('attached', function() {
        listener.end();
        done();
      });
  });
});

describe('connect()', function() {
  it('resolves a tunneled connection (id from above)', function(done) {
    const listener = usbmux.createListener()
      .on('error', done)
      .once('attached', function(udid) {
        const deviceID = usbmux.devices[udid].DeviceID;
        usbmux.__get__('connect')(deviceID, port)
          .then(function(tunnel) {
            tunnel.should.be.instanceof(net.Socket);
            tunnel.end();
            listener.end();
            done();
          })
          .catch(done);
      });
  });
});

describe('getTunnel()', function() {
  describe('resolves a tunneled connection', function() {

    it('with the udid option', function(done) {
      const listener = usbmux.createListener()
        .on('error', done)
        .once('attached', function(udid) {
          usbmux.getTunnel(port, {udid: udid})
            .then(function(tunnel) {
              tunnel.should.be.instanceof(net.Socket);
              tunnel.end();
              listener.end();
              done();
            })
            .catch(done);
        });
    });

    it('and without udid option', function(done) {
      // emptying out device cache to test that case too
      usbmux.__set__('devices', {});

      usbmux.getTunnel(port)
        .then(function(tunnel) {
          tunnel.should.be.instanceof(net.Socket);
          tunnel.end();
          done();
        })
        .catch(done);
    });

  });
});

describe('Relay()', function() {
  it('has a server, a listener, and fires a ready event', function(done) {
    var relay = new usbmux.Relay(port, 2222)
      .on('error', done)
      .on('warning', done)
      .on('ready', function() {
        relay._server.should.instanceof(net.Server);
        relay._listener.should.instanceof(net.Socket);
        relay.stop();
        done();
      });
  });
});
