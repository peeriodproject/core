var Id = require('../../topology/Id');
var MessageByteCheatsheet = require('./MessageByteCheatsheet');

/**
* @class core.protocol.messages.ReadableMessage
* @implements core.protocol.messages.ReadableMessageInterface
*
* @param {Buffer} buffer The message buffer
* @param {core.topology.ContactNodeFactoryInterface} nodeFactory A contact node factory
* @param {core.topology.ContactNodeAddressFactoryInterface} addressFactory An address factory.
*/
var ReadableMessage = (function () {
    function ReadableMessage(buffer, nodeFactory, addressFactory) {
        /**
        * @member {core.topology.ContactNodeAddressFactoryInterface} core.protocol.messages.ReadableMessage~_addressFactory
        */
        this._addressFactory = null;
        /**
        * The message buffer.
        *
        * @member {Buffer} core.protocol.messages.ReadableMessage~_buffer
        */
        this._buffer = null;
        /**
        * Length of the message buffer.
        *
        * @member {number} core.protocol.messages.ReadableMessage~_bufferLength
        */
        this._bufferLength = 0;
        /**
        * Indicates whether this is a hydra message.
        *
        * @member {boolean} core.protocol.messages.ReadableMessage~_isHydra
        */
        this._isHydra = false;
        /**
        * A helper member for remembering which bytes have already been read and processed.
        *
        * @member {number}  core.protocol.messages.ReadableMessage~_lastPosRead
        */
        this._lastPosRead = 0;
        /**
        * The type of protocol message (e.g. PING, PONG, etc.)
        *
        * @member {string} core.protocol.messages.ReadableMessage~_messageType
        */
        this._messageType = null;
        /**
        * @member {core.topology.ContactNodeFactoryInterface} core.protocol.messages.ReadableMessage~_nodeFactory
        */
        this._nodeFactory = null;
        /**
        * The slice of message buffer constituting the payload of the message.
        *
        * @member {Buffer} core.protocol.messages.ReadableMessage~_payload
        */
        this._payload = null;
        /**
        * The ID of the intended receiver of the message.
        *
        * @member {core.topology.IdInterface} core.protocol.messages.ReadableMessage~_receiverId
        */
        this._receiverId = null;
        /**
        * The sender object.
        *
        * @member {core.topology.ContactNodeInterface} core.protocol.messages.ReadableMessage~_sender
        */
        this._sender = null;
        this._buffer = buffer;
        this._nodeFactory = nodeFactory;
        this._addressFactory = addressFactory;
        this._bufferLength = buffer.length;

        this._deformat();
    }
    ReadableMessage.prototype.discard = function () {
        this._buffer = null;
        this._payload = null;
    };

    ReadableMessage.prototype.getMessageType = function () {
        return this._messageType;
    };

    ReadableMessage.prototype.getPayload = function () {
        return this._payload;
    };

    ReadableMessage.prototype.getReceiverId = function () {
        return this._receiverId;
    };

    ReadableMessage.prototype.getSender = function () {
        return this._sender;
    };

    ReadableMessage.prototype.isHydra = function () {
        return this._isHydra;
    };

    /**
    * Makes a ContactNodeAddress out of a buffer representing an IPv4 address.
    *
    * @method core.protocol.messages.ReadableMessage~_contactNodeAddressByIPv4Buffer
    *
    * @todo From node v.0.11.x (and thus node-webkit v.0.9.x) toJSON() will return a json object with {type:'Buffer',
    * data:[<bytes>]} and not just the array with bytes!
    *
    * @param {Buffer} buffer
    * @returns {ContactNodeAddressInterface}
    */
    ReadableMessage.prototype._contactNodeAddressByIPv4Buffer = function (buffer) {
        var ip = buffer.slice(0, 4).toJSON().join('.');
        var port = buffer.readUInt16BE(4);

        return this._addressFactory.create(ip, port);
    };

    /**
    * Makes a ContactNodeAddress out of a buffer representing an IPv6 address.
    *
    * @method core.protocol.messages.ReadableMessage~_contactNodeAddressByIPv6Buffer
    *
    * @param {Buffer} buffer
    * @returns {ContactNodeAddressInterface}
    */
    ReadableMessage.prototype._contactNodeAddressByIPv6Buffer = function (buffer) {
        var ip = '';
        var port = buffer.readUInt16BE(16);

        for (var i = 0; i < 8; i++) {
            ip += buffer.slice(i * 2, i * 2 + 2).toString('hex');
            if (i !== 7) {
                ip += ':';
            }
        }

        return this._addressFactory.create(ip, port);
    };

    /**
    * Kicks off the extracting process.
    *
    * @method core.protocol.messages.ReadableMessage~_deformat
    */
    ReadableMessage.prototype._deformat = function () {
        if (!this._isProtocolMessage()) {
            throw new Error('ReadableMessage~_deformat: Buffer is not protocol compliant.');
        }

        this._lastPosRead = MessageByteCheatsheet.messageBegin.length;

        this._lastPosRead = this._extractReceiverId(this._lastPosRead);

        if (this._isHydra) {
            this._extractPayload(this._lastPosRead);
            return;
        }

        this._lastPosRead = this._extractSenderAsContactNode(this._lastPosRead);

        this._lastPosRead = this._extractMessageType(this._lastPosRead);

        this._lastPosRead = this._extractPayload(this._lastPosRead);
    };

    /**
    * Extracts a 20 byte ID from the message buffer.
    *
    * @method core.protocol.messages.ReadableMessage~_extractId
    *
    * @param {number} from Byte index to start from
    * @returns {Id} The created ID
    */
    ReadableMessage.prototype._extractId = function (from) {
        var idBuffer = new Buffer(20);

        this._buffer.copy(idBuffer, 0, from, from + 20);

        return new Id(idBuffer, 160);
    };

    /**
    * Extracts the slice of the message buffer representing the message payload.
    *
    * @method core.protocol.messages.ReadableMessage~_extractPayload
    *
    * @param {number} from Byte index to start from
    * @returns {number} Index of last byte read.
    */
    ReadableMessage.prototype._extractPayload = function (from) {
        this._payload = this._buffer.slice(from, this._buffer.length - MessageByteCheatsheet.messageEnd.length);
        return from + this._payload.length;
    };

    /**
    * Extracts the protocol message type.
    *
    * @method core.protocol.messages.ReadableMessage~_extractMessageType
    *
    * @param {number} from Byte index to start from
    * @returns {number} The index of the last byte read
    */
    ReadableMessage.prototype._extractMessageType = function (from) {
        var msgTypeBytes = this._buffer.slice(from, from + 2);
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

        this._messageType = result;

        return from + 2;
    };

    /**
    * Extracts the ID of the intended receiver. If the id is merely null bytes, the message seems to be a hydra message.
    *
    * @method core.protocol.messages.ReadableMessage~_extractReceiverId
    *
    * @param {number} from The byte index to start from
    * @returns {number} The index of the last byte read
    */
    ReadableMessage.prototype._extractReceiverId = function (from) {
        this._receiverId = this._extractId(from);

        var buffer = this._receiverId.getBuffer();
        var isHydra = true;

        for (var i = 0; i < buffer.length; i++) {
            if (buffer[i] !== 0x00) {
                isHydra = false;
                break;
            }
        }

        this._isHydra = isHydra;

        return from + 20;
    };

    /**
    * Extract the sender addresses and returns them in an array
    *
    * @method core.protocol.messages.ReadableMessage~_extractSenderAddressesAndBytesReadAsArray
    *
    * @param {number} from The index of bytes to start from
    * @returns {Array} Returns an array with two items: First is the array of the sender's addresses, second is the index of the last byte read.
    */
    ReadableMessage.prototype._extractSenderAddressesAndBytesReadAsArray = function (from) {
        var doRead = true;
        var result = [];

        while (doRead) {
            var identByte = this._buffer[from];

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
                throw new Error('ReadableMessage~_extractSenderAddressesAndBytesReadAsArray: Address does not seem to be protocol compliant.');
            }
        }

        return [result, from];
    };

    /**
    * Extracts the sender ID and address block and makes ContactNode out of it.
    *
    * @method core.protocol.messages.ReadableMessage~_extractSenderAsContactNode
    *
    * @param {number} from Byte index to start from.
    * @returns {number} Index of the last byte read.
    */
    ReadableMessage.prototype._extractSenderAsContactNode = function (from) {
        var senderId = this._extractId(from);

        from += 20;

        var res = this._extractSenderAddressesAndBytesReadAsArray(from);
        var senderAddresses = res[0];

        this._sender = this._nodeFactory.create(senderId, senderAddresses);

        return res[1];
    };

    /**
    * Checks whether the message buffer starts and ends with the expected 6 byte-identifiers.
    *
    * @method core.protocol.message.ReadableMessage~_isProtocolMessage
    *
    * @returns {boolean} `True` if protocol message, `false` if not.
    */
    ReadableMessage.prototype._isProtocolMessage = function () {
        var msgBegin = MessageByteCheatsheet.messageBegin;
        var msgEnd = MessageByteCheatsheet.messageEnd;

        if (this._bufferLength < msgBegin.length + msgEnd.length) {
            return false;
        }

        for (var i = 0; i < msgBegin.length; i++) {
            if (this._buffer[i] !== msgBegin[i]) {
                return false;
            }
        }

        for (var i = 0; i < msgEnd.length; i++) {
            if (this._buffer[this._bufferLength - (6 - i)] !== msgEnd[i]) {
                return false;
            }
        }

        return true;
    };
    return ReadableMessage;
})();

module.exports = ReadableMessage;
//# sourceMappingURL=ReadableMessage.js.map
