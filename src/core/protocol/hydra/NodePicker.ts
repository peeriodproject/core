import NodePickerInterface = require('./interfaces/NodePickerInterface');
import HydraNodeList = require('./interfaces/HydraNodeList');
import HydraNode = require('./interfaces/HydraNode');
import RoutingTableInterface = require('../../topology/interfaces/RoutingTableInterface');
import ConfigInterface = require('../../config/interfaces/ConfigInterface');
import ContactNodeInterface = require('../../topology/interfaces/ContactNodeInterface');
import ContactNodeAddressListInterface = require('../../topology/interfaces/ContactNodeAddressListInterface');
import ContactNodeAddressInterface = require('../../topology/interfaces/ContactNodeAddressInterface');

var logger = require('../../utils/logger/LoggerFactory').create();

/**
 * NodePickerInterface implementation.
 *
 * @class core.protocol.hydra.NodePicker
 * @implements core.protocol.hydra.NodePickerInterface
 *
 * @param {core.config.ConfigInterface} hydraConfig Hydra configuration
 * @param {number} relayNodeAmount Number of nodes which will be returned on a call to `pickRelayNodeBatch`
 * @param {core.topology.RoutingTableInterface} routingTable A routing table instance where all nodes will be picked from.
 */
class NodePicker implements NodePickerInterface {

	/**
	 * The number of nodes which will be chosen on a call to `pickNextAdditiveNodeBatch`.
	 * This gets populated by the config.
	 *
	 * @member {number} core.protocol.hydra.NodePicker~_additiveNodeAmount
	 */
	_additiveNodeAmount:number = 0;

	/**
	 * Usually, two addresses are considered equal, if merely their IP is identical. This is a safety measure as
	 * multiple computers in a network can work together to break the additive sharing scheme.
	 * If this is true, however, two addresses are considered equal if their IP AND their port matches.
	 *
	 * WARNING! This should only be used for testing purposes.
	 *
	 * @member {boolean} core.protocol.hydra.NodePicker~_allowIdenticalIps
	 */
	_allowIdenticalIps:boolean = false;

	/**
	 * Threshold of 'errors' (unsuccessful random node tries) until the waiting timeout is set.
	 * This gets populated by the config.
	 *
	 * @member {number} core.protocol.hydra.NodePicker~_errorThreshold
	 */
	_errorThreshold:number = 0;

	/**
	 * Array which keeps track of nodes picked for additive rounds.
	 *
	 * @member {number} core.protocol.hydra.NodePicker~_nodesUsed
	 */
	_nodesUsed:HydraNodeList = [];

	/**
	 * Number of nodes which will be returned on a call to `pickRelayNodes`.
	 * This gets populated via the constructor argument.
	 *
	 * @member {number} core.protocol.hydra.NodePicker~_relayNodeAmount
	 */
	_relayNodeAmount:number = 0;

	/**
	 * The list of nodes picked on a call to `pickRelayNodes`.
	 *
	 * @member {core.protocol.hydra.HydraNodeList} core.protocol.hydra.NodePicker~_relayNodeAmount
	 */
	_relayNodes:HydraNodeList = [];

	/**
	 * The routing table instance used for picking random nodes.
	 *
	 * @member {core.topology.RoutingTableInterface} core.protocol.hydra.NodePicker~_routingTable
	 */
	_routingTable:RoutingTableInterface = null;

	/**
	 * Maximum number of nodes which have been chosen in previous additive rounds that can be used in subsequent rounds.
	 * (this is per round)
	 *
	 * @member {number} core.protocol.hydra.NodePicker~_threshold
	 */
	_threshold:number = 0;

	/**
	 * Number of milliseconds to wait when the error threshold is passed.
	 *
	 * @member {number} core.protocol.hydra.NodePicker~_waitingTimeInMs
	 */
	_waitingTimeInMs:number = 0;

	public constructor (hydraConfig:ConfigInterface, relayNodeAmount:number, routingTable:RoutingTableInterface) {
		this._relayNodeAmount = relayNodeAmount;
		this._allowIdenticalIps = hydraConfig.get('hydra.nodePicker.allowIdenticalIps');
		this._additiveNodeAmount = hydraConfig.get('hydra.additiveSharingNodeAmount');
		this._threshold = hydraConfig.get('hydra.nodePicker.roundThreshold');
		this._waitingTimeInMs = hydraConfig.get('hydra.nodePicker.waitingTimeInSeconds') * 1000;
		this._errorThreshold = hydraConfig.get('hydra.nodePicker.errorThreshold');
		this._routingTable = routingTable;
	}

	/**
	 * BEGIN TESTING PURPOSES ONLY
	 */
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

	/**
	 * END TESTING PURPOSES ONLY
	 */

	public pickAdditionalRelayNode (callback: (node:HydraNode) => any):void {
		if (!this._relayNodes.length) {
			throw new Error('NodePicker: Picking additional relay node before general relay nodes is not allowed!');
		}

		this._pickBatch(1, 0, true, (batch:HydraNodeList) => {
			var node:HydraNode = batch[0];

			this._relayNodes.push(node);
			callback(node);
		});
	}

	public pickNextAdditiveNodeBatch (callback:(batch:HydraNodeList) => any):void {
		if (!this._relayNodes.length) {
			throw new Error('NodePicker: Picking additive nodes before relay nodes is not allowed!');
		}

		logger.log('hydra', 'Picking next additive node batch.');
		this._pickBatch(this._additiveNodeAmount, this._threshold, true, (batch:HydraNodeList) => {
			this._nodesUsed = this._nodesUsed.concat(batch);
			callback(batch);
		});
	}

	public pickRelayNodeBatch (callback:(batch:HydraNodeList) => any):void {
		if (this._relayNodes.length) {
			throw new Error('NodePicker: Relay nodes can only be picked once!');
		}

		logger.log('hydra', 'Picking relay node batch.');
		this._pickBatch(this._relayNodeAmount, this._threshold, false, (batch:HydraNodeList) => {
			this._relayNodes = batch;

			callback(batch);
		});
	}

	/**
	 * Picks a random IP:Port pair from a contact node and returns it as a hydra node if possible.
	 *
	 * @method core.protocol.hydra.NodePicker~_contactNodeToRandHydraNode
	 *
 	 * @param {core.topology.ContactNodeInterface} contactNode The contact node to choose the address from.
	 * @returns {core.protocol.hydra.HydraNode}
	 */
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

	/**
	 * Checks if the ip of a hydra node already exists within a given list of hydra nodes.
	 * If identical IPs are allowed, the ports need to differ.
	 *
	 * @method core.protocol.hydra.NodePicker~_nodeExistsInBatch
	 *
	 * @param {core.protocol.hydra.HydraNode} node The node to check.
	 * @param {core.protocol.hydra.HydraNodeList} batch The list of hydra nodes to check against.
	 *
	 * @returns {boolean} `true` if existing, `false` otherwise.
	 */
	private _nodeExistsInBatch (node:HydraNode, batch:HydraNodeList):boolean {
		var exists:boolean = false;
		var ip:string = node.ip;
		var port:number = node.port;

		for (var i = 0, l = batch.length; i < l; i++) {
			if (batch[i].ip === ip && (!this._allowIdenticalIps || batch[i].port === port)) {
				exists = true;
				break;
			}
		}

		return exists;
	}

	/**
	 * The main method which picks random nodes from the routing table and returns them (via a callback) as an array.
	 * It follows the rules specified in {@link core.protocol.hydra.NodePickerInterface}.
	 *
	 * @method core.protocol.hydra.NodePicker~_pickBatch
	 *
	 * @param {number} amount The number of nodes to pick.
	 * @param {number} usedThreshold The threshold of nodes already used which can be picked again.
	 * @param {boolean} avoidRelayNodes If this is true, then any chosen node may not be part of the (already chosen) relay node list.
	 * @param {Function} callback Callback function which gets called with the resulting batch of nodes as argument.
	 */
	private _pickBatch (amount:number, usedThreshold:number, avoidRelayNodes:boolean, callback:(batch:HydraNodeList) => any):void {
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

					if (!err && contactNode) {

						var node:HydraNode = this._contactNodeToRandHydraNode(contactNode);

						if (node && !this._nodeExistsInBatch(node, returnBatch) && (!avoidRelayNodes || !this._nodeExistsInBatch(node, this._relayNodes))) {

							if (!this._nodeExistsInBatch(node, this._nodesUsed)) {
								noError = true;
								returnBatch.push(node);
							}
							else if (threshold < usedThreshold) {
								noError = true;
								threshold++;
								returnBatch.push(node);
							}
							logger.log('hydra', 'Node is accepted', {ip:node.ip, port:node.port});
						}
						else {
							logger.log('hydra', 'Node is already in return batch or in relay nodes', {ip:node.ip, port:node.port});
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