/// <reference path='../../test.d.ts' />
require('should');

var testUtils = require('../../utils/testUtils');

var ObjectBucketStore = require('../../../src/core/topology/ObjectBucketStore');
var ContactNodeFactory = require('../../../src/core/topology/ContactNodeFactory');

describe('CORE --> TOPOLOGY --> ObjectBucketStore @current', function () {
    var store = null;
    var databasePath = testUtils.getFixturePath('core/topology/bucketstore/db');

    var cleanAddresses = function (addresses) {
        var a = [];
        for (var i = 0, l = addresses.length; i < l; i++) {
            a.push({ _ip: addresses[i]._ip, _port: addresses[i]._port });
        }

        return a;
    };

    beforeEach(function () {
        testUtils.createFolder(databasePath);
        store = new ObjectBucketStore('objectBucketStore', databasePath, 0.01);
    });

    afterEach(function (done) {
        // close the database
        store.close();
        store = null;
        setTimeout(function () {
            testUtils.deleteFolderRecursive(databasePath);
            done();
        }, 50);
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

    it('should add an object, persist it, and load it in a fresh store', function (done) {
        store.close();
        var contact = ContactNodeFactory.createDummy();
        store.add('foobar', contact.getId().getBuffer(), contact.getLastSeen(), contact.getAddresses());

        setTimeout(function () {
            var anotherStore = new ObjectBucketStore('objectBucketStore', databasePath, 0.01);

            var exist = anotherStore.get('foobar', contact.getId().getBuffer());
            (exist == null).should.be.false;
            exist.lastSeen.should.equal(contact.getLastSeen());
            (new Buffer(exist.id)).toString('hex').should.equal(contact.getId().getBuffer().toString('hex'));
            done();
        }, 50);
    });

    it('should correctly return if the specified bucket contains the id', function () {
        var contact1 = ContactNodeFactory.createDummy();
        var contact2 = ContactNodeFactory.createDummy();

        store.add('bucket1', contact1.getId().getBuffer(), contact1.getLastSeen(), contact1.getAddresses());
        store.contains('bucket1', contact1.getId().getBuffer()).should.be.true;

        store.contains('bucket1', contact2.getId().getBuffer()).should.equal(contact1.getId().equals(contact2.getId()));
    });

    it('should return the correct object stored for the specific bucket/id combination', function () {
        var contact = ContactNodeFactory.createDummy();
        var contactJSON = JSON.stringify({
            addresses: cleanAddresses(contact.getAddresses()),
            id: contact.getId().getBuffer(),
            lastSeen: contact.getLastSeen()
        });

        store.add('bucket1', contact.getId().getBuffer(), contact.getLastSeen(), contact.getAddresses());
        JSON.stringify(store.get('bucket1', contact.getId().getBuffer())).should.equal(contactJSON);
    });

    it('should correctly return all items stored in a specified bucket sorted by lastSeen (most recent first)', function () {
        var contacts = [];
        var amount = 10;

        for (var i = 0; i < amount; i++) {
            var contact = ContactNodeFactory.createDummy();

            contacts.push(contact);
        }

        // add items
        store.addAll('bucket1', contacts);

        var all = store.getAll('bucket1');
        var lastTimestamp = 0;
        var gotAmount = 0;

        for (var i in all.reverse()) {
            var lastSeen = all[i].lastSeen;

            lastSeen.should.be.greaterThan(lastTimestamp);

            lastTimestamp = lastSeen;
            gotAmount++;
        }

        gotAmount.should.be.equal(amount);
    });

    it('should correctly return the contact node which was not seen for the longest time', function () {
        var contacts = [];
        var amount = 10;

        for (var i = 0; i < amount; i++) {
            var contact = ContactNodeFactory.createDummy();
            contacts.push(contact);
        }

        // add items
        store.addAll('bucket1', contacts);

        var lastSeenObject = store.getLongestNotSeen('bucket1');

        lastSeenObject.lastSeen.should.equal(contacts[0].getLastSeen());
    });

    it('should correctly return a random item for the specified bucket key', function () {
        var contacts = [];
        var amount = 10;

        for (var i = 0; i < amount; i++) {
            var contact = ContactNodeFactory.createDummy();
            contacts.push(contact);
        }

        // add items
        store.addAll('bucket1', contacts);

        var randomObject = store.getRandom('bucket1');
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
        var contact1 = ContactNodeFactory.createDummy();
        var contact2 = ContactNodeFactory.createDummy();
        var contact3 = ContactNodeFactory.createDummy();

        store.addAll('bucket1', [contact1, contact2, contact3]); //
        store.contains('bucket1', contact1.getId().getBuffer()).should.be.true;
        store.contains('bucket1', contact2.getId().getBuffer()).should.be.true;
        store.contains('bucket1', contact3.getId().getBuffer()).should.be.true;
        store.size('bucket1').should.equal(3);
    });

    it('should correctly remove an item from the database even if it does not exists', function () {
        var contact = ContactNodeFactory.createDummy();

        store.add('bucket1', contact.getId().getBuffer(), contact.getLastSeen(), contact.getAddresses());
        store.remove('bucket1', contact.getId().getBuffer());

        store.remove('randomBucket', contact.getId().getBuffer());

        //store.size('bucket1').should.equal(0);
        (null === store.get('bucket1', contact.getId().getBuffer())).should.be.true;
    });

    it('should return the correct size items stored under the given bucket key', function () {
        var contact = ContactNodeFactory.createDummy();

        store.add('bucket1', contact.getId().getBuffer(), contact.getLastSeen(), contact.getAddresses());
        store.size('bucket1').should.equal(1);

        store.size('bucket0').should.equal(0);
    });
});
//# sourceMappingURL=ObjectBucketStore.js.map
