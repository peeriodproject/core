/// <reference path='../../../test.d.ts' />
require('should');

var events = require('events');

var sinon = require('sinon');

var testUtils = require('../../../utils/testUtils');

var HydraMessageCenter = require('../../../../src/core/protocol/hydra/HydraMessageCenter');

var WritableFileTransferMessageFactory = require('../../../../src/core/protocol/fileTransfer/messages/WritableFileTransferMessageFactory');
var Middleware = require('../../../../src/core/protocol/fileTransfer/Middleware');

describe('CORE --> PROTOCOL --> FILE TRANSFER --> Middleware @current', function () {
    var sandbox = null;

    var socketCount = 0;
    var openSockets = [];

    var protocolConnectionManagerStub = null;
    var hydraMessageCenterStub = null;
    var writableFileTransferFactoryStub = null;
    var cellManagerStub = new events.EventEmitter();
    var middleware = null;

    var connectEmitter = new events.EventEmitter();

    var terminateCircuit = function (circuitId) {
        cellManagerStub.emit('tornDownCell', circuitId);
    };

    var terminateSocket = function (socketIdentifier) {
        protocolConnectionManagerStub.emit('terminatedConnection', socketIdentifier);
    };

    var connectionResponse = function (ip, port, success) {
        connectEmitter.emit(ip + '_' + port, success);
    };

    it('should correctly initialize the middleware', function () {
        middleware = new Middleware(cellManagerStub, protocolConnectionManagerStub, hydraMessageCenterStub, writableFileTransferFactoryStub);
        middleware.should.be.instanceof(Middleware);
    });

    it('should correctly feed a node within a list of nodes', function (done) {
        var nodes = [
            {
                ip: '1',
                port: 80,
                feedingIdentifier: 'foobar'
            },
            {
                ip: '2',
                port: 80,
                feedingIdentifier: 'foobar2'
            },
            {
                ip: '3',
                port: 80,
                feedingIdentifier: 'foobar3'
            },
            {
                ip: '4',
                port: 80,
                feedingIdentifier: 'foobar4'
            }
        ];

        connectEmitter.on('obtaining', function (port, ip) {
            if (ip === '1') {
                connectionResponse(ip, port, true);
            } else {
                connectionResponse(ip, port, false);
            }
        });

        connectEmitter.once('msgSent', function (ident, buffer) {
            connectEmitter.removeAllListeners('obtaining');

            buffer.toString().should.equal('mumu');

            middleware.getOutgoingList()['circ1_1_80_foobar'].should.equal(ident);
            done();
        });

        middleware.feedNode(nodes, 'circ1', new Buffer('mumu'));
    });

    before(function () {
        sandbox = sinon.sandbox.create();

        protocolConnectionManagerStub = new events.EventEmitter();

        protocolConnectionManagerStub.hydraConnectTo = function (port, ip, cb) {
            connectEmitter.once(ip + '_' + port, function (success) {
                var ident = null;
                var err = null;

                if (success) {
                    ident = 'socket' + ++socketCount;
                } else {
                    err = new Error();
                }

                setImmediate(function () {
                    cb(err, ident);
                });
            });
            connectEmitter.emit('obtaining', port, ip);
        };

        protocolConnectionManagerStub.closeHydraSocket = function (identifier) {
            var index = openSockets.indexOf(identifier);

            if (index >= 0) {
                openSockets.splice(index, 1);
            }
        };

        protocolConnectionManagerStub.hydraWriteMessageTo = function (ident, buffer) {
            connectEmitter.emit('msgSent', ident, buffer);
        };

        hydraMessageCenterStub = testUtils.stubPublicApi(sandbox, HydraMessageCenter, {
            wrapFileTransferMessage: function (buffer) {
                return buffer;
            }
        });

        writableFileTransferFactoryStub = testUtils.stubPublicApi(sandbox, WritableFileTransferMessageFactory, {
            constructMessage: function (a, b, payload) {
                return payload;
            }
        });
    });

    after(function () {
        sandbox.restore();
    });
});
//# sourceMappingURL=Middleware.js.map
