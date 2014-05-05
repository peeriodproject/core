/// <reference path='../../../../ts-definitions/node/node.d.ts' />

/**
 * Kademlia IDs are represented by instances of node.js's Buffer class.
 *
 * __Important: The Byte Buffer will be interpreted as bigendian numbers, so the low index bytes are the most significant!__
 *
 * @example <caption>(4 bytes)</caption>
 *   Buffer array 	-> [0, 0, 4, 1]
 *   Binary 		-> 00000000 00000000 00000100 00000001
 *   Decimal		-> 1025 (for example by calling `readUInt32BE`)
 *
 * @interface
 * @class core.topology.IdInterface
 */
interface IdInterface {

	/**
	 * Extract the bit at the specified index. The index must be between the range [0, bit_length[.
	 *
	 * @method core.topology.IdInterface#at
	 *
	 * @param {number} index
	 * @return {number}
	 */
	at (index:number):number;

	/**
	 * Compare the difference of distance of two ids from this one. Return a
	 * Number equal to 0 if the distance is identical, >0 if `first` is closer, <0 otherwise.
	 *
	 * @method core.topology.IdInterface#compareDistance
	 *
	 * @param {core.topology.IdInterface} first
	 * @param {core.topology.IdInterface} second
	 * @return {number}
	 */
	compareDistance (first:IdInterface, second:IdInterface):number;

	/**
	 * Returns the first bit in which two ids differ, starting from the highest bit, going down to 0.
	 * Returns -1 if they don't differ (and are thus the same).
	 *
	 * @method core.topology.IdInterface#differsInHighestBit
	 *
	 * @param {core.topology.IdInterface} other
	 * @return {number}
	 */
	differsInHighestBit (other:IdInterface):number;

	/**
	 * Compute the distance between two ids `a` and `b` expressed as buffer.
	 *
	 * @method core.topology.IdInterface#distanceTo
	 *
	 * @param {core.topology.IdInterface} other
	 * @return {NodeBuffer}
	 */
	distanceTo (other:IdInterface):Buffer;

	/**
	 * Test if the id is equal to another.
	 *
	 * @method core.topology.IdInterface#equals
	 *
	 * @param {core.topology.IdInterface} other
	 * @return {boolean}
	 */
	equals (other:IdInterface):boolean;

	/**
	 * Returns the byte buffer.
	 *
	 * @method core.topology.IdInterface#getBuffer
	 *
	 * @return {NodeBuffer} the byte buffer.
	 */
	getBuffer ():Buffer;

	/**
	 * Set the bit at the specified index. The index must be between the range [0, bit_length[.
	 *
	 * @method core.topology.IdInterface#set
	 *
	 * @param {number} index
	 * @param {number} value
	 */
	set (index:number, value:number):void;

	/**
	 * Returns a string of the binary representation of the id with the length 8 * ByteLength,
	 * thus allowing zeros on the left.
	 *
	 * @method core.topology.IdInterface#toBitString
	 *
	 * @return {string}
	 */
	toBitString ():string;

	/**
	 * Returns a string of the hexadecimal representation of the id.
	 *
	 * @method core.topology.IdInterface#toHexString
	 *
	 * @return {string}
	 */
	toHexString ():string;

}

export = IdInterface;