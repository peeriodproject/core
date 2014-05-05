import IdInterface = require('./interfaces/IdInterface');

/**
 * @class core.topology.Id
 * @implements core.topology.IdInterface
 *
 * @param {NodeBuffer} buffer
 * @param {number} bit_length
 */
class Id implements IdInterface {

	/**
	 * @member {number} core.topology.Id~_bit_length
	 */
	private _bit_length:number = 0;

	/**
	 * @member {NodeBuffer} core.topology.Id~_buffer
	 */
	private _buffer:NodeBuffer = null;

	/**
	 * @member {number} core.topology.Id~_byte_length
	 */
	private _byte_length:number = 0;

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
	public static byteBufferByHexString (hex_string:string, expected_byte_len:number):NodeBuffer {
		if (hex_string.length / 2 !== expected_byte_len) {
			throw new Error('Id.byteBufferByHexString: Expected ' + expected_byte_len + ', but got ' + (hex_string.length / 2) + ' bytes');
		}

		var buffer:NodeBuffer = new Buffer(expected_byte_len);

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
	 * @method core.topology.Id.byteBufferByBitString
	 *
	 * @param {string} binary_string
	 * @param {number} expected_byte_len
	 * @returns {NodeBuffer}
	 */
	public static byteBufferByBitString (binary_string:string, expected_byte_len:number):NodeBuffer {
		var strLen:number = binary_string.length;

		if ((strLen / 8) > expected_byte_len) {
			throw new Error('Id.byteBufferByBitString: Bit length exceeds expected number of bytes');
		}

		var buffer:NodeBuffer = new Buffer(expected_byte_len);

		buffer.fill(0);

		for (var i = 0; i < strLen; ++i) {
			var at = strLen - 1 - i,
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
	 * Calculates the number of bytes needed to store the specified bit length (bl).
	 * Identical to Math.ceil(bl / 8), but faster.
	 *
	 * @method core.topology.Id.calculateByteLengthByBitLength
	 *
	 * @param {number} bl bit length
	 * @returns {number}
	 */
	public static calculateByteLengthByBitLength (bl:number):number {
		var div:number = bl / 8;
		var n:number = div << 0;

		return n == div ? n : n + 1;
	}

	constructor (buffer:NodeBuffer, bit_length:number) {
		var byte_length:number = Id.calculateByteLengthByBitLength(bit_length);

		if (!((buffer instanceof Buffer) && (buffer.length === byte_length))) {
			throw new Error('ID construction failed: Must be Buffer of length ' + byte_length);
		}

		this._buffer = buffer;
		this._bit_length = bit_length;
		this._byte_length = byte_length;
	}

	public at (index:number):number {
		return (this.getBuffer()[this._byte_length - 1 - (index / 8 | 0)] & (1 << (index % 8))) > 0 ? 1 : 0;
	}

	public compareDistance (first:IdInterface, second:IdInterface):number {
		if (!(first instanceof Id && second instanceof Id)) {
			throw new Error('Id.compareDistance: Arguments must be of type Id');
		}

		var a:NodeBuffer = this.getBuffer();
		var b:NodeBuffer = first.getBuffer();
		var c:NodeBuffer = second.getBuffer();

		for (var i:number = 0; i < this._byte_length; ++i) {
			var buf_a_b:number = a[i] ^ b[i];
			var buf_a_c:number = a[i] ^ c[i];

			// first is farther away
			if (buf_a_b > buf_a_c) return -1;

			// second is farther away
			if (buf_a_b < buf_a_c) return 1;
		}

		return 0;
	}

	public differsInHighestBit (other:IdInterface):number {
		if (!(other instanceof Id)) {
			throw new Error('Id.differsInHighestBit: Argument must be of type Id');
		}

		var a:NodeBuffer = this.getBuffer();
		var b:NodeBuffer = other.getBuffer();

		for (var i:number = 0; i < this._byte_length; ++i) {
			var xor_byte:number = a[i] ^ b[i];

			if (xor_byte !== 0) {
				for (var j = 0; j < 8; ++j) {
					if (!(xor_byte >>= 1)) return (this._byte_length - 1 - i) * 8 + j;
				}
			}
		}

		return -1;
	}

	public distanceTo (other:IdInterface):NodeBuffer {
		if (!(other instanceof Id)) {
			throw new Error('Id.distanceTo: Can only compare to another Id.');
		}

		var response:NodeBuffer = new Buffer(this._byte_length);
		var a:NodeBuffer = this.getBuffer();
		var b:NodeBuffer = other.getBuffer();

		for (var i = 0; i < this._byte_length; ++i) {
			response[i] = a[i] ^ b[i];
		}

		return response;
	}

	public equals (other:IdInterface):boolean {
		if (!(other instanceof Id)) {
			throw new Error('Id.equals: Argument must be of type Id');
		}

		var a:NodeBuffer = this.getBuffer();
		var b:NodeBuffer = other.getBuffer();

		for (var i:number = 0; i < this._byte_length; ++i) {
			if (a[i] !== b[i]) return false;
		}

		return true;
	}

	public getBuffer ():NodeBuffer {
		return this._buffer;
	}

	public set (index:number, value:number):void {
		var _i:number = this._byte_length - 1 - (index / 8 | 0);
		var mask:number = 1 << (index % 8);

		if (value) {
			this.getBuffer()[_i] |= mask;
		}
		else {
			this.getBuffer()[_i] &= 255 ^ mask;
		}
	}

	public toBitString ():string {
		var result:string = '';

		for (var i:number = 0; i < this._bit_length; ++i) {
			result = (this.at(i) ? '1' : '0') + result;
		}

		return result;
	}

	public toHexString ():string {
		return this.getBuffer().toString('hex');
	}

}

export = Id;