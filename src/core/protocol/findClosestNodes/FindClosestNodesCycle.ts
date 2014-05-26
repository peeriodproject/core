import FindClosestNodesCycleInterface = require('./interfaces/FindClosestNodesCycleInterface');
import FindClosestNodesManagerInterface = require('./interfaces/FindClosestNodesManagerInterface');
import FoundClosestNodesReadableMessageInterface = require('./messages/interfaces/FoundClosestNodesReadableMessageInterface');
import ProtocolConnectionManagerInterface = require('../net/interfaces/ProtocolConnectionManagerInterface');
import ContactNodeInterface = require('../../topology/interfaces/ContactNodeInterface');
import ContactNodeListInterface = require('../../topology/interfaces/ContactNodeListInterface');
import IdInterface = require('../../topology/interfaces/IdInterface');

class FindClosestNodesCycle implements FindClosestNodesCycleInterface {

	private _manager:FindClosestNodesManagerInterface = null;
	private _protocolConnectionManager:ProtocolConnectionManagerInterface = null;

	private _k:number = 0;
	private _alpha:number = 0;
	private _cycleExpirationMillis:number = 0;
	private _parallelismDelayMillis:number = 0;
	private _searchForId:IdInterface = null;

	private _confirmedList:ContactNodeListInterface = [];
	private _probeList:ContactNodeListInterface = null;
	private _registeredIdentifiers:Array<string> = [];

	private _callback:(resultingList:ContactNodeListInterface) => any;

	private _listener:Function = null;

	private _cycleTimeout:number = 0;
	private _alphaTimeout:number = 0;

	constructor (searchForId:IdInterface, startWithList:ContactNodeListInterface, manager:FindClosestNodesManagerInterface, protocolConnectionManager:ProtocolConnectionManagerInterface, callback:(resultingList:ContactNodeListInterface) => any) {

		this._searchForId = searchForId;
		this._probeList = startWithList;
		this._manager = manager;
		this._protocolConnectionManager = protocolConnectionManager;
		this._callback = callback;

		this._k = this._manager.getK();
		this._alpha = this._manager.getAlpha();
		this._cycleExpirationMillis = this._manager.getCycleExpirationMillis();
		this._parallelismDelayMillis = this._manager.getParallelismDelayMillis();

		for (var i=0; i<this._probeList.length; i++) {
			this._registeredIdentifiers.push(this._probeList[i].getId().toHexString());
		}

		this._bindListener();

		this._requestAlphaNodes();
	}

	private _bindListener ():void {
		this._listener = (from:ContactNodeInterface, message:FoundClosestNodesReadableMessageInterface) => {
			this._handleReply(from, message);
		}

		this._manager.on(this._searchForId.toHexString(), this._listener);
	}

	private _unbindListener ():void {
		this._manager.removeListener(this._searchForId.toHexString(), this._listener);
	}

	private _handleReply (from:ContactNodeInterface, message:FoundClosestNodesReadableMessageInterface):void {
		this._sortInsertNodeInList(from, this._confirmedList);

		if (this._confirmedList.length >= this._k) {
			this._finish();
		}
		else {
			var returnedList:ContactNodeListInterface = message.getFoundNodeList();
			var probedPrevLength:number = this._probeList.length;

			for (var i=0; i<returnedList.length; i++) {
				var node:ContactNodeInterface = returnedList[i];
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

	private _sortInsertNodeInList (node:ContactNodeInterface, list:ContactNodeListInterface):void {
		var index:number = -1;
		var nodeId:IdInterface = node.getId();
		var doReturn:boolean = false;

		for (var i=0; i<list.length; i++) {
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

	private _requestAlphaNodes ():void {
		var times:number = Math.min(this._probeList.length, this._alpha);

		while (times--) {
			this._protocolConnectionManager.writeMessageTo(this._probeList.splice(0,1)[0], 'FIND_CLOSEST_NODES', this._searchForId.getBuffer());
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

	private _doAlphaTimeout ():void {
		if (!this._alphaTimeout) {
			this._alphaTimeout = setTimeout(() => {
				this._alphaTimeout = 0;
				this._requestAlphaNodes();
			}, this._parallelismDelayMillis);
		}
	}

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

}

export = FindClosestNodesCycle;