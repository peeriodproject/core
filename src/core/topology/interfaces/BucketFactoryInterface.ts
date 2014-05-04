import ConfigInterface = require('../../config/interfaces/ConfigInterface');
import BucketStoreInterface = require('./BucketStoreInterface');
import BucketInterface = require('./BucketInterface');

/**
 * @interface
 * @class core.topology.BucketFactoryInterface
 */
interface BucketFactoryInterface {

	create (config:ConfigInterface, key:string, store:BucketStoreInterface):BucketInterface;

}

export = BucketFactoryInterface;