var net = require('net');

require('should');

var sinon = require('sinon');

var testUtils = require('../../utils/testUtils');

var TCPSocketFactory = require('../../../src/core/net/tcp/TCPSocketFactory');

var TCPSocketHandler = require('../../../src/core/net/tcp/TCPSocketHandler');

var ObjectConfig = require('../../../src/core/config/ObjectConfig');

var ContactNodeFactory = require('../../../src/core/topology/ContactNodeFactory');

var ProtocolConnectionManager = require('../../../src/core/protocol/net/ProtocolConnectionManager');

describe('CORE --> PROTOCOL --> NET --> ProtocolConnectionManager @current', function () {
    var protoPort = 60000;
    var remotePort = 60001;

    var sandbox;
    var configStub;
    var tcpSocketHandler;
    var remoteServer;

    var handler_built = false;
    var server_built = false;

    var manager;

    var handlerOpts = {
        allowHalfOpenSockets: false,
        myExternalIp: '127.0.0.1',
        myOpenPorts: [protoPort],
        doKeepAlive: true,
        idleConnectionKillTimeout: 1.2
    };

    var tcpSocketFactory = new TCPSocketFactory();

    before(function (done) {
        sandbox = sinon.sandbox.create();

        // build our config
        configStub = testUtils.stubPublicApi(sandbox, ObjectConfig, {
            get: function (key) {
                if (key === 'protocol.messages.maxByteLengthPerMessage')
                    return 1024 * 1024;
                if (key === 'protocol.messages.msToKeepNonAddressableMemory')
                    return 2000;
                if (key === 'protocol.net.msToWaitForIncomingMessage')
                    return 500;
                if (key === 'protocol.net.maxSecondsToWaitForConnection')
                    return 1000;
            }
        });

        remoteServer = net.createServer();
        remoteServer.listen(remotePort);
        remoteServer.on('listening', function () {
            server_built = true;
            if (server_built && handler_built)
                done();
        });

        // build our tcp socket handler
        tcpSocketHandler = new TCPSocketHandler(tcpSocketFactory, handlerOpts);

        tcpSocketHandler.autoBootstrap(function (openPorts) {
            if (openPorts[0] === protoPort) {
                manager = new ProtocolConnectionManager(configStub, tcpSocketHandler);
                handler_built = true;
                if (server_built && handler_built)
                    done();
            }
        });
    });

    after(function () {
        sandbox.restore();
    });

    // ------- MESSAGES ----
    var createWorkingMessageA = function () {
        var begin = new Buffer([0x50, 0x52, 0x44, 0x42, 0x47, 0x4e]), end = new Buffer([0x50, 0x52, 0x44, 0x45, 0x4e, 0x44]), receiverId = new Buffer([0xf3, 0xec, 0x6b, 0x95, 0x29, 0x92, 0xbb, 0x07, 0xf3, 0x48, 0x62, 0xa4, 0x11, 0xbb, 0x1f, 0x83, 0x3f, 0x63, 0x62, 0x88]), senderId = new Buffer([0xfe, 0x36, 0x26, 0xca, 0xca, 0x6c, 0x84, 0xfa, 0x4e, 0x5d, 0x32, 0x3b, 0x6a, 0x26, 0xb8, 0x97, 0x58, 0x2c, 0x57, 0xf9]), ipv4Address = new Buffer([0x04, 127, 0, 0, 1, 0x17, 0x71]), addressEnd = new Buffer([0x05]), messageType = new Buffer([0x50, 0x49]), payload = new Buffer('foobar', 'utf8'), list = [begin, receiverId, senderId, ipv4Address, addressEnd, messageType, payload, end];

        return Buffer.concat(list);
    };

    // ------- TESTS -------
    it('should correctly add a connection to the incoming pending list', function (done) {
        net.createConnection(protoPort, 'localhost');
        tcpSocketHandler.once('connected', function () {
            var item = manager.getIncomingPendingSocketList()['_temp1'];
            if (item && item.timeout)
                done();
        });
    });

    it('should correctly timeout kill the incoming pending socket', function (done) {
        var socket = manager.getIncomingPendingSocketList()['_temp1'].socket;

        socket.once('destroy', function () {
            if (manager.getIncomingPendingSocketList()['_temp1'] === undefined) {
                manager.removeAllListeners('terminatedConnection');
                done();
            }
        });

        manager.once('terminatedConnection', function () {
            throw new Error('Should not do that, nope nope.');
        });
    });

    it('should add the incoming socket to the confirmed sockets', function (done) {
        var message_a = createWorkingMessageA();
        manager.once('confirmedSocket', function (identifier) {
            if (Object.keys(manager.getIncomingPendingSocketList()).length === 0 && identifier === 'fe3626caca6c84fa4e5d323b6a26b897582c57f9')
                done();
        });

        var sock = net.createConnection(protoPort, 'localhost', function () {
            // is connected
            sock.write(message_a);
        });
    });

    it('should return the existing socket when connecting', function (done) {
        var contactNode = ContactNodeFactory.createDummy('fe3626caca6c84fa4e5d323b6a26b897582c57f9', 'hex', '127.0.0.1', remotePort);
        var existing = manager.getConfirmedSocketList()['fe3626caca6c84fa4e5d323b6a26b897582c57f9'].socket;

        manager.obtainConnectionTo(contactNode, function (err, socket) {
            if (socket && socket === existing)
                done();
        });
    });

    it('should keep the existing socket open', function (done) {
        var contactNode = ContactNodeFactory.createDummy('fe3626caca6c84fa4e5d323b6a26b897582c57f9', 'hex', '127.0.0.1', remotePort);
        manager.keepSocketsOpenFromNode(contactNode);
        var sock = manager.getConfirmedSocketByContactNode(contactNode);
        sock.once('destroy', function () {
            throw new Error('Should not happen, nope nope.');
        });
        setTimeout(function () {
            sock.removeAllListeners('destroy');
            done();
        }, 1500);
    });

    it('should no longer keep the existing socket open', function (done) {
        var contactNode = ContactNodeFactory.createDummy('fe3626caca6c84fa4e5d323b6a26b897582c57f9', 'hex', '127.0.0.1', remotePort);
        manager.keepSocketsNoLongerOpenFromNode(contactNode);
        manager.once('terminatedConnection', function (id) {
            if (id.toHexString() === 'fe3626caca6c84fa4e5d323b6a26b897582c57f9') {
                if (Object.keys(manager.getConfirmedSocketList()).length === 0)
                    done();
            }
        });
    });
});
//# sourceMappingURL=ProtocolConnectionManager.js.map
