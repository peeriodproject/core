/**
* WritableShareAbortMessageFactoryInterface implementation.
*
* @class core.protocol.fileTransfer.share.WritableShareAbortMessageFactory
* @implements core.protocol.fileTransfer.share.WritableShareAbortMessageFactoryInterface
*/
var WritableShareAbortMessageFactory = (function () {
    function WritableShareAbortMessageFactory() {
    }
    WritableShareAbortMessageFactory.prototype.constructMessage = function (filesize, filename, filehash) {
        var filesizeBuffer = new Buffer(8);

        filesizeBuffer.writeUInt32BE(Math.floor(filesize / 1000), 0);
        filesizeBuffer.writeUInt32BE(filesize % 1000, 4);

        var filenameBuffer = new Buffer(filename, 'utf8');
        var filehashBuffer = new Buffer(filehash, 'hex');

        return Buffer.concat([filesizeBuffer, filehashBuffer, filenameBuffer], filenameBuffer.length + 28);
    };
    return WritableShareAbortMessageFactory;
})();

module.exports = WritableShareAbortMessageFactory;
//# sourceMappingURL=WritableShareAbortMessageFactory.js.map
