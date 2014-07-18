/// <reference path='../test.d.ts' />
var fs = require('fs-extra');

var path = require('path');

/**
*
*/
var testUtils;
(function (testUtils) {
    function stubPublicApi(sandbox, klass, apiMethodCallbacks) {
        if (typeof apiMethodCallbacks === "undefined") { apiMethodCallbacks = {}; }
        var proto = klass.constructor();

        var keys = Object.keys(klass.prototype);

        var stubbed = {};

        var p = klass.prototype;
        while (p) {
            p = p.__proto__;
            if (p)
                keys = keys.concat(Object.keys(p));
        }

        for (var attr in klass.prototype) {
            proto[attr] = klass.prototype[attr];
        }

        for (var i in keys) {
            var key = keys[i];
            var method = proto[key];

            // look for public methods
            if (typeof method === 'function' && key.charAt(0) !== '_') {
                // restoring base class stub
                if (stubbed[key] && stubbed[key].calledBefore) {
                    stubbed[key].restore();
                }

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

    function getFixturePath(fixturePath) {
        return path.join(process.cwd(), 'test/fixtures/', fixturePath);
    }
    testUtils.getFixturePath = getFixturePath;
    ;

    function createFolder(folderPath) {
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath);
        }
    }
    testUtils.createFolder = createFolder;
    ;

    function copyFolder(from, to) {
        var to = (path.resolve(to) === to) ? to : testUtils.getFixturePath(to);

        fs.copySync(path.resolve(process.cwd(), from), to);
    }
    testUtils.copyFolder = copyFolder;

    /**
    * @see http://www.geedew.com/2012/10/24/remove-a-directory-that-is-not-empty-in-nodejs/
    */
    function deleteFolderRecursive(path) {
        if (fs.existsSync(path)) {
            fs.readdirSync(path).forEach(function (file, index) {
                var curPath = path + '/' + file;
                if (fs.lstatSync(curPath).isDirectory()) {
                    testUtils.deleteFolderRecursive(curPath);
                } else {
                    fs.unlinkSync(curPath);
                }
            });

            fs.rmdirSync(path);
        }
    }
    testUtils.deleteFolderRecursive = deleteFolderRecursive;
    ;
})(testUtils || (testUtils = {}));

module.exports = testUtils;
//# sourceMappingURL=testUtils.js.map
