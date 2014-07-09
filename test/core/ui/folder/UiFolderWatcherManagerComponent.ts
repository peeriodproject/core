/// <reference path='../../../test.d.ts' />

import should = require('should');

import sinon = require('sinon');
import testUtils = require('../../../utils/testUtils');

import FolderWatcherManager = require('../../../../src/core/fs/FolderWatcherManager');
import UiFolderWatcherManagerComponent = require('../../../../src/core/ui/folder/UiFolderWatcherManagerComponent');

describe('CORE --> UI --> FOLDER --> UiFolderWatcherManagerComponent', function () {
	var sandbox:SinonSandbox;
	var component:UiFolderWatcherManagerComponent;
	var eventListeners:{ [eventName:string]:Function };
	var folderWatcherManagerStub:any;

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

		component = new UiFolderWatcherManagerComponent(folderWatcherManagerStub);
	});

	afterEach(function () {
		sandbox.restore();
		component = null;
		folderWatcherManagerStub = null;
		eventListeners = null;
	});

	it('should correctly instantiate without error', function () {
		component.should.be.an.instanceof(UiFolderWatcherManagerComponent);
	});

	it('should correctly listen for FolderWatcherManager events', function () {
		var eventNames:Array<string> = ['watcher.add', 'watcher.invalid', 'watcher.remove', 'watcher.removeInvalid', 'add', 'unlink'];
		var listenerNames:Array<string> = Object.keys(eventListeners);

		for (var i in listenerNames) {
			eventNames.indexOf(listenerNames[i]).should.be.greaterThan(-1);
		}
	});

	it('should correctly return the channel name', function () {
		component.getChannelName().should.equal('folder');
	});

	it('should correctly return the event names', function () {
		component.getEventNames().should.containDeep(['addFolder', 'removeFolder', 'syncFolders']);
	});

	it('should correctly return the state', function () {
		var state = component.getState();

		state.should.be.an.instanceof(Array);
		state.length.should.equal(0);
	});

	it('should correctly send a new folder to the ui', function (done) {
		// add a new folder
		component.onUiUpdate(function () {
			component.getState().should.containDeep([{
				items : 0,
				name  : 'Folder Name',
				path  : '/path/to/the/Folder Name',
				status: 'active'
			}]);

			done();
		});

		eventListeners['watcher.add']('/path/to/the/Folder Name');
	});

	it('should correctly remove a folder from the ui', function () {
		var uiUpdateSpy = sandbox.spy();
		component.onUiUpdate(uiUpdateSpy);

		// add a new folder
		eventListeners['watcher.add']('/path/to/the/Folder Name');
		uiUpdateSpy.calledOnce.should.be.true;
		component.getState().should.have.a.lengthOf(1);


		eventListeners['watcher.remove']('/path/to/the/Folder Name');

		uiUpdateSpy.calledTwice.should.be.true;
		component.getState().should.have.a.lengthOf(0);
	});

	it('should correctly remove a invalid folder from the ui', function () {
		var uiUpdateSpy = sandbox.spy();
		component.onUiUpdate(uiUpdateSpy);

		// add a new folder
		eventListeners['watcher.invalid']('/path/to/the/Folder Name');
		eventListeners['watcher.removeInvalid']('/path/to/the/Folder Name');

		uiUpdateSpy.calledTwice.should.be.true;
		component.getState().should.have.a.lengthOf(0);
	});

	it('should correctly set the folder status', function () {
		var uiUpdateSpy = sandbox.spy();
		component.onUiUpdate(uiUpdateSpy);

		eventListeners['watcher.add']('/path/to/the/Folder Name');
		component.getState()[0].should.containDeep({
			items : 0,
			name  : 'Folder Name',
			path  : '/path/to/the/Folder Name',
			status: 'active'
		});

		eventListeners['watcher.invalid']('/path/to/the/Folder Name');
		uiUpdateSpy.calledTwice.should.be.true;
		component.getState()[0].should.containDeep({
			items : 0,
			name  : 'Folder Name',
			path  : '/path/to/the/Folder Name',
			status: 'invalid'
		});
	});

	it('should correctly increment the item count', function () {
		var uiUpdateSpy = sandbox.spy();
		component.onUiUpdate(uiUpdateSpy);

		// add folder
		eventListeners['watcher.add']('/path/to/the/folder');
		eventListeners['watcher.add']('/path/to/the/folder2/sub/folder');
		eventListeners['watcher.add']('/path/to');

		// add item to the folder
		eventListeners['add']('/path/to/the/folder/foo/bar.txt');

		uiUpdateSpy.callCount.should.equal(4);

		var state = component.getState();

		for (var i in state) {
			var folder = state[i];

			if (folder.path === '/path/to/the/folder') {
				folder.items.should.equal(1);
			}
			else {
				folder.items.should.equal(0);
			}
		}
	});

	it('should correctly decrement the item count', function () {
		var uiUpdateSpy = sandbox.spy();
		component.onUiUpdate(uiUpdateSpy);

		// add folder
		eventListeners['watcher.add']('/path/to/the/folder');
		eventListeners['watcher.add']('/path/to/the/folder2/sub/folder');
		eventListeners['watcher.add']('/path/to');

		// add item to the folder
		eventListeners['add']('/path/to/the/folder/foo/bar.txt');
		eventListeners['unlink']('/path/to/the/folder/foo/bar.txt');

		uiUpdateSpy.callCount.should.equal(5);

		var state = component.getState();
		for (var i in state) {
			state[i].items.should.equal(0);
		}
	});

	it ('should correctly call the FolderWatcherManager.addFolderWatcher method when the component recieves an "addFolder" event', function () {
		var newFolderPath:string = '/the/path/to/the/folder/to/add';

		component.emit('addFolder', newFolderPath);

		folderWatcherManagerStub.addFolderWatcher.calledOnce.should.be.true;
		folderWatcherManagerStub.addFolderWatcher.getCall(0).args[0].should.equal(newFolderPath);
	});

	it ('should correctly call the FolderWatcherManager.removeFolderWatcher method when the component receives an "removeFolder" event', function () {
		var newFolderPath:string = '/the/path/to/the/folder/to/remove';

		component.emit('removeFolder', newFolderPath);

		folderWatcherManagerStub.removeFolderWatcher.calledOnce.should.be.true;
		folderWatcherManagerStub.removeFolderWatcher.getCall(0).args[0].should.equal(newFolderPath);
	});

	it ('should correctly call the FolderWatcherManager.removeFolderWatcher method when the component receives an "syncFolders" event', function () {
		component.emit('syncFolders');

		folderWatcherManagerStub.checkFolderWatcherPaths.calledOnce.should.be.true;
	});

});