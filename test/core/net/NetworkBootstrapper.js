/// <reference path='../../test.d.ts' />
require('should');

var sinon = require('sinon');

var testUtils = require('../../utils/testUtils');

var JSONWebIp = require('../../../src/core/net/ip/JSONWebIp');
var NetworkBootstrapper = require('../../../src/core/net/NetworkBootstrapper');
var TCPSocketHandlerFactory = require('../../../src/core/net/tcp/TCPSocketHandlerFactory');
var TCPSocketHandler = require('../../../src/core/net/tcp/TCPSocketHandler');
var ObjectConfig = require('../../../src/core/config/ObjectConfig');

describe('CORE --> NET --> NetworkBootstrapper', function () {
    var sandbox;
    var configStub;
    var factoryStub;
    var tcpHandlerStub;
    var ipObtainerStubSuccess;
    var ipObtainerStubError;

    beforeEach(function () {
        sandbox = sinon.sandbox.create();
        configStub = testUtils.stubPublicApi(sandbox, ObjectConfig, {
            "get": function (key) {
                if (key === 'net.allowHalfOpenSockets')
                    return false;
                if (key === 'net.connectionRetrySeconds')
                    return 3;
                if (key === 'net.idleConnectionKillTimeout')
                    return 5;
                if (key === 'net.myOpenPorts')
                    return [56789];
            }
        });

        tcpHandlerStub = testUtils.stubPublicApi(sandbox, TCPSocketHandler, {
            "autoBootstrap": function (callback) {
                callback();
            }
        });

        factoryStub = testUtils.stubPublicApi(sandbox, TCPSocketHandlerFactory, {
            "create": function () {
                return tcpHandlerStub;
            }
        });

        ipObtainerStubSuccess = testUtils.stubPublicApi(sandbox, JSONWebIp, {
            "obtainIP": function (cb) {
                cb(null, '127.0.0.1');
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
        var bootstrapper = new NetworkBootstrapper(factoryStub, configStub, [ipObtainerStubSuccess]);
        bootstrapper.bootstrap(function () {
            if (bootstrapper.getExternalIp() === '127.0.0.1')
                done();
        });
    });

    it('should successfully return the external ip on second try', function (done) {
        var bootstrapper = new NetworkBootstrapper(factoryStub, configStub, [ipObtainerStubError, ipObtainerStubSuccess]);
        bootstrapper.bootstrap(function () {
            if (bootstrapper.getExternalIp() === '127.0.0.1')
                done();
        });
    });

    it('should bootstrap with error', function (done) {
        var bootstrapper = new NetworkBootstrapper(factoryStub, configStub, [ipObtainerStubError]);
        bootstrapper.bootstrap(function (err) {
            if (err && err.message === 'NetworkBootstrapper: All IP obtainers throw an error.')
                done();
        });
    });

    it('should error out that no IP obtainers have been specified', function (done) {
        var bootstrapper = new NetworkBootstrapper(factoryStub, configStub, []);
        bootstrapper.bootstrap(function (err) {
            if (err && err.message === 'NetworkBootstrapper: No IP obtainers specified.')
                done();
        });
    });

    it('should return tcp socket handler', function (done) {
        var bootstrapper = new NetworkBootstrapper(factoryStub, configStub, [ipObtainerStubSuccess]);

        bootstrapper.bootstrap(function () {
            if (bootstrapper.getTCPSocketHandler() === tcpHandlerStub) {
                done();
            } else
                throw new Error();
        });
    });
});
//# sourceMappingURL=NetworkBootstrapper.js.map
