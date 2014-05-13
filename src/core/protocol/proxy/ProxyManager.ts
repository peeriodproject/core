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


class ProxyManager extends events.EventEmitter implements ProxyManagerInterface {

	private _protocolConnectionManager:ProtocolConnectionManagerInterface = null;
	private _routingTable:RoutingTableInterface = null;
	private _externalAddressList:ContactNodeAddressListInterface = null;
	private _myNode:MyNodeInterface = null;

	private _reachableFromOutside:boolean = false;

	private _proxyForMaxNumberOfNodes:number = 0;

	private _maxNumberOfProxies:number = 0;

	private _reactionTime:number = 0;

	private _maxUnsuccessfulProxyTries:number = 0;
	private _unsuccessfulProxyTries:number = 0;
	private _unsuccessfulProxyTryWaitTime:number = 0;
	private _proxyWaitTimeout:number = 0;

	private _canProxyCycle:boolean = true;

	private _requestedProxies:{[identifier:string]:number} = {};
	private _confirmedProxies:ProxyList = {};
	private _ignoreProxies:Array<string> = [];
	private _proxyingFor:ProxyList = {};

	private _proxyAffineMessages:Array<string> = ['PROXY_REQUEST', 'PROXY_ACCEPT', 'PROXY_REJECT', 'PROXY_THROUGH'];

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
				// if the message is not intended for us, proxy it through
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

	private _requestProxy(node:ContactNodeInterface):void {
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

	private _requestProxyTimeout(identifier:string):void {
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

	private _canUseNodeAsProxy(node:ContactNodeInterface):boolean {
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

	private _nodeToIdentifier(node:ContactNodeInterface):string {
		return node.getId().toHexString();
	}

	private _updateMyNodeAddresses ():void {
		var addressList:ContactNodeAddressListInterface = [];
		var keys:Array<string> = Object.keys(this._confirmedProxies);

		for (var i=0; i<keys.length; i++) {
			addressList.concat(this._confirmedProxies[keys[i]].getAddresses());
		}

		this._myNode.updateAddresses(addressList);
	}

}