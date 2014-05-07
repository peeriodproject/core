/// <reference path='../../../../../ts-definitions/node/node.d.ts' />

import ContactNodeInterface = require('../../../topology/interfaces/ContactNodeInterface');
import IdInterface = require('../../../topology/interfaces/IdInterface');
import TCPSocketInterface = require('../../../net/tcp/interfaces/TCPSocketInterface');

/**
 * The basic concept of the ProtocolConnectionManager is to provide the first interface between networking, messaging and
 * topology. It tries to assign sockets to ContactNodes, but does not differentiate between proxys (which it may not have
 * knowledge about) and 'direct' connections.
 * In order to do so, it can easily assign outgoing sockets to ContactNodes, however has to wait for a first message before being
 * able to assign an incoming socket to a ContactNode.
 *
 * Thus it strictly has to follow some rules:
 * 1.) Outgoing connections are directly referenced, without needing to wait for a first message.
 * 2.) Incoming connections have to wait for a first message before being referenced.
 * 3.) Only one socket per node.
 * 4.) As it may be that an outgoing connection is being proxied, incoming always beats outgoing.
 *
 * ################
 * The detailed flow goes like this:
 * If there is a new incoming socket, it is provided with a temporary identifier und kept track of. Now it will be waited
 * for an incoming message on this socket to correctly get the identifier (which is the hex-string representation of the ID).
 * If a timeout elapses and the incoming message could not be assigned to an ID (and thus a node) the socket gets destroyed.
 *
 * If a message comes in on an incoming socket and the socket can be assigned an ID, the timeout gets invalidatet, the socket
 * is updated with the new identifier, and it will be added to the confirmed sockets. The message itself is propagated.
 * If there are any outgoing pending connections on the same identifier, a flag `closeAtOnce` is set on them to indicate
 * it is no longer needed (as incoming connections always beat outgoing).
 *
 * If a message comes in and the identifier of the socket is neither a temporary identifier nor is it the same as the one
 * extracted from the message, something must be not protocol compliable and the responsible socket will be destroyed.
 *
 * If an outgoing connection is initiated, it is kept track of until a socket is successfully connected. If it has connected,
 * however an incoming socket has also been opened in the same time window (thus `closeAtOnce` is true), the outgoing connection
 * is immediately closed. Otherwise the socket is added to the confirmed sockets.
 *
 * When a socket is added to the confirmed sockets, the only time when an old socket does not get replaced by the new one
 * is when the old socket is an incoming socket and the new socket is an outgoing socket.
 *
 * Incoming always beats outgoing because it may be that the outgoing is being proxied on the remote end, while direct incoming
 * sockets are obviously never proxied. (if one uses a proxy this simply means that the only incoming socket it will ever
 * have is the one of the proxy socket)
 *
 * Furthermore there is a functionality to add ContactNodes to a "keep open list", which says that all new confirmed sockets
 * (and existing confirmed sockets) do not destroy themselves on a timeout.
 *
 * #################
 *
 * The only method one will probably ever need is "writeBufferTo". Everything is handled for you.
 *
 * #################
 *
 * Following events are emitted:
 *
 * - 'confirmedSocket': Is emitted when a new confirmed socket was added / replaced. Argument is the identifier + socket.
 * Is used internally and should probably never need listening to.
 *
 * - 'terminatedConnection': Is emitted when there is no longer an open connection to an ID. Emitted with the ID as argument.
 * Will probably be used for proxy handling / deciding when to use other connections etc.
 *
 *
 * @interface
 * @class core.protocol.ProtocolConnectionManagerInterface
 */
interface ProtocolConnectionManagerInterface {

	/**
	 * Returns a confirmed socket by the speicifed contact node. Returns `null` if tehre is none.
	 *
	 * @method core.protocol.net.ProtocolConnectionManagerInterface#getConfirmedSocketById
	 *
	 * @param {core.topology.ContactNodeInterface} node
	 * @returns {core.net.tcp.TCPSocketInterface}
	 */
	getConfirmedSocketByContactNode (node:ContactNodeInterface):TCPSocketInterface;

	/**
	 * Returns a confirmed socket by the specified ID. Returns `null` if there is none.
	 *
	 * @method core.protocol.net.ProtocolConnectionManagerInterface#getConfirmedSocketById
	 *
	 * @param {core.topology.IdInterface} id
	 * @returns {core.net.tcp.TCPSocketInterface}
	 */
	getConfirmedSocketById (id:IdInterface):TCPSocketInterface;

	/**
	 * The anti-version to {@link core.topology.net.ProtocolConnectionManagerInterface#keepSocketsOpenFromNode}.
	 * The timeout of existing confirmed sockets will be refreshed.
	 *
	 * @method core.protocol.net.ProtocolConnectionManagerInterface#keepSocketsNoLongerOpenFromNode
	 *
	 * @param {core.topology.ContactNodeInterface} }contactNode
	 */
	keepSocketsNoLongerOpenFromNode (contactNode:ContactNodeInterface):void;

	/**
	 * Says that from now on, all sockets to this node should not be closed on timeout. Applies the same to any existing
	 * confirmed sockets as well.
	 *
	 * @method core.protocol.net.ProtocolConnectionManagerInterface#keepSocketsOpenFromNode
	 *
	 * @param {core.topology.ContactNodeInterface} }contactNode
	 */
	keepSocketsOpenFromNode (contactNode:ContactNodeInterface):void;

	/**
	 * Tries to get an established connection to a contact node. Used internally, should normally not be needed in another
	 * context. Calls a callback as soon as an established connection is available or an error occurs. Called with
	 * error and the socket as arguments.
	 *
	 * @method core.protocol.net.ProtocolConnectionManagerInterface#obtainConnectionTo
	 *
	 * @param {core.topology.ContactNodeInterface} node The contact node to connect to-
	 * @param {Function} callback Callback function (mandatory)
	 */
	obtainConnectionTo (node:ContactNodeInterface, callback:(err:Error, socket:TCPSocketInterface) => any):void;

	/**
	 * The most important method. Tries to write a byte buffer to a contact node. If there is already an established
	 * connection, it is used. If not, a connection will be established and after that written to it.
	 *
	 * Calls the callback with an error object or `null`. An error may occur if no connection could be established.
	 * If the callback is called without an error, it means that the buffer has been successfully written out.
	 *
	 * @method core.protocol.net.ProtocolConnectionManagerInterface#writeBufferTo
	 *
	 * @param {core.topology.ContactNodeInterface} node The contact node to write to
	 * @param {Buffer} buffer The byte buffer to write
	 * @param {Function} callback Optional callback function that gets called.
	 */
	writeBufferTo (node:ContactNodeInterface, buffer:Buffer, callback?:(err:Error) => any):void;

}

export = ProtocolConnectionManagerInterface;