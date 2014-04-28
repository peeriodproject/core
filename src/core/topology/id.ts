/// <reference path='../../../ts-definitions/node/node.d.ts' />
/// <reference path='DistanceMetric.d.ts' />

class Id implements DistanceMetric {

	/**
	 * @private
	 * @member {Buffer} Id#buffer
	 */
	private _buffer:NodeBuffer = null;

	/**
	 * @private
	 * @member {number} Id#bit_length
	 */
	private _bit_length:number = 0;

	/**
	 * @private
	 * @member {number} Id#byte_length
	 */
	private _byte_length:number = 0;

	// Static helper methods

	/**
	 * Calculates the number of bytes needed to store the specified bit length (bl).
	 * Identical to Math.ceil(bl / 8), but faster.
	 *
	 * @method Id.calculateByteLengthByBitLength
	 *
	 * @param {number} bl bit length
	 * @returns {number}
	 */
	static calculateByteLengthByBitLength(bl:number):number {
		var div = bl / 8,
			n = div << 0;

		return n == div ? n : n + 1;
	}

	/**
	 * Creates a byte buffer by the hexadecimal representation (string) provided. Throws an error if the hex doesn't
	 * equal the number of bytes expected.
	 *
	 * @method Id.byteBufferByHexString
	 *
	 * @param {string} hex_string
	 * @param {number} expected_byte_len
	 * @returns {Buffer}
	 */
	static byteBufferByHexString(hex_string:string, expected_byte_len:number):NodeBuffer {
		if (hex_string.length / 2 !== expected_byte_len) {
			throw new Error('byteBufferByHexString: Expected ' + expected_byte_len + ', but got ' + (hex_string.length / 2) + ' bytes');
		}

		var buffer = new Buffer(expected_byte_len);
		buffer.fill(0);
		buffer.write(hex_string, 0, expected_byte_len, 'hex');

		return buffer;
	}

	/**
	 * Creates a byte buffer by the binary representatino (string) provided. Throws an error if the string is longer than
	 * the number of bytes expected.
	 *
	 * todo add throw jsdoc comment
	 *
	 * @method Id.byteBufferByBitString
	 *
	 * @param {string} binary_string
	 * @param {number} expected_byte_len
	 * @returns {Buffer}
	 */
	static byteBufferByBitString(binary_string:string, expected_byte_len:number):NodeBuffer {
		var str_len = binary_string.length;
		if ((str_len / 8) > expected_byte_len) {
			throw new Error('byteBufferByBitString: Bit length exceeds expected number of bytes');
		}

		var buffer = new Buffer(expected_byte_len);
		buffer.fill(0);

		for (var i = 0; i < str_len; ++i) {
			var at = str_len - 1 - i,
				_i = expected_byte_len - 1 - (at / 8 | 0),
				mask = 1 << (at % 8);

			if (binary_string.charAt(i) == '1') {
				buffer[_i] |= mask;
			}
			else {
				buffer[_i] &= 255 ^ mask;
			}
		}

		return buffer;
	}

	/**
	 * Implementation
	 *
	 * @class Id
	 * @implements topology.DistanceMetric
	 *
	 * @param {Buffer} buffer
	 * @param {number} bit_length
	 */
	constructor(buffer:NodeBuffer, bit_length:number) {
		var byte_length = Id.calculateByteLengthByBitLength(bit_length);

		if (!((buffer instanceof Buffer) && (buffer.length == byte_length))) {
			throw new Error('ID construction failed: Must be Buffer of length ' + bit_length);
		}

		this._buffer 		= buffer;
		this._bit_length 	= bit_length;
		this._byte_length 	= byte_length;
	}

	/**
	 * {@link topology.DistanceMetric#getBuffer}
	 *
	 * @method Id#getBuffer
	 */
	getBuffer():NodeBuffer {
		return this._buffer;
	}

	/**
	 * {@link topology.DistanceMetric#distanceTo}
	 *
	 * @method Id#distanceTo
	 */
	distanceTo(other:DistanceMetric):NodeBuffer {
		if (!(other instanceof Id)) {
			throw new Error('Can only compare to another ID.');
		}

		var response = new Buffer(this._byte_length),
			a = this.getBuffer(),
			b = other.getBuffer();

		for (var i=0; i<this._byte_length; ++i) {
			response[i] = a[i] ^ b[i];
		}

		return response;
	}

	compareDistance(first:DistanceMetric, second:DistanceMetric):number {
		if (!(first instanceof Id && second instanceof Id)) {
			throw new Error('compareDistance: Arguments must be of type Id');
		}

		var a = this.getBuffer(),
			b = first.getBuffer(),
			c = second.getBuffer();

		for (var i=0; i<this._byte_length; ++i) {
			var buf_a_b = a[i] ^ b[i],
				buf_a_c = a[i] ^ c[i];

			// first is farther away
			if (buf_a_b > buf_a_c) return -1;

			// second is farther away
			if (buf_a_b < buf_a_c) return 1;
		}

		return 0;
	}

	equals(other:DistanceMetric):boolean {
		if (!(other instanceof Id)) {
			throw new Error('equals: Argument must be of type Id')
		}

		var a = this.getBuffer(),
			b = other.getBuffer();

		for (var i=0; i<this._byte_length; ++i) {
			if (a[i] !== b[i]) return false;
		}

		return true;
	}

	at(index:number):number {
		return (this.getBuffer()[this._byte_length - 1 - (index / 8 | 0)] & (1 << (index % 8))) > 0 ? 1 : 0;
	}

	set(index:number, value:number):void {
		var _i = this._byte_length - 1 - (index / 8 | 0),
			mask = 1 << (index % 8);

		if (value) {
			this.getBuffer()[_i] |= mask;
		}
		else {
			this.getBuffer()[_i] &= 255 ^ mask;
		}
	}

	differsInHighestBit(other:DistanceMetric):number {
		if (!(other instanceof Id)) {
			throw new Error('differsInHighestBit: Argument must be of type Id');
		}

		var a = this.getBuffer(),
			b = other.getBuffer();

		for (var i=0; i<this._byte_length; ++i) {
			var xor_byte = a[i] ^ b[i];

			if (xor_byte !== 0) {
				for (var j=0; j<8; ++j) {
					if (!(xor_byte >>= 1)) return (this._byte_length - 1 - i) * 8 + j;
				}
			}
		}

		return -1;
	}

	toBitString():string {
		var result = '';
		for (var i=0; i<this._bit_length; ++i) {
			result = (this.at(i) ? '1' : '0') + result;
		}
		return result;
	}

	toHexString():string {
		return this.getBuffer().toString('hex');
	}
}

export = Id;