/// <reference path='../../../test.d.ts' />
var sinon = require('sinon');
var testUtils = require('../../../utils/testUtils');

var FolderWatcherManager = require('../../../../src/core/fs/FolderWatcherManager');
var UiFolderWatcherManagerComponent = require('../../../../src/core/ui/folder/UiFolderWatcherManagerComponent');

describe('CORE --> UI --> FOLDER --> UiFolderWatcherManagerComponent @joern', function () {
    var sandbox;
    var component;
    var eventListeners;
    var folderWatcherManagerStub;
    var sparkStub;

    beforeEach(function () {
        sandbox = sinon.sandbox.create();
        eventListeners = {};
        folderWatcherManagerStub = testUtils.stubPublicApi(sandbox, FolderWatcherManager, {
            on: function (eventName, callback) {
                if (eventListeners[eventName]) {
                    throw new Error('Already added a listener to: ' + eventName);
                }

                eventListeners[eventName] = callback;
            }
        });

        sparkStub = {
            send: sandbox.spy()
        };
        component = new UiFolderWatcherManagerComponent(folderWatcherManagerStub);
    });

    afterEach(function () {
        sandbox.restore();
        component = null;
        folderWatcherManagerStub = null;
        eventListeners = null;
        sparkStub = null;
    });

    it('should correctly instantiate without error', function () {
        component.should.be.an.instanceof(UiFolderWatcherManagerComponent);
    });

    it('should correctly listen for FolderWatcherManager events', function () {
        var eventNames = ['watcher.add', 'watcher.invalid', 'watcher.remove', 'add', 'unlink'];
        var listenerNames = Object.keys(eventListeners);

        for (var i in listenerNames) {
            eventNames.indexOf(listenerNames[i]).should.be.greaterThan(-1);
        }
    });

    it('should correctly return the channel name', function () {
        component.getChannelName().should.equal('folder');
    });

    it('should correctly send a new folder to the ui', function () {
        // add a client connection
        component.onConnection(sparkStub);

        // add a new folder
        eventListeners['watcher.add']('/path/to/the/Folder Name');

        sparkStub.send.calledOnce.should.be.true;

        // check message key
        sparkStub.send.getCall(0).args[0].should.equal('update');

        // check folder list
        sparkStub.send.getCall(0).args[1].length.should.equal(1);
        sparkStub.send.getCall(0).args[1][0].should.containDeep({
            items: 0,
            name: 'Folder Name',
            path: '/path/to/the/Folder Name',
            status: 'active'
        });
    });

    it('should correctly remove a folder from the ui', function () {
        // add a client connection
        component.onConnection(sparkStub);

        // add a new folder
        eventListeners['watcher.add']('/path/to/the/Folder Name');
        eventListeners['watcher.remove']('/path/to/the/Folder Name');

        sparkStub.send.calledTwice.should.be.true;

        // check message key
        sparkStub.send.getCall(1).args[0].should.equal('update');

        // check folders list
        sparkStub.send.getCall(1).args[1].length.should.equal(0);
    });

    it('should correctly set the folder status', function () {
        // add a client connection
        component.onConnection(sparkStub);

        eventListeners['watcher.add']('/path/to/the/Folder Name');
        eventListeners['watcher.invalid']('/path/to/the/Folder Name');

        sparkStub.send.calledTwice.should.be.true;

        // check folder status
        sparkStub.send.getCall(0).args[1][0].should.containDeep({
            items: 0,
            name: 'Folder Name',
            path: '/path/to/the/Folder Name',
            status: 'invalid'
        });
    });

    it('should correctly increment the item count', function () {
        // add a client connection
        component.onConnection(sparkStub);

        // add folder
        eventListeners['watcher.add']('/path/to/the/folder');
        eventListeners['watcher.add']('/path/to/the/folder2/sub/folder');
        eventListeners['watcher.add']('/path/to');

        // add item to the folder
        eventListeners['add']('/path/to/the/folder/foo/bar.txt');

        var folders = sparkStub.send.getCall(3).args[1];
        for (var i in folders) {
            var folder = folders[i];

            if (folder.path === '/path/to/the/folder') {
                folder.items.should.equal(1);
            } else {
                folder.items.should.equal(0);
            }
        }
    });

    it('should correctly decrement the item count', function () {
        // add a client connection
        component.onConnection(sparkStub);

        // add folder
        eventListeners['watcher.add']('/path/to/the/folder');
        eventListeners['watcher.add']('/path/to/the/folder2/sub/folder');
        eventListeners['watcher.add']('/path/to');

        // add item to the folder
        eventListeners['add']('/path/to/the/folder/foo/bar.txt');
        eventListeners['unlink']('/path/to/the/folder/foo/bar.txt');

        var folders = sparkStub.send.getCall(3).args[1];
        for (var i in folders) {
            folders[i].items.should.equal(0);
        }
    });
});
//# sourceMappingURL=UiFolderWatcherManagerComponent.js.map
