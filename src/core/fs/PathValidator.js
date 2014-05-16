/// <reference path='../../main.d.ts' />
var crypto = require('crypto');
var fs = require('fs');

/**
* @class core.fs.PathValidator
* @implements core.fs.PathValidatorInterface
*/
var PathValidator = (function () {
    function PathValidator() {
    }
    PathValidator.prototype.getHash = function (filePath, callback) {
        fs.stat(filePath, function (err, stats) {
            if (err) {
                return callback(err, null);
            } else if (!stats.isFile() && !stats.isDirectory()) {
                return callback(new Error('PathValidator.getHash: The specified path is not a valid file or directory. "' + filePath + '"'), null);
            }

            // todo fix node.d.ts (duplex stream)
            var hash = crypto.createHash('sha1');
            var fileStream = fs.createReadStream(filePath);

            hash.setEncoding('hex');

            fileStream.pipe(hash, {
                end: false
            });

            fileStream.on('end', function () {
                hash.end();

                callback(null, hash.read());
            });
        });
    };

    PathValidator.prototype.validateHash = function (filePath, hashToValidate, callback) {
        this.getHash(filePath, function (err, fileHash) {
            if (err) {
                return callback(err, false, fileHash);
            } else {
                return callback(null, (hashToValidate === fileHash), fileHash);
            }
        });
    };
    return PathValidator;
})();

module.exports = PathValidator;
//# sourceMappingURL=PathValidator.js.map
