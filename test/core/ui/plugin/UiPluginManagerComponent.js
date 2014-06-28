/// <reference path='../../../test.d.ts' />
var sinon = require('sinon');
var testUtils = require('../../../utils/testUtils');

var PluginManager = require('../../../../src/core/plugin/PluginManager');
var PluginRunner = require('../../../../src/core/plugin/PluginRunner');
var UiPluginManagerComponent = require('../../../../src/core/ui/plugin/UiPluginManagerComponent');

describe('CORE --> UI --> FOLDER --> UiPluginManagerComponent @_joern', function () {
    var sandbox;
    var component;
    var eventListeners;
    var pluginManagerStub;
    var pluginRunnerStub;
    var sparkStub;

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
        var eventNames = ['pluginAdded'];
        var listenerNames = Object.keys(eventListeners);

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
            var state = component.getState();

            state.should.be.an.instanceof(Object);
            state.should.containDeep({ identifier: { fields: 'foobar' } });

            done();
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
        component.onConnection(sparkStub);
        eventListeners['pluginAdded']('fooIdentifier');

        // waiting for pluginManager.open
        setImmediate(function () {
            // waiting for pluginManager.activatePluginState
            setImmediate(function () {
                sparkStub.send.calledOnce.should.be.true;
                sparkStub.send.getCall(0).args[0].should.equal('update');
                sparkStub.send.getCall(0).args[1].should.containDeep({
                    identifier: { fields: 'foobar' },
                    fooIdentifier: { fields: 'foobar' }
                });

                done();
            });
        });
    });
});
//# sourceMappingURL=UiPluginManagerComponent.js.map
