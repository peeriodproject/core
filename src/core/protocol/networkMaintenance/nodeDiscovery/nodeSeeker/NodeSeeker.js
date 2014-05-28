/// <reference path='../../../../../../ts-definitions/node/node.d.ts' />
var Id = require('../../../../topology/Id');

/**
* @class core.protocol.nodeDiscovery.NodeSeeker
*/
var NodeSeeker = (function () {
    function NodeSeeker() {
        this._contactNodeFactory = null;
        this._addressFactory = null;
    }
    NodeSeeker.prototype.setNodeFactory = function (factory) {
        this._contactNodeFactory = factory;
    };

    NodeSeeker.prototype.setAddressFactory = function (factory) {
        this._addressFactory = factory;
    };

    NodeSeeker.prototype.getNodeFactory = function () {
        return this._contactNodeFactory;
    };

    NodeSeeker.prototype.getAddressFactory = function () {
        return this._addressFactory;
    };

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
    return NodeSeeker;
})();

module.exports = NodeSeeker;
//# sourceMappingURL=NodeSeeker.js.map
