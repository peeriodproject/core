/// <reference path='../../test.d.ts' />

require('should');

import sinon = require('sinon');

import testUtils = require('../../utils/testUtils');

import BucketFactory = require('../../../src/core/topology/BucketFactory');
import Bucket = require('../../../src/core/topology/Bucket');
import ContactNodeFactory = require('../../../src/core/topology/ContactNodeFactory');
import ObjectConfig = require('../../../src/core/config/ObjectConfig');
import BucketStore = require('../../../src/core/topology/BucketStore');

describe('CORE --> TOPOLOGY --> BucketFactory', function () {
	var sandbox:SinonSandbox;
	var configStub:any;
	var bucketStoreStub:any;
	var contactNodeFactoryStub:any;

	beforeEach(function () {
		sandbox = sinon.sandbox.create();
		configStub = testUtils.stubPublicApi(sandbox, ObjectConfig);
		bucketStoreStub = testUtils.stubPublicApi(sandbox, BucketStore);
		contactNodeFactoryStub = testUtils.stubPublicApi(sandbox, ContactNodeFactory);
	});

	afterEach(function () {
		sandbox.restore();
	});

	it ('should correctly create Buckets', function () {
		var bucket = (new BucketFactory()).create(configStub, 1, 20, bucketStoreStub, contactNodeFactoryStub);
		bucket.should.be.an.instanceof(Bucket);
	});

});