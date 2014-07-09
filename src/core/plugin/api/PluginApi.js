/**
* // todo docs
* @type {{getState: (function(): Object), setState: (function(Object): void)}}
*/
exports.api = (function () {
    var _state = {};

    return {
        getState: function () {
            return _state;
        },
        setState: function (state) {
            _state = state;
        }
    };
}());
//# sourceMappingURL=PluginApi.js.map
