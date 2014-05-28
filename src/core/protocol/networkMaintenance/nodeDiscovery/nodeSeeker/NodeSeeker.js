/// <reference path='../../../../../../ts-definitions/node/node.d.ts' />
var Id = require('../../../../topology/Id');

/**
* The NodeSeeker class is a helper class from which other seeker classes can be extended from, offering a JSON-to-node
* conversion and the construction of addresses/nodes via provided factories.
*
* @class core.protocol.nodeDiscovery.NodeSeeker
*/
var NodeSeeker = (function () {
    function NodeSeeker() {
        /**
        * A contact node address factory.
        *
        * @member {core.topology.ContactNodeAddressFactoryInterface} core.protocol.nodeDiscovery.NodeSeeker~_addressFactory
        */
        this._addressFactory = null;
        /**
        * A contact node factory.
        *
        * @member {core.topology.ContactNodeFactoryInterface} core.protocol.nodeDiscovery.NodeSeeker~_nodeFactory
        */
        this._contactNodeFactory = null;
    }
    /**
    * Getter for the address factory.
    *
    * @method core.protocol.nodeDiscovery.NodeSeeker#getAddressFactory
    *
    * @returns core.topology.ContactNodeAddressFactoryInterface
    */
    NodeSeeker.prototype.getAddressFactory = function () {
        return this._addressFactory;
    };

    /**
    * Getter for the node factory.
    *
    * @method core.protocol.nodeDiscovery.NodeSeeker#getNodeFactory
    *
    * @returns core.topology.ContactNodeFactoryInterface
    */
    NodeSeeker.prototype.getNodeFactory = function () {
        return this._contactNodeFactory;
    };

    /**
    * Tries to create a contact node from a JSON object.
    * The JSON object must look like the following:
    * {
    *   'id' : a hex string representation of the node's id
    *   'addresses': an array of {ip:string, port:number}-objects
    * }
    *
    * Throws errors on problems.
    *
    * @method core.protocol.nodeDiscovery.NodeSeeker#nodeFromJSON
    *
    * @param {Object} obj A JSON object
    * @returns {core.topology.ContactNodeInterface} The resulting contact node (if successful)
    */
    NodeSeeker.prototype.nodeFromJSON = function (obj) {
        var id = new Id(Id.byteBufferByHexString(obj.id, 20), 160);
        var addresses = [];

        if (!obj.addresses.length) {
            throw new Error('NodeSeeker#nodeFromJSON: Addresses may not be empty for a valid node.');
        }

        for (var i = 0; i < obj.addresses.length; i++) {
            addresses.push(this.getAddressFactory().create(obj.addresses[i].ip, obj.addresses[i].port));
        }

        return this.getNodeFactory().create(id, addresses);
    };

    /**
    * Setter for the address factory.
    *
    * @method core.protocol.nodeDiscovery.NodeSeeker#setAddressFactory
    *
    * @param {core.topology.ContactNodeAddressFactoryInterface} factory
    */
    NodeSeeker.prototype.setAddressFactory = function (factory) {
        this._addressFactory = factory;
    };

    /**
    * Setter for the node factory.
    *
    * @method core.protocol.nodeDiscovery.NodeSeeker#setNodeFactory
    *
    * @param {core.topology.ContactNodeFactoryInterface} factory
    */
    NodeSeeker.prototype.setNodeFactory = function (factory) {
        this._contactNodeFactory = factory;
    };
    return NodeSeeker;
})();

module.exports = NodeSeeker;
//# sourceMappingURL=NodeSeeker.js.map
