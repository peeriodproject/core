/// <reference path='../../test.d.ts' />
require('should');

var sinon = require('sinon');
var testUtils = require('../../utils/testUtils');

var JSONWebIp = require('../../../src/core/net/ip/JSONWebIp');
var JSONStateHandlerFactory = require('../../../src/core/utils/JSONStateHandlerFactory');
var JSONStateHandler = require('../../../src/core/utils/JSONStateHandler');
var NetworkBootstrapper = require('../../../src/core/net/NetworkBootstrapper');
var TCPSocketHandlerFactory = require('../../../src/core/net/tcp/TCPSocketHandlerFactory');
var TCPSocketHandler = require('../../../src/core/net/tcp/TCPSocketHandler');
var ObjectConfig = require('../../../src/core/config/ObjectConfig');

describe('CORE --> NET --> NetworkBootstrapper', function () {
    var sandbox;
    var configStub;
    var openPortsStateHandler;
    var stateHandlerFactoryStub;
    var factoryStub;
    var tcpHandlerStub;
    var ipObtainerStubSuccess;
    var ipObtainerStubError;
    var change = false;

    beforeEach(function () {
        sandbox = sinon.sandbox.create();
        configStub = testUtils.stubPublicApi(sandbox, ObjectConfig, {
            "get": function (key) {
                if (key === 'net.allowHalfOpenSockets')
                    return false;
                if (key === 'net.connectionRetrySeconds')
                    return 2;
                if (key === 'net.recheckIpIntervalInSeconds')
                    return 2;
                if (key === 'net.idleConnectionKillTimeout')
                    return 5;
                if (key === 'app.dataPath')
                    return testUtils.getFixturePath('net/appDataPath');
                if (key === 'net.myOpenPortsStateConfig')
                    return 'myOpenPorts.json';
            }
        });

        openPortsStateHandler = testUtils.stubPublicApi(sandbox, JSONStateHandler, {
            load: function (callback) {
                return callback(null, [56789]);
            }
        });

        stateHandlerFactoryStub = testUtils.stubPublicApi(sandbox, JSONStateHandlerFactory, {
            create: function () {
                return openPortsStateHandler;
            }
        });

        tcpHandlerStub = testUtils.stubPublicApi(sandbox, TCPSocketHandler, {
            "autoBootstrap": function (callback) {
                callback();
            },
            "setMyExternalIp": function (ip) {
                this.ip = ip;
            },
            "getMyExternalIp": function () {
                return this.ip;
            }
        });

        factoryStub = testUtils.stubPublicApi(sandbox, TCPSocketHandlerFactory, {
            "create": function () {
                return tcpHandlerStub;
            }
        });

        ipObtainerStubSuccess = testUtils.stubPublicApi(sandbox, JSONWebIp, {
            "obtainIP": function (cb) {
                var ip = change ? '127.0.0.2' : '127.0.0.1';

                cb(null, ip);
            }
        });

        ipObtainerStubError = testUtils.stubPublicApi(sandbox, JSONWebIp, {
            "obtainIP": function (cb) {
                cb(new Error('foobar'), null);
            }
        });
    });

    afterEach(function () {
        sandbox.restore();
    });

    it('should successfully return the external ip on first try', function (done) {
        var bootstrapper = new NetworkBootstrapper(factoryStub, configStub, stateHandlerFactoryStub, [ipObtainerStubSuccess]);
        bootstrapper.bootstrap(function () {
            if (bootstrapper.getExternalIp() === '127.0.0.1')
                done();
        });
    });

    it('should successfully return the external ip on second try', function (done) {
        var bootstrapper = new NetworkBootstrapper(factoryStub, configStub, stateHandlerFactoryStub, [ipObtainerStubError, ipObtainerStubSuccess]);
        bootstrapper.bootstrap(function () {
            if (bootstrapper.getExternalIp() === '127.0.0.1')
                done();
        });
    });

    it('should bootstrap with error', function (done) {
        var bootstrapper = new NetworkBootstrapper(factoryStub, configStub, stateHandlerFactoryStub, [ipObtainerStubError]);
        bootstrapper.bootstrap(function (err) {
            if (err && err.message === 'NetworkBootstrapper: All IP obtainers throw an error.')
                done();
        });
    });

    it('should error out that no IP obtainers have been specified', function (done) {
        var bootstrapper = new NetworkBootstrapper(factoryStub, configStub, stateHandlerFactoryStub, []);
        bootstrapper.bootstrap(function (err) {
            if (err && err.message === 'NetworkBootstrapper: No IP obtainers specified.')
                done();
        });
    });

    it('should return tcp socket handler', function (done) {
        var bootstrapper = new NetworkBootstrapper(factoryStub, configStub, stateHandlerFactoryStub, [ipObtainerStubSuccess]);

        bootstrapper.bootstrap(function () {
            if (bootstrapper.getTCPSocketHandler() === tcpHandlerStub) {
                done();
            } else
                throw new Error();
        });
    });

    it('should notice an ip change and set the IP on the TCP socket handler', function (done) {
        var bootstrapper = new NetworkBootstrapper(factoryStub, configStub, stateHandlerFactoryStub, [ipObtainerStubSuccess]);

        bootstrapper.bootstrap(function () {
            // there is none yet
            (bootstrapper.getTCPSocketHandler().getMyExternalIp() === undefined).should.be.true;

            change = true;
            setTimeout(function () {
                bootstrapper.getTCPSocketHandler().getMyExternalIp().should.equal('127.0.0.2');
                done();
            }, 2500);
        });
    });
});
//# sourceMappingURL=NetworkBootstrapper.js.map
