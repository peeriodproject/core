/// <reference path='../../test.d.ts' />

require('should');

import testUtils = require('../../utils/testUtils');

import BucketStoreInterface = require('../../../src/core/topology/interfaces/BucketStoreInterface');
import ContactNodeInterface = require('../../../src/core/topology/interfaces/ContactNodeInterface');
import ContactNodeListInterface = require('../../../src/core/topology/interfaces/ContactNodeListInterface');
import ContactNodeObjectInterface = require('../../../src/core/topology/interfaces/ContactNodeObjectInterface');
import ContactNodeObjectListInterface = require('../../../src/core/topology/interfaces/ContactNodeObjectListInterface');

import Id = require('../../../src/core/topology/Id');
import BucketStore = require('../../../src/core/topology/BucketStore');
import ContactNodeFactory = require('../../../src/core/topology/ContactNodeFactory');

describe('CORE --> TOPOLOGY --> BucketStore', function () {
	var databasePath:string = testUtils.getFixturePath('core/topology/bucketstore/db');
	var store:BucketStoreInterface = null;

	beforeEach(function () {
		testUtils.createFolder(databasePath);
		store = new BucketStore('name', databasePath);

	});

	afterEach(function () {
		// close the database
		store.close();
		store = null;

		// remove the temporary database folder
		testUtils.deleteFolderRecursive(databasePath);
	});

	it('should correctly instantiate BucketStore without error', function () {
		store.should.be.a.instanceof(BucketStore);

		store.open();
		store.isOpen().should.be.true;
	});

	it('should close the bucket store correctly', function () {
		store.close();
		store.close();
		store.isOpen().should.be.false;
	});

	it('should correctly return if the specified bucket contains the id', function () {
		var contact1:ContactNodeInterface = ContactNodeFactory.createDummy();
		var contact2:ContactNodeInterface = ContactNodeFactory.createDummy();

		store.add('bucket1', contact1.getId().getBuffer(), contact1.getLastSeen(), contact1.getAddresses());
		store.contains('bucket1', contact1.getId().getBuffer()).should.be.true;

		store.contains('bucket1', contact2.getId().getBuffer()).should.equal(contact1.getId().equals(contact2.getId()));
	});

	it('should return the correct object stored for the specific bucket/id combination', function () {
		var contact:ContactNodeInterface = ContactNodeFactory.createDummy();
		var contactJSON = JSON.stringify({
			addresses: contact.getAddresses(),
			id       : contact.getId().getBuffer(),
			lastSeen : contact.getLastSeen()
		});

		store.add('bucket1', contact.getId().getBuffer(), contact.getLastSeen(), contact.getAddresses());
		JSON.stringify(store.get('bucket1', contact.getId().getBuffer())).should.equal(contactJSON);
	});

	it ('should correctly return all items stored in a specified bucket sorted by lastSeen', function () {
		var contacts:any = [];
		var amount:number = 10;

		for (var i = 0; i < amount; i++) {
			var contact:ContactNodeInterface = ContactNodeFactory.createDummy();

			contacts.push(contact);
		}

		// add items
		store.addAll('bucket1', contacts);

		var all:ContactNodeObjectListInterface = store.getAll('bucket1');
		var lastTimestamp:number = 0;
		var gotAmount:number = 0;

		for (var i in all) {
			var lastSeen = all[i].lastSeen;

			lastSeen.should.be.greaterThan(lastTimestamp);

			lastTimestamp = lastSeen;
			gotAmount++;
		}

		gotAmount.should.be.equal(amount);
	});

	it ('should correctly return the contact node which was not seen for the longest time', function () {
		var contacts:ContactNodeListInterface = [];
		var amount:number = 10;

		for (var i = 0; i < amount; i++) {
			var contact:ContactNodeInterface = ContactNodeFactory.createDummy();
			contacts.push(contact);
		}

		// add items
		store.addAll('bucket1', contacts);

		var lastSeenObject:ContactNodeObjectInterface = store.getLongestNotSeen('bucket1');

		lastSeenObject.lastSeen.should.equal(contacts[9].getLastSeen());
	});

	it ('should correctly return a random item for the specified bucket key @joern', function () {
		var contacts:ContactNodeListInterface = [];
		var amount:number = 10;

		for (var i = 0; i < amount; i++) {
			var contact:ContactNodeInterface = ContactNodeFactory.createDummy();
			contacts.push(contact);
		}

		// add items
		store.addAll('bucket1', contacts);

		var randomObject:ContactNodeObjectInterface = store.getRandom('bucket1');
		var found = false;

		for (var i in contacts) {
			if (contacts[i].getLastSeen() === randomObject.lastSeen) {
				found = true;
				break;
			}
		}

		found.should.be.true;
	});

	it('should add multiple contacts at once', function () {
		var contact1:ContactNodeInterface = ContactNodeFactory.createDummy();
		var contact2:ContactNodeInterface = ContactNodeFactory.createDummy();
		var contact3:ContactNodeInterface = ContactNodeFactory.createDummy();

		store.addAll('bucket1', [contact1, contact2, contact3]); //
		store.contains('bucket1', contact1.getId().getBuffer()).should.be.true;
		store.contains('bucket1', contact2.getId().getBuffer()).should.be.true;
		store.contains('bucket1', contact3.getId().getBuffer()).should.be.true;
		store.size('bucket1').should.equal(3);
	});

	it('should correctly remove an item from the database even if it does not exists', function () {
		var contact:ContactNodeInterface = ContactNodeFactory.createDummy();

		store.add('bucket1', contact.getId().getBuffer(), contact.getLastSeen(), contact.getAddresses());
		store.remove('bucket1', contact.getId().getBuffer());

		store.remove('randomBucket', contact.getId().getBuffer());
		//store.size('bucket1').should.equal(0);
		(null === store.get('bucket1', contact.getId().getBuffer())).should.be.true;
	});

	it('should return the correct size items stored under the given bucket key', function () {
		var contact:ContactNodeInterface = ContactNodeFactory.createDummy();

		store.add('bucket1', contact.getId().getBuffer(), contact.getLastSeen(), contact.getAddresses());
		store.size('bucket1').should.equal(1);

		store.size('bucket0').should.equal(0);
	});

});