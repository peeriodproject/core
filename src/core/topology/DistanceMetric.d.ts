/**
 * Created by joernroeder on 4/23/14.
 */

/// <reference path='../../../ts-definitions/node/node.d.ts' />

/**
 * @namespace topology
 */

/**
 * Kademlia IDs are represented by instances of node.js's Buffer class.
 *
 * !!!IMPORTANT!!!
 * The Byte Buffer will be interpreted as bigendian numbers, so the low index bytes are the most significant!
 *
 * Example (4 bytes):
 * Buffer array 	-> [0, 0, 4, 1]
 * Binary 			-> 00000000 00000000 00000100 00000001
 * Decimal			-> 1025 (for example by calling `readUInt32BE`)
 *
 * @interface
 * @class topology.DistanceMetric
 */
interface DistanceMetric {

	/**
	 * Returns the byte buffer.
	 *
	 * @abstract
	 * @method topology.DistanceMetric#getBuffer
	 *
	 * @return {Buffer} the byte buffer.
	 */
	getBuffer():NodeBuffer;


	/**
	 * Compute the distance between two ids `a` and `b` expressed as buffer.
	 *
	 * @abstract
	 * @method topology.DistanceMetric#distanceTo
	 *
	 * @param {topology.DistanceMetric} other
	 * @return {Buffer}
	 */
	distanceTo(other:DistanceMetric):NodeBuffer;

	/**
	 * Compare the difference of distance of two ids from this one. Return a
	 * Number equal to 0 if the distance is identical, >0 if `first` is closer, <0 otherwise.
	 *
	 * @abstract
	 * @method topology.DistanceMetric#compareDistance
	 *
	 * @param {topology.DistanceMetric} first
	 * @param {topology.DistanceMetric} second
	 * @return {number}
	 */
	compareDistance(first:DistanceMetric, second:DistanceMetric):number;

	/**
	 * Test if the id is equal to another.
	 *
	 * @abstract
	 * @method topology.DistanceMetric#equals
	 *
	 * @param {topology.DistanceMetric} other
	 * @return {boolean}
	 */
	equals(other:DistanceMetric):boolean;

	/**
	 * Extract the bit at the specified index. The index must be between the range [0, bit_length[.
	 *
	 * @abstract
	 * @method topology.DistanceMetric#at
	 *
	 * @param {number} index
	 * @return {number}
	 */
	at(index:number):number;

	/**
	 * Set the bit at the specified index. The index must be between the range [0, bit_length[.
	 *
	 * @abstract
	 * @method topology.DistanceMetric#set
	 *
	 * @param {number} index
	 * @param {number} value
	 */
	set(index:number, value:number):void;

	/**
	 * Returns the first bit in which two ids differ, starting from the highest bit, going down to 0.
	 * Returns -1 if they don't differ (and are thus the same).
	 *
	 * @abstract
	 * @method topology.DistanceMetric#differsInHighestBit
	 *
	 * @param {topology.DistanceMetric} other
	 * @return {number}
	 */
	differsInHighestBit(other:DistanceMetric):number;

	/**
	 * Returns a string of the binary representation of the id with the length 8 * ByteLength,
	 * thus allowing zeros on the left.
	 *
	 * @abstract
	 * @method topology.DistanceMetric#toBitString
	 *
	 * @return {string}
	 */
	toBitString():string;

	/**
	 * Returns a string of the hexadecimal representation of the id.
	 *
	 * @abstract
	 * @method topology.DistanceMetric#toHexString
	 *
	 * @return {string}
	 */
	toHexString():string;
}