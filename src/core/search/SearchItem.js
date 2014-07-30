/// <reference path='../../../ts-definitions/node/node.d.ts' />
/**
* @class core.search.SearchItem
* @implements core.search.SearchItemInterface
*/
var SearchItem = (function () {
    function SearchItem(data) {
        this._hash = null;
        this._name = null;
        this._path = null;
        this._pluginIdentifiers = [];
        this._pluginData = {};
        this._score = 0;
        this._stats = null;
        if (!data || !Array.isArray(data) || !data.length) {
            throw new Error('SearchItem.constructor: Invalid data: ' + JSON.stringify(data));
        }

        // quick array copy
        data = data.slice();

        //var calcScoreAverage:boolean = false;
        var scoreDivider = 0;
        var testError = false;

        for (var i = 0, l = data.length; i < l; i++) {
            try  {
                var addToScoreAverage = this._processItem(data[i]);

                if (addToScoreAverage) {
                    scoreDivider++;
                }
            } catch (e) {
                testError = true;
                console.error(e);
            }
            //var item = data[i];
        }

        if (scoreDivider) {
            this._score = this._score / scoreDivider;
        } else {
            this._score = 1;
        }
    }
    SearchItem.prototype.getHash = function () {
        return this._hash;
    };

    SearchItem.prototype.getName = function () {
        return this._name;
    };

    SearchItem.prototype.getPath = function () {
        return this._path;
    };

    SearchItem.prototype.getPluginIdentifiers = function () {
        return this._pluginIdentifiers;
    };

    SearchItem.prototype.getPluginData = function (identifier) {
        return this._pluginData[identifier] ? this._pluginData[identifier] : null;
    };

    SearchItem.prototype.getScore = function () {
        return this._score;
    };

    SearchItem.prototype.getStats = function () {
        return this._stats;
    };

    /**
    * Processes a single hit and check whether it can be added to the item or not.
    * It pushes the identifier to the {@link core.search.SearchItem~_pluginIdentifiers} list and adds it's source to the
    * {@link core.search.SearchItem~_pluginData} Map as well as updating the {@link core.search.SearchItem~_score} field
    * and returning an indicator that the source update should be considered while calculating the average score.
    *
    * @method core.search.SearchItem~_processItem
    *
    * @param {Object} item The item that should be processed
    * @returns {boolean} A flag indicates whether the item updated the score or not.
    */
    SearchItem.prototype._processItem = function (item) {
        var source = item['_source'];
        var addToScoreAverage = false;

        if (!source) {
            return addToScoreAverage;
        }

        this._processItemMember('Hash', source);
        this._processItemMember('Name', source);
        this._processItemMember('Path', source);
        this._processItemMember('Stats', source);

        var identifier = item['_type'];

        // todo check identifier existence and throw error
        this._pluginIdentifiers.push(identifier);
        var score = item['_score'];

        // hits: calc average score
        if (!isNaN(score)) {
            addToScoreAverage = true;
            this._score += score;
        } else {
            this._score = 1;
        }

        // add plugin data
        if (Object.keys(source).length) {
            this._pluginData[identifier] = source;
        }

        return addToScoreAverage;
    };

    /**
    * @method core.search.SearchItem~_processItemMember
    *
    * @param {string} name
    * @param {Object} source
    */
    SearchItem.prototype._processItemMember = function (name, source) {
        var lower = name.toLowerCase();
        var memberName = '_' + lower;

        if (this[memberName] !== null) {
            var isValid = false;

            // strict equal for primitives
            if (typeof this[memberName] !== 'object') {
                isValid = this[memberName] === source['item' + name];
            } else {
                isValid = JSON.stringify(this[memberName]) === JSON.stringify(source['item' + name]);
            }

            if (!isValid) {
                console.log(name, this[memberName], source);
                throw new Error('SearchItem~_processItemMember: "_source.item' + name + '" must be equal in all plugin data!');
            }
        } else if (this[memberName] === null) {
            this[memberName] = source['item' + name];
        }

        delete source['item' + name];
    };
    return SearchItem;
})();

module.exports = SearchItem;
//# sourceMappingURL=SearchItem.js.map
