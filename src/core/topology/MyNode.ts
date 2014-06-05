/// <reference path='../../../ts-definitions/node/node.d.ts' />

import events = require('events');

import MyNodeInterface = require('./interfaces/MyNodeInterface');
import ContactNodeAddressListInterface = require('./interfaces/ContactNodeAddressListInterface');
import ContactNode = require('./ContactNode');
import IdInterface = require('./interfaces/IdInterface');

/**
 * MyNodeInterface implementation.
 *
 * @class core.topology.MyNode
 * @implements core.topology.MyNodeInterface
 *
 * @param {core.topology.IdInterface} id The node's ID
 * @param {core.topology.ContactNodeAddressListInterface} addresses The node's initial address block.
 */
class MyNode implements MyNodeInterface {

	/**
	 * The addresses of the node
	 *
	 * @member {core.topology.ContactNodeAddressListInterface} core.topology.MyNode~_addresses
	 */
	private _addresses:ContactNodeAddressListInterface = null;

	/**
	 * Internal event emitter
	 *
	 * @member {NodeJS.EventEmitter} core.topology.MyNode~_eventEmitter
	 */
	private _eventEmitter:NodeJS.EventEmitter = null;

	/**
	 * The Id of the node
	 *
	 * @member {core.topology.IdInterface} core.topology.MyNode~_id
	 */
	private _id:IdInterface = null;

	constructor (id:IdInterface, addresses:ContactNodeAddressListInterface) {
		this._id = id;
		this._addresses = addresses;
		this._eventEmitter = new events.EventEmitter();
	}

	public getAddresses ():ContactNodeAddressListInterface {

		return this._addresses;
	}

	public getId ():IdInterface {

		return this._id;
	}

	public updateAddresses (addressList:ContactNodeAddressListInterface):void {
		this._addresses = addressList;
		this._eventEmitter.emit('addressChange');
	}

	public onAddressChange (callback:() => any):void {
		this._eventEmitter.on('addressChange', callback);
	}

	public removeOnAddressChange (callback:() => any):void {
		this._eventEmitter.removeListener('addressChange', callback);
	}
}

export = MyNode;