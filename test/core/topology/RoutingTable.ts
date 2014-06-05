/// <reference path='../../test.d.ts' />

require('should');

import sinon = require('sinon');
import testUtils = require('../../utils/testUtils');

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
	});

	it('should correctly instantiate RoutingTable without error', function () {
		var routingTable:RoutingTableInterface;

		routingTable = new RoutingTable(configStub, me.getId(), bucketFactoryStub, bucketStoreStub, contactNodeFactoryStub);
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
			closeOnProcessExit: false,
			onCloseCallback   : function () {
				onClose();
				checkDone();
			},
			onOpenCallback    : function () {
				onOpen();
				checkDone();
			}
		};

		routingTable = (new RoutingTable(configStub, me.getId(), bucketFactoryStub, bucketStoreStub, contactNodeFactoryStub, opts));
		routingTable.close();
	});

	it('should correctly create topology.bitLength buckets', function (done) {
		var routingTable:RoutingTableInterface;
		var opts:RoutingTableOptions = {
			closeOnProcessExit: false,
			onOpenCallback    : function () {
				bucketFactoryStub.create.callCount.should.equal(topologyBitLength);

				closeRtAndDone(routingTable, done);
			}
		};

		routingTable = new RoutingTable(configStub, me.getId(), bucketFactoryStub, bucketStoreStub, contactNodeFactoryStub, opts);
	});

	it('should correctly call the internal close method', function (done) {
		var routingTable:RoutingTableInterface;
		var opts:RoutingTableOptions = {
			closeOnProcessExit: false,
			onCloseCallback   : function () {
				if (bucketStub.close.callCount === topologyBitLength) {
					done();
				}
			}
		};

		routingTable = new RoutingTable(configStub, me.getId(), bucketFactoryStub, bucketStoreStub, contactNodeFactoryStub, opts);
		routingTable.close();
	});

	it('should correctly return the isOpen value', function (done) {
		var routingTable:RoutingTableInterface;

		routingTable = new RoutingTable(configStub, me.getId(), bucketFactoryStub, bucketStoreStub, contactNodeFactoryStub, {
			closeOnProcessExit: false
		});
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
			size : function (callback) {
				var bucketSize:number = 10;

				size += bucketSize;

				callback(null, bucketSize);
			}
		});

		routingTable = new RoutingTable(configStub, me.getId(), bucketFactoryStub, bucketStoreStub, contactNodeFactoryStub, {
			closeOnProcessExit: false
		});

		routingTable.getAllContactNodesSize(function(err:Error, size:number) {
			size.should.equal(topologyBitLength * 10);
			bucketStub.size.callCount.should.equal(topologyBitLength);

			done();
		});
	});

	it('should correctly call the internal bucket.get method', function (done) {
		var routingTable:RoutingTableInterface;
		var contact:ContactNodeInterface = ContactNodeFactory.createDummy();

		routingTable = new RoutingTable(configStub, me.getId(), bucketFactoryStub, bucketStoreStub, contactNodeFactoryStub, {
			closeOnProcessExit: false
		});

		routingTable.getContactNode(contact.getId(), function (err:Error, contact:ContactNodeInterface) {
			bucketStub.get.calledOnce.should.be.true;

			closeRtAndDone(routingTable, done);
		});
	});

	it('should correctly call th internal bucket.update method', function (done) {
		var routingTable:RoutingTableInterface;
		var contact:ContactNodeInterface = ContactNodeFactory.createDummy();

		routingTable = new RoutingTable(configStub, me.getId(), bucketFactoryStub, bucketStoreStub, contactNodeFactoryStub, {
			closeOnProcessExit: false
		});

		routingTable.updateContactNode(contact, function (err:Error, longestNotSeenContact:ContactNodeInterface) {
			bucketStub.update.calledOnce.should.be.true;

			closeRtAndDone(routingTable, done);
		});
	});

	describe('should correctly throw an error whenever you are looking for the owner Id', function () {
		var routingTable:RoutingTableInterface;

		beforeEach(function () {
			routingTable = new RoutingTable(configStub, me.getId(), bucketFactoryStub, bucketStoreStub, contactNodeFactoryStub);
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

				routingTable = new RoutingTable(configStub, owner.getId(), bucketFactory, bucketStore, contactNodeFactory, {
					closeOnProcessExit: false,
					onOpenCallback    : function () {
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

				routingTable = new RoutingTable(configStub, me.getId(), bucketFactory, bucketStore, contactNodeFactory, {
					closeOnProcessExit: false
				});

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

		describe('should correctly return a random contact node', function () {

			it('should not fail if the buckets are empty', function (done) {
				var routingTable:RoutingTableInterface;

				routingTable = new RoutingTable(configStub, me.getId(), bucketFactory, bucketStore, contactNodeFactory, {
					closeOnProcessExit: false,
					onOpenCallback    : function () {

						routingTable.getRandomContactNode(function (err:Error, contact:ContactNodeInterface) {
							(err === null).should.be.true;
							(contact === null).should.be.true;

							closeRtAndDone(routingTable, done);
						});
					}
				});
			});

			it ('should correctly return a random contact node', function (done) {
				var routingTable:RoutingTableInterface;

				routingTable = new RoutingTable(configStub, me.getId(), bucketFactory, bucketStore, contactNodeFactory, {
					closeOnProcessExit: false,
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

				routingTable = new RoutingTable(configStub, me.getId(), bucketFactory, bucketStore, contactNodeFactory, {
					closeOnProcessExit: false
				});

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

				routingTable = new RoutingTable(configStub, me.getId(), bucketFactory, bucketStore, contactNodeFactory, {
					closeOnProcessExit: false
				});

				createContactNodes(routingTable, 100, function () {
					routingTable.getClosestContactNodes(targetNode.getId(), null, function (err:Error, contacts:ContactNodeListInterface) {
						contacts.length.should.equal(topologyK);

						closeRtAndDone(routingTable, done);
					});
				});
			});

			it('should correctly return all contact nodes', function (done) {
				var routingTable:RoutingTableInterface;

				routingTable = new RoutingTable(configStub, me.getId(), bucketFactory, bucketStore, contactNodeFactory, {
					closeOnProcessExit: false
				});

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
				var createContactNodesFromIds = function (ids:Array<string>, index:number, callback:Function) {
					var contact:ContactNodeInterface = ContactNodeFactory.createDummy(ids[index]);

					routingTable.updateContactNode(contact, function (err:Error) {
						if (!err) {
							if (index < ids.length - 1) {
								createContactNodesFromIds(ids, ++index, callback);
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

				routingTable = new RoutingTable(customConfigStub, owner.getId(), bucketFactory, bucketStore, contactNodeFactory, {
					closeOnProcessExit: false
				});

				createContactNodesFromIds(ids, 0, function () {
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
			});
		});
	});
});