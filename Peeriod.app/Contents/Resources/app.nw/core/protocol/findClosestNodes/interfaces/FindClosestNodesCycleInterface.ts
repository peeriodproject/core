/// <reference path='../../../../../ts-definitions/node/node.d.ts' />

/**
 * FindClosestNodesCycleInterface handles all actions when looking for a sepcific node ID.
 * The general outline is as follows:
 * The class keeps track of a confirmed list, which holds up to k entries.
 * Furthermore there is a probed list, keeping track of the nodes to be requested.
 *
 * A cycle starts with a list of close nodes, taken from the node's own routing table. It sends parallel 'FIND_CLOSEST_NODES'
 * requests to alpha nodes in the probed list, and removes them from it.
 * If a 'FOUND_CLOSEST_NODES' answer rolls in, the originator of the message is added to the (sorted) confirmed list. The contact
 * node information in the payload is added to the probed list.
 *
 * If the parallel timeout elapses, further alpha nodes are taken from the probe list and requested.
 *
 * If the confirmed list is full (i.e. holds `k` entries), the cycle is finished.
 *
 * If all nodes in the probe list have been requested, the confirmed list isn't full, and a request timeout elapses,
 * the cycle is finished.
 *
 * @interface
 * @class core.protocol.findClosestNodes.FindClosestNodesCycleInterface
 */
interface FindClosestNodesCycleInterface {

}

export = FindClosestNodesCycleInterface;