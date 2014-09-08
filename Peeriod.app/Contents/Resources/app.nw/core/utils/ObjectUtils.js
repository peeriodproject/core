// todo implement ObjectUtilsInterface
var ObjectUtils = (function () {
    function ObjectUtils() {
    }
    ObjectUtils.extend = function (obj1, obj2) {
        var obj3 = {};

        for (var attrname in obj1) {
            obj3[attrname] = obj1[attrname];
        }

        for (var attrname in obj2) {
            obj3[attrname] = obj2[attrname];
        }

        return obj3;
    };
    return ObjectUtils;
})();

module.exports = ObjectUtils;
/*
module objectUtils {
/**
* Overwrites obj1's values with obj2's and adds obj2's if non existent in obj1
*
* @see http://stackoverflow.com/a/171256
*
* @method {Object} core.utils.objectUtils.extend
*
* @param {Object} obj1
* @param {Object} obj2
* @returns {Object} obj3 a new object based on obj1 and obj2
* /
export function extend(obj1:Object, obj2:Object) {
var obj3:Object = {};
for (var attrname in obj1) {
obj3[attrname] = obj1[attrname];
}
for (var attrname in obj2) {
obj3[attrname] = obj2[attrname];
}
return obj3;
}
}
export = objectUtils;*/
//# sourceMappingURL=ObjectUtils.js.map
