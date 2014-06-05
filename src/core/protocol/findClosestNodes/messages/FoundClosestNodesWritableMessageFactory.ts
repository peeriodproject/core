import FoundClosestNodesWritablesMessageFactoryInterface = require('./interfaces/FoundClosestNodesWritableMessageFactoryInterface');
import IdInterface = require('../../../topology/interfaces/IdInterface');
import Id = require('../../../topology/Id');
import ContactNodeListInterface = require('../../../topology/interfaces/ContactNodeListInterface');
import ContactNodeInterface = require('../../../topology/interfaces/ContactNodeInterface');
import ContactNodeAddressInterface = require('../../../topology/interfaces/ContactNodeAddressInterface');
import ContactNodeAddressListInterface = require('../../../topology/interfaces/ContactNodeAddressListInterface');
import MessageByteCheatsheet = require('../../messages/MessageByteCheatsheet');

/**
 * FoundClosestNodesWritableMessageFactoryInterface implementation.
 *
 * @class core.protocol.findClosestNodes.messages.FoundClosestNodesWritableMessageFactory
 * @implements core.protocol.findClosestNodes.messages.FoundClosestNodesWritableMessageFactoryInterface
 */
class FoundClosestNodesWritableMessageFactory implements FoundClosestNodesWritablesMessageFactoryInterface {

	public constructPayload (searchedForId:IdInterface, nodeList:ContactNodeListInterface):Buffer {
		var bufferList:Array<Buffer> = [];
		var bufferLength:number = 0;

		bufferList.push(searchedForId.getBuffer());
		bufferLength += 20;

		for (var i=0; i<nodeList.length; i++) {
			var node:ContactNodeInterface = nodeList[i];
			var addressBlock = this._getAddressBlockBuffer(node);

			bufferList.push(node.getId().getBuffer());
			bufferLength += 20;

			bufferList.push(addressBlock);
			bufferLength += addressBlock.length;

		}

		return Buffer.concat(bufferList, bufferLength);
	}

	/**
	 * Returns the addresses of a node as byte buffer representation.
	 * For more information, see the address block specification of
	 * {@link core.protocol.messages.ReadableMessageInterface}
	 *
	 * @method core.protocol.findClosestNodes.messages.FoundClosestNodesWritableMessageFactory~_getAddressBlockBuffer
	 *
	 * @param {core.topology.ContactNodeInterface} node
	 * @returns {Buffer} The address block of the node as byte buffer.
	 */
	private _getAddressBlockBuffer (node:ContactNodeInterface):any {
		var bufferList:Array<Buffer> = [];
		var addressList:ContactNodeAddressListInterface = node.getAddresses();

		for (var i=0; i<addressList.length; i++) {
			var address:ContactNodeAddressInterface = addressList[i];
			var indicatorByte:Buffer = new Buffer(1);
			var addressBuffer:Buffer = address.getAddressAsByteBuffer();

			if (address.isIPv4()) {
				indicatorByte[0] = MessageByteCheatsheet.ipv4;
			}
			else if (address.isIPv6()) {
				indicatorByte[0] = MessageByteCheatsheet.ipv6;
			}

			bufferList.push(indicatorByte);
			bufferList.push(addressBuffer);
		}

		bufferList.push(new Buffer([MessageByteCheatsheet.addressEnd]));

		return Buffer.concat(bufferList);
	}

}

export = FoundClosestNodesWritableMessageFactory;