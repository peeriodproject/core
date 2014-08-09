import events = require('events');
import ProxyManagerInterface = require('./interfaces/ProxyManagerInterface');
import ConfigInterface = require('../../config/interfaces/ConfigInterface');
import ProtocolConnectionManagerInterface = require('../net/interfaces/ProtocolConnectionManagerInterface');
import RoutingTableInterface = require('../../topology/interfaces/RoutingTableInterface');
import ContactNodeAddressListInterface = require('../../topology/interfaces/ContactNodeAddressListInterface');
import ContactNodeAddressInterface = require('../../topology/interfaces/ContactNodeAddressInterface');
import ContactNodeInterface = require('../../topology/interfaces/ContactNodeInterface');
import ContactNodeListInterface = require('../../topology/interfaces/ContactNodeListInterface');
import ProxyList = require('./interfaces/ProxyList');
import MyNodeInterface = require('../../topology/interfaces/MyNodeInterface');
import ReadableMessageInterface = require('../messages/interfaces/ReadableMessageInterface');
import IdInterface = require('../../topology/interfaces/IdInterface');
import Id = require('../../topology/Id');

var logger = require('../../utils/logger/LoggerFactory').create();

/**
 * ProxyManagerInterface implementation.
 *
 * @class core.protocol.proxy.ProxyManager
 * @extends NodeJS.EventEmitter
 * @implements core.protocol.proxy.ProxyManagerInterface
 *
 * @param {core.config.ConfigInterface} config The configuration object
 * @apram {core.protocol.net.ProtocolConnectionManagerInterface} protocolConnectionManager A running connection manager.
 * @param {core.topology.RoutingTableInterface} routingTable The routing table of the node.
 */
class ProxyManager extends events.EventEmitter implements ProxyManagerInterface {

	/**
	 * Stores a timeout which gets reset when my node's address changes, so address changes need to be valid for a given time
	 * until all known nodes are notified. This is to ensure that a node doesn't send too many messages if it e.g. loses a proxy
	 * and immediately finds a new one.
	 *
	 * @member {number} core.protocol.proxy.ProxyManager~_addressChangeTimeout
	 */
	private _addressChangeTimeout:number = 0;

	/**
	 * The number of milliseconds to wait for another new address change before notifying all known nodes.
	 *
	 * @member {number} core.protocol.proxy.ProxyManager~_addressChangeTimeoutBeforeNotifyInMs
	 */
	private _addressChangeTimeoutBeforeNotifyInMs:number = 0;

	/**
	 * A flag indicating if a potential new proxy request can be fired off.
	 *
	 * @member {boolean} core.protocol.proxy.ProxyManager~_canProxyCycle
	 */
	private _canProxyCycle:boolean = true;

	/**
	 * The list of confirmed nodes proxying for oneself.
	 *
	 * @member {core.protocol.proxy.ProxyList} core.protocol.proxy.ProxyManager~_confirmedProxies
	 */
	private _confirmedProxies:ProxyList = {};

	/**
	 * The list of external addresses of my node. Used to check if the my node needs a proxy or can be a proxy.
	 *
	 * @member {core.topology.ContactNodeAddressListInterface} core.protocol.proxy.ProxyManager~_externalAddressList
	 */
	private _externalAddressList:ContactNodeAddressListInterface = null;

	/**
	 * Temporary list of node identifiers to ignore on following proxy cycles. Gets reset after the waiting timeout.
	 *
	 * @member {Array<string>} core.protocol.proxy.ProxyManager~_ignoreProxies
	 */
	private _ignoreProxies:Array<string> = [];

	/**
	 * The maximum number of proxies the node can possibly have. Populated by config.
	 *
	 * @member {number} core.protocol.proxy.ProxyManager~_maxNumberOfProxies
	 */
	private _maxNumberOfProxies:number = 0;

	/**
	 * The maximum number of unsuccessful proxy request tries before the waiting timeout is fired. Populated by config.
	 *
	 * @member {number} core.protocol.proxy.ProxyManager~_maxUnsuccessfulProxyTries
	 */
	private _maxUnsuccessfulProxyTries:number = 0;

	/**
	 * My node.
	 *
	 * @member {core.topology.MyNodeInterface} core.protocol.proxy.ProxyManager~_myNode
	 */
	private _myNode:MyNodeInterface = null;

	/**
	 * The running protocol connection manager. Provided in the constructor.
	 *
	 * @member {core.protocol.net.ProtocolConnectionManagerInterface} core.protocol.proxy.ProxyManager~_protocolConnectionManager
	 */
	private _protocolConnectionManager:ProtocolConnectionManagerInterface = null;

	/**
	 * A hardcoded list of human-readable message types which should concern the ProxyManager instance.
	 *
	 * @member {Array<string>} core.protocol.proxy.ProxyManager~_proxyAffineMessages
	 */
	private _proxyAffineMessages:Array<string> = ['PROXY_REQUEST', 'PROXY_ACCEPT', 'PROXY_REJECT', 'PROXY_THROUGH'];

	/**
	 * A maximum number of nodes one can be a proxy for. Populated by config.
	 *
	 * @member {number} core.protocol.proxy.ProxyManager~_proxyForMaxNumberOfNodes
	 */
	private _proxyForMaxNumberOfNodes:number = 0;

	/**
	 * The list of nodes one proxies for.
	 *
	 * @member {core.protocol.proxy.ProxyList} core.protocol.proxy.ProxyManager~_proxyingFor
	 */
	private _proxyingFor:ProxyList = {};

	/**
	 * The waiting timeout which blocks the proxy cycle until expiration.
	 *
	 * @member {number} core.protocol.proxy.ProxyManager~_proxyWaitTimeout
	 */
	private _proxyWaitTimeout:number = 0;

	/**
	 * A flag indicating whether the machine is reachable from outside.
	 *
	 * @member {boolean} core.protocol.proxy.ProxyManager~_reachableFromOutside
	 */
	private _reachableFromOutside:boolean = false;

	/**
	 * The time in milliseconds a requested node has to answer before the request is discarded.
	 *
	 * @member {number} core.protocol.proxy.ProxyManager~_reactionTime
	 */
	private _reactionTime:number = 0;

	/**
	 * A list of identifiers with assigned timeouts of the requested proxy nodes.
	 *
	 * @member {Object} core.protocol.proxy.ProxyManager~_requestedProxies
	 */
	private _requestedProxies:{[identifier:string]:number} = {};

	/**
	 * My node's routing table.
	 *
	 * @member {core.topology.RoutingTableInterface} core.protocol.proxy.ProxyManager~_routingTable
	 */
	private _routingTable:RoutingTableInterface = null;

	/**
	 * Number keeping track of the unsuccessful proxy tries. Gets reset to 0 after the wait timeout expires.
	 *
	 * @member {number} core.protocol.proxy.ProxyManager~_unsuccessfulProxyTries
	 */
	private _unsuccessfulProxyTries:number = 0;

	/**
	 * Milliseconds to wait until a blockes proxy cycle is unblocked again. Populated by config.
	 *
	 * @member {number} core.protocol.proxy.ProxyManager~_unsuccessfulProxyTryWaitTime
	 */
	private _unsuccessfulProxyTryWaitTime:number = 0;

	constructor (config:ConfigInterface, protocolConnectionManager:ProtocolConnectionManagerInterface, routingTable:RoutingTableInterface) {
		super();

		this._maxNumberOfProxies = config.get('protocol.proxy.maxNumberOfProxies');
		this._proxyForMaxNumberOfNodes = config.get('protocol.proxy.proxyForMaxNumberOfNodes');
		this._reactionTime = config.get('protocol.waitForNodeReactionInSeconds') * 1000;
		this._maxUnsuccessfulProxyTries = config.get('protocol.proxy.maxUnsuccessfulProxyTries');
		this._unsuccessfulProxyTryWaitTime = config.get('protocol.proxy.unsuccessfulProxyTryWaitTimeInSeconds') * 1000;
		this._addressChangeTimeoutBeforeNotifyInMs = config.get('protocol.proxy.addressChangeTimeoutBeforeNotifyInSeconds') * 1000;

		this._protocolConnectionManager = protocolConnectionManager;
		this._routingTable = routingTable;

		this._myNode = this._protocolConnectionManager.getMyNode();
		this._externalAddressList = this._myNode.getAddresses();

		if (this._externalAddressList.length) {
			this._reachableFromOutside = true;
		}

		this._setupListeners();
	}

	/**
	 * BEGIN TESTING PURPOSES ONLY
	 */

	public getMyNode ():MyNodeInterface {
		return this._myNode;
	}

	public getRequestedProxies ():any {
		return this._requestedProxies;
	}

	public getConfirmedProxies ():ProxyList {
		return this._confirmedProxies;
	}

	public getProxyingFor ():ProxyList {
		return this._proxyingFor;
	}

	public getProtocolConnectionManager ():ProtocolConnectionManagerInterface {
		return this._protocolConnectionManager;
	}

	public isBlocked ():boolean {
		return !this._canProxyCycle;
	}

	public block ():void {
		this._canProxyCycle = false;
	}

	public unblock ():void {
		this._canProxyCycle = true;
	}


	/**
	 * END TESTING PURPOSES ONLY
	 */

	public isProxyCapable ():boolean {
		return (Object.keys(this._proxyingFor).length < this._proxyForMaxNumberOfNodes) && this._reachableFromOutside;
	}

	public kickOff ():void {
		this._canProxyCycle = true;
		this._proxyCycleOnNextTick();
	}

	public needsAdditionalProxy ():boolean {
		return ((Object.keys(this._confirmedProxies).length + Object.keys(this._requestedProxies).length) < this._maxNumberOfProxies) && !this._reachableFromOutside;
	}

	/**
	 * Adds a node to the confirmed proxy list, tells the connection manager to keep the sockets open from this node
	 * and updates my node addresses accordingly.
	 *
	 * @method core.protocol.proxy.ProxyManager~_addToConfirmedProxies
	 *
	 * @param {string} identifier Node identifier
	 * @param {core.topology.ContactNodeInterface} node The contact node to add to the proxy list.
	 */
	private _addToConfirmedProxies (identifier:string, node:ContactNodeInterface):void {
		this._confirmedProxies[identifier] = node;
		this._protocolConnectionManager.keepSocketsOpenFromNode(node);
		this._updateMyNodeAddresses();
		this.emit('proxyCount', Object.keys(this._confirmedProxies).length);
	}

	/**
	 * Adds a node to the list one is proxying for. Tells the connection manager to keep the sockets open from this node.
	 *
	 * @method core.protocol.proxy.ProxyManager~_addToProxyingFor
	 *
	 * @param {string} identifier Node identifier
	 * @param {core.topology.ContactNodeInterface} node The contact node to add to the proxyingFor list.
	 */
	private _addToProxyingFor (identifier:string, node:ContactNodeInterface):void {
		this._proxyingFor[identifier] = node;
		this._protocolConnectionManager.keepSocketsOpenFromNode(node);
		this.emit('proxyingForCount', Object.keys(this._proxyingFor).length);
	}

	/**
	 * Blocks the proxy cycle for a specific time.
	 *
	 * @method core.protocol.proxy.ProxyManager~_blockProxyCycle
	 */
	private _blockProxyCycle ():void {
		this._canProxyCycle = false;
		if (this._proxyWaitTimeout) {
			global.clearTimeout(this._proxyWaitTimeout);
			this._proxyWaitTimeout = 0;
		}
		this._proxyWaitTimeout = global.setTimeout(() => {
			this._canProxyCycle = true;
			this._unsuccessfulProxyTries = 0;
			this._ignoreProxies = [];

			this._proxyCycleOnNextTick();

		}, this._unsuccessfulProxyTryWaitTime);
	}

	/**
	 * Checks if the node can be used as a potential proxy.
	 *
	 * @method core.protocol.proxy.ProxyManager~_canUseNodeAsProxy
	 *
	 * @param {core.topology.ContactNodeInterface} node Node to check.
	 */
	private _canUseNodeAsProxy (node:ContactNodeInterface):boolean {
		var identifier:string = this._nodeToIdentifier(node);
		var canUse:boolean = true;

		canUse = this._confirmedProxies[identifier] ? false : canUse;
		canUse = this._requestedProxies[identifier] ? false : canUse;
		canUse = this._ignoreProxies.indexOf(identifier) > -1 ? false : canUse;

		if (!canUse) {
			this._unsuccessfulProxyTries++;
			if (this._unsuccessfulProxyTries >= this._maxUnsuccessfulProxyTries) {
				this._blockProxyCycle();
			}
		}

		return canUse;
	}

	/**
	 * The handler for all messages concerning the proxy.
	 * If the message is of type PROXY_REJECT or PROXY_ACCEPT, the requested proxy is handled accordingly.
	 * If it is a PROXY_REQUEST, it is checked whether one can by a proxy. If yes, a PROXY_ACCEPT message is sent back, else
	 * a PROXY_REJECT message is sent back.
	 * If it is a PROXY_THROUGH message, the payload is forced back through the data pipeline.
	 *
	 * @method core.protocol.proxy.ProxyManager~_handleProxyMessage
	 *
	 * @param {core.protocol.messages.ReadableMessageInterface} message The message to handle
	 */
	private _handleProxyMessage (message:ReadableMessageInterface):void {
		var msgType:string = message.getMessageType();
		var sender:ContactNodeInterface = message.getSender();
		var identifier:string = this._nodeToIdentifier(sender);

		if (msgType === 'PROXY_REJECT' || msgType === 'PROXY_ACCEPT') {
			var requestedProxy:number = this._requestedProxies[identifier];
			if (requestedProxy) {
				this._removeFromRequestedProxies(identifier);

				if (msgType === 'PROXY_ACCEPT' && Object.keys(this._confirmedProxies).length < this._maxNumberOfProxies) {
					this._addToConfirmedProxies(identifier, sender);
					this.emit('newProxy', sender);
					console.log('Got new proxy %o',  {id: sender.getId().toHexString(), proxyNow: Object.keys(this._confirmedProxies).length});
					logger.log('proxy', 'Got new proxy', {id: sender.getId().toHexString(), lengthNow: Object.keys(this._confirmedProxies).length});
				}
				else {
					this.emit('proxyReject', sender);
				}

				this._proxyCycleOnNextTick();
			}
			message.discard();
		}
		else if (msgType === 'PROXY_REQUEST') {
			if (!this._proxyingFor[identifier] && this.isProxyCapable()) {
				this._protocolConnectionManager.writeMessageTo(sender, 'PROXY_ACCEPT', new Buffer(0), (err:Error) => {
					if (!err) {
						this._addToProxyingFor(identifier, sender);
						this.emit('proxyingFor', sender);
						logger.log('proxy', 'Proxying now for', {id: sender.getId().toHexString()});
					}
				});
			}
			else {
				this._protocolConnectionManager.writeMessageTo(sender, 'PROXY_REJECT', new Buffer(0));
				message.discard();
			}
		}
		else if (msgType === 'PROXY_THROUGH') {
			if (this._confirmedProxies[identifier]) {
				// force message through the pipe
				this._protocolConnectionManager.forceMessageThroughPipe(sender, message.getPayload());
			}
		}
	}

	/**
	 * Checks if the receiver ID stated in the message is the same as the ID of my node.
	 *
	 * @method core.protocol.proxy.ProxyManager~_messageIsIntendedForMyNode
	 *
	 * @param {core.protocol.messages.ReadableMessageInterface} message
	 * @returns {boolean}
	 */
	private _messageIsIntendedForMyNode (message:ReadableMessageInterface):boolean {

		return message.getReceiverId().equals(this._myNode.getId());
	}

	/**
	 * Compares the message type of the specified message with the class's hardcoded list of prxa affine message types.
	 *
	 * @method core.protocol.proxy.ProxyManager~_messageIsProxyAffine
	 *
	 * @param {core.protocol.messages.ReadableMessageInterface} message
	 * @returns {boolean}
	 */
	private _messageIsProxyAffine (message:ReadableMessageInterface):boolean {

		return this._proxyAffineMessages.indexOf(message.getMessageType()) > -1;
	}

	/**
	 * Returns the hexadecimal string representation of the provided node's ID.
	 *
	 * @method core.protocol.proxy.ProxyManager~_nodeToIdentifier
	 *
	 * @param {core.topology.ContactNodeInterface} node
	 * @returns {string}
	 */
	private _nodeToIdentifier (node:ContactNodeInterface):string {
		return node.getId().toHexString();
	}

	/**
	 * The initial method. Checks if the proxy cycle is active and if the node needs an additional proxy. If yes, it chooses
	 * a node randomly from the routing table, tests if it is usable a a potential node, and if yes, sends a proxy request to it.
	 *
	 * @method core.protocol.proxy.ProxyManager~_proxyCycle
	 */
	private _proxyCycle ():void {
		if (this._canProxyCycle && this.needsAdditionalProxy()) {
			this._routingTable.getRandomContactNode((err:Error, potentialNode:ContactNodeInterface) => {
				if (err) {
					this._blockProxyCycle();
				}
				else if (potentialNode && this._canUseNodeAsProxy(potentialNode)) {
					this._requestProxy(potentialNode);
				}
				else {
					this._proxyCycleOnNextTick();
				}
			});
		}
	}

	private _proxyCycleOnNextTick ():void {
		setImmediate(() => {
			this._proxyCycle();
		});
	}

	/**
	 * Proxies a message not intended for my node through to the actual intended receiver.
	 *
	 * @method core.protocol.proxy.ProxyManager~_proxyMessageThrough
	 *
	 * @param {core.protocol.messages.ReadableMessageInterface} message
	 */
	private _proxyMessageThrough (message:ReadableMessageInterface):void {
		var identifier:string = message.getReceiverId().toHexString();
		var proxyingForNode = this._proxyingFor[identifier];
		if (proxyingForNode) {
			this._protocolConnectionManager.writeMessageTo(proxyingForNode, 'PROXY_THROUGH', message.getRawBuffer(), function () {
				message.discard();
			});
		}
		else {
			message.discard();
		}
	}

	/**
	 * Clears the timeout of a requested proxy, removes the entry and adds the identifier to the `ignoreProxies` list.
	 *
	 * @method core.protocol.proxy.ProxyManager~_removeFromRequestedProxies
	 *
	 * @param {string} identifier Identifier of the requested proxy.
	 */
	private _removeFromRequestedProxies (identifier:string):void {
		var requestedProxy:number = this._requestedProxies[identifier];

		global.clearTimeout(requestedProxy);
		delete this._requestedProxies[identifier];
		this._ignoreProxies.push[identifier];
	}

	/**
	 * Sends a PROXY_REQUEST to the provided node and adds it to the requested proxy list with a timeout indicating how
	 * long the requested node has time to answer.
	 *
	 * @method core.protocol.proxy.ProxyManager~_requestProxy
	 *
	 * @param {core.topology.ContactNodeInterface} node The node to request.
	 */
	private _requestProxy (node:ContactNodeInterface):void {
		var identifier:string = this._nodeToIdentifier(node);
		this._protocolConnectionManager.writeMessageTo(node, 'PROXY_REQUEST', new Buffer(0), (err:Error) => {
			if (!err) {
				this._requestedProxies[identifier] = global.setTimeout(() => {
					this._requestProxyTimeout(identifier);
				}, this._reactionTime);
			}
			this._proxyCycleOnNextTick();
		});
	}

	/**
	 * What happens when a requested node fails to respond in a certain time window:
	 * It is removed from the requested proxy list and a new proxy cycle is kicked off.
	 *
	 * @method core.protocol.proxy.ProxyManager~_requestProxyTimeout
	 *
	 * @param {string} identifier Identifier of the requested proxy
	 */
	private _requestProxyTimeout (identifier:string):void {
		if (this._requestedProxies[identifier]) {
			delete this._requestedProxies[identifier];
			this._ignoreProxies.push(identifier);

			// this event is for testing purposes only
			logger.log('proxy', 'Proxy request timed out', {identifier: identifier});
			this.emit('requestProxyTimeout', identifier);
			this._proxyCycleOnNextTick();
		}
	}

	/**
	 * Sends an ADDRESS_CHANGE message to all known nodes to notify them of the address change.
	 *
	 * @method core.protocol.proxy.ProxyManager~_sendAddressChangeToAllKnownNodes
	 */
	private _sendAddressChangeToAllKnownNodes ():void {
		console.log('sending ADDRESS_CHANGE to all known nodes');
		this._routingTable.getAllContactNodes((err:Error, allNodes:ContactNodeListInterface) => {
			for (var i=0, l=allNodes.length; i<l; i++) {
				this._protocolConnectionManager.writeMessageTo(allNodes[i], 'ADDRESS_CHANGE', new Buffer(0));
			}
		});
	}

	/**
	 * Sets the `message` and `terminatedConnection` listeners on the ProtocolConnectionManagerInterface.
	 * Furthermore sends an ADDRESS_CHANGE message to all known nodes if the address of the node changes.
	 *
	 * @method core.protocol.proxy.ProxyManager~_setupListeners
	 */
	private _setupListeners ():void {
		this._protocolConnectionManager.on('message', (message:ReadableMessageInterface) => {
			// update the contact node in the routing table accordingly, do ping pong if necessary, but not in here
			var sender:ContactNodeInterface = message.getSender();

			if (sender.getAddresses().length > 0) {
				this.emit('contactNodeInformation', message.getSender());
			}

			// check if the message is intended for us and if yes, and it is a proxy affine message, act accordingly
			if (this._messageIsIntendedForMyNode(message)) {
				if (this._messageIsProxyAffine(message)) {
					this._handleProxyMessage(message);
				}
				else if (message.getMessageType() === 'ADDRESS_CHANGE') {
					// we can safely call this, as if we would be proxying for this node, we would always communicate
					// with this node via incoming connections
					console.log('handling ADDRESS_CHANGE message');
					this._protocolConnectionManager.invalidateOutgoingConnectionsTo(message.getSender());
				}
				else {
					this.emit('message', message);
				}
			}
			else {
				this._proxyMessageThrough(message);
			}
		});

		this._protocolConnectionManager.on('terminatedConnection', (id:any) => {
			if (id instanceof Id) {
				var identifier:string = id.toHexString();
				var doStartCycle:boolean = false;
				var requestedProxy = this._requestedProxies[identifier];
				var confirmedProxy = this._confirmedProxies[identifier];
				var proxyingFor = this._proxyingFor[identifier];

				if (requestedProxy) {
					doStartCycle = true;
					this._removeFromRequestedProxies(identifier);
					this.emit('requestProxyTimeout', identifier);
				}
				if (confirmedProxy) {
					doStartCycle = true;
					this._protocolConnectionManager.keepSocketsNoLongerOpenFromNode(confirmedProxy);
					delete this._confirmedProxies[identifier];
					this._updateMyNodeAddresses();
					this.emit('lostProxy', confirmedProxy);
					console.log('Lost proxy %o', confirmedProxy.getId().toHexString());
					this.emit('proxyCount', Object.keys(this._confirmedProxies).length);
				}
				if (proxyingFor) {
					this._protocolConnectionManager.keepSocketsNoLongerOpenFromNode(proxyingFor);
					delete this._proxyingFor[identifier];
					this.emit('lostProxyingFor', proxyingFor);
					logger.proxy('proxy', 'No longer proxying for', {id: proxyingFor.getId().toHexString()})
					this.emit('proxyingForCount', Object.keys(this._proxyingFor).length);
				}


				if (doStartCycle) {
					this._proxyCycleOnNextTick();
				}
			}
		});

		this._myNode.onAddressChange((info?:string) => {
			console.log('address has changed');

			if (this._addressChangeTimeout) {
				global.clearTimeout(this._addressChangeTimeout);
				this._addressChangeTimeout = 0;
			}

			if (info !== 'initial') {
				this._addressChangeTimeout = global.setTimeout(() => {
					this._sendAddressChangeToAllKnownNodes();
					this._addressChangeTimeout = 0;
				}, this._addressChangeTimeoutBeforeNotifyInMs);
			}
		});
	}

	/**
	 * Updates MyNode's address list according to the list of confirmed proxies.
	 *
	 * @method core.protocol.proxy.ProxyManager~_updateMyNodeAddresses
	 */
	private _updateMyNodeAddresses ():void {
		var addressList:ContactNodeAddressListInterface = [];
		var keys:Array<string> = Object.keys(this._confirmedProxies);

		for (var i = 0; i < keys.length; i++) {
			addressList = addressList.concat(this._confirmedProxies[keys[i]].getAddresses());
		}

		this._myNode.updateAddresses(addressList, 'fromProxy');
	}

}

export = ProxyManager;