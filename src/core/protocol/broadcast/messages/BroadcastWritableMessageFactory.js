var BroadcastWritableMessageFactory = (function () {
    function BroadcastWritableMessageFactory() {
    }
    BroadcastWritableMessageFactory.prototype.constructPayload = function (broadcastId, payload, payloadLength) {
        var payloadLength = payloadLength || payload.length;
        var broadcastIdBuffer = new Buffer(broadcastId, 'hex');

        if (broadcastIdBuffer.length !== 16) {
            throw new Error('BroadcastWritableMessageFactory: BroadcastID must be 16 byte long!');
        }

        var timestampBuffer = new Buffer(8);
        var timestamp = Date.now();

        timestampBuffer.writeUInt32BE(Math.floor(timestamp / 1000), 0);
        timestampBuffer.writeUInt32BE(timestamp % 1000, 4);

        return Buffer.concat([broadcastIdBuffer, timestampBuffer, payload], payloadLength + 24);
    };
    return BroadcastWritableMessageFactory;
})();

module.exports = BroadcastWritableMessageFactory;
//# sourceMappingURL=BroadcastWritableMessageFactory.js.map
