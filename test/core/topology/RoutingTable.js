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

describe('CORE --> TOPOLOGY --> RoutingTable @joern', function () {
    var sandbox;
    var configStub;
    var me;
    var bucketStub;
    var bucketFactoryStub;
    var bucketStoreStub;
    var contactNodeFactoryStub;
    var topologyBitLength = 160;
    var topologyK = 20;

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

        //me = testUtils.stubPublicApi(sandbox, ContactNode);
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

                // wait for the next tick. the routing table is still in construction and `routingTable` will be undefined otherwise.
                setTimeout(function () {
                    routingTable.close();
                    done();
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

            routingTable.close();
            done();
        });
    });

    it('should correctly call th internal bucket.update method', function (done) {
        var routingTable;
        var contact = ContactNodeFactory.createDummy();

        routingTable = new RoutingTable(configStub, me.getId(), bucketFactoryStub, bucketStoreStub, contactNodeFactoryStub);

        routingTable.updateContactNode(contact, function (err) {
            bucketStub.update.calledOnce.should.be.true;

            routingTable.close();
            done();
        });
    });
});
//# sourceMappingURL=RoutingTable.js.map
