import events = require('events');
import ProxyManagerInterface = require('./interfaces/ProxyManagerInterface');
import ConfigInterface = require('../../config/interfaces/ConfigInterface');
import ProtocolConnectionManagerInterface = require('../net/interfaces/ProtocolConnectionManagerInterface');
import RoutingTableInterface = require('../../topology/interfaces/RoutingTableInterface');
import ContactNodeAddressListInterface = require('../../topology/interfaces/ContactNodeAddressListInterface');
import ContactNodeAddressInterface = require('../../topology/interfaces/ContactNodeAddressInterface');
import ContactNodeInterface = require('../../topology/interfaces/ContactNodeInterface');
import ProxyList = require('./interfaces/ProxyList');
import MyNodeInterface = require('../../topology/interfaces/MyNodeInterface');
import ReadableMessageInterface = require('../messages/interfaces/ReadableMessageInterface');
import IdInterface = require('../../topology/interfaces/IdInterface');
import Id = require('../../topology/Id');

/**
 * ProxyManagerInterface implementation.
 *
 * @class core.protocol.proxy.ProxyManager
 * @extends NodeJS.EventEmitter
 * @implements core.protocl.proxy.ProxyManagerInterface
 *
 * @param {core.config.ConfigInterface} config The configuration object
 * @apram {core.protocol.net.ProtocolConnectionManagerInterface} protocolConnectionManager A running connection manager.
 * @param {core.topology.RoutingTableInterface} routingTable The routing table of the node.
 */
class ProxyManager extends events.EventEmitter implements ProxyManagerInterface {

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

		this._protocolConnectionManager = protocolConnectionManager;
		this._routingTable = routingTable;
		this._externalAddressList = this._protocolConnectionManager.getExternalAddressList();
		this._myNode = this._protocolConnectionManager.getMyNode();

		if (this._externalAddressList.length) {
			this._reachableFromOutside = true;
		}

		this._setupListeners();

		this._proxyCycle();
	}

	private _proxyCycle ():void {
		if (this._canProxyCycle && this._needsAdditionalProxy()) {
			this._routingTable.getRandomContactNode((err:Error, potentialNode:ContactNodeInterface) => {
				if (err) {
					this._blockProxyCycle();
				}
				else if (potentialNode && this._canUseNodeAsProxy(potentialNode)) {
					this._requestProxy(potentialNode);
				}
			});
		}
	}

	private _setupListeners ():void {
		this._protocolConnectionManager.on('message', (message:ReadableMessageInterface) => {
			// update the contact node in the routing table accordingly, do ping pong if necessary, but not in here
			this.emit('contactNodeInformation', message.getSender());

			// check if the message is intended for us and if yes, and it is a proxy affine message, act accordingly
			if (this._messageIsIntendedForMyNode(message)) {
				if (this._messageIsProxyAffine(message)) {
					this._handleProxyMessage(message);
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
				}
				if (confirmedProxy) {
					doStartCycle = true;
					this._protocolConnectionManager.keepSocketsNoLongerOpenFromNode(confirmedProxy);
					delete this._confirmedProxies[identifier];
					this._updateMyNodeAddresses();
				}
				if (proxyingFor) {
					this._protocolConnectionManager.keepSocketsNoLongerOpenFromNode(confirmedProxy);
					delete this._proxyingFor[identifier];
				}


				if (doStartCycle) {
					this._proxyCycle();
				}
			}
		})
	}

	private _proxyMessageThrough (message:ReadableMessageInterface) {
		var identifier:string = message.getReceiverId().toHexString();
		var proxyingForNode = this._proxyingFor[identifier];
		if (proxyingForNode) {
			this._protocolConnectionManager.writeMessageTo(proxyingForNode, 'PROXY_THROUGH', message.getRawBuffer(), function () {
				message.discard();
			});
		}
	}

	private _isProxyCapable ():boolean {
		return (Object.keys(this._proxyingFor).length < this._proxyForMaxNumberOfNodes) && this._reachableFromOutside;
	}

	private _needsAdditionalProxy ():boolean {
		return ((Object.keys(this._confirmedProxies).length + Object.keys(this._requestedProxies).length) < this._maxNumberOfProxies) && !this._reachableFromOutside;
	}

	private _removeFromRequestedProxies (identifier:string):void {
		var requestedProxy:number = this._requestedProxies[identifier];

		clearTimeout(requestedProxy);
		delete this._requestedProxies[identifier];
		this._ignoreProxies.push[identifier];
	}

	private _addToConfirmedProxies (identifier:string, node:ContactNodeInterface) {
		this._confirmedProxies[identifier] = node;
		this._protocolConnectionManager.keepSocketsOpenFromNode(node);
		this._updateMyNodeAddresses();
	}

	private _addToProxyingFor (identifier:string, node:ContactNodeInterface) {
		this._proxyingFor[identifier] = node;
		this._protocolConnectionManager.keepSocketsOpenFromNode(node);
	}

	private _handleProxyMessage (message:ReadableMessageInterface):void {
		var msgType:string = message.getMessageType();
		var sender:ContactNodeInterface = message.getSender();
		var identifier:string = this._nodeToIdentifier(sender);

		if (msgType === 'PROXY_REJECT' || msgType === 'PROXY_ACCEPT') {
			var requestedProxy:number = this._requestedProxies[identifier];
			if (requestedProxy) {
				this._removeFromRequestedProxies(identifier);

				if (msgType === 'PROXY_ACCEPT') {
					this._addToConfirmedProxies(identifier, sender);
				}

				this._proxyCycle();
			}
			message.discard();
		}
		else if (msgType === 'PROXY_REQUEST') {
			if (!this._proxyingFor[identifier] && this._isProxyCapable()) {
				this._protocolConnectionManager.writeMessageTo(sender, 'PROXY_ACCEPT', new Buffer(0), (err:Error) => {
					if (!err) {
						this._addToProxyingFor(identifier, sender);
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

	private _messageIsIntendedForMyNode (message:ReadableMessageInterface):boolean {

		return message.getReceiverId().equals(this._myNode.getId());
	}

	private _messageIsProxyAffine (message:ReadableMessageInterface):boolean {
		return this._proxyAffineMessages.indexOf(message.getMessageType()) > -1;
	}

	private _requestProxy (node:ContactNodeInterface):void {
		var identifier:string = this._nodeToIdentifier(node);
		this._protocolConnectionManager.writeMessageTo(node, 'PROXY_REQUEST', new Buffer(0), (err:Error) => {
			if (!err) {
				this._requestedProxies[identifier] = setTimeout(() => {
					this._requestProxyTimeout(identifier);
				}, this._reactionTime);
			}
			this._proxyCycle();
		});
	}

	private _requestProxyTimeout (identifier:string):void {
		if (this._requestedProxies[identifier]) {
			delete this._requestedProxies[identifier];
			this._ignoreProxies.push(identifier);
			this._proxyCycle();
		}
	}

	private _blockProxyCycle ():void {
		this._canProxyCycle = false;
		if (this._proxyWaitTimeout) {
			clearTimeout(this._proxyWaitTimeout);
		}
		this._proxyWaitTimeout = setTimeout(() => {
			this._canProxyCycle = true;
			this._unsuccessfulProxyTries = 0;
			this._ignoreProxies = [];
			this._proxyCycle();
		}, this._unsuccessfulProxyTryWaitTime);
	}

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

	private _nodeToIdentifier (node:ContactNodeInterface):string {
		return node.getId().toHexString();
	}

	private _updateMyNodeAddresses ():void {
		var addressList:ContactNodeAddressListInterface = [];
		var keys:Array<string> = Object.keys(this._confirmedProxies);

		for (var i = 0; i < keys.length; i++) {
			addressList.concat(this._confirmedProxies[keys[i]].getAddresses());
		}

		this._myNode.updateAddresses(addressList);
	}

}