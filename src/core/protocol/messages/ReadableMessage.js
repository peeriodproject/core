var Id = require('../../topology/Id');
var MessageByteCheatsheet = require('./MessageByteCheatsheet');

var ReadableMessage = (function () {
    function ReadableMessage(buffer, nodeFactory, addressFactory) {
        this._addressFactory = null;
        this._nodeFactory = null;
        this._buffer = null;
        this._bufferLen = 0;
        this._receiverId = null;
        this._sender = null;
        this._msgType = null;
        this._payload = null;
        this._lastPosRead = 0;
        this._buffer = buffer;
        this._bufferLen = buffer.length;
        this._addressFactory = addressFactory;
        this._nodeFactory = nodeFactory;
    }
    ReadableMessage.prototype.deformat = function () {
        if (!this._isProtocolMessage()) {
            throw new Error("ReadableMessage: Buffer is not protocol compliant.");
        }

        this._lastPosRead = MessageByteCheatsheet.messageBegin.length;

        this._lastPosRead = this._extractReceiverId(this._lastPosRead);

        this._lastPosRead = this._extractSenderAsContactNode(this._lastPosRead);

        this._lastPosRead = this._extractMessageType(this._lastPosRead);

        this._lastPosRead = this._extractPayload(this._lastPosRead);
    };

    ReadableMessage.prototype.discard = function () {
        this._buffer = null;
        this._payload = null;
    };

    ReadableMessage.prototype._contactNodeAddressByIPv4Buffer = function (buffer) {
        var ip = buffer.slice(0, 4).toJSON().join('.');
        var port = buffer.readUInt16BE(5);

        return this._addressFactory.create(ip, port);
    };

    ReadableMessage.prototype._contactNodeAddressByIPv6Buffer = function (buffer) {
        var ip = null;
        var port = buffer.readUInt16BE(17);

        for (var i = 0; i < 7; i++) {
            ip += buffer.slice(i * 2, 2).toString('hex');
            if (i !== 6) {
                ip += ':';
            }
        }

        return this._addressFactory.create(ip, port);
    };

    ReadableMessage.prototype._extractId = function (from) {
        var idBuffer = new Buffer(20);
        this._buffer.copy(idBuffer, 0, from, 20);
        return new Id(idBuffer, 160);
    };

    ReadableMessage.prototype._extractPayload = function (from) {
        this._payload = this._buffer.slice(++from, this._buffer.length - MessageByteCheatsheet.messageEnd.length);
        return from + this._payload.length;
    };

    ReadableMessage.prototype._extractMessageType = function (from) {
        var msgTypeBytes = this._buffer.slice(++from, 2);
        var messageTypes = MessageByteCheatsheet.messageTypes;
        var typesClear = Object.keys(messageTypes);
        var result = null;

        for (var i = 0; i < typesClear.length; i++) {
            var typeClear = typesClear[i];
            var bytes = messageTypes[typeClear];

            if (msgTypeBytes[0] === bytes[0] && msgTypeBytes[1] === bytes[1]) {
                result = typeClear;
                break;
            }
        }

        if (!result) {
            throw new Error('ReadableMessage~_extractMessageType: Unknown message type.');
        }

        this._msgType = result;

        return ++from;
    };

    ReadableMessage.prototype._extractReceiverId = function (from) {
        this._receiverId = this._extractId(from);
        return from + 20;
    };

    ReadableMessage.prototype._extractSenderAsContactNode = function (from) {
        var senderId = this._extractId(from);
        from += 20;

        var res = this._extractSenderAddressesAndBytesReadAsArray(from);
        var senderAddresses = res[0];
        this._sender = this._nodeFactory.create(senderId, senderAddresses);

        return res[1];
    };

    ReadableMessage.prototype._extractSenderAddressesAndBytesReadAsArray = function (from) {
        var doRead = true;
        var result = [];

        while (doRead) {
            var identByte = this._buffer[++from];
            from++;

            if (identByte === MessageByteCheatsheet.ipv4) {
                var bytesToRead = 6;
                result.push(this._contactNodeAddressByIPv4Buffer(this._buffer.slice(from, from + bytesToRead)));
                from += bytesToRead;
            } else if (identByte === MessageByteCheatsheet.ipv6) {
                var bytesToRead = 18;
                result.push(this._contactNodeAddressByIPv6Buffer(this._buffer.slice(from, from + bytesToRead)));
                from += bytesToRead;
            } else if (identByte === MessageByteCheatsheet.addressEnd) {
                doRead = false;
            } else {
                doRead = false;
                throw new Error("ReadableMessage~_extractSenderAddressesAndBytesReadAsArray: Address does not seem to be protocol compliant.");
            }
        }

        return [result, from];
    };

    ReadableMessage.prototype._isProtocolMessage = function () {
        var msgBegin = MessageByteCheatsheet.messageBegin;
        var msgEnd = MessageByteCheatsheet.messageEnd;

        if (this._bufferLen < msgBegin.length + msgEnd.length) {
            return false;
        }

        for (var i = 0; i < msgBegin.length; i++) {
            if (this._buffer[i] !== msgBegin[i]) {
                return false;
            }
        }

        for (var i = 0; i < msgEnd.length; i++) {
            if (this._buffer[this._bufferLen - (6 - i)] !== msgEnd[i]) {
                return false;
            }
        }

        return true;
    };
    return ReadableMessage;
})();

module.exports = ReadableMessage;
//# sourceMappingURL=ReadableMessage.js.map
