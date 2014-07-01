/// <reference path='../../../ts-definitions/node/node.d.ts' />
var crypto = require('crypto');

/**
*
* This is a node.js implementation of the [HMAC-based Extract-and-Expand Key Derivation Function (HKDF) RFC-5869](http://tools.ietf.org/html/rfc5869)
*
* This class merely uses Buffers. See tests for test vectors of the RFC.
*
* @class core.crypto.HKDF
*
* @param {string} algorithm The Hash algorithm to use
* @param {Buffer} IKM Input key material to use.
*/
var HKDF = (function () {
    function HKDF(algorithm, IKM) {
        /**
        *
        * Number of octets output by the used hashing function
        *
        * @member {number} core.crypto.HKDF~_hashLen
        */
        this._hashLen = 0;
        /**
        *
        * Stores the Input Key Material
        *
        * @member {Buffer} core.crypto.HKDF~_IKM
        */
        this._IKM = null;
        /**
        *
        * Name of the algorithm to use.
        * For available algorithms, use `require('crypto').getHashes()`
        *
        * @member {string} core.crypto.HKDF~_algorithm
        */
        this._algorithm = null;
        this._hashLen = crypto.createHash(algorithm).digest().length;
        this._algorithm = algorithm;
        this._IKM = IKM;
    }
    /**
    *
    * Derives the output keying material (OKM)
    *
    * @method core.crypto.HKDF#derive
    *
    * @param {number} L Length of output keying material in octets (<= 255 * HashLength)
    * @param {Buffer} salt Optional salt value (a non-secret random value) (can be null)
    * @param {Buffer} info Optional context and application specific information (can be null). Please note that if no salt is used, this parameter should always be different for derivations using the same input keying material.
    *
    *
    * @returns {Buffer} The output keying material
    */
    HKDF.prototype.derive = function (L, salt, info) {
        var PRK = this.extract(salt);

        return this.expand(PRK, L, info);
    };

    /**
    * 'Extract' part of the RFC.
    *
    * @method core.crypto.HKDF#extract
    *
    * @param {Buffer} salt Optional salt value (a non-secret random value) (can be null)
    *
    * @returns {Buffer} The PRK, a pseudorandom key (of hashLength octets)
    */
    HKDF.prototype.extract = function (salt) {
        salt = salt || this._zeroBuffer(this._hashLen);

        var hmac = crypto.createHmac(this._algorithm, salt);

        hmac.update(this._IKM);
        return hmac.digest();
    };

    /**
    * 'Expand' part of the RFC.
    *
    * @method core.crypto.HKDF#expand
    *
    * @param {Buffer} PRK A pseudorandom key of at least HashLenght octets (usually the output from the extract step)
    * @param {number} L Length of output keying material in octets (<= 255 * HashLen)
    * @param {Buffer} optInfo Optional context and application specific information (can be null). Please note that if no salt is used, this parameter should always be different for derivations using the same input keying material.
    *
    * @returns {Buffer} Output keying material (of L octets)
    */
    HKDF.prototype.expand = function (PRK, L, optInfo) {
        var info = optInfo ? optInfo : new Buffer(0);

        var infoLen = info.length;
        var n = Math.ceil(L / this._hashLen);
        var prevBuffer = new Buffer(0);
        var output = new Buffer(n * this._hashLen);
        var retBuffer = new Buffer(L);

        for (var i = 0; i < n; i++) {
            var hmac = crypto.createHmac(this._algorithm, PRK);
            hmac.update(Buffer.concat([prevBuffer, info, new Buffer([i + 1])], infoLen + 1 + (i === 0 ? 0 : this._hashLen)));
            prevBuffer = hmac.digest();

            prevBuffer.copy(output, i * this._hashLen);
        }

        output.copy(retBuffer, 0, 0, L);

        return retBuffer;
    };

    /**
    * Returns a buffer of the given length filled with 0x00 bytes.
    *
    * @method core.crypto.HKDF~_zeroBuffer
    *
    * @param {number} ofLength Length of the output buffer in octets.
    * @returns {Buffer} An empty buffer of the given length
    */
    HKDF.prototype._zeroBuffer = function (ofLength) {
        var buf = new Buffer(ofLength);

        buf.fill(0x00);
        return buf;
    };
    return HKDF;
})();

module.exports = HKDF;
//# sourceMappingURL=HKDF.js.map
