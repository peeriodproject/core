/// <reference path='../../../test.d.ts' />

import should = require('should');

import sinon = require('sinon');
import testUtils = require('../../../utils/testUtils');

import PluginManager = require('../../../../src/core/plugin/PluginManager');
import PluginRunner = require('../../../../src/core/plugin/PluginRunner');
import UiPluginManagerComponent = require('../../../../src/core/ui/plugin/UiPluginManagerComponent');

describe('CORE --> UI --> FOLDER --> UiPluginManagerComponent', function () {
	var sandbox:SinonSandbox;
	var component:UiPluginManagerComponent;
	var eventListeners:{ [eventName:string]:Function };
	var pluginManagerStub:any;
	var pluginRunnerStub:any;
	var sparkStub:any;

	beforeEach(function () {
		sandbox = sinon.sandbox.create();
		eventListeners = {};
		pluginRunnerStub = testUtils.stubPublicApi(sandbox, PluginRunner, {
			getSearchFields: function (callback) {
				callback(null, { fields: 'foobar' });
			}
		});
		pluginManagerStub = testUtils.stubPublicApi(sandbox, PluginManager, {
			addEventListener: function (eventName, callback) {
				if (eventListeners[eventName]) {
					throw new Error('Already added a listener to: ' + eventName);
				}

				eventListeners[eventName] = callback;
			},

			activatePluginState: function (callback) {
				return process.nextTick(callback.bind(null, null));
			},

			getActivePluginRunners: function (callback) {
				callback({
					identifier: pluginRunnerStub
				});
			},

			getActivePluginRunner: function (identifier, callback) {
				callback(pluginRunnerStub);
			},

			open: function (callback) {
				return process.nextTick(callback.bind(null, null));
			}
		});
		sparkStub = {
			send: sandbox.spy()
		};
		component = new UiPluginManagerComponent(pluginManagerStub);
	});

	afterEach(function () {
		sandbox.restore();
		component = null;
		pluginManagerStub = null;
		pluginRunnerStub = null;
		eventListeners = null;
		sparkStub = null;
	});

	it('should correctly instantiate without error', function () {
		component.should.be.an.instanceof(UiPluginManagerComponent);
	});

	it('should correctly listen for PluginManager events', function () {
		var eventNames:Array<string> = ['pluginAdded'];
		var listenerNames:Array<string> = Object.keys(eventListeners);

		for (var i in listenerNames) {
			eventNames.indexOf(listenerNames[i]).should.be.greaterThan(-1);
		}
	});

	it('should correctly return the channel name', function () {
		component.getChannelName().should.equal('plugin');
	});

	it('should correctly return the state', function (done) {
		// waiting for pluginManager.open
		setImmediate(function () {
			component.getState(function (state) {
				state.should.be.an.instanceof(Object);
				state.should.containDeep({ identifier: { fields: 'foobar' } });

				done();
			});
		});
	});

	it('should correctly get the initial state of the plugins on construction', function (done) {
		// waiting for pluginManager.open
		setImmediate(function () {
			pluginManagerStub.getActivePluginRunners.calledOnce.should.be.true;
			pluginRunnerStub.getSearchFields.calledOnce.should.be.true;

			done();
		});
	});

	it('should correctly add the fields of a plugin whenever it receives an "pluginAdded" event and update the UI', function (done) {
		var uiUpdateSpy = sandbox.spy();
		component.onUiUpdate(uiUpdateSpy);

		eventListeners['pluginAdded']('fooIdentifier');

		// waiting for pluginManager.open
		setImmediate(function () {
			// waiting for pluginManager.activatePluginState
			setImmediate(function () {
				uiUpdateSpy.calledOnce.should.be.true;
				component.getState(function (state) {
					state.should.containDeep({
						identifier   : { fields: 'foobar' },
						fooIdentifier: { fields: 'foobar' }
					});

					done();
				});
			});
		});
	});

});