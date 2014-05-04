import BucketFactoryInterface = require('./interfaces/BucketFactoryInterface');

import ConfigInterface = require('../config/interfaces/ConfigInterface');
import BucketStoreInterface = require('./interfaces/BucketStoreInterface');
import BucketInterface = require('./interfaces/BucketInterface');

class BucketFactory implements BucketFactoryInterface {

	create (config:ConfigInterface, key:string, store:BucketStoreInterface):BucketInterface {
		return undefined;
	}

}

export = BucketFactory;