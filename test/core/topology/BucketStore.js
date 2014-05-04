/// <reference path='../../test.d.ts' />
require('should');

var fs = require('fs');
var path = require('path');

var BucketStore = require('../../../src/core/topology/BucketStore');

var ContactNodeFactory = require('../../../src/core/topology/ContactNodeFactory');

describe('CORE --> TOPOLOGY --> BUCKETSTORE', function () {
    /** @see http://www.geedew.com/2012/10/24/remove-a-directory-that-is-not-empty-in-nodejs/ */
    var deleteFolderRecursive = function (path) {
        if (fs.existsSync(path)) {
            fs.readdirSync(path).forEach(function (file, index) {
                var curPath = path + '/' + file;
                if (fs.lstatSync(curPath).isDirectory()) {
                    deleteFolderRecursive(curPath);
                } else {
                    fs.unlinkSync(curPath);
                }
            });

            fs.rmdirSync(path);
        }
    }, databasePath = path.join(process.cwd(), 'test/fixtures/core/topology/bucketstore/db'), store = null;

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
        var contact1 = ContactNodeFactory.createDummy();
        var contact2 = ContactNodeFactory.createDummy();

        store.add('bucket1', contact1.getId().getBuffer(), contact1.getLastSeen(), contact1.getAddresses());
        store.contains('bucket1', contact1.getId().getBuffer()).should.be.true;

        store.contains('bucket1', contact2.getId().getBuffer()).should.equal(contact1.getId().equals(contact2.getId()));
    });

    it('should return the correct object stored for the specific bucket/id combination', function () {
        var contact = ContactNodeFactory.createDummy();
        var contactJSON = JSON.stringify({
            addresses: contact.getAddresses(),
            id: contact.getId().getBuffer(),
            lastSeen: contact.getLastSeen()
        });

        store.add('bucket1', contact.getId().getBuffer(), contact.getLastSeen(), contact.getAddresses());
        store.get('bucket1', contact.getId().getBuffer()).should.equal(contactJSON);
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
//# sourceMappingURL=BucketStore.js.map
