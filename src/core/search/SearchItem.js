/// <reference path='../../../ts-definitions/node/node.d.ts' />
/**
* @class core.search.SearchItem
* @implements core.search.SearchItemInterface
*/
var SearchItem = (function () {
    function SearchItem(data) {
        this._hash = null;
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

        var calcScoreAverage = false;

        for (var i in data) {
            var item = data[i];
            var source = item['_source'];

            if (!source) {
                continue;
            }

            var identifier = item['_type'];

            // todo check identifier existence and throw error
            this._pluginIdentifiers.push(identifier);
            var score = item['_score'];

            // hits: calc average score
            if (!isNaN(score)) {
                calcScoreAverage = true;
                this._score += score;
            } else {
                this._score = 1;
            }

            if (source) {
                this._processItemMember('Hash', source);
                this._processItemMember('Path', source);
                this._processItemMember('Stats', source);
            }

            // add plugin data
            if (Object.keys(source).length) {
                this._pluginData[identifier] = source;
            }
        }

        if (calcScoreAverage) {
            this._score = this._score / this._pluginIdentifiers.length;
        }
    }
    SearchItem.prototype.getHash = function () {
        return this._hash;
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
