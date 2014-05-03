/// <reference path='../test.d.ts' />
/**
*
*/
var testUtils;
(function (testUtils) {
    function stubPublicApi(sandbox, klass, apiMethodCallbacks) {
        var proto = klass.constructor();
        var keys = Object.keys(klass.prototype);
        var stubbed = {};

        for (var attr in klass.prototype) {
            proto[attr] = klass.prototype[attr];
        }

        for (var i in keys) {
            var key = keys[i];
            var method = proto[key];

            // look for public methods
            if (typeof method === 'function' && key.charAt(0) !== '_') {
                if (apiMethodCallbacks[key]) {
                    stubbed[key] = sandbox.stub(proto, key, apiMethodCallbacks[key]);
                } else {
                    stubbed[key] = sandbox.stub(proto, key);
                }
                /*}
                else {
                console.log('spy on ' + key);
                spies[key] = sandbox.spy()
                }*/
            }
        }

        return stubbed;
    }
    testUtils.stubPublicApi = stubPublicApi;
})(testUtils || (testUtils = {}));

module.exports = testUtils;
//# sourceMappingURL=testUtils.js.map
