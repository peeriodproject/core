/// <reference path='../../test.d.ts' />
require('should');

var sinon = require('sinon');
var testUtils = require('../../utils/testUtils');

var JSONStateHandler = require('../../../src/core/utils/JSONStateHandler');
var JSONStateHandlerFactory = require('../../../src/core/utils/JSONStateHandlerFactory');
var PluginFinder = require('../../../src/core/plugin/PluginFinder');
var PluginManager = require('../../../src/core/plugin/PluginManager');

//import PluginRunner = require('../../../src/core/plugin/PluginRunner');
var PluginLoaderFactory = require('../../../src/core/plugin/PluginLoaderFactory');
var PluginRunner = require('../../../src/core/plugin/PluginRunner');
var PluginRunnerFactory = require('../../../src/core/plugin/PluginRunnerFactory');
var PluginValidator = require('../../../src/core/plugin/PluginValidator');
var ObjectConfig = require('../../../src/core/config/ObjectConfig');

describe('CORE --> PLUGIN --> PluginManager', function () {
    var sandbox;
    var appDataPath = testUtils.getFixturePath('core/plugin/appDataPath');
    var createConfig = function () {
        return testUtils.stubPublicApi(sandbox, ObjectConfig, {
            get: function (key) {
                if (key === 'app.dataPath') {
                    return appDataPath;
                } else if (key === 'app.internalDataPath') {
                    return appDataPath;
                } else if (key === 'plugin.pluginManagerStateConfig') {
                    return 'pluginManager.json';
                }
            }
        });
    };
    var stateHandlerFactoryStub;
    var stateHandlerStub;
    var validState = {
        idle: [
            {
                name: 'foo bar idle',
                path: '/path',
                hash: '123',
                since: 123456
            }
        ],
        inactive: [
            {
                name: 'foo bar inactive',
                path: '/path',
                hash: '123',
                since: 123456
            }
        ],
        active: [
            {
                name: 'foo bar active',
                path: '/path',
                hash: '123',
                since: 123456
            }
        ]
    };

    var closeAndDone = function (pluginManager, done) {
        pluginManager.close(function () {
            done();
        });
    };

    beforeEach(function () {
        //testUtils.createFolder(appDataPath);
        sandbox = sinon.sandbox.create();

        stateHandlerFactoryStub = testUtils.stubPublicApi(sandbox, JSONStateHandlerFactory, {
            create: function () {
                return stateHandlerStub;
            }
        });

        stateHandlerStub = testUtils.stubPublicApi(sandbox, JSONStateHandler, {
            load: function () {
                return process.nextTick(arguments[0].bind(null, null, validState));
            },
            save: function () {
                return process.nextTick(arguments[1].bind(null, null));
            }
        });
    });

    afterEach(function () {
        sandbox.restore();

        stateHandlerFactoryStub = null;
        stateHandlerStub = null;
        //testUtils.deleteFolderRecursive(appDataPath);
    });

    it('should correctly instantiate PluginManager without error', function (done) {
        var config = createConfig();
        var pluginFinder = testUtils.stubPublicApi(sandbox, PluginFinder);
        var pluginValidator = testUtils.stubPublicApi(sandbox, PluginValidator);
        var pluginLoaderFactory = testUtils.stubPublicApi(sandbox, PluginLoaderFactory);
        var pluginRunnerFactory = testUtils.stubPublicApi(sandbox, PluginRunnerFactory);

        var pluginManager = new PluginManager(config, stateHandlerFactoryStub, pluginFinder, pluginValidator, pluginLoaderFactory, pluginRunnerFactory, {
            onOpenCallback: function () {
                closeAndDone(pluginManager, done);
            }
        });

        pluginManager.should.be.an.instanceof(PluginManager);
    });

    it('should correctly call the onOpen and onClose callback', function (done) {
        var config = createConfig();
        var pluginFinder = testUtils.stubPublicApi(sandbox, PluginFinder);
        var pluginValidator = testUtils.stubPublicApi(sandbox, PluginValidator);
        var pluginLoaderFactory = testUtils.stubPublicApi(sandbox, PluginLoaderFactory);
        var pluginRunnerFactory = testUtils.stubPublicApi(sandbox, PluginRunnerFactory);
        var pluginManager = new PluginManager(config, stateHandlerFactoryStub, pluginFinder, pluginValidator, pluginLoaderFactory, pluginRunnerFactory, {
            onOpenCallback: function () {
                pluginManager.open(function () {
                    pluginManager.close();
                });
            },
            onCloseCallback: function (err) {
                pluginManager.close(function (err) {
                    pluginManager.isOpen(function (err, isOpen) {
                        isOpen.should.be.false;

                        pluginManager.open(function () {
                            closeAndDone(pluginManager, done);
                        });
                    });
                });
            }
        });
    });

    it('should correctly call the findPlugins method from the pluginFinder', function (done) {
        var config = createConfig();
        var pluginFinder = testUtils.stubPublicApi(sandbox, PluginFinder, {
            findPlugins: function (callback) {
                callback(null, null);
            }
        });
        var pluginValidator = testUtils.stubPublicApi(sandbox, PluginValidator);
        var pluginLoaderFactory = testUtils.stubPublicApi(sandbox, PluginLoaderFactory);
        var pluginRunnerFactory = testUtils.stubPublicApi(sandbox, PluginRunnerFactory);
        var pluginManager = new PluginManager(config, stateHandlerFactoryStub, pluginFinder, pluginValidator, pluginLoaderFactory, pluginRunnerFactory);

        pluginManager.findNewPlugins(function (err) {
            pluginFinder.findPlugins.calledOnce.should.be.true;

            closeAndDone(pluginManager, done);
        });
    });

    it('should correctly load without a pluginState file', function (done) {
        var config = testUtils.stubPublicApi(sandbox, ObjectConfig, {
            get: function (key) {
                if (key === 'app.dataPath') {
                    return appDataPath;
                }
                if (key === 'app.internalDataPath') {
                    return appDataPath;
                } else if (key === 'plugin.pluginManagerStateConfig') {
                    return 'invalidFileName.json';
                }
            }
        });
        var pluginFinder = testUtils.stubPublicApi(sandbox, PluginFinder);
        var pluginValidator = testUtils.stubPublicApi(sandbox, PluginValidator);
        var pluginLoaderFactory = testUtils.stubPublicApi(sandbox, PluginLoaderFactory);
        var pluginRunnerFactory = testUtils.stubPublicApi(sandbox, PluginRunnerFactory);
        var pluginManager = new PluginManager(config, stateHandlerFactoryStub, pluginFinder, pluginValidator, pluginLoaderFactory, pluginRunnerFactory, {
            onOpenCallback: function () {
                pluginManager.getActivePluginRunners(function (pluginState) {
                    closeAndDone(pluginManager, done);
                });
            }
        });
    });

    it('should correctly load the pluginState from disk', function (done) {
        var config = createConfig();
        var pluginFinder = testUtils.stubPublicApi(sandbox, PluginFinder);
        var pluginValidator = testUtils.stubPublicApi(sandbox, PluginValidator);
        var pluginLoaderFactory = testUtils.stubPublicApi(sandbox, PluginLoaderFactory);
        var pluginRunnerFactory = testUtils.stubPublicApi(sandbox, PluginRunnerFactory);
        var pluginManager = new PluginManager(config, stateHandlerFactoryStub, pluginFinder, pluginValidator, pluginLoaderFactory, pluginRunnerFactory, {
            onOpenCallback: function () {
                pluginManager.getPluginState(function (pluginState) {
                    pluginState.should.containDeep(validState);

                    closeAndDone(pluginManager, done);
                });
            }
        });
    });

    it('should correctly activate the plugin, trigger the "pluginAdded" event and return it\'s runner', function (done) {
        var config = createConfig();
        var pluginFinder = testUtils.stubPublicApi(sandbox, PluginFinder);
        var pluginValidator = testUtils.stubPublicApi(sandbox, PluginValidator, {
            validateState: function (pluginState, callback) {
                return process.nextTick(callback.bind(null, null));
            }
        });
        var pluginLoaderFactory = testUtils.stubPublicApi(sandbox, PluginLoaderFactory, {
            create: function () {
                return {
                    getMain: function () {
                        return 'index.js';
                    },
                    getFileMimeTypes: function () {
                        return ['application/pdf'];
                    }
                };
            }
        });
        var pluginRunnerStub = testUtils.stubPublicApi(sandbox, PluginRunner);
        var pluginRunnerFactory = testUtils.stubPublicApi(sandbox, PluginRunnerFactory, {
            create: function () {
                return pluginRunnerStub;
            }
        });
        var pluginManager = new PluginManager(config, stateHandlerFactoryStub, pluginFinder, pluginValidator, pluginLoaderFactory, pluginRunnerFactory, {
            onOpenCallback: function () {
                pluginManager.activatePluginState();
            }
        });

        var onPluginAdded = function (identifier) {
            identifier.should.equal('foo bar active');

            pluginManager.removeEventListener('pluginAdded', onPluginAdded);

            pluginManager.getActivePluginRunners(function (pluginRunners) {
                pluginRunners['foo bar active'].should.equal(pluginRunnerStub);
                Object.keys(pluginRunners).length.should.equal(1);

                pluginManager.getActivePluginRunner('foo bar active', function (pluginRunner) {
                    pluginRunner.should.equal(pluginRunnerStub);

                    pluginManager.getActivePluginRunnerIdentifiers(function (identifiers) {
                        identifiers.should.have.a.lengthOf(1);
                        identifiers[0].should.equal('foo bar active');

                        closeAndDone(pluginManager, done);
                    });
                });
            });
        };

        pluginManager.addEventListener('pluginAdded', onPluginAdded);
    });

    it('should correctly return the plugin runner specified for the mime type', function (done) {
        var config = createConfig();
        var pluginFinder = testUtils.stubPublicApi(sandbox, PluginFinder);
        var pluginValidator = testUtils.stubPublicApi(sandbox, PluginValidator, {
            validateState: function (pluginState, callback) {
                return process.nextTick(callback.bind(null, null));
            }
        });
        var pluginLoaderFactory = testUtils.stubPublicApi(sandbox, PluginLoaderFactory, {
            create: function () {
                return {
                    getMain: function () {
                        return 'index.js';
                    },
                    getFileMimeTypes: function () {
                        return ['image/jpeg'];
                    }
                };
            }
        });
        var pluginRunnerStub = testUtils.stubPublicApi(sandbox, PluginRunner);
        var pluginRunnerFactory = testUtils.stubPublicApi(sandbox, PluginRunnerFactory, {
            create: function () {
                return pluginRunnerStub;
            }
        });
        var pluginManager = new PluginManager(config, stateHandlerFactoryStub, pluginFinder, pluginValidator, pluginLoaderFactory, pluginRunnerFactory, {
            onOpenCallback: function () {
                pluginManager.activatePluginState(function () {
                    pluginManager.getPluginRunnersForItem(testUtils.getFixturePath('core/plugin/pluginManager/image.jpg'), function (pluginRunners) {
                        Object.keys(pluginRunners).length.should.equal(1);
                        pluginRunners['foo bar active'].should.equal(pluginRunnerStub);

                        closeAndDone(pluginManager, done);
                    });
                });
            }
        });
    });

    it('should correctly return additional fields provided by the plugins', function (done) {
        var config = createConfig();
        var pluginFinder = testUtils.stubPublicApi(sandbox, PluginFinder);
        var pluginValidator = testUtils.stubPublicApi(sandbox, PluginValidator, {
            validateState: function (pluginState, callback) {
                return process.nextTick(callback.bind(null, null));
            }
        });
        var pluginLoaderFactory = testUtils.stubPublicApi(sandbox, PluginLoaderFactory, {
            create: function () {
                return {
                    getMain: function () {
                        return 'index.js';
                    },
                    getFileMimeTypes: function () {
                        return ['image/jpeg'];
                    },
                    getSettings: function () {
                        return {
                            useApacheTika: true
                        };
                    }
                };
            }
        });
        var pluginDataStub = {
            foo: 'foobar',
            bar: 'barfoo'
        };
        var pluginRunnerStub = testUtils.stubPublicApi(sandbox, PluginRunner, {
            onBeforeItemAdd: function (itemPath, stats, tikaGlobals, callback) {
                callback(null, pluginDataStub);
            }
        });
        var pluginRunnerFactory = testUtils.stubPublicApi(sandbox, PluginRunnerFactory, {
            create: function () {
                return pluginRunnerStub;
            }
        });
        var statsJson = '{"dev":16777222,"mode":33188,"nlink":1,"uid":501,"gid":20,"rdev":0,"blksize":4096,"ino":27724859,"size":6985,"blocks":16,"atime":"2014-05-18T11:59:13.000Z","mtime":"2014-05-16T21:16:41.000Z","ctime":"2014-05-16T21:16:41.000Z"}';
        var pluginManager = new PluginManager(config, stateHandlerFactoryStub, pluginFinder, pluginValidator, pluginLoaderFactory, pluginRunnerFactory, {
            onOpenCallback: function () {
                pluginManager.activatePluginState(function () {
                    pluginManager.onBeforeItemAdd(testUtils.getFixturePath('core/plugin/pluginManager/image.jpg'), JSON.parse(statsJson), 'fileHash', function (pluginData) {
                        Object.keys(pluginData).length.should.equal(1);
                        pluginData['foo bar active'].should.containDeep(pluginDataStub);

                        closeAndDone(pluginManager, done);
                    });
                });
            }
        });
    });

    it('should correctly return the settings of the given plugin identifer', function (done) {
        var config = createConfig();
        var pluginFinder = testUtils.stubPublicApi(sandbox, PluginFinder);
        var pluginValidator = testUtils.stubPublicApi(sandbox, PluginValidator, {
            validateState: function (pluginState, callback) {
                return process.nextTick(callback.bind(null, null));
            }
        });
        var pluginLoaderFactory = testUtils.stubPublicApi(sandbox, PluginLoaderFactory, {
            create: function () {
                return {
                    getMain: function () {
                        return 'index.js';
                    },
                    getFileMimeTypes: function () {
                        return ['image/jpeg'];
                    },
                    getSettings: function () {
                        return {
                            settings: true
                        };
                    }
                };
            }
        });
        var pluginRunnerStub = testUtils.stubPublicApi(sandbox, PluginRunner);
        var pluginRunnerFactory = testUtils.stubPublicApi(sandbox, PluginRunnerFactory, {
            create: function () {
                return pluginRunnerStub;
            }
        });

        var pluginManager = new PluginManager(config, stateHandlerFactoryStub, pluginFinder, pluginValidator, pluginLoaderFactory, pluginRunnerFactory, {
            onOpenCallback: function () {
                pluginManager.activatePluginState(function () {
                    pluginManager.getPluginSettings('foo bar active', function (settings) {
                        settings.should.eql({ settings: true });

                        done();
                    });
                });
            }
        });
    });
});
//# sourceMappingURL=PluginManager.js.map
