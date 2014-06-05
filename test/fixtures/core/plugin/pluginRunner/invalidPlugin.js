exports.main = {
    onBeforeItemAdd: function () {
        invalidFunctonCall();
        // no exit method will be called!
    }
};