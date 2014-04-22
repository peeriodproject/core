/// <reference path='../../../ts-definitions/node/node.d.ts' />


/*
Kademlia IDs are represented by instances of node.js's Buffer class.

!!!IMPORTANT!!!
The Byte Buffer will be interpreted as bigendian numbers, so the low index bytes are the most significant!
Example:
Buffer array -> 	[]

 */

export interface DistanceMetric {

	/*
	Returns the byte buffer.
	 */
	getBuffer():NodeBuffer;


	/*
	Compute the distance between two ids `a` and `b` expressed as buffer.
	 */
	distanceTo(other:DistanceMetric):NodeBuffer;

	/*
	 Compare the difference of distance of two ids from this one. Return a
	 Number equal to 0 if the distance is identical, >0 if `first` is closer,
	 <0 otherwise.
	 */
	compareDistance(first:DistanceMetric, second:DistanceMetric):number;

	/*
	Test if the id is equal to another.
	 */
	equals(other:DistanceMetric):boolean;

	/*
	 Extract the bit at the specified index. The index must be between the range [0, bit_length[.
	 */
	at(index:number):number;

	/*
	Set the bit at the specified index. The index must be between the range [0, bit_length[.
	 */
	set(index:number, value:number):void;

	/*
	Returns the first bit in which two ids differ, starting from the highest bit, going down to 0.
	Returns -1 if they don't differ (and are thus the same).
	 */
	differsInHighestBit(other:DistanceMetric):number;

	/*
	Returns a string of the binary representation of the id with the length 8 * ByteLength,
	thus allowing zeros on the left.
	 */
	toBitString():string;

	/*
	Returns a string of the hexadecimal representation of the id.
	 */
	toHexString():string;
}




export class Id implements DistanceMetric {

	private buffer:NodeBuffer = null;
	private bit_length:number = 0;
	private byte_length:number = 0;

	// Static helper methods

	/*
	Calculates the number of bytes needed to store the specified bit length (bl).
	Identical to Math.ceil(bl / 8), but faster.
	 */
	static calculateByteLengthByBitLength(bl:number):number {
		var div = bl / 8,
			n = div << 0;
		return n == div ? n : n + 1;
	}

	/*
	Creates a byte buffer by the hexadecimal representation (string) provided. Throws an error if the hex doesn't equal
	the number of bytes expected.
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

	/*
	Creates a byte buffer by the binary representatino (string) provided. Throws an error if the string is longer than
	the nzmber of bytes expected.
	 */
	static byteBufferByBitString(binary_string:string, expected_byte_len:number):NodeBuffer {
		var str_len = binary_string.length;
		if ((str_len / 8) > expected_byte_len) {
			throw new Error('byteBufferByBitString: Bit length exceeds expected number of bytes');
		}

		var buffer = new Buffer(expected_byte_len);
		buffer.fill(0);

		for (var i=0; i<str_len; ++i) {
			var at = str_len - 1 - i,
				_i = expected_byte_len - 1 - (at / 8 | 0),
				mask = 1 << (at % 8);

			if (binary_string.charAt(i) == '1')
				buffer[_i] |= mask;
			else
				buffer[_i] &= 255 ^ mask;
		}

		return buffer;
	}


	// Implementation
	constructor(buffer:NodeBuffer, bit_length:number) {
		var byte_length = Id.calculateByteLengthByBitLength(bit_length);

		if (!((buffer instanceof Buffer) && (buffer.length == byte_length))) {
			throw new Error('ID construction failed: Must be Buffer of length ' + bit_length);
		}

		this.buffer 		= buffer;
		this.bit_length 	= bit_length;
		this.byte_length 	= byte_length;
	}

	getBuffer():NodeBuffer {
		return this.buffer;
	}

	distanceTo(other:DistanceMetric):NodeBuffer {
		if (!(other instanceof Id)) {
			throw new Error('Can only compare to another ID.');
		}

		var response = new Buffer(this.byte_length),
			a = this.getBuffer(),
			b = other.getBuffer();

		for (var i=0; i<this.byte_length; ++i) {
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

		for (var i=0; i<this.byte_length; ++i) {
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

		for (var i=0; i<this.byte_length; ++i) {
			if (a[i] !== b[i]) return false;
		}

		return true;
	}

	at(index:number):number {
		return (this.getBuffer()[this.byte_length - 1 - (index / 8 | 0)] & (1 << (index % 8))) > 0 ? 1 : 0;
	}

	set(index:number, value:number):void {
		var _i = this.byte_length - 1 - (index / 8 | 0),
			mask = 1 << (index % 8);
		if (value)
			this.getBuffer()[_i] |= mask;
		else
			this.getBuffer()[_i] &= 255 ^ mask;

	}

	differsInHighestBit(other:DistanceMetric):number {
		if (!(other instanceof Id)) {
			throw new Error('differsInHighestBit: Argument must be of type Id')
		}

		var a = this.getBuffer(),
			b = other.getBuffer();

		for (var i=0; i<this.byte_length; ++i) {
			var xor_byte = a[i] ^ b[i];
			if (xor_byte !== 0) {
				for (var j=0; j<8; ++j) {
					if (!(xor_byte >>= 1)) return (this.byte_length - 1 - i) * 8 + j;
				}
			}
		}

		return -1;
	}


	toBitString():string {
		var result = '';
		for (var i=0; i<this.bit_length; ++i) {
			result = (this.at(i) ? '1' : '0') + result;
		}
		return result;
	}

	toHexString():string {
		return this.getBuffer().toString('hex');
	}

}