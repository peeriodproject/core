/// <reference path='../../test.d.ts' />
require('should');

var sinon = require('sinon');

var testUtils = require('../../utils/testUtils');

var BucketFactory = require('../../../src/core/topology/BucketFactory');
var Bucket = require('../../../src/core/topology/Bucket');
var ContactNodeFactory = require('../../../src/core/topology/ContactNodeFactory');
var ObjectConfig = require('../../../src/core/config/ObjectConfig');
var BucketStore = require('../../../src/core/topology/BucketStore');

describe('CORE --> TOPOLOGY --> BucketFactory', function () {
    var sandbox;
    var configStub;
    var bucketStoreStub;
    var contactNodeFactoryStub;

    beforeEach(function () {
        sandbox = sinon.sandbox.create();
        configStub = testUtils.stubPublicApi(sandbox, ObjectConfig);
        bucketStoreStub = testUtils.stubPublicApi(sandbox, BucketStore);
        contactNodeFactoryStub = testUtils.stubPublicApi(sandbox, ContactNodeFactory);
    });

    afterEach(function () {
        sandbox.restore();
    });

    it('should correctly create Buckets', function () {
        var bucket = (new BucketFactory()).create(configStub, 1, 20, bucketStoreStub, contactNodeFactoryStub);
        bucket.should.be.an.instanceof(Bucket);
    });
});
//# sourceMappingURL=BucketFactory.js.map
