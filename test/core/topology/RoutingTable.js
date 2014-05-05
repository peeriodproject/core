/// <reference path='../../test.d.ts' />
require('should');

var sinon = require('sinon');
var testUtils = require('../../utils/testUtils');

var RoutingTable = require('../../../src/core/topology/RoutingTable');
var ObjectConfig = require('../../../src/core/config/ObjectConfig');
var Bucket = require('../../../src/core/topology/Bucket');
var BucketFactory = require('../../../src/core/topology/BucketFactory');
var BucketStore = require('../../../src/core/topology/BucketStore');

var ContactNodeFactory = require('../../../src/core/topology/ContactNodeFactory');

describe('CORE --> TOPOLOGY --> RoutingTable', function () {
    var sandbox;
    var configStub;
    var me;
    var bucketStub;
    var bucketFactoryStub;
    var bucketStoreStub;
    var topologyBitLength = 160;

    beforeEach(function () {
        sandbox = sinon.sandbox.create();
        configStub = testUtils.stubPublicApi(sandbox, ObjectConfig, {
            get: function (key) {
                if (key.toLowerCase() === 'topology.bitlength') {
                    return topologyBitLength;
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
    });

    afterEach(function () {
        sandbox.restore();
    });

    it('should correctly instantiate RoutingTable without error', function () {
        (new RoutingTable(configStub, me.getId(), bucketFactoryStub, bucketStoreStub)).should.be.an.instanceof(RoutingTable);
    });

    it('should correctly call the onOpen and onClose callbacks passed as option', function (done) {
        var onOpen = sinon.stub();
        var onClose = sinon.stub();

        var checkDone = function () {
            if (onOpen.calledOnce && onClose.calledOnce) {
                done();
            }
        };

        var opts = {
            closeOnProcessExit: true,
            onCloseCallback: function () {
                onClose();
                checkDone();
            },
            onOpenCallback: function () {
                onOpen();
                checkDone();
            }
        };

        var routingTable = (new RoutingTable(configStub, me.getId(), bucketFactoryStub, bucketStoreStub, opts));
        routingTable.close();
    });

    it('should correctly create bitLength buckets', function (done) {
        var opts = {
            onOpenCallback: function () {
                bucketFactoryStub.create.callCount.should.equal(topologyBitLength);
                done();
            }
        };

        new RoutingTable(configStub, me.getId(), bucketFactoryStub, bucketStoreStub, opts);
    });

    it('should correctly call the internal close method', function (done) {
        var opts = {
            onCloseCallback: function () {
                if (bucketStub.close.callCount === topologyBitLength) {
                    done();
                }
            }
        };

        var routingTable = new RoutingTable(configStub, me.getId(), bucketFactoryStub, bucketStoreStub, opts);
        routingTable.close();
    });

    it('should correctly return the isOpen value', function (done) {
        var routingTable = new RoutingTable(configStub, me.getId(), bucketFactoryStub, bucketStoreStub);
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
        var routingTable = new RoutingTable(configStub, me.getId(), bucketFactoryStub, bucketStoreStub);
        var contact = ContactNodeFactory.createDummy();

        routingTable.getContactNode(contact.getId(), function (err, contact) {
            bucketStub.get.calledOnce.should.be.true;
            done();
        });
    });

    it('should correctly call th internal bucket.update method', function (done) {
        var routingTable = new RoutingTable(configStub, me.getId(), bucketFactoryStub, bucketStoreStub);
        var contact = ContactNodeFactory.createDummy();

        routingTable.updateContactNode(contact, function (err) {
            bucketStub.update.calledOnce.should.be.true;
            done();
        });
    });
});
//# sourceMappingURL=RoutingTable.js.map
