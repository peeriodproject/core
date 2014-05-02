/// <reference path='../../test.d.ts' />
var sinon = require('sinon');
var testUtils = require('../../utils/testUtils');

var fs = require('fs');
var path = require('path');

var Bucket = require('../../../src/core/topology/Bucket');
var ObjectConfig = require('../../../src/core/config/ObjectConfig');
var BucketStore = require('../../../src/core/topology/BucketStore');

//import Id = require('../../../src/core/topology/Id');
// sinon can only spy/stub/mock methods on an object.
// Therefore sinon objects are wrapped in this container object
var sinonGlobal = {
    ObjectConfig: ObjectConfig,
    BucketStore: BucketStore
};

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

    it('should correctly call the call the internally bucket store', function () {
        createBucket(stubPublicApi(BucketStore));

        bucket.size();
        bucketStoreStub.size.calledOnce;
    });
});
//# sourceMappingURL=Bucket.js.map
