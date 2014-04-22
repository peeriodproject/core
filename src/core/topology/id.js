/// <reference path='../../../ts-definitions/node/node.d.ts' />

var Id = (function () {
    // Implementation
    function Id(buffer, bit_length) {
        this.buffer = null;
        this.bit_length = 0;
        this.byte_length = 0;
        var byte_length = Id.calculateByteLengthByBitLength(bit_length);

        if (!((buffer instanceof Buffer) && (buffer.length == byte_length))) {
            throw new Error('ID construction failed: Must be Buffer of length ' + bit_length);
        }

        this.buffer = buffer;
        this.bit_length = bit_length;
        this.byte_length = byte_length;
    }
    // Static helper methods
    /*
    Calculates the number of bytes needed to store the specified bit length (bl).
    Identical to Math.ceil(bl / 8), but faster.
    */
    Id.calculateByteLengthByBitLength = function (bl) {
        var div = bl / 8, n = div << 0;
        return n == div ? n : n + 1;
    };

    /*
    Creates a byte buffer by the hexadecimal representation (string) provided. Throws an error if the hex doesn't equal
    the number of bytes expected.
    */
    Id.byteBufferByHexString = function (hex_string, expected_byte_len) {
        if (hex_string.length / 2 !== expected_byte_len) {
            throw new Error('byteBufferByHexString: Expected ' + expected_byte_len + ', but got ' + (hex_string.length / 2) + ' bytes');
        }

        var buffer = new Buffer(expected_byte_len);
        buffer.fill(0);
        buffer.write(hex_string, 0, expected_byte_len, 'hex');
        return buffer;
    };

    /*
    Creates a byte buffer by the binary representatino (string) provided. Throws an error if the string is longer than
    the nzmber of bytes expected.
    */
    Id.byteBufferByBitString = function (binary_string, expected_byte_len) {
        var str_len = binary_string.length;
        if ((str_len / 8) > expected_byte_len) {
            throw new Error('byteBufferByBitString: Bit length exceeds expected number of bytes');
        }

        var buffer = new Buffer(expected_byte_len);
        buffer.fill(0);

        for (var i = 0; i < str_len; ++i) {
            var at = str_len - 1 - i, _i = expected_byte_len - 1 - (at / 8 | 0), mask = 1 << (at % 8);

            if (binary_string.charAt(i) == '1')
                buffer[_i] |= mask;
            else
                buffer[_i] &= 255 ^ mask;
        }

        return buffer;
    };

    Id.prototype.getBuffer = function () {
        return this.buffer;
    };

    Id.prototype.distanceTo = function (other) {
        if (!(other instanceof Id)) {
            throw new Error('Can only compare to another ID.');
        }

        var response = new Buffer(this.byte_length), a = this.getBuffer(), b = other.getBuffer();

        for (var i = 0; i < this.byte_length; ++i) {
            response[i] = a[i] ^ b[i];
        }

        return response;
    };

    Id.prototype.compareDistance = function (first, second) {
        if (!(first instanceof Id && second instanceof Id)) {
            throw new Error('compareDistance: Arguments must be of type Id');
        }

        var a = this.getBuffer(), b = first.getBuffer(), c = second.getBuffer();

        for (var i = 0; i < this.byte_length; ++i) {
            var buf_a_b = a[i] ^ b[i], buf_a_c = a[i] ^ c[i];

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

        var a = this.getBuffer(), b = other.getBuffer();

        for (var i = 0; i < this.byte_length; ++i) {
            if (a[i] !== b[i])
                return false;
        }

        return true;
    };

    Id.prototype.at = function (index) {
        return (this.getBuffer()[this.byte_length - 1 - (index / 8 | 0)] & (1 << (index % 8))) > 0 ? 1 : 0;
    };

    Id.prototype.set = function (index, value) {
        var _i = this.byte_length - 1 - (index / 8 | 0), mask = 1 << (index % 8);
        if (value)
            this.getBuffer()[_i] |= mask;
        else
            this.getBuffer()[_i] &= 255 ^ mask;
    };

    Id.prototype.differsInHighestBit = function (other) {
        if (!(other instanceof Id)) {
            throw new Error('differsInHighestBit: Argument must be of type Id');
        }

        var a = this.getBuffer(), b = other.getBuffer();

        for (var i = 0; i < this.byte_length; ++i) {
            var xor_byte = a[i] ^ b[i];
            if (xor_byte !== 0) {
                for (var j = 0; j < 8; ++j) {
                    if (!(xor_byte >>= 1))
                        return (this.byte_length - 1 - i) * 8 + j;
                }
            }
        }

        return -1;
    };

    Id.prototype.toBitString = function () {
        var result = '';
        for (var i = 0; i < this.bit_length; ++i) {
            result = (this.at(i) ? '1' : '0') + result;
        }
        return result;
    };

    Id.prototype.toHexString = function () {
        return this.getBuffer().toString('hex');
    };
    return Id;
})();
exports.Id = Id;
//# sourceMappingURL=id.js.map
