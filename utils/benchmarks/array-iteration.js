var forLoopWithCachedKeysAndLength = function (arr) {
    for (var i = 0, l = arr.length; i < l; i++) {
        var val = arr[i];
    }
};

var forEachLoop = function (arr) {
    arr.forEach(function (key, val) {
        val;
    });
}

var arr = [];

for (var i = 0; i < 1000; i++) {
    arr[i] = 'value-' + i;
}

module.exports = {
    name: 'Array iteration',
    tests: {
        'for loop with cached keys and length': function() {
            forLoopWithCachedKeysAndLength(arr);
        },
        'array.forEach': function () {
            forEachLoop(arr);
        }
    }
};