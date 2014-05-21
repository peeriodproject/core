var _state = {};

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
