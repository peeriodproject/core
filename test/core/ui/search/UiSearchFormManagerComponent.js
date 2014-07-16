/// <reference path='../../../test.d.ts' />
var sinon = require('sinon');
var testUtils = require('../../../utils/testUtils');

var SearchFormManager = require('../../../../src/core/search/SearchFormManager');
var SearchRequestManager = require('../../../../src/core/search/SearchRequestManager');
var UiSearchFormManagerComponent = require('../../../../src/core/ui/search/UiSearchFormManagerComponent');

describe('CORE --> UI --> SEARCH --> UiSearchFormManagerComponent', function () {
    var sandbox;
    var component;
    var searchFormManagerStub;
    var searchRequestManagerStub;

    beforeEach(function () {
        sandbox = sinon.sandbox.create();
        searchFormManagerStub = testUtils.stubPublicApi(sandbox, SearchFormManager, {
            addQuery: function () {
                return arguments[1](null, 'queryId');
            }
        });
        searchRequestManagerStub = testUtils.stubPublicApi(sandbox, SearchRequestManager, {
            removeQuery: function () {
                return arguments[1](null);
            }
        });

        component = new UiSearchFormManagerComponent(searchFormManagerStub, searchRequestManagerStub);
    });

    afterEach(function () {
        sandbox.restore();
        component = null;

        searchFormManagerStub = null;
        searchRequestManagerStub = null;
    });

    it('should correctly instantiate without error', function () {
        component.should.be.an.instanceof(UiSearchFormManagerComponent);
    });

    it('should correctly return the channel name', function () {
        component.getChannelName().should.equal('search');
    });

    it('should correctly return the event names', function () {
        component.getEventNames().should.containDeep(['addQuery', 'removeQuery']);
    });

    it('should correctly add the specified query', function () {
        var uiUpdateSpy = sandbox.spy();

        component.onUiUpdate(uiUpdateSpy);
        component.emit('addQuery', 'raw query');

        searchFormManagerStub.addQuery.calledOnce.should.be.true;
        searchFormManagerStub.addQuery.getCall(0).args[0].should.equal('raw query');

        uiUpdateSpy.calledOnce.should.be.true;

        component.getState().should.containDeep({
            currentQuery: 'raw query'
        });
    });

    it('should correctly remove a running query', function () {
        var uiUpdateSpy = sandbox.spy();

        component.emit('addQuery', 'raw query');

        // added after the addQuery event to get the more precise call count
        component.onUiUpdate(uiUpdateSpy);
        component.emit('removeQuery');

        searchRequestManagerStub.removeQuery.calledOnce.should.be.true;
        searchRequestManagerStub.removeQuery.getCall(0).args[0].should.equal('queryId');

        uiUpdateSpy.calledOnce.should.be.true;

        var state = component.getState();
        (state.currentQuery === null).should.be.true;
    });

    it('should correctly remove the old query whenever a new query starts', function () {
        var uiUpdateSpy = sandbox.spy();

        component.onUiUpdate(uiUpdateSpy);
        component.emit('addQuery', 'first query');

        searchRequestManagerStub.removeQuery.called.should.be.false;

        component.emit('addQuery', 'second query');

        searchRequestManagerStub.removeQuery.calledOnce.should.be.true;
        searchRequestManagerStub.removeQuery.getCall(0).args[0].should.equal('queryId');

        uiUpdateSpy.calledTwice.should.be.true;

        component.getState().should.containDeep({
            currentQuery: 'second query'
        });
    });
});
//# sourceMappingURL=UiSearchFormManagerComponent.js.map
