var BroadcastReadableMessage = (function () {
    function BroadcastReadableMessage(buffer) {
        this._broadcastId = null;
        this._payload = null;
        this._timestamp = null;
        if (buffer.length < 24) {
            throw new Error('BroadcastReadableMessage: Message too short.');
        }

        this._broadcastId = buffer.slice(0, 16).toString('hex');

        var timestampBuffer = buffer.slice(16, 24);
        this._timestamp = timestampBuffer.slice(0, 4).readUInt32BE(0) * 1000 + timestampBuffer.slice(4).readUInt32BE(0);

        this._payload = buffer.slice(24);

        if (this._payload.length === 0) {
            throw new Error('BroadcastReadableMessage: Empty payload.');
        }
    }
    BroadcastReadableMessage.prototype.getBroadcastId = function () {
        return this._broadcastId;
    };

    BroadcastReadableMessage.prototype.getPayload = function () {
        return this._payload;
    };

    BroadcastReadableMessage.prototype.getTimestamp = function () {
        return this._timestamp;
    };
    return BroadcastReadableMessage;
})();

module.exports = BroadcastReadableMessage;
//# sourceMappingURL=BroadcastReadableMessage.js.map
