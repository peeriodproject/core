/// <reference path='../../test.d.ts' />

require('should');

import fs = require('fs');

import sinon = require('sinon');
import testUtils = require('../../utils/testUtils');

import PluginManager = require('../../../src/core/plugin/PluginManager');
import PluginRunner = require('../../../src/core/plugin/PluginRunner');
import SearchFormManager = require('../../../src/core/search/SearchFormManager');
import SearchRequestManager = require('../../../src/core/search/SearchRequestManager');
import JSONStateHandler= require('../../../src/core/utils/JSONStateHandler');
import JSONStateHandlerFactory = require('../../../src/core/utils/JSONStateHandlerFactory');

import AppQuitHandler = require('../../../src/core/utils/AppQuitHandler');
import ObjectConfig = require('../../../src/core/config/ObjectConfig');

describe('CORE --> SEARCH --> SearchFormManager', function () {
	var sandbox:SinonSandbox;
	var configStub:any;
	var appQuitHandlerStub:any;
	var pluginManagerStub:any;
	var pluginRunnerStub:any;
	var searchRequestManagerStub:any;
	var stateHandlerFactoryStub:any;
	var stateHandlerStub:any;

	var appDataPath:string = testUtils.getFixturePath('/core/search/SearchFormManager');

	var stateObject:Object = null;
	var activeIdentifiers:Array<string> = [];
	var manager:SearchFormManager = null;

	var createSearchFormManager = function (onOpen) {
		manager = new SearchFormManager(configStub, appQuitHandlerStub, stateHandlerFactoryStub, pluginManagerStub, searchRequestManagerStub, {
			onOpenCallback: onOpen
		});
	};

	var closeAndDone = function (done) {
		manager.close(function () {
			done();
		});
	}

	beforeEach(function () {
		testUtils.createFolder(appDataPath);

		sandbox = sinon.sandbox.create();
		configStub = testUtils.stubPublicApi(sandbox, ObjectConfig, {
			get: function (key:string) {
				if (key === 'app.dataPath') {
					return appDataPath;
				}
				else if (key === 'app.internalDataPath') {
					return appDataPath;
				}
				else if (key === 'search.searchFormStateConfig') {
					return 'searchFormManager.json';
				}
			}
		});
		appQuitHandlerStub = testUtils.stubPublicApi(sandbox, AppQuitHandler);
		pluginManagerStub = testUtils.stubPublicApi(sandbox, PluginManager, {
			getActivePluginRunner: function () {
				return process.nextTick(arguments[1].bind(null, pluginRunnerStub));
			},
			getActivePluginRunnerIdentifiers: function () {
				return process.nextTick(arguments[0].bind(null, activeIdentifiers));
			},
			open: function () {
				return process.nextTick(arguments[0].bind(null, null));
			}
		});

		pluginRunnerStub = testUtils.stubPublicApi(sandbox, PluginRunner, {
			getQuery: function () {
				return process.nextTick(arguments[1].bind(null, null, { transformed: arguments[0] }));
			}
		});

		searchRequestManagerStub = testUtils.stubPublicApi(sandbox, SearchRequestManager, {
			addQuery: function () {
				return process.nextTick(arguments[1].bind(null, null));
			}
		});

		stateHandlerFactoryStub = testUtils.stubPublicApi(sandbox, JSONStateHandlerFactory, {
			create: function () {
				return stateHandlerStub;
			}
		});

		stateHandlerStub = testUtils.stubPublicApi(sandbox, JSONStateHandler, {
			load: function () {
				return process.nextTick(arguments[0].bind(null, null, stateObject));
			},

			save: function () {
				return process.nextTick(arguments[1].bind(null, null));
			}
		});
	});

	afterEach(function () {
		sandbox.restore();

		configStub = null;
		appQuitHandlerStub = null;
		pluginManagerStub = null;
		pluginRunnerStub = null;
		searchRequestManagerStub = null;
		stateHandlerFactoryStub = null;
		stateHandlerStub = null;

		stateObject = null;
		activeIdentifiers = [];

		testUtils.deleteFolderRecursive(appDataPath);
	});

	it ('should correctly instantiate SearchFormManager without error', function (done) {
		createSearchFormManager(function () {
			manager.should.be.an.instanceof(SearchFormManager);

			return closeAndDone(done);
		});
	});

	it ('should correctly open and close the SearchFormManager', function (done) {
		activeIdentifiers = ['pluginIdentifer'];

		createSearchFormManager(function () {
			manager.open(function (err) {
				(err === null).should.be.true;

				manager.isOpen(function (err, isOpen) {
					(err === null).should.be.true;

					isOpen.should.be.true;

					manager.close(function (err) {
						(err === null).should.be.true;

						manager.close(function (err) {
							manager.isOpen(function (err, isOpen) {
								(err === null).should.be.true;

								isOpen.should.be.false;

								return closeAndDone(done);
							});
						});
					});
				});
			});
		});
	});

	it ('should correctly return the identifiers provided from the pluginManager', function (done) {
		activeIdentifiers = ['pluginIdentifier'];

		createSearchFormManager(function () {
			manager.getFormIdentifiers(function (identifiers) {
				pluginManagerStub.getActivePluginRunnerIdentifiers.calledTwice.should.be.true;

				identifiers.should.be.an.instanceof(Array);
				identifiers.should.have.a.lengthOf(1);

				identifiers[0].should.equal('pluginIdentifier');

				return closeAndDone(done);
			});
		});
	});

	it ('should correctly load the state and return an error as no plugins are available', function (done) {
		createSearchFormManager(function (err) {
			err.should.be.an.instanceof(Error);
			err.message.should.equal('SearchFormManager#open: No identifiers to construct a search form found. Add a plugin or activate at least one.');

			return closeAndDone(done);
		});
	});

	it ('should correctly fall back to the first active plugin if no state is provided', function (done) {
		activeIdentifiers = ['pluginIdentifier'];

		createSearchFormManager(function () {
			manager.getCurrentFormIdentifier(function (identifier) {

				identifier.should.equal('pluginIdentifier');

				return closeAndDone(done);
			});
		});
	});

	it ('should correctly load the state and set the current form', function (done) {
		activeIdentifiers = ['pluginIdentifier']
		stateObject = { currentForm: 'pluginIdentifier' };

		createSearchFormManager(function () {
			stateHandlerStub.load.calledOnce.should.be.true;

			manager.getCurrentFormIdentifier(function (identifier) {
				identifier.should.equal('pluginIdentifier');

				return closeAndDone(done);
			});
		});
	});

	it ('should correctly return an error if the loaded state returns an invalid identifier', function (done) {
		activeIdentifiers = ['fooIdentifier'];
		stateObject = { currentForm: 'barIdentifier' };

		createSearchFormManager(function (err) {
			err.should.be.an.instanceof(Error);
			err.message.should.equal('SearchFormManager#setForm: Could not activate the given identifier. The Identifier "barIdentifier" is invalid');

			return closeAndDone(done);
		});
	});

	it ('should correctly save the current form', function (done) {
		activeIdentifiers = ['pluginIdentifier'];

		createSearchFormManager(function () {
			manager.close(function () {

				stateHandlerStub.save.calledOnce.should.be.true;
				stateHandlerStub.save.getCall(0).args[0].should.containDeep({
					currentForm: 'pluginIdentifier'
				});

				return closeAndDone(done);
			});
		});
	});

	it ('should correctly set the new identifier', function (done) {
		activeIdentifiers = ['pluginIdentifier', 'fooIdentifier'];

		createSearchFormManager(function () {
			manager.setForm('fooIdentifier', function (err) {
				(err === null).should.be.true;

				manager.getCurrentFormIdentifier(function (identifier) {
					identifier.should.equal('fooIdentifier');

					return closeAndDone(done);
				});
			});
		});
	});

	it ('should correctly prevent the current form update if the new identifier is invalid', function (done) {
		activeIdentifiers = ['pluginIdentifier', 'fooIdentifier'];

		createSearchFormManager(function () {
			manager.setForm('barIdentifier', function (err) {
				err.should.be.an.instanceof(Error);
				err.message.should.equal('SearchFormManager#setForm: Could not activate the given identifier. The Identifier "barIdentifier" is invalid');

				manager.getCurrentFormIdentifier(function (identifier) {
					identifier.should.equal('pluginIdentifier');

					return closeAndDone(done);
				});
			});
		});
	});

	it ('should correctly transform the "raw query" with the current form', function (done) {
		activeIdentifiers = ['pluginIdentifier'];

		createSearchFormManager(function () {
			manager.addQuery('foobar', function (err) {
				(err === null).should.be.true;

				pluginManagerStub.getActivePluginRunner.calledOnce.should.be.true;
				pluginManagerStub.getActivePluginRunner.getCall(0).args[0].should.equal('pluginIdentifier');

				pluginRunnerStub.getQuery.calledOnce.should.be.true;
				pluginRunnerStub.getQuery.getCall(0).args[0].should.equal('foobar');

				searchRequestManagerStub.addQuery.calledOnce.should.be.true;
				searchRequestManagerStub.addQuery.getCall(0).args[0].should.containDeep({
					transformed: 'foobar'
				});

				return closeAndDone(done);
			});
		});

	});

});