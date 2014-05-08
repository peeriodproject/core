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
	 * @member {number} core.topology.Id~_bitLength
	 */
	private _bitLength:number = 0;

	/**
	 * @member {NodeBuffer} core.topology.Id~_buffer
	 */
	private _buffer:Buffer = null;

	/**
	 * @member {number} core.topology.Id~_byteLength
	 */
	private _byteLength:number = 0;

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
	public static byteBufferByHexString (hexString:string, expectedByteLength:number):Buffer {
		if (hexString.length / 2 !== expectedByteLength) {
			throw new Error('Id.byteBufferByHexString: Expected ' + expectedByteLength + ', but got ' + (hexString.length / 2) + ' bytes');
		}

		var buffer:Buffer = new Buffer(expectedByteLength);

		buffer.fill(0);
		buffer.write(hexString, 0, expectedByteLength, 'hex');

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
	 * @param {string} binaryString
	 * @param {number} expectedByteLength
	 * @returns {NodeBuffer}
	 */
	public static byteBufferByBitString (binaryString:string, expectedByteLength:number):Buffer {
		var binaryStringLength:number = binaryString.length;

		if ((binaryStringLength / 8) > expectedByteLength) {
			throw new Error('Id.byteBufferByBitString: Bit length exceeds expected number of bytes');
		}

		var buffer:Buffer = new Buffer(expectedByteLength);

		buffer.fill(0);

		for (var i = 0; i < binaryStringLength; ++i) {
			var at = binaryStringLength - 1 - i,
				_i = expectedByteLength - 1 - (at / 8 | 0),
				mask = 1 << (at % 8);

			if (binaryString.charAt(i) == '1') {
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
	 * @param {number} bitLength bit length
	 * @returns {number}
	 */
	public static calculateByteLengthByBitLength (bitLength:number):number {
		var div:number = bitLength / 8;
		var n:number = div << 0;

		return n == div ? n : n + 1;
	}

	constructor (buffer:Buffer, bitLength:number) {
		var byteLength:number = Id.calculateByteLengthByBitLength(bitLength);

		if (!((buffer instanceof Buffer) && (buffer.length === byteLength))) {
			throw new Error('ID construction failed: Must be Buffer of length ' + byteLength);
		}

		this._buffer = buffer;
		this._bitLength = bitLength;
		this._byteLength = byteLength;
	}

	public at (index:number):number {
		return (this.getBuffer()[this._byteLength - 1 - (index / 8 | 0)] & (1 << (index % 8))) > 0 ? 1 : 0;
	}

	public compareDistance (first:IdInterface, second:IdInterface):number {
		if (!(first instanceof Id && second instanceof Id)) {
			throw new Error('Id.compareDistance: Arguments must be of type Id');
		}

		var a:Buffer = this.getBuffer();
		var b:Buffer = first.getBuffer();
		var c:Buffer = second.getBuffer();

		for (var i:number = 0; i < this._byteLength; ++i) {
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

		var a:Buffer = this.getBuffer();
		var b:Buffer = other.getBuffer();

		for (var i:number = 0; i < this._byteLength; ++i) {
			var xor_byte:number = a[i] ^ b[i];

			if (xor_byte !== 0) {
				for (var j = 0; j < 8; ++j) {
					if (!(xor_byte >>= 1)) return (this._byteLength - 1 - i) * 8 + j;
				}
			}
		}

		return -1;
	}

	public distanceTo (other:IdInterface):Buffer {
		if (!(other instanceof Id)) {
			throw new Error('Id.distanceTo: Can only compare to another Id.');
		}

		var response:Buffer = new Buffer(this._byteLength);
		var a:Buffer = this.getBuffer();
		var b:Buffer = other.getBuffer();

		for (var i = 0; i < this._byteLength; ++i) {
			response[i] = a[i] ^ b[i];
		}

		return response;
	}

	public equals (other:IdInterface):boolean {
		if (!(other instanceof Id)) {
			throw new Error('Id.equals: Argument must be of type Id');
		}

		var a:Buffer = this.getBuffer();
		var b:Buffer = other.getBuffer();

		for (var i:number = 0; i < this._byteLength; ++i) {
			if (a[i] !== b[i]) return false;
		}

		return true;
	}

	public getBuffer ():Buffer {
		return this._buffer;
	}

	public set (index:number, value:number):void {
		var _i:number = this._byteLength - 1 - (index / 8 | 0);
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

		for (var i:number = 0; i < this._bitLength; ++i) {
			result = (this.at(i) ? '1' : '0') + result;
		}

		return result;
	}

	public toHexString ():string {
		return this.getBuffer().toString('hex');
	}

}

export = Id;