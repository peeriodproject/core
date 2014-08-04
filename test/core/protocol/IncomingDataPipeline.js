/// <reference path='../../test.d.ts' />
var net = require('net');
var crypto = require('crypto');

require('should');

var sinon = require('sinon');

var testUtils = require('../../utils/testUtils');

var IncomingDataPipeline = require('../../../src/core/protocol/messages/IncomingDataPipeline');
var TCPSocket = require('../../../src/core/net/tcp/TCPSocket');
var ReadableMessageFactory = require('../../../src/core/protocol/messages/ReadableMessageFactory');

describe('CORE --> PROTOCOL --> MESSAGES --> IncomingDataPipeline', function () {
    this.timeout(0);

    var sandbox;
    var readableMessageFactoryStub;
    var server = null;
    var currentConnection = null;
    var tcpSock = null;

    var pipe = null;

    var maxByteLength = 1024 * 1024;
    var messageEndBytes = [0x50, 0x52, 0x44, 0x45, 0x4e, 0x44];

    var sockOpts = { doKeepAlive: true, idleConnectionKillTimeout: 0 };

    var suppressMessageError = false;

    // we use a null byte at the beginning to indicate that a message cannot be parsed.
    before(function () {
        sandbox = sinon.sandbox.create();

        // build up readable message factory stub
        readableMessageFactoryStub = testUtils.stubPublicApi(sandbox, ReadableMessageFactory, {
            "create": function (buffer) {
                if (buffer[0] === 0x00 && !suppressMessageError)
                    throw new Error('Message not readable yo.');
                var foo = {
                    isHydra: function () {
                        return false;
                    },
                    payload: buffer
                };

                return foo;
            }
        });

        // build up our server
        server = net.createServer(function (socket) {
            socket.setNoDelay(true);
            currentConnection = socket;
        });

        server.listen(66666);

        pipe = new IncomingDataPipeline(maxByteLength, messageEndBytes, 1000, readableMessageFactoryStub);
    });

    it('should throw an error when hooking a socket without an identifer', function (done) {
        var sock = net.createConnection(66666, 'localhost', function () {
            var tcpSock = new TCPSocket(sock, sockOpts);
            try  {
                pipe.hookSocket(tcpSock);
            } catch (e) {
                tcpSock.end();
                if (e.message === 'IncomingDataPipeline#hookSocket: Can only hook sockets with identifier')
                    done();
            }
        });
    });

    it('should correctly hook a socket to the pipeline', function (done) {
        var sock = net.createConnection(66666, 'localhost', function () {
            tcpSock = new TCPSocket(sock, sockOpts);
            tcpSock.setIdentifier('mySock');
            pipe.hookSocket(tcpSock);
            var hook = pipe.getSocketHookByIdentifier('mySock');
            if (hook !== undefined && typeof hook === 'function')
                done();
        });
    });

    it('should emit a message event with a complete message', function (done) {
        var message = new Buffer([0, 0, 0, 6, 0x66, 0x6f, 0x6f, 0x62, 0x61, 0x72]);

        pipe.once('message', function (identifier, msg) {
            msg.payload.toString().should.equal('foobar');
            done();
        });

        currentConnection.write(message);
    });

    it('should not be able to read the message', function (done) {
        var msg = new Buffer([0, 0, 0, 8, 0x00, 0x02, 0x03, 0x50, 0x52, 0x44, 0x45, 0x4e, 0x44]);

        pipe.once('unreadableMessage', function (identifier) {
            done();
        });

        currentConnection.write(msg);
    });

    it('should be able to extract messages split over many parts', function (done) {
        suppressMessageError = true;

        var msgs = [];
        var stringToSend = '';

        var checkIndex = -1;

        pipe.on('message', function (identifier, msg) {
            checkIndex++;

            msg.payload.toString('hex').should.equal(msgs[checkIndex]);

            if (checkIndex === msgs.length - 1) {
                pipe.removeAllListeners('message');
                done();
            }
        });

        pipe.once('unreadableMessage', function () {
            throw new Error('Cannot read message');
        });

        for (var i = 0; i < 100; i++) {
            if (Math.round(Math.random())) {
                var buff = crypto.pseudoRandomBytes(Math.ceil(Math.random() * 200));
                var sizeBuff = new Buffer(4);
                sizeBuff.writeUInt32BE(buff.length, 0);

                var stringRep = buff.toString('hex');
                msgs.push(stringRep);
                stringToSend += sizeBuff.toString('hex');
                stringToSend += stringRep;
            } else {
                stringToSend += '00000000';
            }
        }

        while (stringToSend.length) {
            var to = Math.ceil(Math.random() * 100) * 2;
            var chunk = stringToSend.substr(0, to);
            stringToSend = stringToSend.substr(to);

            currentConnection.write(chunk, 'hex');
        }
    });

    it('should be able to finalize large data', function (done) {
        var len = maxByteLength;
        var largeBuffer = new Buffer(len);

        largeBuffer.fill(1);
        largeBuffer.writeUInt32BE(maxByteLength - 4, 0);

        pipe.once('message', function (identifier, message) {
            message.payload.toString('hex').should.equal(largeBuffer.slice(4).toString('hex'));
            done();
        });

        currentConnection.write(largeBuffer);
    });

    it('should free memory when the limit has exceeded', function (done) {
        var largeBuffer = new Buffer(maxByteLength + 1);
        largeBuffer.fill(1);
        largeBuffer.writeUInt32BE(0xffffffff, 0);

        currentConnection.write(largeBuffer, function () {
            // give a second of time
            setTimeout(function () {
                if (pipe.getTemporaryMemoryByIdentifier('mySock') === undefined)
                    done();
            }, 1000);
        });
    });

    it('should correctly handle things on identifier change', function (done) {
        var buf = new Buffer([0x01]);

        currentConnection.write(buf);

        setTimeout(function () {
            tcpSock.setIdentifier('mySockB');
            if (pipe.getSocketHookByIdentifier('mySockB') !== undefined && pipe.getTemporaryMemoryByIdentifier('mySockB').data[0][0] === 0x01)
                done();
        }, 20);
    });

    it('should return false when unhooking a non-existant socket', function () {
        pipe.unhookSocket(undefined).should.be.false;
    });

    it('should unhook a TCP socket from the pipe but keep the data', function (done) {
        if (pipe.unhookSocket(tcpSock) && pipe.getSocketHookByIdentifier('mySockB') === undefined) {
            if (tcpSock.listeners('data').length === 0 && pipe.getTemporaryMemoryByIdentifier('mySockB').data[0][0] === 0x01)
                done();
        }
    });

    it('should hook a TCP socket again and not timeout kill the memory', function (done) {
        pipe.hookSocket(tcpSock);
        currentConnection.write(new Buffer([0x02]));
        setTimeout(function () {
            var mem = pipe.getTemporaryMemoryByIdentifier('mySockB').data;
            if (mem[0][0] === 0x01 && mem[1][0] === 0x02)
                done();
        }, 1000);
    });

    it('should timeout kill the memory of an unhooked tcp socket', function (done) {
        pipe.unhookSocket(tcpSock);
        setTimeout(function () {
            if (pipe.getTemporaryMemoryByIdentifier('mySockB') === undefined)
                done();
        }, 1000);
    });

    after(function () {
        sandbox.restore();
        server.close();
    });
});
//# sourceMappingURL=IncomingDataPipeline.js.map
