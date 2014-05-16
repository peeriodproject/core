/// <reference path='../../test.d.ts' />

import fs = require('fs');
require('should');

import sinon = require('sinon');
import testUtils = require('../../utils/testUtils');


import ObjectConfig = require('../../../src/core/config/ObjectConfig');
import FolderWatcher = require('../../../src/core/fs/FolderWatcher');

describe('CORE --> FS --> FolderWatcher', function () {
	var sandbox:SinonSandbox;
	var configStub:any
	var validPathToWatch:string = testUtils.getFixturePath('core/fs/folderWatcherTest/folderToWatch');
	var fileContent = "if (humans!=robots) {\n\treality();\n}\n\n// code {poems}\n// David Sjunnesson";
	var options = {
		closeOnProcessExit: false
	};
	var folderWatcher:FolderWatcher;

	this.timeout(0);

	beforeEach(function () {
		sandbox = sinon.sandbox.create();
		configStub = testUtils.stubPublicApi(sandbox, ObjectConfig, {
			get: function (key) {
				if (key === 'fs.folderWatcher.interval') {
					return 1000;
				}
				else if (key === 'fs.folderWatcher.binaryInterval') {
					return 5000;
				}
				else if (key === 'fs.folderWatcher.eventDelay') {
					return 3000;
				}
			}
		})
		testUtils.createFolder(validPathToWatch);
	});

	afterEach(function () {
		folderWatcher.close();
		folderWatcher = null;

		sandbox.restore();
		configStub = null;
		testUtils.deleteFolderRecursive(validPathToWatch);
	});

	it('should correctly instantiate the folder watcher', function () {
		folderWatcher = new FolderWatcher(configStub, validPathToWatch, options);
		folderWatcher.should.be.an.instanceof(FolderWatcher);
	});

	it('should correctly return the state of the watcher', function () {
		folderWatcher = new FolderWatcher(configStub, validPathToWatch, options);

		folderWatcher.isOpen().should.be.true;
		folderWatcher.close();
		folderWatcher.close();
		folderWatcher.isOpen().should.be.false;
		folderWatcher.open();
		folderWatcher.open();
		folderWatcher.isOpen().should.be.true;
	});

	it ('should correctly ignore the folder updates', function () {
		var onAddCallback = sinon.spy();
		var onUnlinkCallback = sinon.spy();
		folderWatcher = new FolderWatcher(configStub, validPathToWatch, options);

		folderWatcher.on('add', onAddCallback);
		folderWatcher.on('unlink', onUnlinkCallback);

		testUtils.createFolder(validPathToWatch + '/new-folder');
		testUtils.deleteFolderRecursive(validPathToWatch + '/new-folder');

		onAddCallback.called.should.be.false;
		onUnlinkCallback.called.should.be.false;
	});

	it('should correctly trigger one add event', function (done) {
		var filePath:string = validPathToWatch + '/message.txt';

		folderWatcher = new FolderWatcher(configStub, validPathToWatch, options);
		folderWatcher.on('add', function (path:string, stats:fs.Stats) {

			path.should.equal(filePath);
			stats.isFile().should.be.true;

			done();
		});

		fs.writeFileSync(filePath, fileContent);
	});

	it('should correctly emit one unlink event', function (done) {
		var filePath:string = validPathToWatch + '/message.txt';

		folderWatcher = new FolderWatcher(configStub, validPathToWatch, options);

		folderWatcher.on('add', function (path:string, stats:fs.Stats) {
			fs.unlinkSync(filePath);
		});

		folderWatcher.on('unlink', function (path:string, stats:fs.Stats) {
			path.should.equal(filePath);
			(stats === undefined).should.be.true;

			done();
		});

		fs.writeFileSync(filePath, fileContent);
	});

	it ('should correctly emit one change event', function (done) {
		var filePath:string = validPathToWatch + '/message.txt';

		folderWatcher = new FolderWatcher(configStub, validPathToWatch, options);

		folderWatcher.on('add', function (path:string, stats:fs.Stats) {
			fs.writeFileSync(filePath, fileContent);
		});

		folderWatcher.on('change', function (path:string, stats:fs.Stats) {
			path.should.equal(filePath);
			(stats !== undefined).should.be.true;

			done();
		});

		fs.writeFileSync(filePath, 'Hello FolderWatcher!');
	});

	it ('should correctly emit a single event after the file is updated multiple times', function (done) {
		var filePath:string = validPathToWatch + '/message.txt';
		var written = true;
		var writeFile = function (i:number) {
			fs.writeFileSync(filePath, new Buffer(1000 * i));

			if (i < 3) {
				setTimeout(function () {
					writeFile(++i);
				}, 3000);
			}
			else {
				written = true;
			}
		};

		folderWatcher = new FolderWatcher(configStub, validPathToWatch, options);

		folderWatcher.on('add', function (path:string, stats:fs.Stats) {
			written.should.be.true;

			done();
		});

		writeFile(1);
	});

	it ('should correctly analyse 0 byte files after delayed event queue is handled (handles/simulates bulk copies on OS X)', function (done) {
		var validZeroByetFilePath:string = validPathToWatch + '/validZeroByteFile.txt';
		var invalidZeroByetFilePath:string = validPathToWatch + '/invalidZeroByteFile.txt';
		var largeFilePath:string = validPathToWatch + '/largeFile.txt';
		var added:number = 0;
		var written = true;
		var writeFile = function (i:number) {
			fs.writeFileSync(largeFilePath, new Buffer(1000 * i));

			if (i === 3) {
				fs.writeFileSync(validZeroByetFilePath, new Buffer(100));
			}

			if (i < 4) {
				setTimeout(function () {
					writeFile(++i);
				}, 3000);
			}
			else {
				written = true;
			}
		};

		folderWatcher = new FolderWatcher(configStub, validPathToWatch, options);
		folderWatcher.on('add', function (path:string, stats:fs.Stats) {
			added++;

			if (added === 2) {
				done();
			}
		});

		fs.writeFileSync(validZeroByetFilePath, new Buffer(0));
		fs.writeFileSync(invalidZeroByetFilePath, new Buffer(0));

		writeFile(1);
	});
});