var _state = {};

/**
* // todo docs
* @type {{getState: (function(): Object), setState: (function(Object): void)}}
*/
exports.api = {
    getState: function () {
        return _state;
    },
    setState: function (state) {
        console.log('setting the state', state);
        _state = state;
    }
};
//# sourceMappingURL=PluginApi.js.map
