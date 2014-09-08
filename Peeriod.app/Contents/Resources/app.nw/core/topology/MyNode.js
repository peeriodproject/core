/// <reference path='../../../ts-definitions/node/node.d.ts' />
var events = require('events');

/**
* MyNodeInterface implementation.
*
* @class core.topology.MyNode
* @implements core.topology.MyNodeInterface
*
* @param {core.topology.IdInterface} id The node's ID
* @param {core.topology.ContactNodeAddressListInterface} addresses The node's initial address block.
*/
var MyNode = (function () {
    function MyNode(id, addresses) {
        /**
        * The addresses of the node
        *
        * @member {core.topology.ContactNodeAddressListInterface} core.topology.MyNode~_addresses
        */
        this._addresses = null;
        /**
        * Internal event emitter
        *
        * @member {NodeJS.EventEmitter} core.topology.MyNode~_eventEmitter
        */
        this._eventEmitter = null;
        /**
        * The Id of the node
        *
        * @member {core.topology.IdInterface} core.topology.MyNode~_id
        */
        this._id = null;
        this._id = id;
        this._addresses = addresses;
        this._eventEmitter = new events.EventEmitter();
    }
    MyNode.prototype.getAddresses = function () {
        return this._addresses;
    };

    MyNode.prototype.getId = function () {
        return this._id;
    };

    MyNode.prototype.updateAddresses = function (addressList, emitInfo) {
        this._addresses = addressList;
        this._eventEmitter.emit('addressChange', emitInfo);
    };

    MyNode.prototype.onAddressChange = function (callback) {
        this._eventEmitter.on('addressChange', callback);
    };

    MyNode.prototype.removeOnAddressChange = function (callback) {
        this._eventEmitter.removeListener('addressChange', callback);
    };
    return MyNode;
})();

module.exports = MyNode;
//# sourceMappingURL=MyNode.js.map
