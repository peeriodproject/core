/// <reference path='../../test.d.ts' />
require('should');

var sinon = require('sinon');
var testUtils = require('../../utils/testUtils');

var AppQuitHandler = require('../../../src/core/utils/AppQuitHandler');
var FolderWatcherManager = require('../../../src/core/fs/FolderWatcherManager');
var IndexManager = require('../../../src/core/search/IndexManager');
var ObjectConfig = require('../../../src/core/config/ObjectConfig');
var PathValidator = require('../../../src/core/fs/PathValidator');
var SearchManager = require('../../../src/core/search/SearchManager');

describe('CORE --> SEARCH --> IndexManager', function () {
    var sandbox;
    var indexManager;
    var configStub;
    var appQuitHandlerStub;
    var folderWatcherManagerStub;
    var pathValidatorStub;
    var searchManagerStub;

    var closableAsync = {
        open: function (callback) {
            if (callback) {
                return process.nextTick(callback.bind(null, null));
            }
        },
        close: function (callback) {
            if (callback) {
                return process.nextTick(callback.bind(null, null));
            }
        }
    };

    var createIndexManager = function (stubExtensions, callback) {
        var pathValidatorMethods = {};
        var searchManagerMethods = closableAsync;

        if (stubExtensions.pathValidator) {
            for (var key in stubExtensions.pathValidator) {
                pathValidatorMethods[key] = stubExtensions.pathValidator[key];
            }
        }

        pathValidatorStub = testUtils.stubPublicApi(sandbox, PathValidator, pathValidatorMethods);

        if (stubExtensions.searchManager) {
            for (var key in stubExtensions.searchManager) {
                searchManagerMethods[key] = stubExtensions.searchManager[key];
            }
        }

        searchManagerStub = testUtils.stubPublicApi(sandbox, SearchManager, searchManagerMethods);

        indexManager = new IndexManager(configStub, appQuitHandlerStub, folderWatcherManagerStub, pathValidatorStub, searchManagerStub);
        indexManager.open(function () {
            callback();
        });
    };

    var closeAndDone = function (done) {
        indexManager.close(function () {
            done();
        });
    };

    this.timeout(0);

    beforeEach(function () {
        sandbox = sinon.sandbox.create();
        configStub = testUtils.stubPublicApi(sandbox, ObjectConfig, {
            get: function (key) {
                if (key === 'search.indexManager.indexRunnerDelayInMilliSeconds') {
                    return 1000;
                } else if (key === 'search.indexManager.indexRunnersInParallel') {
                    return 3;
                }
            }
        });
        appQuitHandlerStub = testUtils.stubPublicApi(sandbox, AppQuitHandler);
        folderWatcherManagerStub = testUtils.stubPublicApi(sandbox, FolderWatcherManager, closableAsync);
    });

    afterEach(function () {
        sandbox.restore();
        indexManager = null;
        configStub = null;
        appQuitHandlerStub = null;
        folderWatcherManagerStub = null;
        searchManagerStub = null;
    });

    it('should correctly return the open/close state of the index manager', function (done) {
        createIndexManager({}, function () {
            indexManager.open(function (err) {
                (err === null).should.be.true;

                indexManager.isOpen(function (err, isOpen) {
                    (err === null).should.be.true;
                    isOpen.should.be.true;

                    indexManager.close(function () {
                        indexManager.isOpen(function (err, isOpen) {
                            (err === null).should.be.true;
                            isOpen.should.be.false;

                            closeAndDone(done);
                        });
                    });
                });
            });
        });
    });

    it('should correctly pause and resume the indexing process', function (done) {
        createIndexManager({}, function () {
            indexManager.isPaused(function (isPaused) {
                isPaused.should.be.false;

                indexManager.pause(function () {
                    indexManager.isPaused(function (isPaused) {
                        isPaused.should.be.true;

                        indexManager.resume(function () {
                            indexManager.isPaused(function (isPaused) {
                                isPaused.should.be.false;

                                closeAndDone(done);
                            });
                        });
                    });
                });
            });
        });
    });

    describe('should correctly call the searchManager.addItem method', function () {
        var stats = '{"foo":"bar"}';

        it('should correctly add a fresh item which does not exits in the database', function (done) {
            createIndexManager({
                pathValidator: {
                    getHash: function (filePath, callback) {
                        return process.nextTick(callback.bind(null, null, 'fileHash'));
                    }
                },
                searchManager: {
                    // no item exists in the database
                    getItem: function (pathToIndex, callback) {
                        return process.nextTick(callback.bind(null, null, null));
                    },
                    addItem: function (pathToIndex, stats, fileHash, callback) {
                        return process.nextTick(callback.bind(null));
                    }
                }
            }, function () {
                indexManager.addToIndex('/path/to/index', JSON.parse(stats), function (err) {
                    searchManagerStub.getItem.calledOnce.should.be.true;

                    pathValidatorStub.validateStats.called.should.be.false;
                    pathValidatorStub.validateHash.called.should.be.false;

                    searchManagerStub.addItem.calledOnce.should.be.true;

                    (err === null).should.be.true;

                    closeAndDone(done);
                });
            });
        });

        it('should correctly reject the creation after the stats validation', function (done) {
            createIndexManager({
                pathValidator: {
                    // validate stats check returns 'isValid:true'
                    validateStats: function (filePath, stats, callback) {
                        return process.nextTick(callback.bind(null, null, true, JSON.parse('{"fs.Stats": "Object"}')));
                    }
                },
                searchManager: {
                    // a item exists in the database
                    getItem: function (pathToIndex, callback) {
                        return process.nextTick(callback.bind(null, 'hash', JSON.parse('{"fs.Stats": "Object"}')));
                    },
                    addItem: function (pathToIndex, stats, fileHash, callback) {
                        return process.nextTick(callback.bind(null));
                    }
                }
            }, function () {
                indexManager.addToIndex('/path/to/index', JSON.parse(stats), function (err) {
                    searchManagerStub.getItem.calledOnce.should.be.true;

                    pathValidatorStub.validateStats.calledOnce.should.be.true;
                    pathValidatorStub.validateHash.called.should.be.false;

                    searchManagerStub.addItem.called.should.be.false;

                    err.should.be.an.instanceof(Error);
                    err.message.should.equal('IndexManager~_processPendingPathToIndex: The item at path "' + '/path/to/index' + '" is already indexed.');

                    closeAndDone(done);
                });
            });
        });

        it('should correctly reject the creation after the hash validation', function (done) {
            createIndexManager({
                pathValidator: {
                    // validate stats check returns 'isValid:false'
                    validateStats: function (filePath, stats, callback) {
                        return process.nextTick(callback.bind(null, null, false, JSON.parse('{"fs.Stats": "Object"}')));
                    },
                    // validate hash check returns 'isValid:true'
                    validateHash: function (filePath, hash, callback) {
                        return process.nextTick(callback.bind(null, null, true, 'searchManagerHash'));
                    }
                },
                searchManager: {
                    // a item exists in the database
                    getItem: function (pathToIndex, callback) {
                        return process.nextTick(callback.bind(null, 'hash', JSON.parse('{"fs.Stats": "Object"}')));
                    },
                    addItem: function (pathToIndex, stats, fileHash, callback) {
                        return process.nextTick(callback.bind(null));
                    }
                }
            }, function () {
                indexManager.addToIndex('/path/to/index', JSON.parse(stats), function (err) {
                    searchManagerStub.getItem.calledOnce.should.be.true;

                    pathValidatorStub.validateStats.calledOnce.should.be.true;
                    pathValidatorStub.validateHash.calledOnce.should.be.true;

                    searchManagerStub.addItem.called.should.be.false;

                    err.should.be.an.instanceof(Error);
                    err.message.should.equal('IndexManager~_processPendingPathToIndex: The item at path "' + '/path/to/index' + '" is already indexed.');

                    closeAndDone(done);
                });
            });
        });

        it('should correctly add the item after the stats and the hash validation failed', function (done) {
            createIndexManager({
                pathValidator: {
                    // validate stats check returns 'isValid:false'
                    validateStats: function (filePath, stats, callback) {
                        return process.nextTick(callback.bind(null, null, false, JSON.parse('{"fs.Stats": "Object"}')));
                    },
                    // validate hash check returns 'isValid:false'
                    validateHash: function (filePath, hash, callback) {
                        return process.nextTick(callback.bind(null, null, false, 'searchManagerHash'));
                    }
                },
                searchManager: {
                    // a item exists in the database
                    getItem: function (pathToIndex, callback) {
                        return process.nextTick(callback.bind(null, 'hash', JSON.parse('{"fs.Stats": "Object"}')));
                    },
                    addItem: function (pathToIndex, stats, fileHash, callback) {
                        return process.nextTick(callback.bind(null));
                    }
                }
            }, function () {
                indexManager.addToIndex('/path/to/index', JSON.parse(stats), function (err) {
                    searchManagerStub.getItem.calledOnce.should.be.true;

                    pathValidatorStub.validateStats.calledOnce.should.be.true;
                    pathValidatorStub.validateHash.calledOnce.should.be.true;

                    searchManagerStub.addItem.called.should.be.true;

                    (err === null).should.be.true;

                    closeAndDone(done);
                });
            });
        });
    });
    //it ('should correctly batch it')
});
//# sourceMappingURL=IndexManager.js.map
