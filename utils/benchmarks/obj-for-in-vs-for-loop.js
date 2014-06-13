var forInLoop = function (obj) {
	for (var key in obj) {
		var val = obj[key];	
	}
};

var forLoopWithCachedKeysAndLength = function (obj) {
	var keys = Object.keys(obj);

	for (var i = 0, l = keys.length; i < l; i++) {
		var val = obj[keys[i]];
	}
};

var keysAsArrayForEachLoop = function (obj) {
	var keys = Object.keys(obj);

	keys.forEach(function (key) {
		val = obj[key];
	});
}

var arrayWithStringsAsKeysForEachLoop = function (arr) {
	arr.forEach(function (key, val) {
		val;
	});
}

var objToTest = {};
var arrayToTest = [];

for (var i = 0; i < 1000; i++) {
	objToTest['i' + i] = 'value-' + i;
	arrayToTest['i' + i] = 'value-' + i;
}

module.exports = {
	name: 'Object key iteration',
	tests: {
		'for key in obj': function() {
			forInLoop(objToTest);
		},
		'for loop with cached keys and length': function() {
			forLoopWithCachedKeysAndLength(objToTest);
		},
		'get object keys as array. --> Array.forEach': function () {
			keysAsArrayForEachLoop(objToTest);
		},
		'array with strings as keys. --> array.forEach': function () {
			arrayWithStringsAsKeysForEachLoop(arrayToTest);
		}
	}
};