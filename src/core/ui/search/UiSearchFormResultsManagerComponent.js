var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var UiComponent = require('../UiComponent');

/**
* @class core.ui.UiSearchFormResultsManagerComponent
* @implements core.ui.UiComponentInterface
*
* @param {core.search.SearchFormResultsManagerInterface} searchFormManager
* @param {core.search.SearchRequestManagerInterface} searchRequestManager
*/
var UiSearchFormResultsManagerComponent = (function (_super) {
    __extends(UiSearchFormResultsManagerComponent, _super);
    function UiSearchFormResultsManagerComponent(searchFormResultsManager, searchRequestManager) {
        _super.call(this);
        /**
        * todo docs
        *
        * @member {string} core.ui.UiSearchFormResultsManagerComponent~_runningQueryId
        */
        this._currentResults = {};
        /**
        * The internally used.SearchFormResultsManagerInterface instance to start new queries
        *
        * @member {core.search.SearchFormResultsManagerInterface} core.ui.UiSearchFormResultsManagerComponent~_searchFormResultsManager
        */
        this._searchFormResultsManager = null;
        /**
        * The internally used SearchRequestManagerInterface to remove old queries
        *
        * @member {core.search.SearchRequestManagerInterface} core.ui.UiSearchFormResultsManagerComponent~_searchRequestManager
        */
        this._searchRequestManager = null;
        /**
        * Stores the currently running `queryId`
        *
        * todo add the ability to run multiple queries in parallel aka tabs
        *
        * @member {string} core.ui.UiSearchFormResultsManagerComponent~_runningQueryId
        */
        this._runningQueryId = null;
        /**
        * todo ts-definition, docs
        *
        * @member {any} core.ui.UiSearchFormResultsManagerComponent~_runningQuery
        */
        this._runningQuery = null;

        this._searchFormResultsManager = searchFormResultsManager;
        this._searchRequestManager = searchRequestManager;

        this._setupEventListeners();
    }
    UiSearchFormResultsManagerComponent.prototype.getChannelName = function () {
        return 'search';
    };

    UiSearchFormResultsManagerComponent.prototype.getEventNames = function () {
        return ['addQuery', 'removeQuery'];
    };

    UiSearchFormResultsManagerComponent.prototype.getState = function (callback) {
        return process.nextTick(callback.bind(null, {
            currentQuery: this._runningQuery,
            currentResults: this._currentResults
        }));
    };

    /**
    * Sets up the `addQuery` and `removeQuery` event listener
    *
    * @method core.ui.UiSearchFormResultsManagerComponent~_setupEventListeners
    */
    UiSearchFormResultsManagerComponent.prototype._setupEventListeners = function () {
        var _this = this;
        this.on('addQuery', function (rawQuery) {
            _this._removeRunningQuery();
            _this._addQuery(rawQuery);
        });

        this.on('removeQuery', function () {
            _this._removeRunningQuery();
            _this._runningQuery = null;
            _this._runningQueryId = null;
            _this._currentResults = null;

            return _this.updateUi();
        });

        this._searchRequestManager.onQueryResultsChanged(function (queryId) {
            if (queryId !== _this._runningQueryId) {
                return;
            }

            _this._searchRequestManager.getResponses(queryId, function (err, responses) {
                if (err || !responses || !responses.total) {
                    if (err) {
                        console.error(err);
                    }

                    return;
                }

                _this._searchFormResultsManager.transformResponses(responses.hits, true, function (err, transformedResults) {
                    if (err) {
                        console.error(err);

                        return;
                    }

                    responses.hits = transformedResults;

                    _this._currentResults = responses;
                    _this.updateUi();
                });
            });
        });
    };

    /**
    * Creates a new query if it differs from the stored {@link core.ui.UiSearchFormResultsManagerComponent~_runningQuery}
    * and stores the `queryId` for further cleanup.
    *
    * @method core.ui.UiSearchFormResultsManagerComponent~_addQuery
    *
    * @param rawQuery
    */
    UiSearchFormResultsManagerComponent.prototype._addQuery = function (rawQuery) {
        var _this = this;
        if (this._runningQuery === rawQuery) {
            return;
        }

        this._searchFormResultsManager.addQuery(rawQuery, function (err, queryId) {
            if (err) {
                console.error(err);
            }

            _this._runningQuery = rawQuery;
            _this._runningQueryId = queryId;
            _this._currentResults = null;

            return _this.updateUi();
        });
    };

    /**
    * Removes the running query from the database
    *
    * @method core.ui.UiSearchFormResultsManagerComponent~_removeRunningQuery
    */
    UiSearchFormResultsManagerComponent.prototype._removeRunningQuery = function () {
        if (!this._runningQueryId) {
            return;
        }

        this._searchRequestManager.removeQuery(this._runningQueryId, function (err) {
            if (err) {
                console.error(err);
            }
        });
    };
    return UiSearchFormResultsManagerComponent;
})(UiComponent);

module.exports = UiSearchFormResultsManagerComponent;
//# sourceMappingURL=UiSearchFormResultsManagerComponent.js.map
