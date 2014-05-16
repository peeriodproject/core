import FoundClosestNodesReadableMessageInterface = require('./interfaces/FoundClosestNodesReadableMessageInterface');
import MessageByteCheatsheet = require('../../messages/MessageByteCheatsheet');
import ContactNodeAddressListInterface = require('../../../topology/interfaces/ContactNodeAddressListInterface');
import ContactNodeAddressInterface = require('../../../topology/interfaces/ContactNodeAddressInterface');
import ContactNodeAddressFactoryInterface = require('../../../topology/interfaces/ContactNodeAddressFactoryInterface');
import ContactNodeInterface = require('../../../topology/interfaces/ContactNodeInterface');
import ContactNodeFactoryInterface = require('../../../topology/interfaces/ContactNodeFactoryInterface');
import ContactNodeListInterface = require('../../../topology/interfaces/ContactNodeListInterface');
import IdInterface = require('../../../topology/interfaces/IdInterface');
import Id = require('../../../topology/Id');
import ContactNodeAddressExtractor = require('../../messages/ContactNodeAddressExtractor');

/**
 * FoundClosestNodesReadableMessageInterface implementation.
 *
 * @class core.protocol.findClosestNodes.messages.FoundClosestNodesReadableMessage
 * @implements core.protocol.findClosestNodes.messages.FoundClosestNodesReadableMessageInterface
 *
 * @param {Buffer} payload The buffer to extract the information from.
 * @param {core.topology.ContactNodeFactoryInterface} nodeFactory A contact node factory.
 * @param {core.topology.ContactNodeAddressFactoryInterface} addressFactory An address factory.
 */
class FoundClosestNodesReadableMessage implements FoundClosestNodesReadableMessageInterface {

	/**
	 * An address factory used to create the addresses of the found nodes.
	 *
	 * @member {core.topology.ContactNodeAddressFactoryInterface} core.protocol.findClosestNodes.FoundClosestNodesReadableMessage~_addressFactory
	 */
	_addressFactory:ContactNodeAddressFactoryInterface = null;

	/**
	 * List of the found nodes.
	 *
	 * @member {core.topology.ContactNodeListInterface} core.protocol.findClosestNodes.FoundClosestNodesReadableMessage~_foundNodeList
	 */
	_foundNodeList:ContactNodeListInterface = null;

	/**
	 * A node factory used to create the extracted found nodes.
	 *
	 * @member {core.topology.ContactNodeFactoryInterface} core.protocol.findClosestNodes.FoundClosestNodesReadableMessage~_nodeFactory
	 */
	_nodeFactory:ContactNodeFactoryInterface = null;

	/**
	 * The byte buffer to work with.
	 *
	 * @member {Buffer} core.protocol.findClosestNodes.FoundClosestNodesReadableMessage~_payload
	 */
	_payload:Buffer = null;

	/**
	 * The extracted originally searched for ID.
	 *
	 * @member {core.topology.IdInterface} core.protocol.findClosestNodes.FoundClosestNodesReadableMessage~_searchedForId
	 */
	_searchedForId:IdInterface = null;

	constructor (payload:Buffer, nodeFactory:ContactNodeFactoryInterface, addressFactory:ContactNodeAddressFactoryInterface) {
		this._payload = payload;
		this._nodeFactory = nodeFactory;
		this._addressFactory = addressFactory;

		this._deconstruct();
	}

	public discard ():void {
		this._payload = null;
	}

	public getFoundNodeList ():ContactNodeListInterface {
		return this._foundNodeList;
	}

	public getSearchedForId ():IdInterface {
		return this._searchedForId;
	}

	/**
	 * Deconstructs the message into its parts.
	 *
	 * @method core.protocol.findClosestNodes.FoundClosestNodesReadableMessage~_deconstruct
	 */
	private _deconstruct ():void {
		this._searchedForId = this._extractId(0);
		this._extractFoundNodeList();
	}

	/**
	 * Extracts the found node list from the payload.
	 *
	 * @method core.protocol.findClosestNodes.FoundClosestNodesReadableMessage~_extractFoundNodeList
	 */
	private _extractFoundNodeList ():void {
		var doRead = true;
		var result:ContactNodeListInterface = [];

		var pos = 20;

		while (doRead) {
			if (!this._followedByDelimiter(pos)) {
				doRead = false;
			}
			else {
				pos += 20;
				var id:IdInterface = this._extractId(pos);
				pos += 20;
				var res:any = ContactNodeAddressExtractor.extractAddressesAndBytesReadAsArray(this._payload, this._addressFactory, pos);
				result.push(this._nodeFactory.create(id, res[0]));

				pos = res[1];
			}
		}

		this._foundNodeList = result;
	}

	/**
	 * Extracts an ID from the given position in the payload.
	 *
	 * @method core.protocol.findClosestNodes.FoundClosestNodesReadableMessage~_extractId
	 *
	 * @param {number} from The position in the buffer to start from.
	 * @returns {core.topology.IdInterface}
	 */
	private _extractId (from:number):IdInterface {
		var idBuffer:Buffer = new Buffer(20);

		this._payload.copy(idBuffer, 0, from, from + 20);

		return new Id(idBuffer, 160);
	}

	/**
	 * Checks if from the given position the next 20 bytes are null bytes.
	 *
	 * @method core.protocol.findClosestNodes.FoundClosestNodesReadableMessage~_followedByDelimiter
	 *
	 * @param {number} from The position in the buffer to start from.
	 * @returns {boolean}
	 */
	private _followedByDelimiter (from:number):boolean {
		var is = true;

		for (var i = 0; i < 20; i++) {
			if (this._payload[from + i] === undefined || this._payload[from + i] !== 0x00) {
				is = false;
			}
		}
		return is;
	}

}

export = FoundClosestNodesReadableMessage;