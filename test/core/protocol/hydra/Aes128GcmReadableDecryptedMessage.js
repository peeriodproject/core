/// <reference path='../../../test.d.ts' />
// Please note that as node.js does not yet support GCM auth tags in this version
require('should');

var Aes128GcmReadableDecryptedMessage = require('../../../../src/core/protocol/hydra/messages/Aes128GcmReadableDecryptedMessage');

describe('CORE --> PROTOCOL --> HYDRA --> Aes128GcmReadableDecryptedMessage', function () {
    it('should correctly decrypt a message (not receiver)', function () {
        var key = new Buffer('feffe9928665731c6d6a8f9467308308', 'hex');
        var enc = new Buffer('cafebabefacedbaddecaf8889b6b1dd5fc0bf6c70b8e717bee8a0720ff8b2fd56a2367cdc1a3022e9e171ad64ff5242b549bf246016fab70c16bb9958f788c2135ad4726d081f8d3648a240288', 'hex');

        var msg = new Aes128GcmReadableDecryptedMessage(enc, key);

        msg.isReceiver().should.be.false;
        msg.getPayload().toString('hex').should.equal('d9313225f88406e5a55909c5aff5269a86a7a9531534f7da2e4c303d8a318a721c3c0c95956809532fcf0e2449a6b525b16aedf5aa0de657ba637b391aafd255');
    });

    it('should correctly decrypt a message (receiver)', function () {
        var key = new Buffer('feffe9928665731c6d6a8f9467308308', 'hex');
        var enc = new Buffer('cafebabefacedbaddecaf8889a6b1dd5fc0bf6c70b8e717bee8a0720ff8b2fd56a2367cdc1a3022e9e171ad64ff5242b549bf246016fab70c16bb9958f788c2135ad4726d081f8d3648a240288ffffffffffffffffffffffffffffffff', 'hex');

        var msg = new Aes128GcmReadableDecryptedMessage(enc, key);

        msg.isReceiver().should.be.true;
        msg.getPayload().toString('hex').should.equal('d9313225f88406e5a55909c5aff5269a86a7a9531534f7da2e4c303d8a318a721c3c0c95956809532fcf0e2449a6b525b16aedf5aa0de657ba637b391aafd255');
    });

    it('should throw an error with an unknown indicator byte', function () {
        (function () {
            var key = new Buffer('feffe9928665731c6d6a8f9467308308', 'hex');
            var enc = new Buffer('cafebabefacedbaddecaf8889a6b1dd5fc0bf6c70b8e717bee8a0720ff8b2fd56a2367cdc1a3022e9e171ad64ff5242b549bf246016fab70c16bb9958f788c2135ad4726d081f8d3648a240288ffffffffffffffffffffffffffffffff', 'utf8');

            new Aes128GcmReadableDecryptedMessage(enc, key);
        }).should.throw('Aes128GcmReadableDecryptedMessage: Unknown indicator byte');
    });

    it('should throw an authentication error (this is faked for now)', function () {
        Aes128GcmReadableDecryptedMessage.SKIP_AUTH = false;

        (function () {
            var key = new Buffer('feffe9928665731c6d6a8f9467308308', 'hex');
            var enc = new Buffer('cafebabefacedbaddecaf8889a6b1dd5fc0bf6c70b8e717bee8a0720ff8b2fd56a2367cdc1a3022e9e171ad64ff5242b549bf246016fab70c16bb9958f788c2135ad4726d081f8d3648a240288fffffffffffffffffffffffffffffff0', 'hex');

            new Aes128GcmReadableDecryptedMessage(enc, key);
            Aes128GcmReadableDecryptedMessage.SKIP_AUTH = true;
        }).should.throw('Aes128GcmReadableDecryptedMessage: Integrity check fail!');
    });
});
//# sourceMappingURL=Aes128GcmReadableDecryptedMessage.js.map
