/// <reference path='../../test.d.ts' />
require('should');

var fs = require('fs');

var sinon = require('sinon');
var testUtils = require('../../utils/testUtils');

var JSONStateHandler = require('../../../src/core/utils/JSONStateHandler');
var JSONStateHandlerFactory = require('../../../src/core/utils/JSONStateHandlerFactory');
var ObjectConfig = require('../../../src/core/config/ObjectConfig');
var FolderWatcher = require('../../../src/core/fs/FolderWatcher');
var FolderWatcherFactory = require('../../../src/core/fs/FolderWatcherFactory');
var FolderWatcherManager = require('../../../src/core/fs/FolderWatcherManager');

describe('CORE --> FS --> FolderWatcherManager', function () {
    var managerStoragePath = testUtils.getFixturePath('core/fs/folderWatcherManagerTest');
    var validPathToWatch = testUtils.getFixturePath('core/fs/folderWatcherManagerTest/folderToWatch');
    var sandbox;
    var configStub;
    var folderWatcherStub;
    var folderWatcherFactoryStub;
    var stateHandlerStub;
    var stateHandlerFactoryStub;

    var createStateHandlerStub = function (state) {
        if (typeof state === "undefined") { state = {}; }
        stateHandlerStub = testUtils.stubPublicApi(sandbox, JSONStateHandler, {
            load: function (callback) {
                return process.nextTick(callback.bind(null, null, state));
            },
            save: function (state, callback) {
                if (callback) {
                    return process.nextTick(callback.bind(null, null));
                }
            }
        });
    };

    var closeAndDone = function (folderWatcherManager, done) {
        folderWatcherManager.close(function () {
            done();
        });
    };

    beforeEach(function () {
        sandbox = sinon.sandbox.create();
        configStub = testUtils.stubPublicApi(sandbox, ObjectConfig, {
            get: function (key) {
                if (key === 'app.dataPath') {
                    return managerStoragePath;
                    //return [pathToWatchPath];
                }
            }
        });

        createStateHandlerStub();

        stateHandlerFactoryStub = testUtils.stubPublicApi(sandbox, JSONStateHandlerFactory, {
            create: function () {
                return stateHandlerStub;
            }
        });

        folderWatcherStub = testUtils.stubPublicApi(sandbox, FolderWatcher);

        folderWatcherFactoryStub = testUtils.stubPublicApi(sandbox, FolderWatcherFactory, {
            create: function () {
                return folderWatcherStub;
            }
        });

        testUtils.createFolder(managerStoragePath);
        testUtils.createFolder(validPathToWatch);
    });

    afterEach(function () {
        sandbox.restore();

        testUtils.deleteFolderRecursive(managerStoragePath);
        testUtils.deleteFolderRecursive(validPathToWatch);
    });

    it('should correctly instantiate FolderWatcherManager without error', function (done) {
        var folderWatcherManager = new FolderWatcherManager(configStub, stateHandlerFactoryStub, folderWatcherFactoryStub, {
            closeOnProcessExit: false
        });

        folderWatcherManager.should.be.an.instanceof(FolderWatcherManager);

        closeAndDone(folderWatcherManager, done);
    });

    it('should correctly return the open/closed state of the manager', function (done) {
        createStateHandlerStub({
            paths: [
                validPathToWatch
            ]
        });

        var folderWatcherManager = new FolderWatcherManager(configStub, stateHandlerFactoryStub, folderWatcherFactoryStub, {
            closeOnProcessExit: false,
            onOpenCallback: function (err) {
                (err === null).should.be.true;

                folderWatcherManager.isOpen(function (err, isOpen) {
                    (err === null).should.be.true;
                    isOpen.should.be.true;

                    folderWatcherManager.open(function (err) {
                        (err === null).should.be.true;

                        folderWatcherManager.close(function (err) {
                            (err === null).should.be.true;

                            folderWatcherManager.isOpen(function (err, isOpen) {
                                isOpen.should.be.false;

                                folderWatcherManager.close(function (err) {
                                    (err === null).should.be.true;

                                    closeAndDone(folderWatcherManager, done);
                                });
                            });
                        });
                    });
                });
            }
        });
    });

    it('should throw an error if the specified path is not absolute', function (done) {
        createStateHandlerStub({
            paths: [
                './not/a/absolute/path'
            ]
        });

        var folderWatcherManager = new FolderWatcherManager(configStub, stateHandlerFactoryStub, folderWatcherFactoryStub, {
            closeOnProcessExit: false,
            onOpenCallback: function (err) {
                err.should.be.an.instanceof(Error);
                err.message.should.equal('FolderWatcherManager~_checkFolderWatcherPaths: The specified path is not absolute. "./not/a/absolute/path"');

                closeAndDone(folderWatcherManager, done);
            }
        });
    });

    it('should correctly create a watcher for the specified path', function (done) {
        createStateHandlerStub({
            paths: [
                validPathToWatch
            ]
        });

        var onWatcherAdd = sinon.spy();

        var folderWatcherManager = new FolderWatcherManager(configStub, stateHandlerFactoryStub, folderWatcherFactoryStub, {
            closeOnProcessExit: false,
            onOpenCallback: function (err) {
                (err === null).should.be.true;

                folderWatcherFactoryStub.create.calledOnce.should.be.true;

                folderWatcherManager.getFolderWatchers(function (watchers) {
                    (watchers[validPathToWatch] === undefined).should.be.false;

                    onWatcherAdd.calledOnce.should.be.true;
                    onWatcherAdd.getCall(0).args[0].should.equal(validPathToWatch);

                    closeAndDone(folderWatcherManager, done);
                });
            }
        });

        folderWatcherManager.on('watcher.add', onWatcherAdd);
    });

    it('should correctly remove the watcher if a path becomes invalid', function (done) {
        createStateHandlerStub({
            paths: [
                validPathToWatch
            ]
        });

        var onWatcherInvalid = sinon.spy();

        var folderWatcherManager = new FolderWatcherManager(configStub, stateHandlerFactoryStub, folderWatcherFactoryStub, {
            closeOnProcessExit: false,
            onOpenCallback: function (err) {
                testUtils.deleteFolderRecursive(validPathToWatch);

                folderWatcherManager.checkFolderWatcherPaths(function () {
                    folderWatcherManager.getFolderWatchers(function (watchers) {
                        Object.keys(watchers).length.should.equal(0);

                        onWatcherInvalid.calledOnce.should.be.true;
                        onWatcherInvalid.getCall(0).args[0].should.equal(validPathToWatch);

                        closeAndDone(folderWatcherManager, done);
                    });
                });
            }
        });

        folderWatcherManager.on('watcher.invalid', onWatcherInvalid);
    });

    it('should correctly add the watcher if a path becomes valid', function (done) {
        createStateHandlerStub({
            paths: [
                validPathToWatch
            ]
        });

        testUtils.deleteFolderRecursive(validPathToWatch);

        var folderWatcherManager = new FolderWatcherManager(configStub, stateHandlerFactoryStub, folderWatcherFactoryStub, {
            closeOnProcessExit: false,
            onOpenCallback: function (err) {
                testUtils.createFolder(validPathToWatch);

                folderWatcherManager.checkFolderWatcherPaths(function () {
                    folderWatcherManager.getFolderWatchers(function (watchers) {
                        Object.keys(watchers).length.should.equal(1);

                        (watchers[validPathToWatch] === undefined).should.be.false;

                        closeAndDone(folderWatcherManager, done);
                    });
                });
            }
        });
    });

    it('should correctly remove the folder watcher', function (done) {
        createStateHandlerStub({
            paths: [
                validPathToWatch
            ]
        });

        var onWatcherRemove = sinon.spy();

        var folderWatcherManager = new FolderWatcherManager(configStub, stateHandlerFactoryStub, folderWatcherFactoryStub, {
            closeOnProcessExit: false,
            onOpenCallback: function (err) {
                folderWatcherFactoryStub.create.calledOnce.should.be.true;

                folderWatcherManager.removeFolderWatcher(validPathToWatch, function () {
                    folderWatcherManager.getFolderWatchers(function (watchers) {
                        Object.keys(watchers).length.should.equal(0);

                        onWatcherRemove.calledOnce.should.be.true;
                        onWatcherRemove.getCall(0).args[0].should.equal(validPathToWatch);

                        closeAndDone(folderWatcherManager, done);
                    });
                });
            }
        });

        folderWatcherManager.on('watcher.remove', onWatcherRemove);
    });

    it('should correctly add the folder watcher', function (done) {
        createStateHandlerStub({
            paths: []
        });

        var folderWatcherManager = new FolderWatcherManager(configStub, stateHandlerFactoryStub, folderWatcherFactoryStub, {
            closeOnProcessExit: false,
            onOpenCallback: function (err) {
                folderWatcherFactoryStub.create.callCount.should.equal(0);

                folderWatcherManager.addFolderWatcher(validPathToWatch, function () {
                    folderWatcherFactoryStub.create.calledOnce.should.be.true;

                    folderWatcherManager.getFolderWatchers(function (watchers) {
                        Object.keys(watchers).length.should.equal(1);

                        closeAndDone(folderWatcherManager, done);
                    });
                });
            }
        });
    });

    describe('implementation tests: should correctly forward the events from the watchers', function () {
        var folderWatcherConfigStub;

        this.timeout(0);

        beforeEach(function () {
            folderWatcherConfigStub = testUtils.stubPublicApi(sandbox, ObjectConfig, {
                get: function (key) {
                    if (key === 'fs.folderWatcher.interval') {
                        return 1000;
                    } else if (key === 'fs.folderWatcher.binaryInterval') {
                        return 5000;
                    } else if (key === 'fs.folderWatcher.eventDelay') {
                        return 3000;
                    }
                }
            });

            folderWatcherFactoryStub = testUtils.stubPublicApi(sandbox, FolderWatcherFactory, {
                create: function (config, pathToWatch, options) {
                    options = options || {};
                    options.closeOnProcessExit = false;
                    return new FolderWatcher(folderWatcherConfigStub, pathToWatch, options);
                }
            });

            testUtils.createFolder(validPathToWatch);
        });

        afterEach(function () {
            testUtils.deleteFolderRecursive(validPathToWatch);
        });

        it('should correctly forward the add event', function (done) {
            createStateHandlerStub({
                paths: [
                    validPathToWatch
                ]
            });

            var folderWatcherManager = new FolderWatcherManager(configStub, stateHandlerFactoryStub, folderWatcherFactoryStub, {
                closeOnProcessExit: false,
                onOpenCallback: function (err) {
                    folderWatcherManager.on('add', function (changedPath, stats) {
                        changedPath.should.equal(validPathToWatch + '/foo.txt');
                        (stats !== null).should.be.true;

                        closeAndDone(folderWatcherManager, done);
                    });

                    fs.writeFileSync(validPathToWatch + '/foo.txt', new Buffer(100));
                }
            });
        });

        it('should correctly forward the change event', function (done) {
            var filePath = validPathToWatch + '/foo.txt';

            createStateHandlerStub({
                paths: [
                    validPathToWatch
                ]
            });

            fs.writeFileSync(filePath, new Buffer(100));

            var folderWatcherManager = new FolderWatcherManager(configStub, stateHandlerFactoryStub, folderWatcherFactoryStub, {
                closeOnProcessExit: false,
                onOpenCallback: function (err) {
                    folderWatcherManager.on('add', function (changedPath, stats) {
                        fs.writeFileSync(filePath, new Buffer(500));
                    });

                    folderWatcherManager.on('change', function (changedPath, stats) {
                        changedPath.should.equal(filePath);
                        (stats !== null).should.be.true;

                        closeAndDone(folderWatcherManager, done);
                    });
                }
            });
        });

        it('should correctly forward the unlink event', function (done) {
            var filePath = validPathToWatch + '/foo.txt';

            createStateHandlerStub({
                paths: [
                    validPathToWatch
                ]
            });

            fs.writeFileSync(filePath, new Buffer(100));

            var onAddChangeCallback = function () {
            };
            var folderWatcherManager = new FolderWatcherManager(configStub, stateHandlerFactoryStub, folderWatcherFactoryStub, {
                closeOnProcessExit: false,
                onOpenCallback: function (err) {
                    // on/off test
                    folderWatcherManager.on('change', onAddChangeCallback);
                    folderWatcherManager.off('change', onAddChangeCallback);

                    folderWatcherManager.on('add', function (changedPath, stats) {
                        fs.unlinkSync(filePath);
                    });

                    folderWatcherManager.on('unlink', function (changedPath, stats) {
                        changedPath.should.equal(filePath);
                        (stats === null).should.be.true;

                        closeAndDone(folderWatcherManager, done);
                    });
                }
            });
        });
    });
});
//# sourceMappingURL=FolderWatcherManager.js.map
