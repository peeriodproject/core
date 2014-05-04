/// <reference path='../../test.d.ts' />
require('should');

var sinon = require('sinon');

var testUtils = require('../../utils/testUtils');

var BucketFactory = require('../../../src/core/topology/BucketFactory');
var Bucket = require('../../../src/core/topology/Bucket');
var ObjectConfig = require('../../../src/core/config/ObjectConfig');
var BucketStore = require('../../../src/core/topology/BucketStore');

describe('CORE --> TOPOLOGY --> BucketFactory', function () {
    var sandbox;
    var configStub;
    var bucketStoreStub;

    beforeEach(function () {
        sandbox = sinon.sandbox.create();
        configStub = testUtils.stubPublicApi(sandbox, ObjectConfig);
        bucketStoreStub = testUtils.stubPublicApi(sandbox, BucketStore);
    });

    afterEach(function () {
        sandbox.restore();
    });

    it('should correctly create Buckets', function () {
        var bucket = (new BucketFactory()).create(configStub, 'bucket', bucketStoreStub);
        bucket.should.be.an.instanceof(Bucket);
    });
});
//# sourceMappingURL=BucketFactory.js.map
