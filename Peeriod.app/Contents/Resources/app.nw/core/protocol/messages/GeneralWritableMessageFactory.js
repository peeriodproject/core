var MessageByteCheatsheet = require('./MessageByteCheatsheet');

/**
* GeneralWritableMessageFactoryInterface implementation.
*
* @class core.protocol.messages.GeneralWritableMessageFactory
* @implements core.protocol.messages.GeneralWritableMessageFactoryInterface
*
* @todo Swap the sender ContactNodeInterface with a new Class type that extends EventEmitter and that always emits
* a 'change' event, when the addresses are updated. This can lead to a significant performance gain, because then the
* address block only has to be constructed when the addresses change.
*
* @param {core.topology.ContactNodeInterface} sender Optional sender which will be used for the messages.
*/
var GeneralWritableMessageFactory = (function () {
    function GeneralWritableMessageFactory(sender) {
        /**
        * The address block as byte representation of the current sender.
        *
        * @member {Buffer} core.protocol.messages.GeneralWritableMessageFactory~_currentAddressBlockBuffer
        */
        this._currentAddressBlockBuffer = null;
        /**
        * Keeps track of the single address block buffers needed to construct the address block
        *
        * @member {core.utils.BufferListInterface} core.protocol.messages.GeneralWritableMessageFactory~_currentAddressBlockByteList
        */
        this._currentAddressBlockByteList = null;
        /**
        * Keeps track of the address block length of the current sender.
        *
        * @member {number} core.protocol.messages.GeneralWritableMessageFactory~_currentAddressBlockLength
        */
        this._currentAddressBlockLength = 0;
        /**
        * @member {string} core.protocol.messages.GeneralWritableMessageFactory~_messageType
        */
        this._messageType = null;
        /**
        * @member {core.topology.ContactNodeInterface} core.protocol.messages.GeneralWritableMessageFactory~_receiver
        */
        this._receiver = null;
        /**
        * @member {core.topology.MyNodeInterface} core.protocol.messages.GeneralWritableMessageFactory~_sender
        */
        this._sender = null;
        /**
        * Keeps track of the latest hook on the sender's `addressChange` event.
        *
        * @member {Function} core.protocol.messages.GeneralWritableMessageFactory~_recentChangeHook
        */
        this._recentAddressChangeHook = null;
        /**
        * Indicator for whether the sender has undergone changes since the last address block creation.
        *
        * @member {core.topology.ContactNodeInterface} core.protocol.messages.GeneralWritableMessageFactory~_senderHasChanged
        * @private
        */
        this._senderHasChanged = false;
        if (sender) {
            this.setSender(sender);
        }
    }
    GeneralWritableMessageFactory.prototype.setMessageType = function (type) {
        this._messageType = type;
    };

    GeneralWritableMessageFactory.prototype.setReceiver = function (node) {
        this._receiver = node;
    };

    GeneralWritableMessageFactory.prototype.setSender = function (node) {
        var _this = this;
        if (this._sender !== node) {
            if (this._sender && this._recentAddressChangeHook) {
                this._sender.removeOnAddressChange(this._recentAddressChangeHook);
            }

            this._recentAddressChangeHook = function () {
                _this._senderHasChanged = true;
            };

            node.onAddressChange(this._recentAddressChangeHook);
            this._senderHasChanged = true;
        }
        this._sender = node;
    };

    GeneralWritableMessageFactory.prototype.hydraConstructMessage = function (payload, payloadLength) {
        var bufferLength = (payloadLength === undefined) ? payload.length : payloadLength;
        var bufferList = [];

        // add the beginning bytes indicating the length
        var sizeBuffer = new Buffer(4);
        sizeBuffer.writeUInt32BE(bufferLength + 20, 0);

        bufferList.push(sizeBuffer);

        //bufferLength += MessageByteCheatsheet.messageBegin.length;
        // add 20 null bytes
        var nullBuf = new Buffer(20);
        nullBuf.fill(0x00);
        bufferList.push(nullBuf);
        bufferLength += 24;

        // add the payload
        bufferList.push(payload);

        return Buffer.concat(bufferList, bufferLength);
    };

    GeneralWritableMessageFactory.prototype.constructMessage = function (payload, payloadLength) {
        if (!(this._receiver && this._sender && this._messageType)) {
            throw new Error('GeneralWritableMessageFactory#constructMessage: Sender and receiver must be specified.');
        }

        var bufferLength = (payloadLength === undefined) ? payload.length : payloadLength;
        var bufferList = [];

        // add the beginning bytes indicating the size, but don't write the size yet
        bufferList.push(new Buffer(4));

        // add the receiver ID
        bufferList.push(this._receiver.getId().getBuffer());
        bufferLength += 20;

        // add the sender ID
        bufferList.push(this._sender.getId().getBuffer());
        bufferLength += 20;

        // add the address block
        bufferList.push(this._getSenderAddressBlock());
        bufferLength += this._currentAddressBlockLength;

        // add the message type
        var messageTypeByteArray = MessageByteCheatsheet.messageTypes[this._messageType];
        if (!messageTypeByteArray) {
            throw new Error('GeneralWritableMessageFactory#constructMessage: Unknown message type.');
        }
        bufferList.push(new Buffer(messageTypeByteArray));
        bufferLength += messageTypeByteArray.length;

        // add the payload
        bufferList.push(payload);

        bufferList[0].writeUInt32BE(bufferLength, 0);

        // cleanup, sender can stay the same
        this._receiver = null;
        this._messageType = null;

        return Buffer.concat(bufferList, bufferLength + 4);
    };

    /**
    * Only for testing purposes. Should not be used in production.
    *
    * @method core.protocol.messages.GeneralWritableMessageFactory#getSenderHasChanged
    *
    * @returns {boolean}
    */
    GeneralWritableMessageFactory.prototype.getSenderHasChanged = function () {
        return this._senderHasChanged;
    };

    /**
    * Internal method which iterates over the addresses of the sender and creates an address byte block
    * with the needed separators which can be included in the header of the message.
    *
    * @method core.protocol.messages.GeneralWritableMessageFactory~_constructSenderAddressBlock
    *
    */
    GeneralWritableMessageFactory.prototype._constructSenderAddressBlock = function () {
        var _this = this;
        this._currentAddressBlockByteList = [];
        this._currentAddressBlockLength = 0;

        var addressList = this._sender.getAddresses();

        addressList.forEach(function (address) {
            _this._onAddressIteration(address);
        });

        // end the block
        this._currentAddressBlockByteList.push(new Buffer([MessageByteCheatsheet.addressEnd]));

        this._currentAddressBlockLength++;

        this._currentAddressBlockBuffer = null;
        this._currentAddressBlockBuffer = Buffer.concat(this._currentAddressBlockByteList, this._currentAddressBlockLength);

        this._currentAddressBlockByteList = null;
    };

    /**
    * Checks if the sender has changed since the last time. If yes, a new address block is created.
    *
    * @method core.protocol.messages.GeneralWritableMessageFactory~_getSenderAddressBlock
    *
    * @returns {Buffer} The address block buffer object
    */
    GeneralWritableMessageFactory.prototype._getSenderAddressBlock = function () {
        if (this._senderHasChanged) {
            this._constructSenderAddressBlock();
            this._senderHasChanged = false;
        }
        return this._currentAddressBlockBuffer;
    };

    /**
    * Internal method used when iteration over the sender's address list.
    *
    * @method core.protocol.messages.GeneralWritableMessageFactory~_getSenderAddressBlock
    */
    GeneralWritableMessageFactory.prototype._onAddressIteration = function (address) {
        var indicatorByte = new Buffer(1);
        var addressBuffer = address.getAddressAsByteBuffer();

        if (address.isIPv4()) {
            indicatorByte[0] = MessageByteCheatsheet.ipv4;
        } else if (address.isIPv6()) {
            indicatorByte[0] = MessageByteCheatsheet.ipv6;
        }

        this._currentAddressBlockLength++;
        this._currentAddressBlockByteList.push(indicatorByte);

        this._currentAddressBlockLength += addressBuffer.length;
        this._currentAddressBlockByteList.push(addressBuffer);
    };
    return GeneralWritableMessageFactory;
})();

module.exports = GeneralWritableMessageFactory;
//# sourceMappingURL=GeneralWritableMessageFactory.js.map
