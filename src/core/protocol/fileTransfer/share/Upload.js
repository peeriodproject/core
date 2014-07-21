var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var events = require('events');

var Upload = (function (_super) {
    __extends(Upload, _super);
    function Upload(shareRequest, filename, filesize, filehash, fileReader, shareMessenger, feedingNodesBlockMaintainer, transferMessageCenter, writableShareRatifyFactory, writableEncryptedShareFactory, readableEncryptedShareFactory, readableShareAbortFactory, writableShareAbortFactory, readableBlockRequestFactory, writableBlockFactory, decrypter, encrypter) {
        _super.call(this);
        this._filename = null;
        this._filesize = 0;
        this._filehash = null;
        this._initialFeedingNodesBlockOfDownloader = null;
        this._fileReader = null;
        this._shareMessenger = null;
        this._feedingNodesBlockMaintainer = null;
        this._transferMessageCenter = null;
        this._writableShareRatifyFactory = null;
        this._writableEncryptedShareFactory = null;
        this._readableEncryptedShareFactory = null;
        this._readableShareAbortFactory = null;
        this._writableShareAbortFactory = null;
        this._readableBlockRequestFactory = null;
        this._writableBlockFactory = null;
        this._decrypter = null;
        this._encrypter = null;

        this._filename = filename;
        this._filesize = filesize;
        this._filehash = filehash;
        this._initialFeedingNodesBlockOfDownloader = shareRequest.getFeedingNodesBlock();
        this._fileReader = fileReader;
        this._shareMessenger = shareMessenger;
        this._feedingNodesBlockMaintainer = feedingNodesBlockMaintainer;
        this._transferMessageCenter = transferMessageCenter;
        this._writableShareRatifyFactory = writableShareRatifyFactory;
        this._writableEncryptedShareFactory = writableEncryptedShareFactory;
        this._readableEncryptedShareFactory = readableEncryptedShareFactory;
        this._readableShareAbortFactory = readableShareAbortFactory;
        this._writableShareAbortFactory = writableShareAbortFactory;
        this._readableBlockRequestFactory = readableBlockRequestFactory;
        this._writableBlockFactory = writableBlockFactory;
        this._decrypter = decrypter;
        this._encrypter = encrypter;
    }
    Upload.prototype.manuallyAbort = function () {
        // @todo
    };
    return Upload;
})(events.EventEmitter);

module.exports = Upload;
//# sourceMappingURL=Upload.js.map
