/// <reference path='../../test.d.ts' />

require('should');

var fs = require('fs');
var path = require('path');

import Id = require('../../../src/core/topology/Id');
import BucketStore = require('../../../src/core/topology/BucketStore');
import BucketStoreInterface = require('../../../src/core/topology/interfaces/BucketStoreInterface');
import ContactNodeFactory = require('../../../src/core/topology/ContactNodeFactory');
import ContactNodeInterface = require('../../../src/core/topology/interfaces/ContactNodeInterface');

describe('CORE --> TOPOLOGY --> BUCKETSTORE', function () {
	/** @see http://www.geedew.com/2012/10/24/remove-a-directory-that-is-not-empty-in-nodejs/ */
	var deleteFolderRecursive = function (path) {
		if (fs.existsSync(path)) {
			fs.readdirSync(path).forEach(function (file, index) {
				var curPath = path + '/' + file;
				if (fs.lstatSync(curPath).isDirectory()) { // recurse
					deleteFolderRecursive(curPath);
				}
				else { // delete file
					fs.unlinkSync(curPath);
				}
			});

			fs.rmdirSync(path);
		}
	},
	databasePath:string = path.join(process.cwd(), 'test/fixtures/core/topology/bucketstore/db'),
	store:BucketStoreInterface = null;

	beforeEach(function () {
		// create the temporary database folder
		if (!fs.existsSync(databasePath)) {
			fs.mkdirSync(databasePath);
		}

		store = new BucketStore('name', databasePath);

	});

	afterEach(function () {
		// close the database
		store.close();
		store = null;

		// remove the temporary database folder
		deleteFolderRecursive(databasePath);
	});

	it('should correctly instantiate BucketStore without error', function () {
		store.should.be.a.instanceof(BucketStore);

		store.open();
		store.isOpen().should.be.true;
	});

	// just for coverage
	it('should debug the database', function () {
		store.debug();
	});

	it('should close the bucket store correctly', function () {
		store.close();
		store.close();
		store.isOpen().should.be.false;
	});

	it('should correctly return if the specified bucket contains the id', function () {
		var contact1:ContactNodeInterface = ContactNodeFactory.createDummy();
		var contact2:ContactNodeInterface = ContactNodeFactory.createDummy();

		store.add('bucket1', contact1.getId(), contact1.getLastSeen(), contact1.getAddresses(), contact1.getPublicKey());
		store.contains('bucket1', contact1.getId()).should.be.true;

		store.contains('bucket1', contact2.getId()).should.equal(contact1.getId().equals(contact2.getId()));
	});

	it('should return the correct object stored for the specific bucket/id combination', function () {
		var contact:ContactNodeInterface = ContactNodeFactory.createDummy();
		var contactJSON = JSON.stringify({
			addresses: contact.getAddresses(),
			id       : contact.getId(),
			lastSeen : contact.getLastSeen(),
			publicKey: contact.getPublicKey()
		});

		store.add('bucket1', contact.getId(), contact.getLastSeen(), contact.getAddresses(), contact.getPublicKey());
		store.get('bucket1', contact.getId()).should.equal(contactJSON);
	});

	it('should add multiple contacts at once', function () {
		var contact1:ContactNodeInterface = ContactNodeFactory.createDummy();
		var contact2:ContactNodeInterface = ContactNodeFactory.createDummy();
		var contact3:ContactNodeInterface = ContactNodeFactory.createDummy();

		store.addAll('bucket1', [contact1, contact2, contact3]); //
		store.contains('bucket1', contact1.getId()).should.be.true;
		store.contains('bucket1', contact2.getId()).should.be.true;
		store.contains('bucket1', contact3.getId()).should.be.true;
		store.size('bucket1').should.equal(3);
	});

	it('should correctly remove an item from the database even if it does not exists', function () {
		var contact:ContactNodeInterface = ContactNodeFactory.createDummy();

		store.add('bucket1', contact.getId(), contact.getLastSeen(), contact.getAddresses(), contact.getPublicKey());
		store.remove('bucket1', contact.getId());

		store.remove('randomBucket', contact.getId());
		//store.size('bucket1').should.equal(0);
		(null === store.get('bucket1', contact.getId())).should.be.true;
	});

	it('should return the correct size items stored under the given bucket key', function () {
		var contact:ContactNodeInterface = ContactNodeFactory.createDummy();

		store.add('bucket1', contact.getId(), contact.getLastSeen(), contact.getAddresses(), contact.getPublicKey());
		store.size('bucket1').should.equal(1);

		store.size('bucket0').should.equal(0);
	});

});