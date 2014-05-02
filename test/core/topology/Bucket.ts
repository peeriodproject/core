/// <reference path='../../test.d.ts' />

require('should');

import sinon = require('sinon');

import path = require('path');
import testUtils = require('../../utils/testUtils');

import Bucket = require('../../../src/core/topology/Bucket');
import ObjectConfig = require('../../../src/core/config/ObjectConfig');
import BucketStore = require('../../../src/core/topology/BucketStore');
import ContactNodeFactory = require('../../../src/core/topology/ContactNodeFactory');
import ContactNodeInterface = require('../../../src/core/topology/interfaces/ContactNodeInterface');

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
	};
	var createStubbedBucketStore = function (apiMethodCallbacks:testUtils.publicApiCallbackList = {}) {
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

	describe('should correctly call the call the internally bucket store', function () {

		it('should call the internal add method', function () {
			createStubbedBucketStore();

			bucket.add(ContactNodeFactory.createDummy());
			bucketStoreStub.add.calledOnce;
		});

		it('should call the internal close method', function () {
			createStubbedBucketStore();

			bucket.close();
			bucketStoreStub.close.calledOnce;
		});

		it('should return the correct contains value', function () {
			var contact:ContactNodeInterface = ContactNodeFactory.createDummy();

			createStubbedBucketStore({
				contains: function () {
					return false;
				}
			});

			bucket.contains(contact).should.be.false;
			bucketStoreStub.contains.calledOnce;
		});

		it('should call the internal get method', function () {
			var contact:ContactNodeInterface = ContactNodeFactory.createDummy();

			createBucket(stubPublicApi(BucketStore));

			bucket.get(contact.getId());
			bucketStoreStub.get.calledOnce;
		});

		it('should return the correct value from the internal isOpen method', function () {
			createStubbedBucketStore({
				isOpen: function () {
					return true;
				}
			});

			bucket.isOpen().should.be.true;
			bucketStoreStub.isOpen.calledOnce;
		});

		it('should call the internal open method', function () {
			createStubbedBucketStore();

			bucket.open();
			bucketStoreStub.open.calledOnce;
		});

		it('should call the internal remove method', function () {
			var contact:ContactNodeInterface = ContactNodeFactory.createDummy();

			createStubbedBucketStore();

			bucket.remove(contact.getId());
			bucketStoreStub.remove.calledOnce;
		});

		it('should return the correct size', function () {
			createStubbedBucketStore({
				size: function () {
					return 10;
				}
			});

			bucket.size().should.equal(10);
			bucketStoreStub.size.calledOnce;
		});

		it('update', function () {
			// todo update method
		});
	});
});