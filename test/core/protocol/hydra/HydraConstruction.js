/// <reference path='../../../test.d.ts' />
require('should');

var events = require('events');

var sinon = require('sinon');

var testUtils = require('../../../utils/testUtils');

var ObjectConfig = require('../../../../src/core/config/ObjectConfig');

var HydraMessageCenter = require('../../../../src/core/protocol/hydra/HydraMessageCenter');
var ConnectionManager = require('../../../../src/core/protocol/hydra/ConnectionManager');
var CellManager = require('../../../../src/core/protocol/hydra/CellManager');
var CircuitExtenderFactory = require('../../../../src/core/protocol/hydra/CircuitExtenderFactory');
var CircuitManager = require('../../../../src/core/protocol/hydra/CircuitManager');
var HydraCircuitFactory = require('../../../../src/core/protocol/hydra/HydraCircuitFactory');
var HydraCircuit = require('../../../../src/core/protocol/hydra/HydraCircuit');

var HydraCellFactory = require('../../../../src/core/protocol/hydra/HydraCellFactory');
var NodePicker = require('../../../../src/core/protocol/hydra/NodePicker');

var ReadableHydraMessageFactory = require('../../../../src/core/protocol/hydra/messages/ReadableHydraMessageFactory');
var ReadableMessage = require('../../../../src/core/protocol/messages/ReadableMessage');

var ReadableCellCreatedRejectedMessageFactory = require('../../../../src/core/protocol/hydra/messages/ReadableCellCreatedRejectedMessageFactory');
var ReadableAdditiveSharingMessageFactory = require('../../../../src/core/protocol/hydra/messages/ReadableAdditiveSharingMessageFactory');
var ReadableCreateCellAdditiveMessageFactory = require('../../../../src/core/protocol/hydra/messages/ReadableCreateCellAdditiveMessageFactory');

var WritableHydraMessageFactory = require('../../../../src/core/protocol/hydra/messages/WritableHydraMessageFactory');
var WritableCellCreatedRejectedMessageFactory = require('../../../../src/core/protocol/hydra/messages/WritableCellCreatedRejectedMessageFactory');
var WritableAdditiveSharingMessageFactory = require('../../../../src/core/protocol/hydra/messages/WritableAdditiveSharingMessageFactory');
var WritableCreateCellAdditiveMessageFactory = require('../../../../src/core/protocol/hydra/messages/WritableCreateCellAdditiveMessageFactory');

var Aes128GcmLayeredEncDecHandlerFactory = require('../../../../src/core/protocol/hydra/messages/Aes128GcmLayeredEncDecHandlerFactory');
var Aes128GcmReadableDecryptedMessageFactory = require('../../../../src/core/protocol/hydra/messages/Aes128GcmReadableDecryptedMessageFactory');
var Aes128GcmWritableMessageFactory = require('../../../../src/core/protocol/hydra/messages/Aes128GcmWritableMessageFactory');

describe('CORE --> PROTOCOL --> HYDRA --> HydraConstruction (integration)', function () {
    var sandbox = null;
    var config = null;
    var readableHydraMessageFactory = new ReadableHydraMessageFactory();
    var layeredEncDecHandlerFactory = new Aes128GcmLayeredEncDecHandlerFactory();

    var nodes = [];

    var ipCount = 0;
    var socketCount = 0;

    var socketNodeMap = {};

    this.timeout(0);

    it('should build up 5 nodes', function () {
        for (var i = 0; i < 5; i++) {
            createNode();
        }

        nodes.length.should.equal(5);
    });

    it('should build up all circuits', function (done) {
        var builtUp = 0;
        var incAndCheck = function () {
            if (++builtUp === 5)
                done();
        };

        for (var i = 0; i < 5; i++) {
            nodes[i].circuitManager.once('desiredCircuitAmountReached', incAndCheck);

            nodes[i].circuitManager.kickOff();
        }
    });

    it('should pipe a FILE_TRANSFER message through and back the circuits', function (done) {
        var count = 0;
        var checkAndDone = function () {
            if (++count === 5)
                done();
        };

        for (var i = 0; i < 5; i++) {
            (function (node) {
                node.cellManager.on('cellReceivedTransferMessage', function (circuitId, payload) {
                    node.cellManager.pipeFileTransferMessage(circuitId, payload);
                });
                node.circuitManager.on('circuitReceivedTransferMessage', function (circuitId, payload) {
                    if (payload.toString() === 'foobar') {
                        checkAndDone();
                    }
                });

                node.circuitManager.pipeFileTransferMessageThroughAllCircuits(new Buffer('foobar'));
            })(nodes[i]);
        }
    });

    var createNode = function () {
        ipCount++;

        var ip = ipCount + '.' + ipCount + '.' + ipCount + '.' + ipCount;

        var protocolConnectionManager = new events.EventEmitter();

        protocolConnectionManager.keepHydraSocketOpen = function () {
        };
        protocolConnectionManager.keepHydraSocketNoLongerOpen = function () {
        };
        protocolConnectionManager.hydraConnectTo = function (port, ips, callback) {
            var identifier = 'hydra' + ++socketCount;

            socketNodeMap[identifier] = [];
            for (var i = 0, l = nodes.length; i < l; i++) {
                if (nodes[i].ip === ips || nodes[i].ip === ip) {
                    socketNodeMap[identifier].push(nodes[i]);
                }
            }

            setTimeout(function (ident) {
                callback(null, ident);
            }, 50, identifier);
        };

        protocolConnectionManager.hydraWriteMessageTo = function (identifier, buffer) {
            var node = (socketNodeMap[identifier][0].ip === ip && socketNodeMap[identifier].length === 2) ? socketNodeMap[identifier][1] : socketNodeMap[identifier][0];

            if (node) {
                setTimeout(function (n, ident, buf) {
                    n.protocolConnectionManager.emit('hydraMessage', ident, n.ip, testUtils.stubPublicApi(sandbox, ReadableMessage, {
                        getPayload: function () {
                            return buf;
                        }
                    }));
                }, 50, node, identifier, buffer);
            }
        };

        protocolConnectionManager.getHydraSocketIp = function (identifier) {
            var node = socketNodeMap[identifier];

            if (node) {
                return node.ip;
            }

            return null;
        };

        var pickBatch = function (amount) {
            var res = [];
            for (var i = 0; i < nodes.length; i++) {
                if (nodes[i].ip !== ip) {
                    res.push({
                        ip: nodes[i].ip,
                        port: nodes[i].port
                    });
                    if (res.length === amount)
                        break;
                }
            }

            return res;
        };

        var connectionManager = new ConnectionManager(protocolConnectionManager, new WritableHydraMessageFactory(), new ReadableHydraMessageFactory());

        var messageCenter = new HydraMessageCenter(connectionManager, new ReadableHydraMessageFactory(), new ReadableCellCreatedRejectedMessageFactory(), new ReadableAdditiveSharingMessageFactory(), new ReadableCreateCellAdditiveMessageFactory(), new WritableCreateCellAdditiveMessageFactory(), new WritableAdditiveSharingMessageFactory(), new WritableHydraMessageFactory(), new WritableCellCreatedRejectedMessageFactory());

        var circuitExtenderFactory = new CircuitExtenderFactory(connectionManager, messageCenter);

        var circuitFactory = testUtils.stubPublicApi(sandbox, HydraCircuitFactory, {
            create: function (numOfRelayNodes) {
                var nodePicker = testUtils.stubPublicApi(sandbox, NodePicker, {
                    pickRelayNodeBatch: function (cb) {
                        setImmediate(function () {
                            cb(pickBatch(numOfRelayNodes));
                        });
                    },
                    pickNextAdditiveNodeBatch: function (cb) {
                        setImmediate(function () {
                            cb(pickBatch(3));
                        });
                    }
                });

                return new HydraCircuit(config, 4, nodePicker, messageCenter, connectionManager, layeredEncDecHandlerFactory, circuitExtenderFactory);
            }
        });

        var cellFactory = new HydraCellFactory(config, connectionManager, messageCenter, new Aes128GcmReadableDecryptedMessageFactory(), new Aes128GcmWritableMessageFactory());

        var circuitManager = new CircuitManager(config, circuitFactory);

        var cellManager = new CellManager(config, connectionManager, messageCenter, cellFactory);

        nodes.push({
            ip: ip,
            port: 80,
            protocolConnectionManager: protocolConnectionManager,
            circuitManager: circuitManager,
            cellManager: cellManager
        });
    };

    before(function () {
        sandbox = sinon.sandbox.create();

        config = testUtils.stubPublicApi(sandbox, ObjectConfig, {
            get: function (what) {
                if (what === 'hydra.desiredNumberOfCircuits')
                    return 1;
                if (what === 'hydra.maximumNumberOfMaintainedCells')
                    return 4;
                if (what === 'hydra.minimumNumberOfRelayNodes')
                    return 4;
                if (what === 'hydra.maximumNumberOfRelayNodes')
                    return 4;
                if (what === 'hydra.additiveSharingNodeAmount')
                    return 3;
                if (what === 'hydra.waitForAdditiveBatchFinishInSeconds')
                    return 10;
                if (what === 'hydra.circuit.extensionReactionTimeBaseInSeconds')
                    return 10;
                if (what === 'hydra.circuit.extensionReactionTimeFactor')
                    return 1.5;
                if (what === 'hydra.circuit.maximumExtensionRetries')
                    return 2;
                if (what === 'hydra.cell.extensionReactionInSeconds')
                    return 10;
            }
        });
    });

    after(function () {
        sandbox.restore();
    });
});
//# sourceMappingURL=HydraConstruction.js.map
