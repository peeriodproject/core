/// <reference path='../../../test.d.ts' />
var sinon = require('sinon');

var UiFolderDropzoneComponent = require('../../../../src/core/ui/folder/UiFolderDropzoneComponent');

describe('CORE --> UI --> FOLDER --> UiFolderDropzoneComponent', function () {
    var sandbox;
    var component;

    //var eventListeners:{ [eventName:string]:Function };
    var folderWatcherManagerStub;
    var sparkStub;
    var nwWindowStub;
    var sparkOnListeners;
    var windowOnListeners;

    var triggerListeners = function () {
        var any = [];
        for (var _i = 0; _i < (arguments.length - 0); _i++) {
            any[_i] = arguments[_i + 0];
        }
        var args = arguments;
        var listeners = Array.prototype.shift.call(args);

        listeners.forEach(function (listener) {
            if (listener) {
                listener.apply(this, args);
            }
        });
    };

    beforeEach(function () {
        sandbox = sinon.sandbox.create();

        //eventListeners = {};
        sparkOnListeners = {};
        windowOnListeners = {};

        sparkStub = {
            send: sandbox.spy(),
            on: function (eventName, listener) {
                if (!sparkOnListeners[eventName]) {
                    sparkOnListeners[eventName] = [];
                }

                sparkOnListeners[eventName].push(listener);
            }
        };

        nwWindowStub = {
            _window: {
                resizeTo: sandbox.spy(),
                moveTo: sandbox.spy(),
                show: sandbox.spy(),
                setAlwaysOnTop: sandbox.spy(),
                on: function (eventName, listener) {
                    if (!windowOnListeners[eventName]) {
                        windowOnListeners[eventName] = [];
                    }

                    windowOnListeners[eventName].push(listener);
                },
                once: function (eventName, listener) {
                    if (!windowOnListeners[eventName]) {
                        windowOnListeners[eventName] = [];
                    }

                    windowOnListeners[eventName].push(listener);
                },
                hide: sandbox.spy(),
                close: sandbox.spy(),
                focus: sandbox.spy(),
                window: {
                    localStorage: {
                        setItem: sandbox.spy()
                    }
                }
            },
            get: function () {
                return this._window;
            },
            open: function () {
                return this._window;
            }
        };

        component = new UiFolderDropzoneComponent(nwWindowStub);
    });

    afterEach(function () {
        sandbox.restore();
        component = null;
        folderWatcherManagerStub = null;

        //eventListeners = null;
        sparkStub = null;
        nwWindowStub = null;
        sparkOnListeners = null;
        windowOnListeners = null;
    });

    it('should correctly instantiate without error', function () {
        component.should.be.an.instanceof(UiFolderDropzoneComponent);
    });

    it('should correctly return the channel name', function () {
        component.getChannelName().should.equal('folderdropzone');
    });

    it('should correctly return the state', function (done) {
        component.getState(function (state) {
            state.should.be.an.instanceof(Object);
            Object.keys(state).length.should.equal(0);

            done();
        });
    });

    /*it('should correctly save the given color object in localStorage', function () {
    component.onConnection(sparkStub);
    
    sparkOnListeners['background'].forEach(function(listener) {
    listener({
    background             : 'background',
    color                  : 'color',
    inverted               : 'inverted',
    invertedBackgroundColor: 'invertedBackgroundColor'
    });
    });
    
    nwWindowStub._window.window.localStorage.setItem.callCount.should.equal(4);
    
    var data = ['background', 'color', 'inverted', 'invertedBackgroundColor'];
    
    for (var i = 0; i < 4; i++) {
    // key data[i] exists
    nwWindowStub._window.window.localStorage.setItem.getCall(i).args[0].should.equal(data[i]);
    
    // value for key data[i] equals data[i]
    nwWindowStub._window.window.localStorage.setItem.getCall(i).args[1].should.equal(data[i]);
    }
    });*/
    it('should correctly open the internal window and focus it', function () {
        component.emit('open');

        nwWindowStub._window.show.calledOnce.should.be.true;
        nwWindowStub._window.setAlwaysOnTop.calledOnce.should.be.true;
    });

    it('should correctly call the internal window close method on close', function () {
        component.emit('open');
        component.emit('close');

        nwWindowStub._window.close.calledOnce.should.be.true;
    });

    it('should correctly open and close the internal window', function () {
        component.emit('open');

        triggerListeners(windowOnListeners['close']);

        nwWindowStub._window.hide.calledOnce.should.be.true;
        nwWindowStub._window.close.calledOnce.should.be.true;
    });

    it('should correctly open the window on the previous position', function () {
        component.emit('open');
        triggerListeners(windowOnListeners['move'], 123, 321);

        component.emit('close');
        component.emit('open');

        nwWindowStub._window.moveTo.getCall(1).args[0].should.equal(123);
        nwWindowStub._window.moveTo.getCall(1).args[1].should.equal(321);
    });

    it('should correctly open the window with the previous dimensions', function () {
        component.emit('open');
        triggerListeners(windowOnListeners['resize'], 358, 853);

        component.emit('close');
        component.emit('open');

        nwWindowStub._window.resizeTo.getCall(1).args[0].should.equal(358);
        nwWindowStub._window.resizeTo.getCall(1).args[1].should.equal(853);
    });

    it('should correctly set the path list, update the UI on drop and clean up the path list', function (done) {
        var uiUpdateSpy = sandbox.spy();
        component.onUiUpdate(uiUpdateSpy);

        component.emit('open', 'pathKey');

        triggerListeners(windowOnListeners['drop'], ['/path/one', '/path/two']);

        uiUpdateSpy.calledOnce.should.be.true;

        component.getState(function (state) {
            // check paths
            state['pathKey'][0].should.equal('/path/one');
            state['pathKey'][1].should.equal('/path/two');

            component.onAfterUiUpdate();

            // paths should be removed from the list
            component.getState(function (state) {
                state.should.be.an.instanceof(Object);
                Object.keys(state).should.have.a.lengthOf(0);

                done();
            });
        });
    });
});
//# sourceMappingURL=UiFolderDropzoneComponent.js.map
