


(function (main) {
    function onTest() {
        setState('foobar');
        var bar = getState();

        exit({ foo: 'foo', bar: bar });
    }
    main.onTest = onTest;

    function onBeforeItemAdd() {
        setState('foobar');
        /*var data = {
            name: getFileName(),
            stats: getStats()
        };*/

        var data = {
            name: fileName,
            stats: fileStats,
            state: getState()
        };

        //exit(data);
    }
    main.onBeforeItemAdd = onBeforeItemAdd;
})(exports.main || (exports.main = {}));
var main = exports.main;
//# sourceMappingURL=index.js.map
