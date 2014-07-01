/// <reference path='../../../../../ts-definitions/node/node.d.ts' />

import net = require('net');

import HydraNodeList = require('../../hydra/interfaces/HydraNodeList');
import HydraNode = require('../../hydra/interfaces/HydraNode');
import ContactNodeAddress = require('../../../topology/ContactNodeAddress');
import MessageByteCheatsheet = require('../../../protocol/messages/MessageByteCheatsheet');

/**
 * The FeedingNodesMessageBlock is the message block used in FILE_TRANSFER messages which need to convey circuit nodes through
 * which an anonymous node can be reached. It consists of the following:
 *
 * 1.) 1 byte indicating the number of nodes
 * 2.) For each node the following:
 * 		- 16 bytes for the feeding identifier
 * 		- 1 byte for the kind of address: IPv4 or IPv6
 * 		- The IP address: 16 bytes for IPv6, 4 bytes for IPv4
 * 		- 2 bytes for the port
 *
 * 	@class core.protocol.fileTransfer.FeedingNodesMessageBlock
 */
class FeedingNodesMessageBlock {

	/**
	 * Constructs a sendable buffer representation of the given nodes.
	 * Each node must have specified an IP, a port and a feeding identifier.
	 *
	 * @method core.protocol.fileTransfer.FeedingNodesMessageBlock.constructBlock
	 *
	 * @param {core.protocol.hydra.HydraNodeList} The nodes to get an feeding-message-block from.
	 * @returns {Buffer}
	 */
	public static constructBlock (nodeList:HydraNodeList):Buffer {
		var bufferList:Array<Buffer> = [];
		var byteLen:number = 1;
		var nodeListLen:number = nodeList.length;

		bufferList.push(new Buffer([nodeListLen]));


		for (var i = 0; i < nodeListLen; i++) {
			var node:HydraNode = nodeList[i];

			if (!(node.ip && node.port && node.feedingIdentifier)) {
				throw new Error('FeedingNodesMessageBlock.constructBlock: A node must have IP, port and feedingIdentifier specified!');
			}

			var feedingIdent:Buffer = new Buffer(node.feedingIdentifier, 'hex');

			if (feedingIdent.length !== 16) {
				throw new Error('FeedingNodesMessageBlock.constructBlock: feedingIdentifier must be of byte length 16');
			}

			bufferList.push(feedingIdent);
			byteLen += 16;

			if (net.isIPv4(node.ip)) {
				byteLen += 7;
				bufferList.push(new Buffer([MessageByteCheatsheet.ipv4]));
				bufferList.push(ContactNodeAddress.ipPortAsBuffer(node.ip, node.port));
			}
			else if (net.isIPv6(node.ip)) {
				byteLen += 19;
				bufferList.push(new Buffer([MessageByteCheatsheet.ipv6]));
				bufferList.push(ContactNodeAddress.ipPortAsBuffer(node.ip, node.port));
			}
			else {
				throw new Error('FeedingNodesMessageBlock.constructBlock: Unrecognizable IP address');
			}
		}


		return Buffer.concat(bufferList, byteLen);
	}

	/**
	 * Extracts an array of nodes from a given buffer starting with a feeding node message block.
	 * Returns an object with the resulting node array and the number of bytes of the feeding node message block.
	 *
	 * @method core.protocol.fileTransfer.FeedingNodesMessageBlock.extractAndDeconstructBlock
	 *
	 * @param {Buffer} buffer The buffer to read from
	 * @returns {{bytesRead: number, nodes: HydraNodeList}}
	 */
	public static extractAndDeconstructBlock (buffer:Buffer):any {
		var nodeList:HydraNodeList = [];
		var bytesRead = 0;

		var numOfNodes:number = buffer[0];
		bytesRead++;

		for (var i = 0; i < numOfNodes; i++) {
			var ipError:boolean = false;
			var ip:string = '';
			var feedingIdentifier:string = buffer.slice(bytesRead, bytesRead + 16).toString('hex');

			bytesRead += 16;

			var addressIndicator:number = buffer[bytesRead];

			bytesRead += 1;

			if (addressIndicator === MessageByteCheatsheet.ipv4) {

				ip = buffer.slice(bytesRead, bytesRead + 4).toJSON().join('.');

				bytesRead += 4;

				if (!net.isIPv4(ip)) {
					ipError = true;
				}

			}
			else if (addressIndicator === MessageByteCheatsheet.ipv6) {

				for (var i = 0; i < 8; i++) {
					ip += buffer.slice(i * 2 + bytesRead, i * 2 + bytesRead + 2).toString('hex');
					if (i !== 7) {
						ip += ':';
					}
				}

				bytesRead += 16;

				if (!net.isIPv6(ip)) {
					ipError = true;
				}

			}
			else {
				throw new Error('FeedingNodesMessageBlock.extractAndDeconstructBlock: Malformed address indicator.');
			}

			if (ipError) {
				throw new Error('FeedingNodesMessageBlock.extractAndDeconstructBlock: Malformed IP');
			}

			var port = buffer.readUInt16BE(bytesRead);
			bytesRead += 2;

			nodeList.push({
				ip               : ip,
				port             : port,
				feedingIdentifier: feedingIdentifier
			});
		}

		return {
			bytesRead: bytesRead,
			nodes    : nodeList
		};
	}

}

export = FeedingNodesMessageBlock;