interface ObjectUtilsInterface {

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
	 */
	extend:(obj1:Object, obj2:Object) => Object;
}

export = ObjectUtilsInterface;