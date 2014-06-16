import NodePickerInterface = require('./interfaces/NodePickerInterface');
import HydraNodeList = require('./interfaces/HydraNodeList');
import HydraNode = require('./interfaces/HydraNode');
import RoutingTableInterface = require('../../topology/interfaces/RoutingTableInterface');
import ConfigInterface = require('../../config/interfaces/ConfigInterface');
import ContactNodeInterface = require('../../topology/interfaces/ContactNodeInterface');
import ContactNodeAddressListInterface = require('../../topology/interfaces/ContactNodeAddressListInterface');
import ContactNodeAddressInterface = require('../../topology/interfaces/ContactNodeAddressInterface');

class NodePicker implements NodePickerInterface {

	_relayNodeAmount:number = 0;
	_additiveNodeAmount:number = 0;
	_routingTable:RoutingTableInterface = null;
	_waitingTimeInMs:number = 0;
	_threshold:number = 0;
	_errorThreshold:number = 0;

	_relayNodes:HydraNodeList = [];
	_nodesUsed:HydraNodeList = [];

	public constructor (hydraConfig:ConfigInterface, relayNodeAmount:number, routingTable:RoutingTableInterface) {
		this._relayNodeAmount = relayNodeAmount;
		this._additiveNodeAmount = hydraConfig.get('hydra.additiveSharingNodeAmount');
		this._threshold = hydraConfig.get('hydra.nodePicker.roundThreshold');
		this._waitingTimeInMs = hydraConfig.get('hydra.nodePicker.waitingTimeInSeconds') * 1000;
		this._errorThreshold = hydraConfig.get('hydra.nodePicker.errorThreshold');

		this._routingTable = routingTable;
	}

	public getRelayNodes ():HydraNodeList {
		return this._relayNodes;
	}

	public getNodesUsed ():HydraNodeList {
		return this._nodesUsed;
	}

	public getAdditiveNodeAmount ():number {
		return this._additiveNodeAmount;
	}

	public getThreshold ():number {
		return this._threshold;
	}

	public getWaitingTime ():number {
		return this._waitingTimeInMs;
	}

	public getErrorThreshold ():number {
		return this._errorThreshold;
	}

	public pickRelayNodeBatch (callback:(batch:HydraNodeList) => any):void {
		if (this._relayNodes.length) {
			throw new Error('NodePicker: Relay nodes can only be picked once!');
		}

		this._pickBatch(this._relayNodeAmount, false, (batch:HydraNodeList) => {
			this._relayNodes = batch;

			callback(batch);
		});
	}

	public pickNextAdditiveNodeBatch (callback:(batch:HydraNodeList) => any):void {
		if (!this._relayNodes.length) {
			throw new Error('NodePicker: Picking additive nodes before relay nodes is not allowed!');
		}

		this._pickBatch(this._additiveNodeAmount, true, (batch:HydraNodeList) => {
			this._nodesUsed = this._nodesUsed.concat(batch);
			callback(batch);
		});
	}

	private _contactNodeToRandHydraNode (contactNode:ContactNodeInterface):HydraNode {

		var retNode:HydraNode = null;

		var addresses:ContactNodeAddressListInterface = contactNode.getAddresses();

		if (addresses.length) {
			var address:ContactNodeAddressInterface = addresses[Math.floor(Math.random() * addresses.length)];

			if (address.getIp() && address.getPort()) {
				retNode = {
					ip  : address.getIp(),
					port: address.getPort()
				};
			}
		}

		return retNode;
	}

	private _nodeExistsInBatch (node:HydraNode, batch:HydraNodeList) {
		var exists:boolean = false;
		var ip:string = node.ip;

		for (var i = 0, l = batch.length; i < l; i++) {
			if (batch[i].ip === ip) {
				exists = true;
				break;
			}
		}

		return exists;
	}

	private _pickBatch (amount:number, avoidRelayNodes:boolean, callback:(batch:HydraNodeList) => any):void {
		var returnBatch:HydraNodeList = [];
		var errorCount:number = 0;
		var threshold:number = 0;

		var getRandomNode = () => {

			if (returnBatch.length === amount) {
				callback(returnBatch);
			}
			else if (errorCount > this._errorThreshold) {
				global.setTimeout(() => {
					errorCount = 0;
					getRandomNode();
				}, this._waitingTimeInMs);
			}
			else {
				this._routingTable.getRandomContactNode((err:Error, contactNode:ContactNodeInterface) => {
					var noError:boolean = false;

					if (!err  && contactNode) {

						var node:HydraNode = this._contactNodeToRandHydraNode(contactNode);

						if (node && !this._nodeExistsInBatch(node, returnBatch) && (!avoidRelayNodes || !this._nodeExistsInBatch(node, this._relayNodes))) {

							if (!this._nodeExistsInBatch(node, this._nodesUsed)) {
								noError = true;
								returnBatch.push(node);
							}
							else if (threshold < this._threshold) {
								noError = true;
								threshold++;
								returnBatch.push(node);
							}
						}
					}

					if (!noError) {
						errorCount++;
					}

					getRandomNode();
				});
			}

		};

		getRandomNode();
	}


}

export = NodePicker;