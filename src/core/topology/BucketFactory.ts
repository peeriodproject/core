import BucketFactoryInterface = require('./interfaces/BucketFactoryInterface');

import ConfigInterface = require('../config/interfaces/ConfigInterface');
import BucketStoreInterface = require('./interfaces/BucketStoreInterface');
import BucketInterface = require('./interfaces/BucketInterface');
import Bucket = require('./Bucket');

class BucketFactory implements BucketFactoryInterface {

	create (config:ConfigInterface, key:string, store:BucketStoreInterface):BucketInterface {
		return new Bucket(config, key, store);
	}

}

export = BucketFactory;