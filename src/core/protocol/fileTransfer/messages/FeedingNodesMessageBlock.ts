/// <reference path='../../../../../ts-definitions/node/node.d.ts' />

import net = require('net');

import HydraNodeList = require('../../hydra/interfaces/HydraNodeList');
import HydraNode = require('../../hydra/interfaces/HydraNode');
import ContactNodeAddress = require('../../../topology/ContactNodeAddress');
import MessageByteCheatsheet = require('../../../protocol/messages/MessageByteCheatsheet');

class FeedingNodesMessageBlock {

	public static constructBlock (nodeList:HydraNodeList):Buffer {
		var bufferList:Array<Buffer> = [];
		var byteLen:number = 1;
		var nodeListLen:number = nodeList.length;

		bufferList.push(new Buffer([nodeListLen]));



		for (var i=0; i<nodeListLen; i++) {
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

	public static deconstructBlock ():Object {
		return undefined
	}

}

export = FeedingNodesMessageBlock;