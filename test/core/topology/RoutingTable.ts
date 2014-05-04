/// <reference path='../../test.d.ts' />

require('should');

import sinon = require('sinon');
import testUtils = require('../../utils/testUtils');

import RoutingTableOptions = require('../../../src/core/topology/interfaces/RoutingTableOptions');
import ContactNodeInterface = require('../../../src/core/topology/interfaces/ContactNodeInterface');

import RoutingTable = require('../../../src/core/topology/RoutingTable');
import ObjectConfig = require('../../../src/core/config/ObjectConfig');
import Bucket = require('../../../src/core/topology/Bucket');
import BucketFactory = require('../../../src/core/topology/BucketFactory');
import BucketStore = require('../../../src/core/topology/BucketStore');
import ContactNode = require('../../../src/core/topology/ContactNode');
import ContactNodeFactory = require('../../../src/core/topology/ContactNodeFactory');

describe('CORE --> TOPOLOGY --> RoutingTable', function () {
	var sandbox:SinonSandbox;
	var configStub:any;
	var me:ContactNodeInterface;
	var bucketStub:any;
	var bucketFactoryStub:any;
	var bucketStoreStub:any;
	var topologyK = 160;

	beforeEach(function () {
		sandbox = sinon.sandbox.create();
		configStub = testUtils.stubPublicApi(sandbox, ObjectConfig, {
			get: function (key:string) {
				if (key === 'topology.k') {
					return topologyK;
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
		var onOpen:SinonStub = sinon.stub();
		var onClose:SinonStub = sinon.stub();

		var checkDone = function () {
			if (onOpen.calledOnce && onClose.calledOnce) {
				done();
			}
		};

		var opts:RoutingTableOptions = {
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

	it ('should correctly create k buckets', function (done) {
		var opts:RoutingTableOptions = {
			onOpenCallback: function () {
				bucketFactoryStub.create.callCount.should.equal(topologyK);
				done();
			}
		};

		new RoutingTable(configStub, me.getId(), bucketFactoryStub, bucketStoreStub, opts);
	});

	it ('should correctly call the internal close method', function (done) {
		var opts:RoutingTableOptions = {
			onCloseCallback: function () {
				if (bucketStub.close.callCount === topologyK) {
					done();
				}
			}
		};

		var routingTable = new RoutingTable(configStub, me.getId(), bucketFactoryStub, bucketStoreStub, opts);
		routingTable.close();
	});

	it ('should correctly return the isOpen value', function (done) {
		var routingTable = new RoutingTable(configStub, me.getId(), bucketFactoryStub, bucketStoreStub);
		routingTable.isOpen(function (err:Error, isOpen1:boolean) {
			isOpen1.should.be.true;

			// double open check
			routingTable.open(function (err:Error) {
				// double close check
				routingTable.close(function (err:Error) {
					routingTable.close(function (err:Error) {
						routingTable.isOpen(function (err:Error, isOpen2:boolean) {
							isOpen2.should.be.false;
							done();
						});
					});
				});
			});
		});
	});

	it ('should correctly call the internal bucket.get method', function (done) {
		var routingTable = new RoutingTable(configStub, me.getId(), bucketFactoryStub, bucketStoreStub);
		var contact:ContactNodeInterface = ContactNodeFactory.createDummy();

		routingTable.getContactNode(contact.getId(), function (err:Error, contact:ContactNodeInterface) {
			bucketStub.get.calledOnce.should.be.true;
			done();
		});
	});

	it ('should correctly call th internal bucket.update method', function (done) {
		var routingTable = new RoutingTable(configStub, me.getId(), bucketFactoryStub, bucketStoreStub);
		var contact:ContactNodeInterface = ContactNodeFactory.createDummy();

		routingTable.updateContactNode(contact, function (err:Error) {
			bucketStub.update.calledOnce.should.be.true;
			done();
		});
	});

});