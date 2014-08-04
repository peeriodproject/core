/// <reference path='../../../test.d.ts' />
require('should');

var crypto = require('crypto');
var events = require('events');

var sinon = require('sinon');

var testUtils = require('../../../utils/testUtils');

var HydraMessageCenter = require('../../../../src/core/protocol/hydra/HydraMessageCenter');

var CellManager = require('../../../../src/core/protocol/hydra/CellManager');

var ObjectConfig = require('../../../../src/core/config/ObjectConfig');

var WritableCreateCellAdditiveMessageFactory = require('../../../../src/core/protocol/hydra/messages/WritableCreateCellAdditiveMessageFactory');
var ReadableCreateCellAdditiveMessageFactory = require('../../../../src/core/protocol/hydra/messages/ReadableCreateCellAdditiveMessageFactory');

describe('CORE --> PROTOCOL --> HYDRA --> CellManager', function () {
    var cellManager = null;

    var sandbox = null;
    var socketCount = 0;
    var writableCreateCellFactory = new WritableCreateCellAdditiveMessageFactory();
    var readableCreateCellFactory = new ReadableCreateCellAdditiveMessageFactory();

    // STUBS
    var configStub = null;
    var cellFactory = {};
    var messageCenterStub = null;
    var connectionManagerStub = null;

    var onMessageListener = null;

    // CHECKERS
    var responseSent = null;
    var circuitNodes = [];

    var closedSocketFrom = null;

    // HELPER FUNCTIONS
    var sendCreateCellMessage = function (uuid, circuitId) {
        var identifier = 'hydra' + ++socketCount;

        var msg = writableCreateCellFactory.constructMessage(circuitId ? true : false, uuid, crypto.pseudoRandomBytes(256), circuitId);
        onMessageListener(identifier, readableCreateCellFactory.create(msg));

        return identifier;
    };

    var terminateCircuit = function (circuitId) {
        connectionManagerStub.emit('circuitTermination', circuitId);
    };

    var tearDownCell = function (cell) {
        cell.emit('isTornDown');
    };

    it('should correctly initialize the cell manager', function () {
        cellManager = new CellManager(configStub, connectionManagerStub, messageCenterStub, cellFactory);

        cellManager.should.be.instanceof(CellManager);
    });

    it('should accept one request and reject the other', function (done) {
        cellManager.once('timeout', function () {
            throw new Error('Timeout should not be present');
        });

        var uuid1 = 'cafebabecafebabecafebabecafebabe';
        var uuid2 = 'babecafebabecafebabecafebabecafe';
        var circuitId1 = 'ffffffffffffffffffffffffffffffff';
        var circuitId2 = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

        sendCreateCellMessage(uuid1);
        var ident2 = sendCreateCellMessage(uuid2, circuitId2);

        cellManager.getPending()[uuid2].initiator.socketIdentifier.should.equal(ident2);
        cellManager.getPending()[uuid2].circuitId.should.equal(circuitId2);
        (cellManager.getPending()[uuid1].initiator == undefined).should.be.true;

        var ident1 = sendCreateCellMessage(uuid1, circuitId1);

        circuitNodes.length.should.equal(2);
        responseSent.to.socketIdentifier.should.equal(ident1);
        responseSent.rejected.should.be.false;
        responseSent.uuid.should.equal(uuid1);

        sendCreateCellMessage(uuid2);

        circuitNodes.length.should.equal(1);
        (closedSocketFrom == null).should.be.true;

        Object.keys(cellManager.getPending()).length.should.equal(0);

        connectionManagerStub.listeners('circuitTermination').length.should.equal(0);

        var cell = cellManager.getCells()[0];

        cell.predecessor.should.equal(circuitNodes[0]);
        responseSent.uuid.should.equal(uuid2);
        responseSent.rejected.should.be.true;

        setTimeout(function () {
            cellManager.removeAllListeners('timeout');
            done();
        }, 1100);
    });

    it('should remove the cell from the maintained list if the cell is torn down', function (done) {
        tearDownCell(cellManager.getCells()[0]);

        setImmediate(function () {
            cellManager.getCells().length.should.equal(0);
            done();
        });
    });

    it('should handle the termination of the circuits when constructing', function (done) {
        cellManager.once('timeout', function () {
            throw new Error('Timeout should not be present');
        });

        var uuid1 = 'cafebabecafebabecafebabecafebabe';
        var uuid2 = 'babecafebabecafebabecafebabecafe';
        var circuitId1 = 'ffffffffffffffffffffffffffffffff';
        var circuitId2 = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

        var ident2 = sendCreateCellMessage(uuid2, circuitId2);
        sendCreateCellMessage(uuid1, circuitId1);

        connectionManagerStub.listeners('circuitTermination').length.should.equal(2);

        terminateCircuit(circuitId1);

        setImmediate(function () {
            Object.keys(cellManager.getPending()).length.should.equal(1);
            cellManager.getPending()[uuid2].circuitId.should.equal(circuitId2);
            cellManager.getPending()[uuid2].initiator.socketIdentifier.should.equal(ident2);
            connectionManagerStub.listeners('circuitTermination').length.should.equal(1);

            terminateCircuit(circuitId2);

            setImmediate(function () {
                Object.keys(cellManager.getPending()).length.should.equal(0);
                connectionManagerStub.listeners('circuitTermination').length.should.equal(0);

                setTimeout(function () {
                    cellManager.removeAllListeners('timeout');
                    done();
                }, 1100);
            });
        });
    });

    it('should correctly handle the timeout on a pending request', function (done) {
        var uuid1 = 'cafebabecafebabecafebabecafebabe';
        var circuitId1 = 'ffffffffffffffffffffffffffffffff';

        sendCreateCellMessage(uuid1, circuitId1);

        setImmediate(function () {
            Object.keys(cellManager.getPending()).length.should.equal(1);

            cellManager.once('timeout', function () {
                Object.keys(cellManager.getPending()).length.should.equal(0);
                done();
            });
        });
    });

    before(function () {
        sandbox = sinon.sandbox.create();

        configStub = testUtils.stubPublicApi(sandbox, ObjectConfig, {
            get: function (what) {
                if (what === 'hydra.maximumNumberOfMaintainedCells')
                    return 1;
                if (what === 'hydra.additiveSharingNodeAmount')
                    return 1;
                if (what === 'hydra.waitForAdditiveBatchFinishInSeconds')
                    return 1;
            }
        });

        cellFactory.create = function (initiatorNode) {
            var cell = new events.EventEmitter();

            cell.predecessor = initiatorNode;
            cell.getPredecessorCircuitId = function () {
                return cell.predecessor.circuitId;
            };
            cell.getFeedingIdentifier = function () {
                return cell.predecessor.feedingIdentifier;
            };

            return cell;
        };

        messageCenterStub = testUtils.stubPublicApi(sandbox, HydraMessageCenter, {
            sendCellCreatedRejectedMessage: function (initiatorNode, uuid, sha1, publicKey) {
                responseSent = {
                    to: initiatorNode,
                    uuid: uuid,
                    rejected: (sha1 && publicKey) ? false : true
                };
            },
            on: function (what, cb) {
                if (what === 'CREATE_CELL_ADDITIVE') {
                    onMessageListener = cb;
                }
            }
        });

        connectionManagerStub = new events.EventEmitter();

        connectionManagerStub.addToCircuitNodes = function (socketIdentifier, node) {
            node.socketIdentifier = socketIdentifier;
            circuitNodes.push(node);
        };

        connectionManagerStub.removeFromCircuitNodes = function (node, closeSocket) {
            if (typeof closeSocket === "undefined") { closeSocket = true; }
            if (closeSocket) {
                closedSocketFrom = node.socketIdentifier;
            }
            for (var i = 0; i < circuitNodes.length; i++) {
                if (circuitNodes[i] === node) {
                    circuitNodes.splice(i, 1);
                    break;
                }
            }
        };

        connectionManagerStub.closeSocketByIdentifier = function () {
        };
    });

    after(function () {
        sandbox.restore();
    });
});
//# sourceMappingURL=CellManager.js.map
