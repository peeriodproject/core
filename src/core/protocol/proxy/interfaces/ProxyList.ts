import ContactNodeInterface = require('../../../topology/interfaces/ContactNodeInterface');

/**
 * @interface
 * @class core.protocol.proxy.ProxyList
 */
interface ProxyList {
	[identifier:string]:ContactNodeInterface;
}

export = ProxyList;