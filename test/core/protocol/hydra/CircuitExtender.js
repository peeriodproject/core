/// <reference path='../../../test.d.ts' />
require('should');

var crypto = require('crypto');
var events = require('events');

var sinon = require('sinon');

var testUtils = require('../../../utils/testUtils');

var HydraMessageCenter = require('../../../../src/core/protocol/hydra/HydraMessageCenter');
var HydraConnectionManager = require('../../../../src/core/protocol/hydra/HydraConnectionManager');

var CircuitExtender = require('../../../../src/core/protocol/hydra/CircuitExtender');
var AdditiveSharingScheme = require('../../../../src/core/crypto/AdditiveSharingScheme');

var ReadableHydraMessageFactory = require('../../../../src/core/protocol/hydra/messages/ReadableHydraMessageFactory');

var ReadableCellCreatedRejectedMessageFactory = require('../../../../src/core/protocol/hydra/messages/ReadableCellCreatedRejectedMessageFactory');
var ReadableAdditiveSharingMessageFactory = require('../../../../src/core/protocol/hydra/messages/ReadableAdditiveSharingMessageFactory');
var ReadableCreateCellAdditiveMessageFactory = require('../../../../src/core/protocol/hydra/messages/ReadableCreateCellAdditiveMessageFactory');

var WritableHydraMessageFactory = require('../../../../src/core/protocol/hydra/messages/WritableHydraMessageFactory');
var WritableCellCreatedRejectedMessageFactory = require('../../../../src/core/protocol/hydra/messages/WritableCellCreatedRejectedMessageFactory');
var WritableAdditiveSharingMessageFactory = require('../../../../src/core/protocol/hydra/messages/WritableAdditiveSharingMessageFactory');
var WritableCreateCellAdditiveMessageFactory = require('../../../../src/core/protocol/hydra/messages/WritableCreateCellAdditiveMessageFactory');
var LayeredEncDecHandler = require('../../../../src/core/protocol/hydra/messages/Aes128GcmLayeredEncDecHandler');

describe('CORE --> PROTOCOL --> HYDRA --> CircuitExtender @current', function () {
    // as this class is closely connected to the MessageCenter, we do not stub the message center
    var sandbox;

    var messagePipeEmitter = new events.EventEmitter();

    var connectionManager = null;
    var messageCenter = null;

    var hydraMessageCallback = null;

    var writableHydraMessageFactory = new WritableHydraMessageFactory();
    var readableHydraMessageFactory = new ReadableHydraMessageFactory();

    var circuitExtender = null;

    var layeredEncDec = null;

    var emitHydraMessage = function (ip, msgType, message, circuitId) {
        process.nextTick(function () {
            hydraMessageCallback(ip, readableHydraMessageFactory.create(writableHydraMessageFactory.constructMessage(msgType, message, message.length, circuitId)));
        });
    };

    before(function () {
        sandbox = sinon.sandbox.create();

        connectionManager = testUtils.stubPublicApi(sandbox, HydraConnectionManager, {
            on: function (what, callback) {
                if (what === 'hydraMessage') {
                    hydraMessageCallback = callback;
                }
            },
            pipeMessage: function (msgType, payload, to, circuitId) {
                messagePipeEmitter.emit('message', msgType, payload, to, circuitId);
            }
        });

        messageCenter = new HydraMessageCenter(connectionManager, new ReadableCellCreatedRejectedMessageFactory(), new ReadableAdditiveSharingMessageFactory(), new ReadableCreateCellAdditiveMessageFactory(), new WritableCreateCellAdditiveMessageFactory(), new WritableAdditiveSharingMessageFactory(), new WritableHydraMessageFactory());

        layeredEncDec = new LayeredEncDecHandler();
    });

    after(function () {
        sandbox.restore();
    });

    it('should correctly initialize a circuit extender', function () {
        circuitExtender = new CircuitExtender(1000, 1.1, connectionManager, messageCenter, layeredEncDec);
        circuitExtender.should.be.instanceof(CircuitExtender);
        circuitExtender.getNodes().length.should.equal(0);
    });

    it('should request a first circuit extension and handle its rejection', function (done) {
        var nodeToExtendWith = {
            ip: '1.1.1.1',
            port: 80
        };
        var additiveNodes = [
            {
                ip: '2.2.2.2',
                port: 70
            },
            {
                ip: '3.3.3.3',
                port: 75
            }
        ];

        var circuitId = null;
        var uuid = null;

        var receivedCount = 0;

        messagePipeEmitter.on('message', function (msgType, payload, to, circId) {
            receivedCount++;

            if (msgType === 'ADDITIVE_SHARING') {
                (['2.2.2.2', '3.3.3.3']).should.containEql(to.ip);
            } else if (msgType === 'CREATE_CELL_ADDITIVE') {
                to.ip.should.equal('1.1.1.1');
                var msg = (new ReadableCreateCellAdditiveMessageFactory()).create(payload);
                circuitId = msg.getCircuitId();
                uuid = msg.getUUID();
            }

            if (receivedCount === 3) {
                messagePipeEmitter.removeAllListeners('message');
                emitHydraMessage('1.1.1.1', 'CELL_CREATED_REJECTED', (new WritableCellCreatedRejectedMessageFactory()).constructMessage(uuid), circuitId);
            }
        });

        circuitExtender.extend(nodeToExtendWith, additiveNodes, function (err, isRejected, newNode) {
            (err === null).should.be.true;
            isRejected.should.be.true;
            (newNode === null).should.be.true;

            messageCenter.listeners('CELL_CREATED_REJECTED_' + circuitId).length.should.equal(0);
            done();
        });
    });

    it('should request a first circuit extension and handle the acceptance', function (done) {
        var nodeToExtendWith = {
            ip: '4.4.4.4',
            port: 80
        };
        var additiveNodes = [
            {
                ip: '2.2.2.2',
                port: 70
            },
            {
                ip: '3.3.3.3',
                port: 75
            }
        ];

        var circuitId = null;
        var uuid = null;
        var dhGroup = crypto.getDiffieHellman('modp14');
        dhGroup.generateKeys();

        var receivedCount = 0;
        var bufList = [];

        messagePipeEmitter.on('message', function (msgType, payload, to, circId) {
            receivedCount++;

            if (msgType === 'ADDITIVE_SHARING') {
                (['2.2.2.2', '3.3.3.3']).should.containEql(to.ip);
                var msg = (new ReadableCreateCellAdditiveMessageFactory()).create((new ReadableAdditiveSharingMessageFactory()).create(payload).getPayload());

                bufList.push(msg.getAdditivePayload());
            } else if (msgType === 'CREATE_CELL_ADDITIVE') {
                to.ip.should.equal('4.4.4.4');
                var msg = (new ReadableCreateCellAdditiveMessageFactory()).create(payload);
                circuitId = msg.getCircuitId();
                uuid = msg.getUUID();

                bufList.push(msg.getAdditivePayload());
            }

            if (receivedCount === 3) {
                var dh = AdditiveSharingScheme.getCleartext(bufList, 256);
                console.log(dh.length);
                var secret = dhGroup.computeSecret(dh);
                var sha = crypto.createHash('sha1');
                var secretHash = sha.update(secret).digest();

                messagePipeEmitter.removeAllListeners('message');
                emitHydraMessage('4.4.4.4', 'CELL_CREATED_REJECTED', (new WritableCellCreatedRejectedMessageFactory()).constructMessage(uuid, secretHash, dhGroup.getPublicKey()), circuitId);
            }
        });

        circuitExtender.extend(nodeToExtendWith, additiveNodes, function (err, isRejected, newNode) {
            (err === null).should.be.true;
            isRejected.should.be.false;
            newNode.ip.should.equal('4.4.4.4');
            newNode.incomingKey.length.should.equal(16);
            newNode.outgoingKey.length.should.equal(16);
            newNode.circuitId.should.equal(circuitId);

            circuitExtender.getNodes()[0].ip.should.equal('4.4.4.4');
            circuitExtender.getExpectReactionFrom().ip.should.equal('4.4.4.4');
            circuitExtender.getCircuitId().should.equal(circuitId);

            done();
        });
    });
});
//# sourceMappingURL=CircuitExtender.js.map
