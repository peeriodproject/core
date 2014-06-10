/// <reference path='../../../ts-definitions/node/node.d.ts' />
var crypto = require('crypto');

/**
* This static class helps generating (and decrypting) random shares for an additive sharing scheme.
*
* @class core.crypto.AdditiveSharingScheme
*/
var AdditiveSharingScheme = (function () {
    function AdditiveSharingScheme() {
    }
    /**
    * Calculates the cleartext from an array of given shares.
    *
    * @method core.crypto.AdditiveSharingScheme.getCleartext
    *
    * @param {Array<Buffer>} shares The input array of shares
    * @param {number} length (optional) Length of the expected output buffer
    * @returns {Buffer} The calculated cleartext
    */
    AdditiveSharingScheme.getCleartext = function (shares, length) {
        length = length ? length : shares[0].length;

        var retBuf = new Buffer(length);
        var amount = shares.length;

        for (var i = 0; i < length; i++) {
            var mem = 0x00;

            for (var j = 0; j < amount; j++) {
                mem += shares[j][i];
            }

            retBuf[i] = mem;
        }

        return retBuf;
    };

    /**
    * Gets a number of random buffers.
    *
    * @method core.crypto.AdditiveSharingScheme.getRandomBuffers
    *
    * @param {number} amount Number of expected random buffers.
    * @param {number} length The length of each buffer (number of octets)
    * @param {Function} callback Callback which gets called with the array as parameter as soon as all random Buffers have been generated.
    */
    AdditiveSharingScheme.getRandomBuffers = function (amount, length, callback) {
        var i = 0;
        var ret = [];
        var getRandomBuffer = function () {
            if (++i <= amount) {
                crypto.randomBytes(length, function (err, buf) {
                    if (err) {
                        i--;
                        setImmediate(function () {
                            getRandomBuffer();
                        });
                    } else {
                        ret.push(buf);
                        getRandomBuffer();
                    }
                });
            } else {
                callback(ret);
            }
        };

        getRandomBuffer();
    };

    /**
    * Calculates all shares for an additive sharing scheme by a given input buffer.
    *
    * @method core.crypto.AdditiveSharingScheme.getShares
    *
    * @param {Buffer} input The input buffer (the cleartext, so to say)
    * @param (number} numOfShares Number of expected shares
    * @param {number} length The length of the cleartext / shares
    * @param {Function} callback Function which gets called with the resulting array of shares as parameter.
    */
    AdditiveSharingScheme.getShares = function (input, numOfShares, length, callback) {
        AdditiveSharingScheme.getRandomBuffers(numOfShares - 1, length, function (sh) {
            var lastShare = new Buffer(length);

            for (var i = 0; i < length; i++) {
                var mem = 0x00;

                for (var j = 0; j < numOfShares - 1; j++) {
                    mem += sh[j][i];
                }
                lastShare[i] = input[i] - mem;
            }

            sh.push(lastShare);
            callback(sh);
        });
    };
    return AdditiveSharingScheme;
})();

module.exports = AdditiveSharingScheme;
//# sourceMappingURL=AdditiveSharingScheme.js.map
