/// <reference path='../../../ts-definitions/node/node.d.ts' />

var Id = (function () {
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

        var a = this.getBuffer(), b = this.getBuffer();

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
            throw new Error('equals: Argument must be of type Id');
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

    Id.calculateByteLengthByBitLength = function (bl) {
        var div = bl / 8, n = div << 0;
        return n == div ? n : n + 1;
    };

    Id.prototype.toHexString = function () {
        return this.getBuffer().toString('hex');
    };

    Id.prototype.toBitString = function () {
        var result = '';
        for (var i = 0; i < this.bit_length; ++i) {
            result += this.at(i) ? '1' : '0';
        }
        return result;
    };
    return Id;
})();
exports.Id = Id;
//# sourceMappingURL=id.js.map
