var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var UiComponent = require('../UiComponent');

/**
* @class core.ui.UiSearchFormManagerComponent
* @implements core.ui.UiComponentInterface
*
* @param {core.search.SearchFormManagerInterface} searchFormManager
* @param {core.search.SearchRequestManagerInterface} searchRequestManager
*/
var UiSearchFormManagerComponent = (function (_super) {
    __extends(UiSearchFormManagerComponent, _super);
    function UiSearchFormManagerComponent(searchFormManager, searchRequestManager) {
        _super.call(this);
        /**
        * The internally used SearchFormManagerInterface instance to start new queries
        *
        * @member {core.search.SearchFormManagerInterface} core.ui.UiSearchFormManager~_searchFormManager
        */
        this._searchFormManager = null;
        /**
        * The internally used SearchRequestManagerInterface to remove old queries
        *
        * @member {core.search.SearchRequestManagerInterface} core.ui.UiSearchFormManager~_searchRequestManager
        */
        this._searchRequestManager = null;
        /**
        * Stores the currently running `queryId`
        *
        * todo add the ability to run multiple queries in parallel aka tabs
        *
        * @member {string} core.ui.UiSearchFormManager~_runningQueryId
        */
        this._runningQueryId = null;
        /**
        * todo ts-definition
        *
        */
        this._runningQuery = null;

        this._searchFormManager = searchFormManager;
        this._searchRequestManager = searchRequestManager;

        this._setupEventListeners();
    }
    UiSearchFormManagerComponent.prototype.getChannelName = function () {
        return 'search';
    };

    UiSearchFormManagerComponent.prototype.getEventNames = function () {
        return ['addQuery', 'removeQuery'];
    };

    UiSearchFormManagerComponent.prototype.getState = function () {
        return {
            currentQuery: this._runningQuery
        };
    };

    /**
    * Sets up the `addQuery` and `removeQuery` event listener
    *
    * @method core.ui.UiSearchFormManager~_setupEventListeners
    */
    UiSearchFormManagerComponent.prototype._setupEventListeners = function () {
        var _this = this;
        this.on('addQuery', function (rawQuery) {
            _this._removeRunningQuery();
            _this._addQuery(rawQuery);
        });

        this.on('removeQuery', function () {
            _this._removeRunningQuery();
            _this._runningQuery = null;
            _this._runningQueryId = null;

            return _this.updateUi();
        });
    };

    /**
    * Creates a new query and stores the `queryId` for further cleanup
    *
    * @param rawQuery
    */
    UiSearchFormManagerComponent.prototype._addQuery = function (rawQuery) {
        var _this = this;
        this._searchFormManager.addQuery(rawQuery, function (err, queryId) {
            if (err) {
                console.error(err);
            }

            _this._runningQuery = rawQuery;
            _this._runningQueryId = queryId;

            return _this.updateUi();
        });
    };

    /**
    * Removes the running query from the database
    *
    * @method core.ui.UiSearchFormManager~_removeRunningQuery
    */
    UiSearchFormManagerComponent.prototype._removeRunningQuery = function () {
        if (!this._runningQueryId) {
            return;
        }

        this._searchRequestManager.removeQuery(this._runningQueryId, function (err) {
            if (err) {
                console.error(err);
            }
        });
    };
    return UiSearchFormManagerComponent;
})(UiComponent);

module.exports = UiSearchFormManagerComponent;
//# sourceMappingURL=UiSearchFormManagerComponent.js.map
