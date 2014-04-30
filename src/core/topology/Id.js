/**
* @class core.topology.Id
* @implements core.topology.IdInterface
*
* @param {NodeBuffer} buffer
* @param {number} bit_length
*/
var Id = (function () {
    function Id(buffer, bit_length) {
        /**
        * @private
        * @member {number} core.topology.Id#_bit_length
        */
        this._bit_length = 0;
        /**
        * @private
        * @member {NodeBuffer} core.topology.Id#_buffer
        */
        this._buffer = null;
        /**
        * @private
        * @member {number} core.topology.Id#_byte_length
        */
        this._byte_length = 0;
        var byte_length = Id.calculateByteLengthByBitLength(bit_length);

        if (!((buffer instanceof Buffer) && (buffer.length === byte_length))) {
            throw new Error('ID construction failed: Must be Buffer of length ' + byte_length);
        }

        this._buffer = buffer;
        this._bit_length = bit_length;
        this._byte_length = byte_length;
    }
    /**
    * Creates a byte buffer by the hexadecimal representation (string) provided. Throws an error if the hex doesn't
    * equal the number of bytes expected.
    *
    * @method core.topology.Id.byteBufferByHexString
    *
    * @param {string} hex_string
    * @param {number} expected_byte_len
    * @returns {NodeBuffer}
    */
    Id.byteBufferByHexString = function (hex_string, expected_byte_len) {
        if (hex_string.length / 2 !== expected_byte_len) {
            throw new Error('Id.byteBufferByHexString: Expected ' + expected_byte_len + ', but got ' + (hex_string.length / 2) + ' bytes');
        }

        var buffer = new Buffer(expected_byte_len);

        buffer.fill(0);
        buffer.write(hex_string, 0, expected_byte_len, 'hex');

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
    * @param {string} binary_string
    * @param {number} expected_byte_len
    * @returns {NodeBuffer}
    */
    Id.byteBufferByBitString = function (binary_string, expected_byte_len) {
        var strLen = binary_string.length;

        if ((strLen / 8) > expected_byte_len) {
            throw new Error('Id.byteBufferByBitString: Bit length exceeds expected number of bytes');
        }

        var buffer = new Buffer(expected_byte_len);

        buffer.fill(0);

        for (var i = 0; i < strLen; ++i) {
            var at = strLen - 1 - i, _i = expected_byte_len - 1 - (at / 8 | 0), mask = 1 << (at % 8);

            if (binary_string.charAt(i) == '1') {
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
    * @param {number} bl bit length
    * @returns {number}
    */
    Id.calculateByteLengthByBitLength = function (bl) {
        var div = bl / 8;
        var n = div << 0;

        return n == div ? n : n + 1;
    };

    Id.prototype.getBuffer = function () {
        return this._buffer;
    };

    Id.prototype.distanceTo = function (other) {
        if (!(other instanceof Id)) {
            throw new Error('Can only compare to another ID.');
        }

        var response = new Buffer(this._byte_length);
        var a = this.getBuffer();
        var b = other.getBuffer();

        for (var i = 0; i < this._byte_length; ++i) {
            response[i] = a[i] ^ b[i];
        }

        return response;
    };

    Id.prototype.compareDistance = function (first, second) {
        if (!(first instanceof Id && second instanceof Id)) {
            throw new Error('compareDistance: Arguments must be of type Id');
        }

        var a = this.getBuffer();
        var b = first.getBuffer();
        var c = second.getBuffer();

        for (var i = 0; i < this._byte_length; ++i) {
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

    Id.prototype.equals = function (other) {
        if (!(other instanceof Id)) {
            throw new Error('equals: Argument must be of type Id');
        }

        var a = this.getBuffer();
        var b = other.getBuffer();

        for (var i = 0; i < this._byte_length; ++i) {
            if (a[i] !== b[i])
                return false;
        }

        return true;
    };

    Id.prototype.at = function (index) {
        return (this.getBuffer()[this._byte_length - 1 - (index / 8 | 0)] & (1 << (index % 8))) > 0 ? 1 : 0;
    };

    Id.prototype.set = function (index, value) {
        var _i = this._byte_length - 1 - (index / 8 | 0);
        var mask = 1 << (index % 8);

        if (value) {
            this.getBuffer()[_i] |= mask;
        } else {
            this.getBuffer()[_i] &= 255 ^ mask;
        }
    };

    Id.prototype.differsInHighestBit = function (other) {
        if (!(other instanceof Id)) {
            throw new Error('differsInHighestBit: Argument must be of type Id');
        }

        var a = this.getBuffer();
        var b = other.getBuffer();

        for (var i = 0; i < this._byte_length; ++i) {
            var xor_byte = a[i] ^ b[i];

            if (xor_byte !== 0) {
                for (var j = 0; j < 8; ++j) {
                    if (!(xor_byte >>= 1))
                        return (this._byte_length - 1 - i) * 8 + j;
                }
            }
        }

        return -1;
    };

    Id.prototype.toBitString = function () {
        var result = '';

        for (var i = 0; i < this._bit_length; ++i) {
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
