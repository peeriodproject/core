import ContactNodeInterface = require('../../../topology/interfaces/ContactNodeInterface');

interface ProxyList {
	[identifier:string]:ContactNodeInterface;
}

export = ProxyList;