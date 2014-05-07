/// <reference path='../../test.d.ts' />
require('should');

var sinon = require('sinon');
var testUtils = require('../../utils/testUtils');

var RoutingTable = require('../../../src/core/topology/RoutingTable');
var Bucket = require('../../../src/core/topology/Bucket');
var BucketFactory = require('../../../src/core/topology/BucketFactory');
var BucketStore = require('../../../src/core/topology/BucketStore');

var ContactNodeFactory = require('../../../src/core/topology/ContactNodeFactory');
var ObjectConfig = require('../../../src/core/config/ObjectConfig');

describe('CORE --> TOPOLOGY --> RoutingTable', function () {
    var sandbox;
    var configStub;
    var me;
    var bucketStub;
    var bucketFactoryStub;
    var bucketStoreStub;
    var contactNodeFactoryStub;
    var topologyBitLength = 160;
    var topologyK = 20;

    /**
    * Helper function to close the RoutingTable and call the doneCallback.
    *
    * @param {core.topology.RoutingTableInterface} routingTable
    * @param {Function} doneCallback
    */
    var closeRtAndDone = function (routingTable, doneCallback) {
        routingTable.close(function () {
            doneCallback();
        });
    };

    beforeEach(function () {
        sandbox = sinon.sandbox.create();
        configStub = testUtils.stubPublicApi(sandbox, ObjectConfig, {
            get: function (key) {
                key = key.toLowerCase();

                if (key === 'topology.bitlength') {
                    return topologyBitLength;
                } else if (key === 'topology.k') {
                    return topologyK;
                }
            }
        });
        me = ContactNodeFactory.createDummy();
        bucketStub = testUtils.stubPublicApi(sandbox, Bucket, {
            get: function (id, callback) {
                callback(null, null);
            },
            update: function (contact, callback) {
                callback(null);
            }
        });
        bucketFactoryStub = testUtils.stubPublicApi(sandbox, BucketFactory, {
            create: function () {
                return bucketStub;
            }
        });
        bucketStoreStub = testUtils.stubPublicApi(sandbox, BucketStore);
        contactNodeFactoryStub = testUtils.stubPublicApi(sandbox, ContactNodeFactory);
    });

    afterEach(function () {
        sandbox.restore();
    });

    it('should correctly instantiate RoutingTable without error', function () {
        var routingTable;

        routingTable = new RoutingTable(configStub, me.getId(), bucketFactoryStub, bucketStoreStub, contactNodeFactoryStub);
        routingTable.should.be.an.instanceof(RoutingTable);
        routingTable.close();
    });

    it('should correctly call the onOpen and onClose callbacks passed as option', function (done) {
        var routingTable;
        var onOpen = sinon.stub();
        var onClose = sinon.stub();

        var checkDone = function () {
            if (onOpen.calledOnce && onClose.calledOnce) {
                done();
            }
        };

        var opts = {
            closeOnProcessExit: false,
            onCloseCallback: function () {
                onClose();
                checkDone();
            },
            onOpenCallback: function () {
                onOpen();
                checkDone();
            }
        };

        routingTable = (new RoutingTable(configStub, me.getId(), bucketFactoryStub, bucketStoreStub, contactNodeFactoryStub, opts));
        routingTable.close();
    });

    it('should correctly create topology.bitLength buckets', function (done) {
        var routingTable;
        var opts = {
            onOpenCallback: function () {
                bucketFactoryStub.create.callCount.should.equal(topologyBitLength);

                // waiting for the next tick!
                // The routing table is still in construction and `routingTable` will be undefined otherwise.
                setTimeout(function () {
                    closeRtAndDone(routingTable, done);
                }, 0);
            }
        };

        routingTable = new RoutingTable(configStub, me.getId(), bucketFactoryStub, bucketStoreStub, contactNodeFactoryStub, opts);
    });

    it('should correctly call the internal close method', function (done) {
        var routingTable;
        var opts = {
            closeOnProcessExit: false,
            onCloseCallback: function () {
                if (bucketStub.close.callCount === topologyBitLength) {
                    done();
                }
            }
        };

        routingTable = new RoutingTable(configStub, me.getId(), bucketFactoryStub, bucketStoreStub, contactNodeFactoryStub, opts);
        routingTable.close();
    });

    it('should correctly return the isOpen value', function (done) {
        var routingTable;

        routingTable = new RoutingTable(configStub, me.getId(), bucketFactoryStub, bucketStoreStub, contactNodeFactoryStub);
        routingTable.isOpen(function (err, isOpen1) {
            isOpen1.should.be.true;

            // double open check
            routingTable.open(function (err) {
                // double close check
                routingTable.close(function (err) {
                    routingTable.close(function (err) {
                        routingTable.isOpen(function (err, isOpen2) {
                            isOpen2.should.be.false;

                            done();
                        });
                    });
                });
            });
        });
    });

    it('should correctly call the internal bucket.get method', function (done) {
        var routingTable;
        var contact = ContactNodeFactory.createDummy();

        routingTable = new RoutingTable(configStub, me.getId(), bucketFactoryStub, bucketStoreStub, contactNodeFactoryStub);

        routingTable.getContactNode(contact.getId(), function (err, contact) {
            bucketStub.get.calledOnce.should.be.true;

            closeRtAndDone(routingTable, done);
        });
    });

    it('should correctly call th internal bucket.update method', function (done) {
        var routingTable;
        var contact = ContactNodeFactory.createDummy();

        routingTable = new RoutingTable(configStub, me.getId(), bucketFactoryStub, bucketStoreStub, contactNodeFactoryStub);

        routingTable.updateContactNode(contact, function (err) {
            bucketStub.update.calledOnce.should.be.true;

            closeRtAndDone(routingTable, done);
        });
    });

    describe('should correctly return the closest contact nodes @joern', function () {
        var databasePath = testUtils.getFixturePath('core/topology/bucketstore/db');

        var bucketFactory;
        var bucketStore;
        var contactNodeFactory;
        var targetNode;

        var createContactNodes = function (routingTable, amount, callback) {
            var addedAmount = 0;
            var addContactNode = function () {
                var contact = ContactNodeFactory.createDummy();

                routingTable.updateContactNode(contact, function (err) {
                    if (!err) {
                        addedAmount++;
                    }

                    if (addedAmount < amount) {
                        addContactNode();
                    } else {
                        callback();
                    }
                });
            };

            addContactNode();
        };

        beforeEach(function () {
            testUtils.createFolder(databasePath);

            bucketFactory = new BucketFactory();
            bucketStore = new BucketStore('name', databasePath);
            contactNodeFactory = new ContactNodeFactory();
            targetNode = ContactNodeFactory.createDummy();
        });

        afterEach(function () {
            bucketFactory = null;
            bucketStore = null;
            contactNodeFactory = null;
            targetNode = null;

            testUtils.deleteFolderRecursive(databasePath);
        });

        it('should correctly exclude the exclude id', function (done) {
            var routingTable;
            var excludeContactNode = ContactNodeFactory.createDummy();

            routingTable = new RoutingTable(configStub, me.getId(), bucketFactory, bucketStore, contactNodeFactory);

            routingTable.updateContactNode(excludeContactNode, function () {
                createContactNodes(routingTable, 10, function () {
                    routingTable.getClosestContactNodes(targetNode.getId(), excludeContactNode.getId(), function (err, contacts) {
                        for (var i in contacts) {
                            var contact = contacts[i];

                            excludeContactNode.getId().equals(contact.getId()).should.be.false;
                        }

                        closeRtAndDone(routingTable, done);
                    });
                });
            });
        });

        it('should correctly limit the return value to k contact nodes', function (done) {
            var routingTable;

            routingTable = new RoutingTable(configStub, me.getId(), bucketFactory, bucketStore, contactNodeFactory);

            createContactNodes(routingTable, 100, function () {
                routingTable.getClosestContactNodes(targetNode.getId(), null, function (err, contacts) {
                    contacts.length.should.equal(topologyK);

                    closeRtAndDone(routingTable, done);
                });
            });
        });

        it('should correctly return all contact nodes', function (done) {
            var routingTable;

            routingTable = new RoutingTable(configStub, me.getId(), bucketFactory, bucketStore, contactNodeFactory);

            createContactNodes(routingTable, 10, function () {
                routingTable.getClosestContactNodes(targetNode.getId(), null, function (err, contacts) {
                    contacts.length.should.equal(10);

                    closeRtAndDone(routingTable, done);
                });
            });
        });

        it('should correctly return the contact nodes in sorted order', function (done) {
            var routingTable;
            var ownerIdStr;
            var targetIdStr;
            var ids;

            var customTopologyK = 5;

            var customConfigStub = testUtils.stubPublicApi(sandbox, ObjectConfig, {
                get: function (key) {
                    key = key.toLowerCase();

                    if (key === 'topology.bitlength') {
                        return topologyBitLength;
                    } else if (key === 'topology.k') {
                        return customTopologyK;
                    }
                }
            });

            var createContactNodesFromIds = function (ids, index, callback) {
                var contact = ContactNodeFactory.createDummy(ids[index]);

                routingTable.updateContactNode(contact, function (err) {
                    if (!err) {
                        if (index < ids.length - 1) {
                            createContactNodesFromIds(ids, ++index, callback);
                        } else {
                            callback();
                        }
                    } else {
                        throw err;
                    }
                });
            };

            ownerIdStr = '1111111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000000000000000';
            targetIdStr = '1111111111111111100000000000000000000000000111111111111111100000000000000000000000000111111111111111100000000000000000000000000000000000000000000000000000000000';

            ids = [
                '1111111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000000000000001',
                '1111111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000000000000011',
                '1111111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000000000000111',
                '1111111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000000000001111',
                '1111111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000000000011111',
                '1111111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000000001111111',
                '1111111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000000011111111',
                '1111111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000000111111111',
                '1111111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000001111111111',
                '1111111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000011111111111'
            ];

            var owner = ContactNodeFactory.createDummy(ownerIdStr);
            var customTargetNode = ContactNodeFactory.createDummy(targetIdStr);

            routingTable = new RoutingTable(customConfigStub, owner.getId(), bucketFactory, bucketStore, contactNodeFactory);

            createContactNodesFromIds(ids, 0, function () {
                routingTable.getClosestContactNodes(customTargetNode.getId(), null, function (err, contacts) {
                    var lastDistance = null;

                    contacts.length.should.equal(customTopologyK);

                    for (var i in contacts) {
                        var contact = contacts[i];

                        contact.getId().toBitString().should.equal(ids[i]);

                        if (lastDistance !== null) {
                            var isGreater = customTargetNode.getId().distanceTo(contact.getId()) > lastDistance;

                            isGreater.should.be.true;
                        } else {
                            lastDistance = customTargetNode.getId().distanceTo(contact.getId());
                        }
                    }

                    lastDistance = null;

                    closeRtAndDone(routingTable, done);
                });
            });
        });
    });
});
//# sourceMappingURL=RoutingTable.js.map
