
(function (main) {
    function onInit() {
        exit(foo);
        /*var foo = getState();
        
        exit(foo);*/
    }
    main.onInit = onInit;

    function onTest() {
        setState('foobar');
        var bar = getState();

        exit({ foo: foo, bar: bar });
    }
    main.onTest = onTest;
})(exports.main || (exports.main = {}));
var main = exports.main;
//# sourceMappingURL=index.js.map
