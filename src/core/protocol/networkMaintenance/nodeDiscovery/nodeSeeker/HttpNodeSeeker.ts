import http = require('http');

import NodeSeekerInterface = require('./interfaces/NodeSeekerInterface');
import NodeSeeker = require('./NodeSeeker');
import ContactNodeFactoryInterface = require('../../../../topology/interfaces/ContactNodeFactoryInterface');
import ContactNodeInterface = require('../../../../topology/interfaces/ContactNodeInterface');
import ConfigInterface = require('../../../../config/interfaces/ConfigInterface');
import HttpServerList = require('../../../../net/interfaces/HttpServerList');
import HttpServerInfo = require('../../../../net/interfaces/HttpServerInfo');

/**
 * A node seeker which requests a list of HTTP servers, expecting a JSON representation of a single node.
 *
 * @class core.protocol.nodeDiscovery.HttpNodeSeeker
 * @extends core.protocol.nodeDiscovery.NodeSeeker
 * @implement core.protocol.nodeDiscovery.NodeSeekerInterface
 *
 * @param {core.net.HttpServerList} serverList A list of HTTP servers which can be requested
 * @param {number} serverTimeoutInMs A server timeout in milliseconds.
 */
class HttpNodeSeeker extends NodeSeeker implements NodeSeekerInterface {

	/**
	 * A list of HTTP server which can be requested
	 *
	 * @member {core.net.HttpServerList} core.protocol.nodeDiscovery.HttpNodeSeeker~_serverList
	 */
	private _serverList:HttpServerList = null;

	/**
	 * Length of the server list.
	 *
	 * @member {number} core.protocol.nodeDiscovery.HttpNodeSeeker~_serverListLength
	 */
	private _serverListLength:number = 0;

	/**
	 * A timeout in which a request must be answered before it is considered as failed
	 *
	 * @member {number} core.protocol.nodeDiscovery.HttpNodeSeeker~_serverTimeout
	 */
	private _serverTimeout:number = 0;

	constructor (serverList:HttpServerList, serverTimeoutInMs:number) {
		super();

		this._serverList = serverList;
		this._serverListLength = this._serverList.length;
		this._serverTimeout = serverTimeoutInMs;
	}

	public seek (callback:(node:ContactNodeInterface) => any):void {
		var index:number = -1;
		var increaseAndQuery = () => {
			if (++index <= this._serverListLength - 1) {
				this._queryServerForNode(this._serverList[index], function (node:ContactNodeInterface) {
					if (node) {
						callback(node);
					}
					else {
						increaseAndQuery();
					}
				});
			}
			else {
				callback(null);
			}
		}

		increaseAndQuery();
	}

	/**
	 * Queries a server for a node. If none can be obtained, or the JSON conversion throws errors, the
	 * provided callback is called with `null`.
	 *
	 * @method core.protocol.nodeDiscovery.HttpNodeSeeker~_queryServerForNode
	 *
	 * @param {core.net.HttpServerInfo} remoteServer
	 * @param {Function} callback Function that gets called when the query has completed. A node or `null` is passed in
	 * as argument.
	 */
	private _queryServerForNode (remoteServer:HttpServerInfo, callback:(node:ContactNodeInterface) => any):void {
		var calledBack:boolean = false;
		var timeout:number = 0;

		var doCallback = function (node:ContactNodeInterface) {
			if (!calledBack) {
				calledBack = true;

				callback(node);
			}
		};

		var request = http.request({
			method  : 'GET',
			hostname: remoteServer.hostname,
			port    : remoteServer.port,
			path    : remoteServer.path
		}, (res) => {

			clearTimeout(timeout);

			var body = '';
			res.on('data', function (data) {
				body += data;
			});

			res.on('end', (data) => {
				if (data) {
					body += data;
				}

				if (res.statusCode === 200) {
					var node:ContactNodeInterface = null;

					try {
						node = this.nodeFromJSON(JSON.parse(body));
					}
					catch (e) {}
					finally {
						doCallback(node);
					}

				}
				else {
					doCallback(null);
				}
			})

		});

		request.on('error', function () {
			doCallback(null);
		});

		request.end();

		timeout = global.setTimeout(function () {
			doCallback(null);
		}, this._serverTimeout);
	}

}

export = HttpNodeSeeker;
