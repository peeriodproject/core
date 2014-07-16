/// <reference path='../../../test.d.ts' />
require('should');

var events = require('events');

var sinon = require('sinon');

var testUtils = require('../../../utils/testUtils');

var ObjectConfig = require('../../../../src/core/config/ObjectConfig');

var ShareMessenger = require('../../../../src/core/protocol/fileTransfer/share/ShareMessenger');

describe('CORE --> PROTOCOL --> FILE TRANSFER --> ShareMessenger', function () {
    var sandbox = null;
    var configStub = null;

    var circuitManager1 = new events.EventEmitter();
    var circuitManager2 = new events.EventEmitter();
    var circuitCount1 = 0;
    var circuitCount2 = 0;
    var transferMessageCenter1 = new events.EventEmitter();
    var transferMessageCenter2 = new events.EventEmitter();
    var middleware1 = new events.EventEmitter();
    var middleware2 = new events.EventEmitter();

    var messenger1 = null;
    var messenger2 = null;

    var sendMessage1 = function (remoteIdentifier, expectedNextIdentifier, callback) {
        messenger1.pipeMessageAndWaitForResponse(Buffer.concat([new Buffer(remoteIdentifier, 'hex'), new Buffer(expectedNextIdentifier, 'hex')], 32), null, 'MESSAGE', expectedNextIdentifier, callback);
    };

    var sendMessage2 = function (remoteIdentifier, expectedNextIdentifier, callback) {
        messenger2.pipeMessageAndWaitForResponse(Buffer.concat([new Buffer(remoteIdentifier, 'hex'), new Buffer(expectedNextIdentifier, 'hex')], 32), null, 'MESSAGE', expectedNextIdentifier, callback);
    };

    it('should correctly construct the messengers', function () {
        messenger1 = new ShareMessenger(configStub, circuitManager1, transferMessageCenter1);
        messenger2 = new ShareMessenger(configStub, circuitManager2, transferMessageCenter2);

        messenger1.should.be.instanceof(ShareMessenger);
        messenger2.should.be.instanceof(ShareMessenger);
    });

    it('messenger1 should successfully initiate conversation as soon as there are circuits', function (done) {
        middleware1.once('msg', function () {
            middleware1.emit('res', true);
        });

        middleware2.once('msg', function () {
            middleware2.emit('res', true);
        });

        transferMessageCenter2.once('MESSAGE_023e6776d0afe3b05e216c6beab25deb', function (circuitId, payload) {
            messenger2.manuallySetPreferredCircuitId(circuitId);

            circuitManager2.emit('circuitCount', 1);

            sendMessage2(payload.toString('hex'), '86f6f012234f9b9364f921cdbcf818de', function (err, payload) {
                middleware2.emit('messenger', err, payload);
            });
        });

        sendMessage1('023e6776d0afe3b05e216c6beab25deb', 'a5ee0ac65e3a2daac53867c544caa355', function (err, payload) {
            messenger1._messageReceivedThroughCircuitId.should.equal('bar');
            (transferMessageCenter1.lastCircuitIdUsed == null).should.be.true;
            (err === null).should.be.true;
            payload.toString('hex').should.equal('86f6f012234f9b9364f921cdbcf818de');

            done();
        });

        setTimeout(function () {
            circuitManager1.emit('circuitCount', 1);
        }, 10);
    });

    it('messenger2 should have used the manually set circuit', function () {
        transferMessageCenter2.lastCircuitIdUsed.should.equal('foo');
    });

    it('messenger1 should callback with an error if the messenger is still waiting for a response', function (done) {
        circuitManager1.emit('circuitCount', 0);

        sendMessage1('86f6f012234f9b9364f921cdbcf818de', 'c61d48915194b4fcc243ee0e427c8a3c', function (err, payload) {
            middleware1.emit('messenger', err, payload);
        });

        sendMessage1('86f6f012234f9b9364f921cdbcf818de', 'c61d48915195b4fcc243ee0e427c8a3c', function (err, payload) {
            err.message.should.equal('ShareMessenger: Cannot pipe message, still waiting for response.');
            done();
        });
    });

    it('messenger1 should be able to deliver the message after one retry with zero circuits', function (done) {
        middleware1.once('msg', function () {
            middleware1.emit('res', false);

            middleware1.once('msg', function () {
                middleware1.emit('res', true);
            });

            circuitManager1.emit('circuitCount', 0);

            setTimeout(function () {
                circuitManager1.emit('circuitCount', 1);
            }, 1010);
        });

        circuitManager1.emit('circuitCount', 1);

        middleware2.once('messenger', function (err, payload) {
            (err === null).should.be.true;
            payload.toString('hex').should.equal('c61d48915194b4fcc243ee0e427c8a3c');
            done();
        });
    });

    it('messenger1 and 2 should both timeout', function (done) {
        circuitManager2.emit('circuitCount', 0);

        var count = 0;
        var checkAndDone = function () {
            if (++count === 2)
                done();
        };

        sendMessage2('c61d48915194b4fcc243ee0e427c8a3c', 'b1e539cf3e653b5b1caa2c084bb758aa', function (err, payload) {
            err.message.should.equal('Maximum tries exhausted.');
            (transferMessageCenter2.lastCircuitIdUsed == null).should.be.true;
            checkAndDone();
        });

        middleware1.once('messenger', function (err, payload) {
            err.message.should.equal('Maximum tries exhausted.');
            (transferMessageCenter1.lastCircuitIdUsed == null).should.be.true;
            checkAndDone();
        });

        setImmediate(function () {
            circuitManager2.emit('circuitCount', 0);
        });
    });

    it('messenger2 should send a last message', function (done) {
        messenger1 = new ShareMessenger(configStub, circuitManager1, transferMessageCenter1);
        messenger2 = new ShareMessenger(configStub, circuitManager2, transferMessageCenter2);

        middleware1.once('msg', function () {
            middleware1.emit('res', true);
        });

        middleware2.once('msg', function () {
            middleware2.emit('res', true);
        });

        transferMessageCenter2.once('MESSAGE_29aaaf78b9f91eecee06794f9904a3c8', function (circuitId, payload) {
            messenger2.pipeLastMessage(Buffer.concat([payload, new Buffer('060bf63ad5e550bcd11688630cf3c237', 'hex')]), null);

            setTimeout(function () {
                (function () {
                    messenger2.pipeLastMessage(Buffer.concat([payload, new Buffer('060bf63ad5e550bcd11688630cf3c237', 'hex')]), null);
                }).should.throw('ShareMessenger: Cannot pipe message, still waiting for another response.');

                circuitManager2.emit('circuitCount', 1);
            }, 200);
        });

        sendMessage1('29aaaf78b9f91eecee06794f9904a3c8', '22cd04277cfb462fffa763ffb4934763', function (err, payload) {
            payload.toString('hex').should.equal('060bf63ad5e550bcd11688630cf3c237');

            messenger1._waitForResponseTimeout.should.equal(0);
            (messenger1._currentMessageListener == null).should.be.true;

            Object.keys(transferMessageCenter1._events).length.should.equal(0);
            Object.keys(transferMessageCenter2._events).length.should.equal(0);

            done();
        });
    });

    it('messenger1 should teardown its last circuit', function () {
        messenger1.teardownLatestCircuit();

        circuitManager1.tornDownCircuit.should.equal('bar');
    });

    before(function () {
        sandbox = sinon.sandbox.create();

        configStub = testUtils.stubPublicApi(sandbox, ObjectConfig, {
            get: function (what) {
                if (what === 'fileTransfer.shareMessaging.maximumNumberOfMessageTries')
                    return 1;
                if (what === 'fileTransfer.shareMessaging.waitForResponseMessageInSeconds')
                    return 1;
            }
        });

        circuitManager1.teardownCircuit = function (identifier) {
            this.tornDownCircuit = identifier;
        };

        circuitManager2.teardownCircuit = function (identifier) {
            this.tornDownCircuit = identifier;
        };

        circuitManager1.on('circuitCount', function (count) {
            circuitCount1 = count;
        });

        circuitManager2.on('circuitCount', function (count) {
            circuitCount2 = count;
        });

        transferMessageCenter1.issueExternalFeedToCircuit = function (nodesToFeedBlock, payloadToFeed, circuitId) {
            if (circuitCount1 === 0)
                return false;

            this.lastCircuitIdUsed = circuitId;

            middleware1.once('res', function (flag) {
                if (flag) {
                    setImmediate(function () {
                        transferMessageCenter2.emit('MESSAGE_' + payloadToFeed.slice(0, 16).toString('hex'), 'foo', payloadToFeed.slice(16));
                    });
                }
            });
            middleware1.emit('msg');

            return true;
        };

        transferMessageCenter2.issueExternalFeedToCircuit = function (nodesToFeedBlock, payloadToFeed, circuitId) {
            if (circuitCount2 === 0)
                return false;

            this.lastCircuitIdUsed = circuitId;

            middleware2.once('res', function (flag) {
                if (flag) {
                    setImmediate(function () {
                        transferMessageCenter1.emit('MESSAGE_' + payloadToFeed.slice(0, 16).toString('hex'), 'bar', payloadToFeed.slice(16));
                    });
                }
            });
            middleware2.emit('msg');

            return true;
        };
    });

    after(function () {
        sandbox.restore();
    });
});
//# sourceMappingURL=ShareMessenger.js.map
