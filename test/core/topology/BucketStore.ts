/// <reference path='../../test.d.ts' />

require('should');

var fs = require('fs');
var path = require('path');

import Id = require('../../../src/core/topology/Id');
import BucketStore = require('../../../src/core/topology/BucketStore');

describe('CORE --> TOPOLOGY --> BUCKETSTORE', function () {
	/** @see http://www.geedew.com/2012/10/24/remove-a-directory-that-is-not-empty-in-nodejs/ */
	var deleteFolderRecursive = function (path) {
			if (fs.existsSync(path)) {
				fs.readdirSync(path).forEach(function (file, index) {
					var curPath = path + '/' + file;
					if (fs.lstatSync(curPath).isDirectory()) { // recurse
						deleteFolderRecursive(curPath);
					} else { // delete file
						fs.unlinkSync(curPath);
					}
				});

				fs.rmdirSync(path);
			}
		},
		getId = function ():DistanceMetric {
			var max:number = 48,
				getRandomIdString = function ():string {
					var str = '';

					for (var i = max; i--;) {
						str += (Math.round(Math.random())).toString();
					}

					return str;
				};

			return new Id(Id.byteBufferByBitString(getRandomIdString(), 6), max);
		},
		getLastSeen = function ():number {
			// node js is to fast for a regular Date.now()
			return Math.round(Date.now() * Math.random());
		},
		getAddresses = function ():any {
			return ['address'];
		},
		getPublicKey = function ():string {
			return 'publicKey';
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
	})

	it('should correctly instantiate BucketStore without error', function () {
		store.should.be.a.instanceof(BucketStore);

		store.open();
		store.isOpen().should.be.true;
	});

	// just for coverage
	it ('should debug the database', function () {
		store.debug();
	});

	it ('should close the bucket store correctly', function () {
		store.close();
		store.close();
		store.isOpen().should.be.false;
	});

	it ('should correctly return if the specified bucket contains the id', function () {
		var id1:DistanceMetric = getId(),
			id2:DistanceMetric = getId();

		store.add('bucket1', id1, getLastSeen(), getAddresses(), getPublicKey());
		store.contains('bucket1', id1).should.be.true;

		store.contains('bucket1', getId()).should.equal(id1.equals(id2));
	});

	it ('should return the correct object stored for the specific bucket/id combination', function () {
		var contact = {
				addresses: getAddresses(),
				id: getId(),
				lastSeen: getLastSeen(),
				publicKey: getPublicKey()
			};

		store.add('bucket1', contact.id, contact.lastSeen, contact.addresses, contact.publicKey);
		store.get('bucket1', contact.id).should.equal(JSON.stringify(contact));
	});

	it ('should add multiple contacts at once', function () {
		var getContact = function () {
			return {
				addresses: getAddresses(),
				id: getId(),
				lastSeen: getLastSeen(),
				publicKey: getPublicKey()
			};
		};

		var contact1 = getContact(),
			contact2 = getContact(),
			contact3 = getContact();

		store.addAll('bucket1', [contact1, contact2, contact3]); //
		store.size('bucket1').should.equal(3);
		store.contains('bucket1', contact1.id).should.be.true;
		store.contains('bucket1', contact2.id).should.be.true;
		store.contains('bucket1', contact3.id).should.be.true;
	});

	it ('should correctly remove an item from the database even if it does not exists', function () {
		var id:DistanceMetric = getId();

		store.add('bucket1', id, getLastSeen(), getAddresses(), getPublicKey());
		store.remove('bucket1', id);

		store.remove('randomBucket', getId());
		//store.size('bucket1').should.equal(0);
		(null === store.get('bucket1', id)).should.be.true;
	});

	it ('should return the correct size items stored under the given bucket key', function () {
		var id:DistanceMetric = getId();

		store.add('bucket1', id, getLastSeen(), getAddresses(), getPublicKey());
		store.size('bucket1').should.equal(1);

		store.size('bucket0').should.equal(0);
	});

});