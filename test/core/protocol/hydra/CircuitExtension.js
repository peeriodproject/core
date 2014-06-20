/// <reference path='../../../test.d.ts' />
require('should');

var crypto = require('crypto');
var events = require('events');

var sinon = require('sinon');

var testUtils = require('../../../utils/testUtils');

var HydraMessageCenter = require('../../../../src/core/protocol/hydra/HydraMessageCenter');
var ConnectionManager = require('../../../../src/core/protocol/hydra/ConnectionManager');
var ProtocolConnectionManager = require('../../../../src/core/protocol/net/ProtocolConnectionManager');

var CircuitExtender = require('../../../../src/core/protocol/hydra/CircuitExtender');
var AdditiveSharingScheme = require('../../../../src/core/crypto/AdditiveSharingScheme');

var ReadableMessage = require('../../../../src/core/protocol/messages/ReadableMessage');
var ReadableHydraMessageFactory = require('../../../../src/core/protocol/hydra/messages/ReadableHydraMessageFactory');

var ReadableCellCreatedRejectedMessageFactory = require('../../../../src/core/protocol/hydra/messages/ReadableCellCreatedRejectedMessageFactory');
var ReadableAdditiveSharingMessageFactory = require('../../../../src/core/protocol/hydra/messages/ReadableAdditiveSharingMessageFactory');
var ReadableCreateCellAdditiveMessageFactory = require('../../../../src/core/protocol/hydra/messages/ReadableCreateCellAdditiveMessageFactory');

var WritableHydraMessageFactory = require('../../../../src/core/protocol/hydra/messages/WritableHydraMessageFactory');
var WritableCellCreatedRejectedMessageFactory = require('../../../../src/core/protocol/hydra/messages/WritableCellCreatedRejectedMessageFactory');
var WritableAdditiveSharingMessageFactory = require('../../../../src/core/protocol/hydra/messages/WritableAdditiveSharingMessageFactory');
var WritableCreateCellAdditiveMessageFactory = require('../../../../src/core/protocol/hydra/messages/WritableCreateCellAdditiveMessageFactory');
var LayeredEncDecHandler = require('../../../../src/core/protocol/hydra/messages/Aes128GcmLayeredEncDecHandler');

describe('CORE --> PROTOCOL --> HYDRA --> Circuit extension (integration) @current', function () {
    this.timeout(0);

    var sandbox = null;

    // STUBS
    var protocolConnectionManagerStub = null;

    // HELPERS
    var theSocketIdentifier = null;
    var openSockets = [];

    var messageListener = new events.EventEmitter();

    var terminationCallback = null;
    var emitTermination = function (identifier) {
        var i = openSockets.indexOf(identifier);
        if (i > -1) {
            openSockets.splice(i, 1);
            terminationCallback(identifier);
        }
    };

    var messageCallback = null;
    var writableHydraMessageFactory = new WritableHydraMessageFactory();
    var readablyHydraMessageFactory = new ReadableHydraMessageFactory();

    var emitHydraMessage = function (type, identifier, messagePayload, circuitId) {
        var msgPayload = writableHydraMessageFactory.constructMessage(type, messagePayload, messagePayload.length, circuitId);
        var msg = testUtils.stubPublicApi(sandbox, ReadableMessage, {
            getPayload: function () {
                return msgPayload;
            }
        });
        messageCallback(identifier, null, msg);
    };

    var connectionError = null;
    var socketCount = 0;

    // INSTANCES USED
    var connectionManager = null;
    var messageCenter = null;
    var layeredEncDec = null;
    var circuitExtender = null;

    it('should correctly instantiate the connection manager, message center, and extender', function () {
        connectionManager = new ConnectionManager(protocolConnectionManagerStub, new WritableHydraMessageFactory(), new ReadableHydraMessageFactory());
        messageCenter = new HydraMessageCenter(connectionManager, new ReadableCellCreatedRejectedMessageFactory(), new ReadableAdditiveSharingMessageFactory(), new ReadableCreateCellAdditiveMessageFactory(), new WritableCreateCellAdditiveMessageFactory(), new WritableAdditiveSharingMessageFactory(), new WritableHydraMessageFactory());
        layeredEncDec = new LayeredEncDecHandler();

        circuitExtender = new CircuitExtender(1000, 1.1, connectionManager, messageCenter, layeredEncDec);

        connectionManager.should.be.instanceof(ConnectionManager);
        messageCenter.should.be.instanceof(HydraMessageCenter);
        layeredEncDec.should.be.instanceof(LayeredEncDecHandler);
        circuitExtender.should.be.instanceof(CircuitExtender);
    });

    it('should pipe all the message and add the node to extend with to the circuit nodes and handle the timeout', function (done) {
        var nodeToExtendWith = {
            ip: '1.1.1.1',
            port: 80
        };

        var additiveNodes = [
            {
                ip: '2.2.2.2',
                port: 80
            },
            {
                ip: '3.3.3.3',
                port: 80
            }
        ];

        var count = 0;
        messageListener.on('message', function (identifier, msg) {
            if (msg.getMessageType() === 'CREATE_CELL_ADDITIVE') {
                count++;
                connectionManager.getCircuitNodes()[identifier].socketIdentifier.should.equal(identifier);
                connectionManager.getCircuitNodes()[identifier].circuitId.should.equal(circuitExtender.getCircuitId());
                (connectionManager.getCircuitNodes()[identifier] === circuitExtender.getExpectReactionFrom()).should.be.true;
            } else if (msg.getMessageType() === 'ADDITIVE_SHARING')
                count++;
        });

        circuitExtender.extend(nodeToExtendWith, additiveNodes, function (err, isRejected, newNode) {
            messageListener.removeAllListeners('message');

            count.should.equal(3);
            err.message.should.equal('CircuitExtender: Timed out');
            isRejected.should.be.false;
            (newNode == null).should.be.true;

            Object.keys(connectionManager.getCircuitNodes()).length.should.equal(0);

            done();
        });
    });

    it('should correctly handle the termination of a circuit socket while extending', function (done) {
        var nodeToExtendWith = {
            ip: '1.1.1.1',
            port: 80
        };

        var additiveNodes = [
            {
                ip: '2.2.2.2',
                port: 80
            },
            {
                ip: '3.3.3.3',
                port: 80
            }
        ];

        messageListener.on('message', function (identifier, msg) {
            if (msg.getMessageType() === 'CREATE_CELL_ADDITIVE') {
                emitTermination(identifier);
            }
        });

        circuitExtender.extend(nodeToExtendWith, additiveNodes, function (err, isRejected, newNode) {
            messageListener.removeAllListeners('message');

            err.message.should.equal('CircuitExtender: Circuit socket terminated');
            Object.keys(connectionManager.getCircuitNodes()).length.should.equal(0);
            circuitExtender.getNodes().length.should.equal(0);
            layeredEncDec.getNodes().length.should.equal(0);

            done();
        });
    });

    it('should correctly handle the acceptance of a circuit extension (first node)', function (done) {
        var nodeToExtendWith = {
            ip: '1.1.1.1',
            port: 80
        };

        var additiveNodes = [
            {
                ip: '2.2.2.2',
                port: 80
            },
            {
                ip: '3.3.3.3',
                port: 80
            }
        ];

        var receivedCount = 0;
        var bufList = [];
        var circuitId = null;
        var uuid = null;
        var dhGroup = crypto.getDiffieHellman('modp14');
        dhGroup.generateKeys();

        messageListener.on('message', function (identifier, message) {
            receivedCount++;

            if (message.getMessageType() === 'CREATE_CELL_ADDITIVE') {
                theSocketIdentifier = identifier;

                var msg = (new ReadableCreateCellAdditiveMessageFactory()).create(message.getPayload());
                circuitId = msg.getCircuitId();
                uuid = msg.getUUID();

                bufList.push(msg.getAdditivePayload());
            } else if (message.getMessageType() == 'ADDITIVE_SHARING') {
                (connectionManager.getCircuitNodes()[identifier] == undefined).should.be.true;
                var msg = (new ReadableCreateCellAdditiveMessageFactory()).create((new ReadableAdditiveSharingMessageFactory()).create(message.getPayload()).getPayload());

                bufList.push(msg.getAdditivePayload());
            }

            if (receivedCount === 3) {
                var dh = AdditiveSharingScheme.getCleartext(bufList, 256);
                var secret = dhGroup.computeSecret(dh);
                var sha = crypto.createHash('sha1');
                var secretHash = sha.update(secret).digest();

                messageListener.removeAllListeners('message');

                emitHydraMessage('CELL_CREATED_REJECTED', theSocketIdentifier, (new WritableCellCreatedRejectedMessageFactory()).constructMessage(uuid, secretHash, dhGroup.getPublicKey()), circuitId);
            }
        });

        circuitExtender.extend(nodeToExtendWith, additiveNodes, function (err, isRejected, newNode) {
            (newNode === connectionManager.getCircuitNodes()[theSocketIdentifier]).should.be.true;
            (newNode === layeredEncDec.getNodes()[0]).should.be.true;
            (newNode === circuitExtender.getExpectReactionFrom()).should.be.true;

            newNode.incomingKey.length.should.equal(16);
            newNode.outgoingKey.length.should.equal(16);
            newNode.socketIdentifier.should.equal(theSocketIdentifier);

            newNode.incomingKey = newNode.outgoingKey;

            done();
        });
    });

    it('should handle the rejection of an extension (second node)', function (done) {
        var nodeToExtendWith = {
            ip: '2.2.2.2',
            port: 80
        };

        var additiveNodes = [
            {
                ip: '3.3.3.3',
                port: 80
            },
            {
                ip: '4.4.4.4',
                port: 80
            }
        ];

        var uuid = null;

        messageListener.on('message', function (identifier, message) {
            if (message.getMessageType() === 'ENCRYPTED_SPITOUT') {
                identifier.should.equal(theSocketIdentifier);

                layeredEncDec.decrypt(message.getPayload(), function (err, decryptedBuf) {
                    var msg = (new ReadableCreateCellAdditiveMessageFactory()).create((new ReadableAdditiveSharingMessageFactory()).create(readablyHydraMessageFactory.create(decryptedBuf).getPayload()).getPayload());
                    uuid = msg.getUUID();

                    messageListener.removeAllListeners('message');

                    emitHydraMessage('CELL_CREATED_REJECTED', theSocketIdentifier, (new WritableCellCreatedRejectedMessageFactory()).constructMessage(uuid), layeredEncDec.getNodes()[0].circuitId);
                });
            }
        });

        circuitExtender.extend(nodeToExtendWith, additiveNodes, function (err, isRejected, newNode) {
            // wait until all messages have been sent. it's a bit too fast
            setTimeout(function () {
                isRejected.should.be.true;
                (err == null).should.be.true;
                (newNode == null).should.be.true;

                Object.keys(connectionManager.getCircuitNodes()).length.should.equal(1);

                (circuitExtender.getExpectReactionFrom() === layeredEncDec.getNodes()[0]).should.be.true;

                done();
            }, 500);
        });
    });

    it('should handle the acceptance of an extension (second ndoe)', function (done) {
        var nodeToExtendWith = {
            ip: '4.4.4.4',
            port: 80
        };

        var additiveNodes = [
            {
                ip: '2.2.2.2',
                port: 80
            },
            {
                ip: '3.3.3.3',
                port: 80
            }
        ];

        var receivedCount = 0;
        var bufList = [];
        var uuid = null;
        var dhGroup = crypto.getDiffieHellman('modp14');
        dhGroup.generateKeys();

        var check = function () {
            if (receivedCount === 3) {
                var dh = AdditiveSharingScheme.getCleartext(bufList, 256);

                var secret = dhGroup.computeSecret(dh);
                var sha = crypto.createHash('sha1');
                var secretHash = sha.update(secret).digest();

                messageListener.removeAllListeners('message');

                emitHydraMessage('CELL_CREATED_REJECTED', theSocketIdentifier, (new WritableCellCreatedRejectedMessageFactory()).constructMessage(uuid, secretHash, dhGroup.getPublicKey()), circuitExtender.getCircuitId());
            }
        };

        messageListener.on('message', function (identifier, message) {
            receivedCount++;

            if (message.getMessageType() === 'ENCRYPTED_SPITOUT') {
                theSocketIdentifier.should.equal(identifier);

                layeredEncDec.decrypt(message.getPayload(), function (err, decryptedBuf) {
                    var msg = (new ReadableCreateCellAdditiveMessageFactory()).create((new ReadableAdditiveSharingMessageFactory()).create(readablyHydraMessageFactory.create(decryptedBuf).getPayload()).getPayload());
                    uuid = msg.getUUID();

                    bufList.push(msg.getAdditivePayload());

                    check();
                });
            } else if (message.getMessageType() == 'ADDITIVE_SHARING') {
                (connectionManager.getCircuitNodes()[identifier] == undefined).should.be.true;
                var msg = (new ReadableCreateCellAdditiveMessageFactory()).create((new ReadableAdditiveSharingMessageFactory()).create(message.getPayload()).getPayload());

                bufList.push(msg.getAdditivePayload());

                check();
            }
        });

        circuitExtender.extend(nodeToExtendWith, additiveNodes, function (err, isRejected, newNode) {
            (newNode === layeredEncDec.getNodes()[1]).should.be.true;

            circuitExtender.getNodes().length.should.equal(2);
            Object.keys(connectionManager.getCircuitNodes()).length.should.equal(1);

            newNode.incomingKey.length.should.equal(16);
            newNode.outgoingKey.length.should.equal(16);

            newNode.incomingKey = newNode.outgoingKey;

            done();
        });
    });

    it('should not react to messages when the circuit socket terminates', function (done) {
        var nodeToExtendWith = {
            ip: '2.2.2.2',
            port: 80
        };

        var additiveNodes = [
            {
                ip: '5.5.5.5',
                port: 80
            },
            {
                ip: '3.3.3.3',
                port: 80
            }
        ];

        messageListener.on('message', function (identifier, message) {
            if (message.getMessageType() === 'ENCRYPTED_SPITOUT') {
                messageListener.removeAllListeners('message');

                emitTermination(theSocketIdentifier);

                theSocketIdentifier.should.equal(identifier);

                layeredEncDec.decrypt(message.getPayload(), function (err, decryptedBuf) {
                    var msg = (new ReadableCreateCellAdditiveMessageFactory()).create((new ReadableAdditiveSharingMessageFactory()).create(readablyHydraMessageFactory.create(decryptedBuf).getPayload()).getPayload());
                    var uuid = msg.getUUID();

                    emitHydraMessage('CELL_CREATED_REJECTED', theSocketIdentifier, (new WritableCellCreatedRejectedMessageFactory()).constructMessage(uuid), circuitExtender.getCircuitId());
                });
            }
        });

        circuitExtender.extend(nodeToExtendWith, additiveNodes, function (err, isRejected, newNode) {
            err.message.should.equal('CircuitExtender: Circuit socket terminated');

            connectionManager.listeners('CELL_CREATED_REJECTED_' + circuitExtender.getCircuitId()).length.should.equal(0);
            connectionManager.listeners('circuitTermination').length.should.equal(0);

            setTimeout(function () {
                done();
            }, 300);
        });
    });

    it('should error out if the hash of the secret does not match', function (done) {
        layeredEncDec = new LayeredEncDecHandler();

        circuitExtender = new CircuitExtender(1000, 1.1, connectionManager, messageCenter, layeredEncDec);

        var nodeToExtendWith = {
            ip: '2.2.2.2',
            port: 80
        };

        var additiveNodes = [
            {
                ip: '5.5.5.5',
                port: 80
            },
            {
                ip: '3.3.3.3',
                port: 80
            }
        ];

        messageListener.on('message', function (identifier, message) {
            if (message.getMessageType() === 'CREATE_CELL_ADDITIVE') {
                messageListener.removeAllListeners('message');

                var msg = (new ReadableCreateCellAdditiveMessageFactory()).create(message.getPayload());
                var uuid = msg.getUUID();
                var circuitId = msg.getCircuitId();

                emitHydraMessage('CELL_CREATED_REJECTED', identifier, (new WritableCellCreatedRejectedMessageFactory()).constructMessage(uuid, crypto.randomBytes(20), crypto.randomBytes(256)), circuitId);
            }
        });

        circuitExtender.extend(nodeToExtendWith, additiveNodes, function (err) {
            err.message.should.equal('CircuitExtender: Hashes of shared secret do not match.');
            done();
        });
    });

    before(function () {
        sandbox = sinon.sandbox.create();

        protocolConnectionManagerStub = testUtils.stubPublicApi(sandbox, ProtocolConnectionManager, {
            on: function (what, callback) {
                if (what === 'terminatedConnection') {
                    terminationCallback = callback;
                } else if (what === 'hydraMessage') {
                    messageCallback = callback;
                }
            },
            hydraConnectTo: function (port, ip, callback) {
                if (connectionError) {
                    setTimeout(function () {
                        callback(connectionError);
                    }, 10);
                } else {
                    setTimeout(function () {
                        var identifier = 'hydra' + ++socketCount;
                        openSockets.push(identifier);
                        callback(null, identifier);
                    }, 10);
                }
            },
            hydraWriteMessageTo: function (identifier, sendableBuffer) {
                if (openSockets.indexOf(identifier) > -1) {
                    var msg = readablyHydraMessageFactory.create(sendableBuffer);
                    setImmediate(function () {
                        messageListener.emit('message', identifier, msg);
                    });
                }
            }
        });
    });

    after(function () {
        sandbox.restore();
    });
});
//# sourceMappingURL=CircuitExtension.js.map
