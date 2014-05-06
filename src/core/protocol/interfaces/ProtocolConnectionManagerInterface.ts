/// <reference path='../../../../ts-definitions/node/node.d.ts' />

/**
 * The basic concept of the ProtocolConnectionManager is to provide the first interface between networking, messaging and
 * topology. It tries to assign sockets to ContactNodes, but does not differentiate between proxys (which it may not have
 * knowledge about) and 'direct' connections.
 * In order to do so, it can easily outgoing sockets to ContactNodes, however has to wait for a first message before being
 * able to assign an incoming socket to a ContactNode.
 *
 * Thus it strictly has to follow some rules:
 * 1.) Outgoing connections are directly referenced, without needing to wait for a first message.
 * 2.) Incoming connections have to wait for a first message before being referenced.
 * 3.) Only one socket per node.
 * 4.) As it may be that an outgoing connection is being proxied, incoming always beats outgoing.
 *
 * @interface
 * @class core.protocol.ProtocolConnectionManagerInterface
 */
interface ProtocolConnectionManagerInterface {

}

export = ProtocolConnectionManagerInterface;