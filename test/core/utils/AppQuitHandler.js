/// <reference path='../../test.d.ts' />
require('should');

var sinon = require('sinon');

var AppQuitHandler = require('../../../src/core/utils/AppQuitHandler');

describe('CORE --> UTILS --> AppQuitHandler', function () {
    var sandbox;
    var app;

    beforeEach(function () {
        sandbox = sinon.sandbox.create();
        app = {
            quit: sandbox.spy()
        };
    });

    afterEach(function () {
        sandbox.restore();
        app = null;
    });

    it('should correctly instantiate the AppQuitHandler', function () {
        (new AppQuitHandler(app)).should.be.an.instanceof(AppQuitHandler);
    });

    it('should correctly call the app.quit method on quit', function () {
        new AppQuitHandler(app).quit();

        app.quit.calledOnce.should.be.true;
    });

    it('should correctly add functions to the list of callbacks and call the app.quit method after all functions called there callback', function () {
        var appQuitHandler = new AppQuitHandler(app);
        var beforeQuitSpy = sandbox.spy();

        var onQuitFunction1 = function (done) {
            beforeQuitSpy();
            done();
        };

        var onQuitFunction2 = function (done) {
            beforeQuitSpy();
            done();
        };

        appQuitHandler.add(onQuitFunction1);

        // double add check
        appQuitHandler.add(onQuitFunction1);
        appQuitHandler.add(onQuitFunction2);

        appQuitHandler.quit();

        beforeQuitSpy.calledTwice.should.be.true;
        app.quit.calledAfter(beforeQuitSpy).should.be.true;
    });

    it('should correctly remove a function from the list of callbacks', function () {
        var appQuitHandler = new AppQuitHandler(app);
        var beforeQuitSpy = sandbox.spy();

        var onQuitFunction = function (done) {
            beforeQuitSpy();
            done();
        };

        appQuitHandler.add(onQuitFunction);
        appQuitHandler.remove(onQuitFunction);

        // double remove check
        appQuitHandler.remove(onQuitFunction);

        appQuitHandler.quit();
        beforeQuitSpy.called.should.be.false;
    });
});
//# sourceMappingURL=AppQuitHandler.js.map
