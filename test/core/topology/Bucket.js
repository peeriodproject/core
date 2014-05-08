/// <reference path='../../test.d.ts' />
require('should');

var sinon = require('sinon');

var testUtils = require('../../utils/testUtils');

var Bucket = require('../../../src/core/topology/Bucket');
var ObjectConfig = require('../../../src/core/config/ObjectConfig');
var BucketStore = require('../../../src/core/topology/BucketStore');
var ContactNodeFactory = require('../../../src/core/topology/ContactNodeFactory');

var ContactNode = require('../../../src/core/topology/ContactNode');

describe('CORE --> TOPOLOGY --> Bucket', function () {
    // http://stackoverflow.com/a/14041593
    var sandbox;
    var configStub;
    var name;
    var bucketStoreStub;
    var contactNodeFactoryStub;
    var bucket;
    var maxBucketSize = 20;

    var createBucket = function (bucketStore) {
        bucketStoreStub = bucketStore;
        bucket = new Bucket(configStub, name, maxBucketSize, bucketStoreStub, contactNodeFactoryStub);
    };
    var stubPublicApi = function (klass, apiMethodCallbacks) {
        if (typeof apiMethodCallbacks === "undefined") { apiMethodCallbacks = {}; }
        return testUtils.stubPublicApi(sandbox, klass, apiMethodCallbacks);
    };
    var createStubbedBucketStore = function (apiMethodCallbacks) {
        if (typeof apiMethodCallbacks === "undefined") { apiMethodCallbacks = {}; }
        createBucket(stubPublicApi(BucketStore, apiMethodCallbacks));
    };

    beforeEach(function () {
        sandbox = sinon.sandbox.create();
        configStub = stubPublicApi(ObjectConfig);

        // random bucket name (0 < name < 160
        name = Math.round(Math.random() * 160);
        contactNodeFactoryStub = testUtils.stubPublicApi(sandbox, ContactNodeFactory);
    });

    afterEach(function () {
        sandbox.restore();
    });

    it('should correctly instantiate Bucket without error', function () {
        createBucket(stubPublicApi(BucketStore));
        bucket.should.be.an.instanceof(Bucket);
    });

    describe('should correctly limit the bucket size an return an error in the callback', function () {
        it('should correctly call the add method', function (done) {
            createStubbedBucketStore({
                size: function () {
                    return maxBucketSize;
                }
            });

            bucket.add(ContactNodeFactory.createDummy(), function (err) {
                err.should.be.an.instanceof(Error);
                err.message.should.equal('Bucket.add: Cannot add another contact. The Bucket is already full.');

                bucketStoreStub.add.called.should.be.false;

                done();
            });
        });

        it('should correctly update a contact node', function (done) {
            var contact = ContactNodeFactory.createDummy();

            createStubbedBucketStore({
                size: function () {
                    return 20;
                }
            });

            bucket.update(contact, function (err) {
                err.should.be.an.instanceof(Error);
                err.message.should.equal('Bucket.add: Cannot add another contact. The Bucket is already full.');

                bucketStoreStub.remove.calledOnce.should.be.true;
                bucketStoreStub.add.called.should.be.false;

                done();
            });
        });
    });

    describe('should correctly create contact node objects from the object from the bucket store', function () {
        var createNodeAddressList = function (nodeAddresses) {
            var addresses = [];

            for (var i in nodeAddresses) {
                addresses.push({
                    _ip: nodeAddresses[i].getIp(),
                    _port: nodeAddresses[i].getPort()
                });
            }

            return addresses;
        };

        it('Bucket.get should correctly return a ContactNode instance', function (done) {
            contactNodeFactoryStub = new ContactNodeFactory();

            createStubbedBucketStore({
                get: function () {
                    var dummy = ContactNodeFactory.createDummy();
                    var obj = {
                        id: dummy.getId().getBuffer(),
                        lastSeen: dummy.getLastSeen(),
                        addresses: createNodeAddressList(dummy.getAddresses())
                    };

                    return obj;
                }
            });

            bucket.get(ContactNodeFactory.createDummy().getId(), function (err, contact) {
                contact.should.be.an.instanceof(ContactNode);
                done();
            });
        });

        it('Bucket.getAll should correctly return an array of ContactNode instances', function (done) {
            contactNodeFactoryStub = new ContactNodeFactory();

            createStubbedBucketStore({
                getAll: function () {
                    var dummies = [];

                    for (var i = 0; i < 10; i++) {
                        var dummy = ContactNodeFactory.createDummy();

                        var dummyObject = {
                            id: dummy.getId().getBuffer(),
                            lastSeen: dummy.getLastSeen(),
                            addresses: createNodeAddressList(dummy.getAddresses())
                        };

                        dummies.push(dummyObject);
                    }

                    return dummies;
                }
            });

            bucket.getAll(function (err, contacts) {
                contacts[0].should.be.an.instanceof(ContactNode);
                done();
            });
        });
    });

    describe('should correctly call the internally bucket store', function () {
        it('should call the internal add method', function (done) {
            createStubbedBucketStore({
                size: function () {
                    return 0;
                }
            });

            bucket.add(ContactNodeFactory.createDummy(), function (err) {
                bucketStoreStub.add.calledOnce.should.be.true;

                done();
            });
        });

        it('should call the internal close method', function (done) {
            createStubbedBucketStore();

            bucket.close(function (err) {
                bucketStoreStub.close.calledOnce.should.be.true;

                done();
            });
        });

        it('should return the correct contains value', function (done) {
            var contact = ContactNodeFactory.createDummy();

            createStubbedBucketStore({
                contains: function () {
                    return false;
                }
            });

            bucket.contains(contact, function (err, contains) {
                contains.should.be.false;
                bucketStoreStub.contains.calledOnce.should.be.true;

                done();
            });
        });

        it('should call the internal get method', function (done) {
            var contact = ContactNodeFactory.createDummy();

            createBucket(stubPublicApi(BucketStore));

            bucket.get(contact.getId(), function (err, contact) {
                bucketStoreStub.get.calledOnce.should.be.true;

                done();
            });
        });

        it('should call the internal getAll method', function (done) {
            var contact = ContactNodeFactory.createDummy();

            createBucket(stubPublicApi(BucketStore));

            bucket.getAll(function (err, contact) {
                bucketStoreStub.getAll.calledOnce.should.be.true;

                done();
            });
        });

        it('should return the correct value from the internal isOpen method', function (done) {
            createStubbedBucketStore({
                isOpen: function () {
                    return true;
                }
            });

            bucket.isOpen(function (err, isOpen) {
                isOpen.should.be.true;
                bucketStoreStub.isOpen.calledOnce.should.be.true;

                done();
            });
        });

        it('should call the internal open method', function (done) {
            createStubbedBucketStore();

            bucket.open(function (err) {
                bucketStoreStub.open.calledTwice.should.be.true;

                done();
            });
        });

        it('should call the internal remove method', function (done) {
            var contact = ContactNodeFactory.createDummy();

            createStubbedBucketStore();

            bucket.remove(contact.getId(), function (err) {
                bucketStoreStub.remove.calledOnce.should.be.true;

                done();
            });
        });

        it('should return the correct size', function (done) {
            createStubbedBucketStore({
                size: function () {
                    return 10;
                }
            });

            bucket.size(function (err, size) {
                size.should.equal(10);
                bucketStoreStub.size.calledOnce.should.be.true;

                done();
            });
        });

        it('should correctly update a contact node', function (done) {
            var contact = ContactNodeFactory.createDummy();

            createStubbedBucketStore({
                size: function () {
                    return 10;
                }
            });

            bucket.update(contact, function (err) {
                bucketStoreStub.remove.calledOnce.should.be.true;
                bucketStoreStub.add.calledOnce.should.be.true;

                done();
            });
        });
    });
});
//# sourceMappingURL=Bucket.js.map
