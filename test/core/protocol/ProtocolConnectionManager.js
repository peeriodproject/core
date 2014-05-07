var net = require('net');

require('should');

var sinon = require('sinon');

var testUtils = require('../../utils/testUtils');

var TCPSocketFactory = require('../../../src/core/net/tcp/TCPSocketFactory');

var TCPSocketHandler = require('../../../src/core/net/tcp/TCPSocketHandler');

var ObjectConfig = require('../../../src/core/config/ObjectConfig');

describe('CORE --> PROTOCOL --> NET --> ProtocolConnectionManager @current', function () {
    var sandbox;
    var configStub;
    var tcpSocketHandler;
    var remoteServer;

    var handler_built = false;
    var server_built = false;

    var handlerOpts = {
        allowHalfOpenSockets: false,
        myExternalIp: '127.0.0.1',
        myOpenPorts: [60000],
        doKeepAlive: true,
        idleConnectionKillTimeout: 1
    };

    var tcpSocketFactory = new TCPSocketFactory();

    before(function (done) {
        sandbox = sinon.sandbox.create();

        // build our config
        configStub = testUtils.stubPublicApi(sandbox, ObjectConfig, {
            get: function (key) {
                if (key === 'protocol.messages.maxByteLengthPerMessage')
                    return 1024 * 1024;
                if (key === 'prococol.messages.msToKeepNonAddressableMemory')
                    return 2000;
                if (key === 'prococol.net.msToWaitForIncomingMessage')
                    return 1000;
                if (key === 'protocol.net.maxSecondsToWaitForConnection')
                    return 1000;
            }
        });

        remoteServer = net.createServer();
        remoteServer.listen(60001);
        remoteServer.on('listening', function () {
            server_built = true;
            if (server_built && handler_built)
                done();
        });

        // build our tcp socket handler
        tcpSocketHandler = new TCPSocketHandler(tcpSocketFactory, handlerOpts);

        tcpSocketHandler.autoBootstrap(function (openPorts) {
            if (openPorts[0] === 60000) {
                handler_built = true;
                if (server_built && handler_built)
                    done();
            }
        });
    });

    after(function () {
        sandbox.restore();
    });

    // ------- TESTS -------
    it('test', function (done) {
        if (true === true)
            done();
    });
});
//# sourceMappingURL=ProtocolConnectionManager.js.map
