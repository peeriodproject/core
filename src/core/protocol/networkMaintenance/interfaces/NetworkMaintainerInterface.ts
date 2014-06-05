/// <reference path='../../../../../ts-definitions/node/node.d.ts' />

/**
 * The NetworkMaintainer is used to join the network. It also handles the refreshing of unaccessed buckets, after
 * a provided number of seconds.
 * If an answer of a node rolls in and the appropriate bucket is updatetd (in whatever fashion), the same bucket is seen
 * as "accessed" and the timeout to refresh the bucket is renewed.
 *
 * When MyNode joins the network, it tries to find a contact node with a NodeSeekerManager. As soon as one is found, a
 * FIND_CLOSEST_NODES cycle is fired off with the closest ID possible to MyNode's ID. If this cycle does not return any
 * nodes, the NetworkMaintainer tries to find another contact node to query.
 *
 * If at last the FIND_CLOSEST_NODES cycle searching for approx. MyNode's ID returns at least one other node, all buckets
 * which are farther away than the closest neighbor found, are refreshed.
 *
 * Refreshing a bucket means firing off a FIND_CLOSEST_NODES cycle on a random ID which would be assigned to the bucket.
 *
 * @interface
 * @class core.protocol.networkMaintenance.NetworkMaintainerInterface
 */
interface NetworkMaintainerInterface extends NodeJS.EventEmitter {

	/**
	 * Joins the network as described above.
	 *
	 * @method core.portoocol.networkMaintenance.NetworkMaintainerInterface#joinNetwork
	 */
	joinNetwork ():void;
}

export = NetworkMaintainerInterface;