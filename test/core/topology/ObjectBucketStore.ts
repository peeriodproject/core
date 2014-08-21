/// <reference path='../../test.d.ts' />

require('should');

import testUtils = require('../../utils/testUtils');

import BucketStoreInterface = require('../../../src/core/topology/interfaces/BucketStoreInterface');
import ContactNodeInterface = require('../../../src/core/topology/interfaces/ContactNodeInterface');
import ContactNodeListInterface = require('../../../src/core/topology/interfaces/ContactNodeListInterface');
import ContactNodeObjectInterface = require('../../../src/core/topology/interfaces/ContactNodeObjectInterface');
import ContactNodeObjectListInterface = require('../../../src/core/topology/interfaces/ContactNodeObjectListInterface');

import Id = require('../../../src/core/topology/Id');
import ObjectBucketStore = require('../../../src/core/topology/ObjectBucketStore');
import ContactNodeFactory = require('../../../src/core/topology/ContactNodeFactory');

describe('CORE --> TOPOLOGY --> ObjectBucketStore @current', function () {
	var store:BucketStoreInterface = null;

	var cleanAddresses = function (addresses:any) {
		var a = [];
		for (var i=0, l=addresses.length; i<l; i++) {
			a.push({_ip: addresses[i]._ip, _port: addresses[i]._port});
		}

		return a;
	}

	beforeEach(function () {
		store = new ObjectBucketStore();
	});

	afterEach(function () {
		// close the database
		store.close();
		store = null;

	});

	it('should correctly instantiate ObjectBucketStore without error', function () {
		store.should.be.a.instanceof(ObjectBucketStore);

		store.open();
		store.isOpen().should.be.true;
	});

	it('should close the bucket store correctly', function () {
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
			addresses: cleanAddresses(contact.getAddresses()),
			id       : contact.getId().getBuffer(),
			lastSeen : contact.getLastSeen()
		});

		store.add('bucket1', contact.getId().getBuffer(), contact.getLastSeen(), contact.getAddresses());
		JSON.stringify(store.get('bucket1', contact.getId().getBuffer())).should.equal(contactJSON);
	});

	it ('should correctly return all items stored in a specified bucket sorted by lastSeen (most recent first)', function () {
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

		for (var i in all.reverse()) {
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

		lastSeenObject.lastSeen.should.equal(contacts[0].getLastSeen());
	});

	it ('should correctly return a random item for the specified bucket key', function () {
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