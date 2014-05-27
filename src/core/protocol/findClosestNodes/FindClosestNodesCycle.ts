/// <reference path='../../../../ts-definitions/node/node.d.ts' />

import FindClosestNodesCycleInterface = require('./interfaces/FindClosestNodesCycleInterface');
import FindClosestNodesManagerInterface = require('./interfaces/FindClosestNodesManagerInterface');
import FoundClosestNodesReadableMessageInterface = require('./messages/interfaces/FoundClosestNodesReadableMessageInterface');
import ProtocolConnectionManagerInterface = require('../net/interfaces/ProtocolConnectionManagerInterface');
import ContactNodeInterface = require('../../topology/interfaces/ContactNodeInterface');
import ContactNodeListInterface = require('../../topology/interfaces/ContactNodeListInterface');
import IdInterface = require('../../topology/interfaces/IdInterface');
import MyNodeInterface = require('../../topology/interfaces/MyNodeInterface');

/**
 * FindClosestNodesCycleInterface implementation.
 *
 * @class core.protocol.findClosestNodes.FindClosestNodesCycle
 * @implements core.protocol.findClosestNodes.FindClosestNodesCycleInterface
 *
 * @param {core.topology.IdInterface} searchForId The ID to search for.
 * @param {core.topology.ContactNodeListInterface} startWithList A list of nodes to request in the beginning (up to alpha).
 * @param {core.protocol.findClosestNodes.FindClosestNodesManagerInterface} A FindClosestNodesManagerInterface instance to obtain configuration details from.
 * @param {core.protocol.net.ProtocolConnectionManagerInterface} Protocol connection manager, used to write messages.
 * @param {Function} callback Function to call when the cycle is finished. Gets called with a list of the up to `k` closest confirmed nodes.
 */
class FindClosestNodesCycle implements FindClosestNodesCycleInterface {

	/**
	 * Number indicating how many nodes from the probeList to request in one go.
	 *
	 * @member {number} core.protocol.findClosestNodes.FindClosestNodesCycle~_alpha
	 */
	private _alpha:number = 0;

	/**
	 * Holds the timeout, which requests further node when elapsed.
	 *
	 * @member {NodeJS.Timer|number} core.protocol.findClosestNodes.FindClosestNodesCycle~_alphaTimeout
	 */
	private _alphaTimeout:number = 0;

	/**
	 * Holds the function which gets called when the cycle is finished. Passed in constructor
	 *
	 * @member {Function} core.protocol.findClosestsNodes.FindClosestNodesCycle~_callback
	 */
	private _callback:(resultingList:ContactNodeListInterface) => any;

	/**
	 * The resulting list of close nodes, which have been successfully probed.
	 *
	 * @member {core.topology.ContactNodeListInterface} core.protocol.findClosestsNodes.FindClosestNodesCycle~_confirmedList
	 */
	private _confirmedList:ContactNodeListInterface = [];

	/**
	 * Milliseconds indicating how long the cycle should wait when all nodes from the probeList have been requested and
	 * the confirmedList is not full yet, until the cycle is considered finished
	 *
	 * @member {number} core.protocol.findClosestsNodes.FindClosestNodesCycle~_cycleExpirationMillis
	 */
	private _cycleExpirationMillis:number = 0;

	/**
	 * Holds the timeout, which finishes a cycle when elapsed.
	 *
	 * @member {NodeJS.Timer|number} core.protocol.findClosestsNodes.FindClosestNodesCycle~_cycleTimeout
	 */
	private _cycleTimeout:number = 0;

	/**
	 * Maxmimum number of close nodes to return. Cycle is considered finished as soon as the confirmedList holds `k`
	 * entries.
	 *
	 * @member {number} core.protocol.findClosestsNodes.FindClosestNodesCycle~_k
	 */
	private _k:number = 0;

	/**
	 * The listener function on the cycle manager's event which gets emitted as the hex string representation
	 * of the searched for ID.
	 *
	 * @member {Function} core.protocol.findClosestsNodes.FindClosestNodesCycle~_listener
	 */
	private _listener:Function = null;

	/**
	 * The manager emitting the events on 'FOUND_CLOSEST_NODES' messages and which holds the configuration details.
	 *
	 * @member {core.protocol.findClosestsNodes.FindClosestNodesManagerInterface} core.protocol.findClosestsNodes.FindClosestNodesCycle~_manager
	 */
	private _manager:FindClosestNodesManagerInterface = null;

	/**
	 * @member {core.topology.MyNodeInterface} core.protocol.findClosestsNodes.FindClosestNodesCycle~_myNode
	 */
	private _myNode:MyNodeInterface = null;

	/**
	 * Milliseconds indicating how much time should pass between to request flights.
	 *
	 * @member {number} core.protocol.findClosestsNodes.FindClosestNodesCycle~_parallelismDelayMillis
	 */
	private _parallelismDelayMillis:number = 0;

	/**
	 * The list of nodes who need probing. As soon as a node has been requested, it is removed from the list.
	 *
	 * @member {core.topology.ContactNodeListInterface} core.protocol.findClosestNodes.FindClosestNodesCycle~_probeList
	 */
	private _probeList:ContactNodeListInterface = null;

	/**
	 * Protocol connection manager used for writing out 'FIND_CLOSEST_NODES' requests
	 *
	 * @member {core.protocol.net.ProtocolConnectionManagerInterface} core.protocol.findClosestNodes.FindClosestNodesCycle~_protocolConnectionManager
	 */
	private _protocolConnectionManager:ProtocolConnectionManagerInterface = null;

	/**
	 * As requested nodes are instantaneously removed from the probeList, this list of hex string represenations keeps track of
	 * nodes which have either been probed or are still in the probeList. Used to avoid requesting nodes multiple times or cluttering
	 * the lists with duplicated.
	 *
	 * @member {Array<string>} core.protocol.findClosestNodes.FindClosestNodesCycle~_registeredIdentifiers
	 */
	private _registeredIdentifiers:Array<string> = [];

	/**
	 * The ID to search for.
	 *
	 * @member {core.topology.IdInterface} core.protocol.findClosestNodes.FindClosestNodesCycle~_searchForId
	 */
	private _searchForId:IdInterface = null;

	constructor (myNode:MyNodeInterface, searchForId:IdInterface, startWithList:ContactNodeListInterface, manager:FindClosestNodesManagerInterface, protocolConnectionManager:ProtocolConnectionManagerInterface, callback:(resultingList:ContactNodeListInterface) => any) {

		this._myNode = myNode;
		this._searchForId = searchForId;
		this._probeList = startWithList;
		this._manager = manager;
		this._protocolConnectionManager = protocolConnectionManager;
		this._callback = callback;

		this._k = this._manager.getK();
		this._alpha = this._manager.getAlpha();
		this._cycleExpirationMillis = this._manager.getCycleExpirationMillis();
		this._parallelismDelayMillis = this._manager.getParallelismDelayMillis();

		for (var i = 0; i < this._probeList.length; i++) {
			this._registeredIdentifiers.push(this._probeList[i].getId().toHexString());
		}

		this._bindListener();

		this._requestAlphaNodes();
	}

	/**
	 * Binds the correct listener to the FindClosestNodesManager instance for received 'FOUND_CLOSEST_NODES' messages.
	 *
	 * @method core.protocol.findClosestNodes.FindClosestNodesCycle~_bindListener
	 */
	private _bindListener ():void {
		this._listener = (from:ContactNodeInterface, message:FoundClosestNodesReadableMessageInterface) => {
			this._handleReply(from, message);
		};

		this._manager.on(this._searchForId.toHexString(), this._listener);
	}

	/**
	 * Sets the timeout, which requests the next alpha nodes in the probeList when elapsed.
	 *
	 * @method core.protocol.findClosestNodes.FindClosestNodesCycle~_doAlphaTimeout
	 */
	private _doAlphaTimeout ():void {
		if (!this._alphaTimeout) {
			this._alphaTimeout = setTimeout(() => {
				this._alphaTimeout = 0;
				this._requestAlphaNodes();
			}, this._parallelismDelayMillis);
		}
	}

	/**
	 * Finishes up the cycle and calls the callback-function provided in the constructor.
	 *
	 * @method core.protocol.findClosestNodes.FindClosestNodesCycle~_finish
	 */
	private _finish ():void {
		this._unbindListener();

		if (this._cycleTimeout) {
			clearTimeout(this._cycleTimeout);
			this._cycleTimeout = 0;
		}
		if (this._alphaTimeout) {
			clearTimeout(this._alphaTimeout);
			this._alphaTimeout = 0;
		}

		this._callback(this._confirmedList);
	}

	/**
	 * Handles a reply on the searched for ID, i.e. a 'FOUND_CLOSEST_NODES' message.
	 * Adds the originating node to the confirmedList. If it is full, the cycle is finished.
	 * Otherwise the specified contact node information in the message is added to the probeList (if not yet present).
	 *
	 * @method core.protocol.findClosestNodes.FindClosestNodesCycle~_handleReply
	 *
	 * @param {core.topology.ContactNodeInterface} from The sender of the FOUND_CLOSEST_NODES message
	 * @param {core.protocol.findClosestNodes.messages.FoundClosestNodesReadableMessageInterface} message The message payload.
	 */
	private _handleReply (from:ContactNodeInterface, message:FoundClosestNodesReadableMessageInterface):void {
		this._sortInsertNodeInList(from, this._confirmedList);

		if (this._confirmedList.length >= this._k) {
			this._finish();
		}
		else {
			var returnedList:ContactNodeListInterface = message.getFoundNodeList();
			var probedPrevLength:number = this._probeList.length;

			for (var i = 0; i < returnedList.length; i++) {
				var node:ContactNodeInterface = returnedList[i];

				if (node.getId().equals(this._myNode.getId())) {
					continue;
				}

				var identifier:string = node.getId().toHexString();

				if (this._registeredIdentifiers.indexOf(identifier) === -1) {
					this._sortInsertNodeInList(node, this._probeList);
					this._registeredIdentifiers.push(identifier);
				}
			}

			if (probedPrevLength === 0 && this._probeList.length) {
				if (this._cycleTimeout) {
					clearTimeout(this._cycleTimeout);
					this._cycleTimeout = 0;
				}
				this._doAlphaTimeout();
			}
		}

	}

	/**
	 * Takes up to alpha nodes from the probeList and writes a 'FIND_CLOSEST_NODES' request to them, thus removing them
	 * from the probeList.
	 * If at the end the probeList is empty, a timeout is set which finishes up the cycle when elapsed (and no new nodes to probe fly in).
	 *
	 * @method core.protocol.findClosestNodes.FindClosestNodesCycle~_requestAlphaNodes
	 */
	private _requestAlphaNodes ():void {
		var times:number = Math.min(this._probeList.length, this._alpha);

		while (times--) {
			this._protocolConnectionManager.writeMessageTo(this._probeList.splice(0, 1)[0], 'FIND_CLOSEST_NODES', this._searchForId.getBuffer());
		}

		if (!this._probeList.length) {
			if (this._cycleTimeout) {
				clearTimeout(this._cycleTimeout);
				this._cycleTimeout = 0;
			}

			this._cycleTimeout = setTimeout(() => {
				this._finish();
			}, this._cycleExpirationMillis);
		}
		else {
			this._doAlphaTimeout();
		}
	}

	/**
	 * Inserts a node in a list at the correct position. Correct position means that the list is sorted by distance to
	 * the searched for ID, from shorter distance to longer distance.
	 *
	 * @method core.protocol.findClosestNodes.FindClosestNodesCycle~_sortInsertNodeList
	 *
	 * @param {core.topology.ContactNodeInterface} node The node to insert.
	 * @param {core.topology.ContactNodeListInterface} list The list in which to insert the node.
	 */
	private _sortInsertNodeInList (node:ContactNodeInterface, list:ContactNodeListInterface):void {
		var index:number = -1;
		var nodeId:IdInterface = node.getId();
		var doReturn:boolean = false;

		for (var i = 0; i < list.length; i++) {
			var dist:number = this._searchForId.compareDistance(nodeId, list[i].getId());
			if (dist > 0) {
				index = i;
				break;
			}
			else if (dist === 0) {
				doReturn = true;
				break;
			}
		}

		if (doReturn) {
			return;
		}

		if (index > -1) {
			list.splice(index, 0, node);
		}
		else {
			list.push(node);
		}
	}

	/**
	 * Removes the bound listener from the FindClosestNodesManager
	 *
	 * @method core.protocol.findClosestNodes.FindClosestNodesCycle~_unbindListener
	 */
	private _unbindListener ():void {
		this._manager.removeListener(this._searchForId.toHexString(), this._listener);
	}

}

export = FindClosestNodesCycle;