/// <reference path='../../test.d.ts' />

require('should');

import sinon = require('sinon');
import testUtils = require('../../utils/testUtils');

import AppQuitHandler = require('../../../src/core/utils/AppQuitHandler');
import BucketFactoryInterface = require('../../../src/core/topology/interfaces/BucketFactoryInterface');
import BucketStoreInterface = require('../../../src/core/topology/interfaces/BucketStoreInterface');
import ContactNodeInterface = require('../../../src/core/topology/interfaces/ContactNodeInterface');
import ContactNodeListInterface = require('../../../src/core/topology/interfaces/ContactNodeListInterface');
import RoutingTableInterface = require('../../../src/core/topology/interfaces/RoutingTableInterface');
import RoutingTableOptions = require('../../../src/core/topology/interfaces/RoutingTableOptions');

import RoutingTable = require('../../../src/core/topology/RoutingTable');
import Bucket = require('../../../src/core/topology/Bucket');
import BucketFactory = require('../../../src/core/topology/BucketFactory');
import BucketStore = require('../../../src/core/topology/BucketStore');
import ContactNode = require('../../../src/core/topology/ContactNode');
import ContactNodeFactory = require('../../../src/core/topology/ContactNodeFactory');
import ObjectConfig = require('../../../src/core/config/ObjectConfig');

describe('CORE --> TOPOLOGY --> RoutingTable', function () {

	var sandbox:SinonSandbox;
	var configStub:any;
	var appQuitHandlerStub:any;
	var me:ContactNodeInterface;
	var bucketStub:any;
	var bucketFactoryStub:any;
	var bucketStoreStub:any;
	var contactNodeFactoryStub:any;
	var topologyBitLength = 160;
	var topologyK = 20;

	/**
	 * Helper function to close the RoutingTable and call the doneCallback.
	 *
	 * @param {core.topology.RoutingTableInterface} routingTable
	 * @param {Function} doneCallback
	 */

	var closeRtAndDone = function (routingTable:RoutingTableInterface, doneCallback:Function) {
		routingTable.close(function () {
			doneCallback();
		});
	};

	beforeEach(function () {
		sandbox = sinon.sandbox.create();
		configStub = testUtils.stubPublicApi(sandbox, ObjectConfig, {
			get: function (key:string) {
				key = key.toLowerCase();

				if (key === 'topology.bitlength') {
					return topologyBitLength;
				}
				else if (key === 'topology.k') {
					return topologyK;
				}
			}
		});
		appQuitHandlerStub = testUtils.stubPublicApi(sandbox, AppQuitHandler);
		me = ContactNodeFactory.createDummy();
		bucketStub = testUtils.stubPublicApi(sandbox, Bucket, {
			get   : function (id, callback) {
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
		contactNodeFactoryStub = testUtils.stubPublicApi(sandbox, ContactNodeFactory);
	});

	afterEach(function () {
		sandbox.restore();

		configStub = null;
		appQuitHandlerStub = null;
		me = null;
		bucketStub = null;
		bucketFactoryStub = null;
		bucketStoreStub = null;
		contactNodeFactoryStub = null;
	});

	it('should correctly instantiate RoutingTable without error', function () {
		var routingTable:RoutingTableInterface;

		routingTable = new RoutingTable(configStub, appQuitHandlerStub, me.getId(), bucketFactoryStub, bucketStoreStub, contactNodeFactoryStub);
		routingTable.should.be.an.instanceof(RoutingTable);
		routingTable.close();
	});

	it('should correctly call the onOpen and onClose callbacks passed as option', function (done) {
		var routingTable:RoutingTableInterface;
		var onOpen:SinonStub = sinon.stub();
		var onClose:SinonStub = sinon.stub();

		var checkDone = function () {
			if (onOpen.calledOnce && onClose.calledOnce) {
				done();
			}
		};

		var opts:RoutingTableOptions = {
			onCloseCallback: function () {
				onClose();
				checkDone();
			},
			onOpenCallback : function () {
				onOpen();
				checkDone();
			}
		};

		routingTable = (new RoutingTable(configStub, appQuitHandlerStub, me.getId(), bucketFactoryStub, bucketStoreStub, contactNodeFactoryStub, opts));
		routingTable.close();
	});

	it('should correctly create topology.bitLength buckets', function (done) {
		var routingTable:RoutingTableInterface;
		var opts:RoutingTableOptions = {
			onOpenCallback: function () {
				bucketFactoryStub.create.callCount.should.equal(topologyBitLength);

				closeRtAndDone(routingTable, done);
			}
		};

		routingTable = new RoutingTable(configStub, appQuitHandlerStub, me.getId(), bucketFactoryStub, bucketStoreStub, contactNodeFactoryStub, opts);
	});

	it('should correctly call the internal close method', function (done) {
		var routingTable:RoutingTableInterface;
		var opts:RoutingTableOptions = {
			onCloseCallback: function () {
				if (bucketStub.close.callCount === topologyBitLength) {
					done();
				}
			}
		};

		routingTable = new RoutingTable(configStub, appQuitHandlerStub, me.getId(), bucketFactoryStub, bucketStoreStub, contactNodeFactoryStub, opts);
		routingTable.close();
	});

	it('should correctly return the isOpen value', function (done) {
		var routingTable:RoutingTableInterface;

		routingTable = new RoutingTable(configStub, appQuitHandlerStub, me.getId(), bucketFactoryStub, bucketStoreStub, contactNodeFactoryStub);
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

	it('should correctly call the internal bucket.size method of k buckets', function (done) {
		var routingTable:RoutingTableInterface;
		var size:number = 0;

		bucketStub = testUtils.stubPublicApi(sandbox, Bucket, {
			size: function (callback) {
				var bucketSize:number = 10;

				size += bucketSize;

				callback(null, bucketSize);
			}
		});

		routingTable = new RoutingTable(configStub, appQuitHandlerStub, me.getId(), bucketFactoryStub, bucketStoreStub, contactNodeFactoryStub);

		routingTable.getAllContactNodesSize(function (err:Error, size:number) {
			size.should.equal(topologyBitLength * 10);
			bucketStub.size.callCount.should.equal(topologyBitLength);

			done();
		});
	});

	it('should correctly call the internal bucket.get method', function (done) {
		var routingTable:RoutingTableInterface;
		var contact:ContactNodeInterface = ContactNodeFactory.createDummy();

		routingTable = new RoutingTable(configStub, appQuitHandlerStub, me.getId(), bucketFactoryStub, bucketStoreStub, contactNodeFactoryStub);

		routingTable.getContactNode(contact.getId(), function (err:Error, contact:ContactNodeInterface) {
			bucketStub.get.calledOnce.should.be.true;

			closeRtAndDone(routingTable, done);
		});
	});

	it('should correctly call th internal bucket.update method', function (done) {
		var routingTable:RoutingTableInterface;
		var contact:ContactNodeInterface = ContactNodeFactory.createDummy();

		routingTable = new RoutingTable(configStub, appQuitHandlerStub, me.getId(), bucketFactoryStub, bucketStoreStub, contactNodeFactoryStub);

		routingTable.updateContactNode(contact, function (err:Error, longestNotSeenContact:ContactNodeInterface) {
			bucketStub.update.calledOnce.should.be.true;

			closeRtAndDone(routingTable, done);
		});
	});

	describe('should correctly throw an error whenever you are looking for the owner Id', function () {
		var routingTable:RoutingTableInterface;

		beforeEach(function () {
			routingTable = new RoutingTable(configStub, appQuitHandlerStub, me.getId(), bucketFactoryStub, bucketStoreStub, contactNodeFactoryStub);
		});

		afterEach(function () {
			routingTable = null;
		});

		it('should correctly throw an error when calling the getContactNode method', function (done) {
			routingTable.getContactNode(me.getId(), function (err:Error, contact:ContactNodeInterface) {
				err.should.be.an.instanceof(Error);
				err.message.should.equal('RoutingTable.getContactNode: cannot get the contact node.');

				done();
			});
		});

		it('should correctly throw an error when calling the getClostestContactNodes method', function (done) {
			routingTable.getClosestContactNodes(me.getId(), null, function (err:Error, contacts:ContactNodeListInterface) {
				err.should.be.an.instanceof(Error);
				err.message.should.equal('RoutingTable.getClosestContactNode: cannot get closest contact nodes for the given Id.');

				done();
			});
		});

		it('should correctly throw an error when calling the updateContactNode method', function (done) {
			var contactNode:ContactNodeInterface = ContactNodeFactory.createDummy(me.getId().toBitString());

			routingTable.updateContactNode(contactNode, function (err:Error, longestNotSeenContact:ContactNodeInterface) {
				err.should.be.an.instanceof(Error);
				err.message.should.equal('RoutingTable.updateContactNode: cannot update the given contact node.');

				done();
			});
		});

	});

	describe('should correctly call public methods when the routing table is closed', function () {
		var routingTable:RoutingTableInterface;

		beforeEach(function (done) {
			routingTable = new RoutingTable(configStub, appQuitHandlerStub, me.getId(), bucketFactoryStub, bucketStoreStub, contactNodeFactoryStub);
			routingTable.close(function () {
				done();
			});
		});

		afterEach(function () {
			routingTable = null;
		});

		it ('`getAllContactNodes` should correctly return an empty array', function (done) {
			routingTable.getAllContactNodes(function (err, contacts) {
				(err === null).should.be.true;

				contacts.should.be.an.instanceof(Array);
				contacts.should.have.a.lengthOf(0);

				done();
			});
		});

		it('`getAllContactNodesSize` should correctly return 0', function (done) {
			routingTable.getAllContactNodesSize(function (err, size) {
				(err === null).should.be.true;

				size.should.equal(0);

				done();
			});
		});

		it('`getClosestContactNodes` should correctly return an empty array', function (done) {
			routingTable.getClosestContactNodes(ContactNodeFactory.createDummy().getId(), null, function (err, contacts) {
				(err === null).should.be.true;

				contacts.should.be.an.instanceof(Array);
				contacts.should.have.a.lengthOf(0);

				done();
			});
		});

		it('`getContactNode` should correctly return `null`', function (done) {
			routingTable.getContactNode(ContactNodeFactory.createDummy().getId(), function (err, contact) {
				(err === null).should.be.true;

				(contact === null).should.be.true;

				done();
			});
		});

		it('`getRandomContactNode` should correctly return `null`', function (done) {
			routingTable.getRandomContactNode(function (err, contact) {
				(err === null).should.be.true;

				(contact === null).should.be.true;

				done();
			});
		});

		it('`getRandomContactNodesFromBucket` should correctly return an empty array', function (done) {
			routingTable.getRandomContactNodesFromBucket(1, 1, function (err, contacts) {
				(err === null).should.be.true;

				contacts.should.be.an.instanceof(Array);
				contacts.should.have.a.lengthOf(0);

				done();
			});
		});

		it('`replaceContactNode` should correctly return `null`', function (done) {
			routingTable.replaceContactNode(ContactNodeFactory.createDummy(), ContactNodeFactory.createDummy(), function (err, longestNotSeenContact) {
				(err === null).should.be.true;

				(longestNotSeenContact === null).should.be.true;

				done();
			});
		});

		it('`updateContactNode` should correctly return `null`', function (done) {
			routingTable.updateContactNode(ContactNodeFactory.createDummy(), function (err, longestNotSeenContact) {
				(err === null).should.be.true;

				(longestNotSeenContact === null).should.be.true;

				done();
			});
		});
	});

	describe('implementation tests', function () {
		var databasePath:string = testUtils.getFixturePath('core/topology/bucketstore/db');
		var bucketFactory:BucketFactoryInterface;
		var bucketStore:BucketStoreInterface;
		var contactNodeFactory:ContactNodeFactory;
		var createContactNodes = function (routingTable:RoutingTableInterface, amount:number, callback:Function) {
			var addedAmount = 0;
			var addContactNode = function () {
				var contact:ContactNodeInterface = ContactNodeFactory.createDummy();

				routingTable.updateContactNode(contact, function (err:Error) {
					if (!err) {
						addedAmount++;
					}

					if (addedAmount < amount) {
						addContactNode();
					}
					else {
						callback();
					}
				});
			};

			addContactNode();
		};
		var createContactNodesFromIds = function (routingTable:RoutingTableInterface, ids:Array<string>, index:number, callback:Function) {
			var contact:ContactNodeInterface = ContactNodeFactory.createDummy(ids[index]);

			routingTable.updateContactNode(contact, function (err:Error) {
				if (!err) {
					if (index < ids.length - 1) {
						createContactNodesFromIds(routingTable, ids, ++index, callback);
					}
					else {
						callback();
					}
				}
				else {
					throw err;
				}
			});
		};

		beforeEach(function () {
			testUtils.createFolder(databasePath);

			bucketFactory = new BucketFactory();
			bucketStore = new BucketStore('name', databasePath);
			contactNodeFactory = new ContactNodeFactory();
		});

		afterEach(function () {
			bucketFactory = null;
			bucketStore = null;
			contactNodeFactory = null;

			testUtils.deleteFolderRecursive(databasePath);
		});

		describe('should correctly replace the given contact nodes if they belong to the same bucket', function () {

			it('should correctly return an error if the contact nodes dont belong to the same bucket', function (done) {
				var routingTable:RoutingTableInterface;

				var ids = [
					// owner
					'1111111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000000000000000',
					// old contact
					'1111111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000000000000010',
					// new contact
					'1111111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000000000000110'
				];
				var owner = ContactNodeFactory.createDummy(ids[0]);
				var oldContact = ContactNodeFactory.createDummy(ids[1]);
				var newContact = ContactNodeFactory.createDummy(ids[2]);

				routingTable = new RoutingTable(configStub, appQuitHandlerStub, owner.getId(), bucketFactory, bucketStore, contactNodeFactory, {
					onOpenCallback: function () {
						routingTable.replaceContactNode(oldContact, newContact, function (err:Error) {
							err.should.be.an.instanceof(Error);
							err.message.should.equal('RoutingTable.replaceContactNode: Cannot replace the given contact nodes. They dont belong to the same Bucket.');

							closeRtAndDone(routingTable, done);
						});
					}
				});
			});

			it('should correctly replace the given contact nodes', function (done) {
				var routingTable:RoutingTableInterface;

				var oldContact:ContactNodeInterface = ContactNodeFactory.createDummy();
				var oldIdBitString:string = oldContact.getId().toBitString();

				var index:number = oldIdBitString.length - 1;
				var lastBit:number = parseInt(oldIdBitString.charAt(index), 10);
				var newIdBitString:string = oldIdBitString.substr(0, index) + (lastBit ? '0' : '1');

				var newContact:ContactNodeInterface = ContactNodeFactory.createDummy(newIdBitString);

				routingTable = new RoutingTable(configStub, appQuitHandlerStub, me.getId(), bucketFactory, bucketStore, contactNodeFactory);

				routingTable.updateContactNode(oldContact, function (err:Error) {
					routingTable.replaceContactNode(oldContact, newContact, function (err:Error) {
						(err === null).should.be.true;

						routingTable.getContactNode(oldContact.getId(), function (err:Error, contact:ContactNodeInterface) {
							(err === null).should.be.true;
							(contact === null).should.be.true;

							routingTable.getContactNode(newContact.getId(), function (err:Error, contact:ContactNodeInterface) {
								JSON.stringify(newContact).should.equal(JSON.stringify(contact));

								closeRtAndDone(routingTable, done);
							});
						});
					});
				});
			});
		});

		describe('should correctly return all contact nodes', function () {
			it('should not fail if the routing table is empty', function (done) {
				var routingTable:RoutingTableInterface;

				routingTable = new RoutingTable(configStub, appQuitHandlerStub, me.getId(), bucketFactory, bucketStore, contactNodeFactory, {
					onOpenCallback: function () {

						routingTable.getAllContactNodes(function (err:Error, contacts:ContactNodeListInterface) {
							(err === null).should.be.true;
							contacts.should.be.an.instanceof(Array);
							contacts.should.have.a.lengthOf(0);

							closeRtAndDone(routingTable, done);
						});
					}
				});
			});

			it('should correctly return all contact nodes', function (done) {
				var routingTable:RoutingTableInterface;
				var lastSeen = 0;

				routingTable = new RoutingTable(configStub, appQuitHandlerStub, me.getId(), bucketFactory, bucketStore, contactNodeFactory, {
					onOpenCallback: function () {
						createContactNodes(routingTable, 100, function () {
							routingTable.getAllContactNodes(function (err:Error, contacts:ContactNodeListInterface) {
								(err === null).should.be.true;

								contacts.should.be.an.instanceof(Array);
								contacts.should.have.a.lengthOf(100);

								// sorted by lastSeen check
								for (var i = 0, l = contacts.length; i < l; i++) {
									var contactLastSeen = contacts[i].getLastSeen();

									contactLastSeen.should.be.greaterThan(lastSeen);

									lastSeen = contactLastSeen;
								}

								closeRtAndDone(routingTable, done);
							});
						});
					}
				});
			});
		});

		describe('should correctly return a random contact node', function () {

			it('should not fail if the buckets are empty', function (done) {
				var routingTable:RoutingTableInterface;

				routingTable = new RoutingTable(configStub, appQuitHandlerStub, me.getId(), bucketFactory, bucketStore, contactNodeFactory, {
					onOpenCallback: function () {

						routingTable.getRandomContactNode(function (err:Error, contact:ContactNodeInterface) {
							(err === null).should.be.true;
							(contact === null).should.be.true;

							closeRtAndDone(routingTable, done);
						});
					}
				});
			});

			it('should correctly return a random contact node', function (done) {
				var routingTable:RoutingTableInterface;

				routingTable = new RoutingTable(configStub, appQuitHandlerStub, me.getId(), bucketFactory, bucketStore, contactNodeFactory, {
					onOpenCallback: function () {
						createContactNodes(routingTable, 100, function () {
							routingTable.getRandomContactNode(function (err:Error, contact:ContactNodeInterface) {
								(err === null).should.be.true;

								contact.should.be.an.instanceof(ContactNode);

								closeRtAndDone(routingTable, done);
							});
						});
					}
				});
			});

		});

		describe('should correctly return `amount` random contact nodes from the specified bucket', function () {

			it('should correctly return all contact nodes if the bucket contains less nodes than specified', function (done) {
				var routingTable:RoutingTableInterface;
				var ownerIdStr:string;
				var ids:Array<string>;

				ownerIdStr = '1111111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000000000000000';

				ids = [
					'1111111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000100000000001',
					'1111111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000100000000011',
					'1111111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000100000000111',
					'1111111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000100000001111',
					'1111111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000100000011111',
					'1111111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000100001111111',
					'1111111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000100011111111',
					'1111111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000100111111111',
					'1111111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000101111111111',
					'1111111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000111111111111'
				];

				var owner:ContactNodeInterface = ContactNodeFactory.createDummy(ownerIdStr);

				routingTable = new RoutingTable(configStub, appQuitHandlerStub, owner.getId(), bucketFactory, bucketStore, contactNodeFactory, {
					onOpenCallback: function () {
						createContactNodesFromIds(routingTable, ids, 0, function () {

							routingTable.getRandomContactNodesFromBucket(11, 20, function (err, contacts:ContactNodeListInterface) {
								(err === null).should.be.true;

								contacts.should.have.a.lengthOf(10);

								for (var i = 0; i < contacts.length; i++) {
									var contact:ContactNodeInterface = contacts[i];
									var id:string = contact.getId().toBitString();

									ids.indexOf(id).should.be.greaterThan(-1);
								}

								done();
							});
						});
					}
				});
			});

			it('should correctly return `amount` random contact nodes', function (done) {
				var routingTable:RoutingTableInterface;
				var ownerIdStr:string;
				var ids:Array<string>;

				ownerIdStr = '1111111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000000000000000';

				ids = [
					'1111111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111100000000000000001',
					'1111111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111100000000000000011',
					'1111111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111100000000000000111',
					'1111111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111100000000000001111',
					'1111111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111100000000000011111',
					'1111111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111100000000001111111',
					'1111111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111100000000011111111',
					'1111111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111100000000111111111',
					'1111111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111100000001111111111',
					'1111111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111100000011111111111',
					'1111111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111100000111111111111',
					'1111111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111100001111111111111',
					'1111111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111100011111111111111',
					'1111111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111100111111111111111',
					'1111111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111101111111111111111',
				];

				var owner:ContactNodeInterface = ContactNodeFactory.createDummy(ownerIdStr);

				routingTable = new RoutingTable(configStub, appQuitHandlerStub, owner.getId(), bucketFactory, bucketStore, contactNodeFactory, {
					onOpenCallback: function () {
						createContactNodesFromIds(routingTable, ids, 0, function () {

							routingTable.getRandomContactNodesFromBucket(16, 10, function (err, contacts:ContactNodeListInterface) {
								var usedIds = [];
								(err === null).should.be.true;

								contacts.should.have.a.lengthOf(10);

								for (var i = 0; i < contacts.length; i++) {
									var contact:ContactNodeInterface = contacts[i];
									var id:string = contact.getId().toBitString();

									ids.indexOf(id).should.be.greaterThan(-1);
									usedIds.indexOf(id).should.equal(-1);

									usedIds.push(id);
								}

								done();
							});
						});
					}
				});
			});
		});

		describe('should correctly return the closest contact nodes', function () {
			var targetNode:ContactNodeInterface;

			beforeEach(function () {
				targetNode = ContactNodeFactory.createDummy();
			});

			afterEach(function () {
				targetNode = null;

				testUtils.deleteFolderRecursive(databasePath);
			});

			it('should correctly exclude the exclude id', function (done) {
				var routingTable:RoutingTableInterface;
				var excludeContactNode:ContactNodeInterface = ContactNodeFactory.createDummy();

				routingTable = new RoutingTable(configStub, appQuitHandlerStub, me.getId(), bucketFactory, bucketStore, contactNodeFactory);

				routingTable.updateContactNode(excludeContactNode, function () {
					createContactNodes(routingTable, 10, function () {
						routingTable.getClosestContactNodes(targetNode.getId(), excludeContactNode.getId(), function (err:Error, contacts:ContactNodeListInterface) {
							for (var i in contacts) {
								var contact:ContactNodeInterface = contacts[i];

								excludeContactNode.getId().equals(contact.getId()).should.be.false;
							}

							closeRtAndDone(routingTable, done);
						});
					});
				});
			});

			it('should correctly limit the return value to k contact nodes', function (done) {
				var routingTable:RoutingTableInterface;

				routingTable = new RoutingTable(configStub, appQuitHandlerStub, me.getId(), bucketFactory, bucketStore, contactNodeFactory);

				createContactNodes(routingTable, 100, function () {
					routingTable.getClosestContactNodes(targetNode.getId(), null, function (err:Error, contacts:ContactNodeListInterface) {
						contacts.length.should.equal(topologyK);

						closeRtAndDone(routingTable, done);
					});
				});
			});

			it('should correctly return all contact nodes', function (done) {
				var routingTable:RoutingTableInterface;

				routingTable = new RoutingTable(configStub, appQuitHandlerStub, me.getId(), bucketFactory, bucketStore, contactNodeFactory);

				createContactNodes(routingTable, 10, function () {
					routingTable.getClosestContactNodes(targetNode.getId(), null, function (err:Error, contacts:ContactNodeListInterface) {
						contacts.length.should.equal(10);

						closeRtAndDone(routingTable, done);
					});
				});
			});

			it('should correctly return the contact nodes in sorted order', function (done) {
				var routingTable:RoutingTableInterface;
				var ownerIdStr:string;
				var targetIdStr:string;
				var ids:Array<string>;
				var customTopologyK:number = 5;
				var customConfigStub = testUtils.stubPublicApi(sandbox, ObjectConfig, {
					get: function (key:string) {
						key = key.toLowerCase();

						if (key === 'topology.bitlength') {
							return topologyBitLength;
						}
						else if (key === 'topology.k') {
							return customTopologyK;
						}
					}
				});

				ownerIdStr = '1111111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000000000000000';
				targetIdStr = '0111111111111111100000000000000000000000000111111111111111100000000000000000000000000111111111111111100000000000000000000000000000000000000000000000000000000000';

				ids = [
					'1111111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000000000000001',
					'1111111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000000000000011',
					'1111111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000000000000111',
					'1111111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000000000001111',
					'1111111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000000000011111',
					'1111111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000000001111111',
					'1111111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000000011111111',
					'1111111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000000111111111',
					'1111111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000001111111111',
					'1111111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000000000000000000000000011111111111111110000011111111111'
				];

				var owner:ContactNodeInterface = ContactNodeFactory.createDummy(ownerIdStr);
				var customTargetNode:ContactNodeInterface = ContactNodeFactory.createDummy(targetIdStr);

				routingTable = new RoutingTable(customConfigStub, appQuitHandlerStub, owner.getId(), bucketFactory, bucketStore, contactNodeFactory, {
					onOpenCallback: function () {
						createContactNodesFromIds(routingTable, ids, 0, function () {
							routingTable.getClosestContactNodes(customTargetNode.getId(), null, function (err:Error, contacts:ContactNodeListInterface) {
								var lastDistance:Buffer = null;

								contacts.length.should.equal(customTopologyK);

								for (var i in contacts) {
									var contact:ContactNodeInterface = contacts[i];

									contact.getId().toBitString().should.equal(ids[i]);

									if (lastDistance !== null) {
										var isGreater:boolean = customTargetNode.getId().distanceTo(contact.getId()) > lastDistance;

										isGreater.should.be.true;
									}
									else {
										lastDistance = customTargetNode.getId().distanceTo(contact.getId());
									}
								}

								lastDistance = null;

								closeRtAndDone(routingTable, done);
							});
						});
					}
				});
			});
		});
	});
});