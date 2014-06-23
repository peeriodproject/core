/// <reference path='../../../test.d.ts' />
require('should');

var crypto = require('crypto');
var events = require('events');

var sinon = require('sinon');

var testUtils = require('../../../utils/testUtils');

var ObjectConfig = require('../../../../src/core/config/ObjectConfig');

var HydraMessageCenter = require('../../../../src/core/protocol/hydra/HydraMessageCenter');

var HydraCell = require('../../../../src/core/protocol/hydra/HydraCell');

var WritableEncryptedMessageFactory = require('../../../../src/core/protocol/hydra/messages/Aes128GcmWritableMessageFactory');
var ReadableDecryptedMessageFactory = require('../../../../src/core/protocol/hydra/messages/Aes128GcmReadableDecryptedMessageFactory');

var ReadableHydraMessageFactory = require('../../../../src/core/protocol/hydra/messages/ReadableHydraMessageFactory');

var ReadableCellCreatedRejectedMessageFactory = require('../../../../src/core/protocol/hydra/messages/ReadableCellCreatedRejectedMessageFactory');
var ReadableAdditiveSharingMessageFactory = require('../../../../src/core/protocol/hydra/messages/ReadableAdditiveSharingMessageFactory');
var ReadableCreateCellAdditiveMessageFactory = require('../../../../src/core/protocol/hydra/messages/ReadableCreateCellAdditiveMessageFactory');

var WritableHydraMessageFactory = require('../../../../src/core/protocol/hydra/messages/WritableHydraMessageFactory');
var WritableCellCreatedRejectedMessageFactory = require('../../../../src/core/protocol/hydra/messages/WritableCellCreatedRejectedMessageFactory');
var WritableAdditiveSharingMessageFactory = require('../../../../src/core/protocol/hydra/messages/WritableAdditiveSharingMessageFactory');
var WritableCreateCellAdditiveMessageFactory = require('../../../../src/core/protocol/hydra/messages/WritableCreateCellAdditiveMessageFactory');

describe('CORE --> PROTOCOL --> HYDRA --> HydraCell', function () {
    var sandbox = null;

    // STUBS
    var configStub = null;
    var connectionManager = null;
    var messageCenter = null;

    var writableCreateCellFactory = new WritableCreateCellAdditiveMessageFactory();
    var writableAdditiveFactory = new WritableAdditiveSharingMessageFactory();
    var writableHydraFactory = new WritableHydraMessageFactory();
    var encryptionFactory = new WritableEncryptedMessageFactory();
    var cellCreatedRejectedFactory = new WritableCellCreatedRejectedMessageFactory();
    var readableHydraFactory = new ReadableHydraMessageFactory();

    // CHECKERS
    var lastMessageSent = null;

    var cell = null;
    var count = 0;
    var succ = null;

    // HELPER FUNCTIONS
    var sendRelayExtendCellRequest = function () {
        var uuid = crypto.pseudoRandomBytes(16).toString('hex');
        var additivePayload = crypto.pseudoRandomBytes(256);
        var predecessor = cell.getPredecessor();

        var m1 = writableCreateCellFactory.constructMessage(false, uuid, additivePayload);
        var m2 = writableAdditiveFactory.constructMessage('1.1.1.1', 80, m1);
        var m3 = writableHydraFactory.constructMessage('ADDITIVE_SHARING', m2);
        encryptionFactory.encryptMessage(predecessor.incomingKey, true, m3, function (err, buff) {
            if (err)
                throw err;

            var m4 = writableHydraFactory.constructMessage('ENCRYPTED_SPITOUT', buff, buff.length, predecessor.circuitId);

            connectionManager.emit('circuitMessage', readableHydraFactory.create(m4), predecessor);
        });

        return uuid;
    };

    var sendExtensionResponse = function (reject, fuckUp) {
        var successor = cell.getSuccessor();

        var m1 = cellCreatedRejectedFactory.constructMessage(fuckUp ? (new Buffer(16).toString('hex')) : cell.getCurrentUUID(), reject ? null : new Buffer(20), reject ? null : new Buffer(256));
        var m2 = writableHydraFactory.constructMessage('CELL_CREATED_REJECTED', m1, m1.length, successor.circuitId);

        connectionManager.emit('circuitMessage', readableHydraFactory.create(m2), successor);
    };

    var createCell = function (predecessorNode) {
        cell = new HydraCell(predecessorNode, configStub, connectionManager, messageCenter, new ReadableDecryptedMessageFactory(), new WritableEncryptedMessageFactory());
        return cell;
    };

    it('should correctly initialize the cell', function () {
        createCell({
            ip: '2.2.2.2',
            port: 100,
            circuitId: crypto.pseudoRandomBytes(16),
            socketIdentifier: 'ident1',
            incomingKey: crypto.pseudoRandomBytes(16),
            outgoingKey: crypto.pseudoRandomBytes(16)
        }).should.be.instanceof(HydraCell);
    });

    it('should correctly send a CREATE_CELL_ADDITIVE request', function (done) {
        sendRelayExtendCellRequest();

        setTimeout(function () {
            succ = cell.getSuccessor();
            succ.ip.should.equal('1.1.1.1');
            succ.port.should.equal(80);

            lastMessageSent.to.should.equal(cell.getSuccessor());
            lastMessageSent.type.should.equal('CREATE_CELL_ADDITIVE');

            messageCenter.listeners('CELL_CREATED_REJECTED_' + succ.circuitId).length.should.equal(1);
            cell.getExtensionTimeout().should.not.equal(0);

            done();
        }, 50);
    });

    it('should handle the rejection', function (done) {
        sendExtensionResponse(true, false);

        setTimeout(function () {
            (cell.getSuccessor() == null).should.be.true;
            lastMessageSent.to.should.equal(cell.getPredecessor());
            messageCenter.listeners('CELL_CREATED_REJECTED_' + succ.circuitId).length.should.equal(0);
            cell.getExtensionTimeout().should.equal(0);

            done();
        }, 50);
    });

    it('should handle the acceptance of an extension', function (done) {
        sendRelayExtendCellRequest();

        setTimeout(function () {
            sendExtensionResponse(false, false);

            setTimeout(function () {
                (cell.getSuccessor() == null).should.be.false;
                messageCenter.listeners('CELL_CREATED_REJECTED_' + succ.circuitId).length.should.equal(0);
                lastMessageSent.to.should.equal(cell.getPredecessor());
                lastMessageSent.type.should.equal('ENCRYPTED_DIGEST');
                cell.getExtensionTimeout().should.equal(0);
                done();
            }, 50);
        }, 50);
    });

    it('should tear down the circuit on a socket termination', function (done) {
        cell.once('isTornDown', done);
        connectionManager.emit('circuitTermination', cell.getSuccessor().circuitId);
    });

    it('should teardown the circuit when extending the cell', function (done) {
        createCell({
            ip: '2.2.2.2',
            port: 100,
            circuitId: crypto.pseudoRandomBytes(16),
            socketIdentifier: 'ident1',
            incomingKey: crypto.pseudoRandomBytes(16),
            outgoingKey: crypto.pseudoRandomBytes(16)
        });

        sendRelayExtendCellRequest();

        setTimeout(function () {
            succ = cell.getSuccessor();

            cell.on('isTornDown', function () {
                cell.getExtensionTimeout().should.equal(0);
                messageCenter.listeners('CELL_CREATED_REJECTED_' + succ.circuitId).length.should.equal(0);
                done();
            });
        }, 50);
    });

    it('should teardown the circuit when extending the cell on mismatching uuids', function (done) {
        createCell({
            ip: '2.2.2.2',
            port: 100,
            circuitId: crypto.pseudoRandomBytes(16),
            socketIdentifier: 'ident1',
            incomingKey: crypto.pseudoRandomBytes(16),
            outgoingKey: crypto.pseudoRandomBytes(16)
        });

        sendRelayExtendCellRequest();

        setTimeout(function () {
            cell.on('isTornDown', function () {
                done();
            });

            sendExtensionResponse(false, true);
        }, 100);
    });

    before(function () {
        sandbox = sinon.sandbox.create();

        configStub = testUtils.stubPublicApi(sandbox, ObjectConfig, {
            get: function (what) {
                if (what === 'hydra.cell.extensionReactionInSeconds')
                    return 1;
            }
        });

        connectionManager = new events.EventEmitter();

        connectionManager.pipeCircuitMessageTo = function (to, msgType, payload) {
            if (!to.socketIdentifier) {
                to.socketIdentifier = 'hydraNode' + ++count;
            }

            lastMessageSent = {
                to: to,
                type: msgType,
                payload: Buffer
            };
        };
        connectionManager.removeFromCircuitNodes = function () {
        };

        messageCenter = new HydraMessageCenter(connectionManager, new ReadableHydraMessageFactory(), new ReadableCellCreatedRejectedMessageFactory(), new ReadableAdditiveSharingMessageFactory(), new ReadableCreateCellAdditiveMessageFactory(), new WritableCreateCellAdditiveMessageFactory(), new WritableAdditiveSharingMessageFactory(), new WritableHydraMessageFactory(), new WritableCellCreatedRejectedMessageFactory());
    });

    after(function () {
        sandbox.restore();
    });
});
//# sourceMappingURL=HydraCell.js.map
