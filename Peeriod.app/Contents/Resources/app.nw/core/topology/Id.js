/**
* @class core.topology.Id
* @implements core.topology.IdInterface
*
* @param {NodeBuffer} buffer
* @param {number} bit_length
*/
var Id = (function () {
    function Id(buffer, bitLength) {
        /**
        * @member {number} core.topology.Id~_bitLength
        */
        this._bitLength = 0;
        /**
        * @member {NodeBuffer} core.topology.Id~_buffer
        */
        this._buffer = null;
        /**
        * @member {number} core.topology.Id~_byteLength
        */
        this._byteLength = 0;
        var byteLength = Id.calculateByteLengthByBitLength(bitLength);

        if (!((buffer instanceof Buffer) && (buffer.length === byteLength))) {
            throw new Error('ID construction failed: Must be Buffer of length ' + byteLength);
        }

        this._buffer = buffer;
        this._bitLength = bitLength;
        this._byteLength = byteLength;
    }
    /**
    * Creates a byte buffer by the hexadecimal representation (string) provided. Throws an error if the hex doesn't
    * equal the number of bytes expected.
    *
    * @method core.topology.Id.byteBufferByHexString
    *
    * @param {string} hexString
    * @param {number} expectedByteLength
    * @returns {NodeBuffer}
    */
    Id.byteBufferByHexString = function (hexString, expectedByteLength) {
        if (hexString.length / 2 !== expectedByteLength) {
            throw new Error('Id.byteBufferByHexString: Expected ' + expectedByteLength + ', but got ' + (hexString.length / 2) + ' bytes');
        }

        var buffer = new Buffer(expectedByteLength);

        buffer.fill(0);
        buffer.write(hexString, 0, expectedByteLength, 'hex');

        return buffer;
    };

    /**
    * Creates a byte buffer by the binary representatino (string) provided. Throws an error if the string is longer than
    * the number of bytes expected.
    *
    * todo add throw jsdoc comment
    *
    * @method core.topology.Id.byteBufferByBitString
    *
    * @param {string} binaryString
    * @param {number} expectedByteLength
    * @returns {NodeBuffer}
    */
    Id.byteBufferByBitString = function (binaryString, expectedByteLength) {
        var binaryStringLength = binaryString.length;

        if ((binaryStringLength / 8) > expectedByteLength) {
            throw new Error('Id.byteBufferByBitString: Bit length exceeds expected number of bytes');
        }

        var buffer = new Buffer(expectedByteLength);

        buffer.fill(0);

        for (var i = 0; i < binaryStringLength; ++i) {
            var at = binaryStringLength - 1 - i, _i = expectedByteLength - 1 - (at / 8 | 0), mask = 1 << (at % 8);

            if (binaryString.charAt(i) == '1') {
                buffer[_i] |= mask;
            } else {
                buffer[_i] &= 255 ^ mask;
            }
        }

        return buffer;
    };

    /**
    * Calculates the number of bytes needed to store the specified bit length (bl).
    * Identical to Math.ceil(bl / 8), but faster.
    *
    * @method core.topology.Id.calculateByteLengthByBitLength
    *
    * @param {number} bitLength bit length
    * @returns {number}
    */
    Id.calculateByteLengthByBitLength = function (bitLength) {
        var div = bitLength / 8;
        var n = div << 0;

        return n == div ? n : n + 1;
    };

    Id.getRandomIdDifferingInHighestBit = function (srcId, differsIn) {
        var srcBuf = srcId.getBuffer();
        var bufLen = srcBuf.length;
        var buf = new Buffer(bufLen);

        srcBuf.copy(buf);

        var retId = new Id(buf, bufLen * 8);

        retId.set(differsIn, srcId.at(differsIn) ^ 1);

        for (var i = differsIn - 1; i >= 0; i--) {
            retId.set(i, Math.round(Math.random()));
        }

        return retId;
    };

    Id.prototype.at = function (index) {
        return (this.getBuffer()[this._byteLength - 1 - (index / 8 | 0)] & (1 << (index % 8))) > 0 ? 1 : 0;
    };

    Id.prototype.compareDistance = function (first, second) {
        if (!(first instanceof Id && second instanceof Id)) {
            throw new Error('Id.compareDistance: Arguments must be of type Id');
        }

        var a = this.getBuffer();
        var b = first.getBuffer();
        var c = second.getBuffer();

        for (var i = 0; i < this._byteLength; ++i) {
            var buf_a_b = a[i] ^ b[i];
            var buf_a_c = a[i] ^ c[i];

            // first is farther away
            if (buf_a_b > buf_a_c)
                return -1;

            // second is farther away
            if (buf_a_b < buf_a_c)
                return 1;
        }

        return 0;
    };

    Id.prototype.differsInHighestBit = function (other) {
        if (!(other instanceof Id)) {
            throw new Error('Id.differsInHighestBit: Argument must be of type Id');
        }

        var a = this.getBuffer();
        var b = other.getBuffer();

        for (var i = 0; i < this._byteLength; ++i) {
            var xor_byte = a[i] ^ b[i];

            if (xor_byte !== 0) {
                for (var j = 0; j < 8; ++j) {
                    if (!(xor_byte >>= 1))
                        return (this._byteLength - 1 - i) * 8 + j;
                }
            }
        }

        return -1;
    };

    Id.prototype.distanceTo = function (other) {
        if (!(other instanceof Id)) {
            throw new Error('Id.distanceTo: Can only compare to another Id.');
        }

        var response = new Buffer(this._byteLength);
        var a = this.getBuffer();
        var b = other.getBuffer();

        for (var i = 0; i < this._byteLength; ++i) {
            response[i] = a[i] ^ b[i];
        }

        return response;
    };

    Id.prototype.equals = function (other) {
        if (!(other instanceof Id)) {
            throw new Error('Id.equals: Argument must be of type Id');
        }

        var a = this.getBuffer();
        var b = other.getBuffer();

        for (var i = 0; i < this._byteLength; ++i) {
            if (a[i] !== b[i])
                return false;
        }

        return true;
    };

    Id.prototype.getBuffer = function () {
        return this._buffer;
    };

    Id.prototype.set = function (index, value) {
        var _i = this._byteLength - 1 - (index / 8 | 0);
        var mask = 1 << (index % 8);

        if (value) {
            this.getBuffer()[_i] |= mask;
        } else {
            this.getBuffer()[_i] &= 255 ^ mask;
        }
    };

    Id.prototype.toBitString = function () {
        var result = '';

        for (var i = 0; i < this._bitLength; ++i) {
            result = (this.at(i) ? '1' : '0') + result;
        }

        return result;
    };

    Id.prototype.toHexString = function () {
        return this.getBuffer().toString('hex');
    };
    return Id;
})();

module.exports = Id;
//# sourceMappingURL=Id.js.map
