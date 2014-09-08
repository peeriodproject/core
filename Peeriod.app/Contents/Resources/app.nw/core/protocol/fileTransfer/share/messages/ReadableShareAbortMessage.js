/**
* ReadableShareAbortMessageInterface implementation.
*
* @class core.protocol.fileTransfer.share.ReadableShareAbortMessage
* @implements core.protocol.fileTransfer.share.ReadableShareAbortMessageInterface
*
* @param {Buffer} buffer The byte buffer to create the message from
*/
var ReadableShareAbortMessage = (function () {
    function ReadableShareAbortMessage(buffer) {
        /**
        * @member {string} core.protocol.fileTransfer.share.ReadableShareAbortMessage~_filehash
        */
        this._filehash = null;
        /**
        * @member {string} core.protocol.fileTransfer.share.ReadableShareAbortMessage~_filename
        */
        this._filename = null;
        /**
        * @member {number} core.protocol.fileTransfer.share.ReadableShareAbortMessage~_filesize
        */
        this._filesize = 0;
        this._filesize = buffer.readUInt32BE(0) * 1000 + buffer.readUInt32BE(4);
        this._filehash = buffer.slice(8, 28).toString('hex');
        this._filename = buffer.slice(28).toString('utf8');
    }
    ReadableShareAbortMessage.prototype.getFileHash = function () {
        return this._filehash;
    };

    ReadableShareAbortMessage.prototype.getFilename = function () {
        return this._filename;
    };

    ReadableShareAbortMessage.prototype.getFilesize = function () {
        return this._filesize;
    };
    return ReadableShareAbortMessage;
})();

module.exports = ReadableShareAbortMessage;
//# sourceMappingURL=ReadableShareAbortMessage.js.map
