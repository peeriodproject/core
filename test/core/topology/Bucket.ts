/// <reference path='../../test.d.ts' />

import should = require('should');
import sinon = require('sinon');
import testUtils = require('../../utils/testUtils');

var fs = require('fs');
var path = require('path');

import Bucket = require('../../../src/core/topology/Bucket');
import ObjectConfig = require('../../../src/core/config/ObjectConfig');
import BucketStore = require('../../../src/core/topology/BucketStore');
//import Id = require('../../../src/core/topology/Id');

// sinon can only spy/stub/mock methods on an object.
// Therefore sinon objects are wrapped in this container object
var sinonGlobal = {
	ObjectConfig: ObjectConfig,
	BucketStore: BucketStore
};

describe('CORE --> TOPOLOGY --> BUCKET', function () {
	// http://stackoverflow.com/a/14041593
	var sandbox:SinonSandbox;

	var configStub:any;
	var name:string;
	var bucketStoreStub:any = {};
	var bucket:Bucket;

	var createBucket = function (bucketStore:any) {
		bucketStoreStub = bucketStore;
		bucket = new Bucket(configStub, name, bucketStoreStub);
	};

	var stubPublicApi = function (klass:Function, apiMethodCallbacks:testUtils.publicApiCallbackList = {}) {
		return testUtils.stubPublicApi(sandbox, klass, apiMethodCallbacks);
	}

	beforeEach(function () {
		sandbox = sinon.sandbox.create();
		configStub = stubPublicApi(ObjectConfig);
		name = 'bucket1';
	});

	afterEach(function () {
		sandbox.restore();
	});

	it ('should correctly instantiate Bucket without error', function () {
		createBucket(stubPublicApi(BucketStore));
		bucket.should.be.an.instanceof(Bucket);
	});

	it ('should correctly call the call the internally bucket store', function () {
		createBucket(stubPublicApi(BucketStore));

		bucket.size();
		bucketStoreStub.size.calledOnce;


	});
});