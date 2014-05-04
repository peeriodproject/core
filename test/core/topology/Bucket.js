/// <reference path='../../test.d.ts' />
require('should');

var sinon = require('sinon');

var testUtils = require('../../utils/testUtils');

var Bucket = require('../../../src/core/topology/Bucket');
var ObjectConfig = require('../../../src/core/config/ObjectConfig');
var BucketStore = require('../../../src/core/topology/BucketStore');
var ContactNodeFactory = require('../../../src/core/topology/ContactNodeFactory');

describe('CORE --> TOPOLOGY --> BUCKET', function () {
    // http://stackoverflow.com/a/14041593
    var sandbox;
    var configStub;
    var name;
    var bucketStoreStub;
    var bucket;
    var createBucket = function (bucketStore) {
        bucketStoreStub = bucketStore;
        bucket = new Bucket(configStub, name, bucketStoreStub);
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
        name = 'bucket1';
    });

    afterEach(function () {
        sandbox.restore();
    });

    it('should correctly instantiate Bucket without error', function () {
        createBucket(stubPublicApi(BucketStore));
        bucket.should.be.an.instanceof(Bucket);
    });

    describe('should correctly call the internally bucket store', function () {
        it('should call the internal add method', function (done) {
            createStubbedBucketStore();

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

        it('update', function () {
            // todo update method
        });
    });
});
//# sourceMappingURL=Bucket.js.map
