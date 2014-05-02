/// <reference path='../../test.d.ts' />
var sinon = require('sinon');
var testUtils = require('../../utils/testUtils');

var fs = require('fs');
var path = require('path');

var Bucket = require('../../../src/core/topology/Bucket');
var ObjectConfig = require('../../../src/core/config/ObjectConfig');
var BucketStore = require('../../../src/core/topology/BucketStore');
var ContactNodeFactory = require('../../../src/core/topology/ContactNodeFactory');

//import Id = require('../../../src/core/topology/Id');
describe('CORE --> TOPOLOGY --> BUCKET', function () {
    // http://stackoverflow.com/a/14041593
    var sandbox;

    var configStub;
    var name;
    var bucketStoreStub = {};
    var bucket;

    var createBucket = function (bucketStore) {
        bucketStoreStub = bucketStore;
        bucket = new Bucket(configStub, name, bucketStoreStub);
    };

    var stubPublicApi = function (klass, apiMethodCallbacks) {
        if (typeof apiMethodCallbacks === "undefined") { apiMethodCallbacks = {}; }
        return testUtils.stubPublicApi(sandbox, klass, apiMethodCallbacks);
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

    describe('should correctly call the call the internally bucket store', function () {
        it('should call the internal add method', function () {
            createBucket(stubPublicApi(BucketStore));

            bucket.add(ContactNodeFactory.createDummy());
            bucketStoreStub.add.calledOnce;
        });

        it('should call the internal close method', function () {
            createBucket(stubPublicApi(BucketStore));

            bucket.close();
            bucketStoreStub.close.calledOnce;
        });

        it('should return the correct contains value', function () {
            var contact = ContactNodeFactory.createDummy();

            createBucket(stubPublicApi(BucketStore, {
                contains: function () {
                    return false;
                }
            }));

            bucket.contains(contact).should.be.false;
            bucketStoreStub.contains.calledOnce;
        });

        it('should call the internal get method', function () {
            var contact = ContactNodeFactory.createDummy();

            createBucket(stubPublicApi(BucketStore));

            bucket.get(contact.getId());
            bucketStoreStub.get.calledOnce;
        });

        it('should return the correct value from the internal isOpen method', function () {
            createBucket(stubPublicApi(BucketStore, {
                isOpen: function () {
                    return true;
                }
            }));

            bucket.isOpen().should.be.true;
            bucketStoreStub.isOpen.calledOnce;
        });

        it('should call the internal open method', function () {
            createBucket(stubPublicApi(BucketStore));

            bucket.open();
            bucketStoreStub.open.calledOnce;
        });

        it('should call the internal remove method', function () {
            var contact = ContactNodeFactory.createDummy();

            createBucket(stubPublicApi(BucketStore));

            bucket.remove(contact.getId());
            bucketStoreStub.remove.calledOnce;
        });

        it('should return the correct size', function () {
            createBucket(stubPublicApi(BucketStore, {
                size: function () {
                    return 10;
                }
            }));

            bucket.size().should.equal(10);
            bucketStoreStub.size.calledOnce;
        });

        it('update', function () {
            // todo update method
        });
    });
});
//# sourceMappingURL=Bucket.js.map
