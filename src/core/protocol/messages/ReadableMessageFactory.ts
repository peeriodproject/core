import ContactNodeFactoryInterface = require('../../topology/interfaces/ContactNodeFactoryInterface');
import ContactNodeFactory = require('../../topology/ContactNodeFactory');
import ContactNodeAddressFactoryInterface = require('../../topology/interfaces/ContactNodeAddressFactoryInterface');
import ContactNodeAddressFactory = require('../../topology/ContactNodeAddressFactory');
import ReadableMessageFactoryInterface = require('./interfaces/ReadableMessageFactoryInterface');
import ReadableMessageInterface = require('./interfaces/ReadableMessageInterface');
import ReadableMessage = require('./ReadableMessage');

class ReadableMessageFactory implements ReadableMessageFactoryInterface {

	private _nodeFactory:ContactNodeFactoryInterface = null;
	private _addressFactory:ContactNodeAddressFactoryInterface = null;

	constructor () {
		this._nodeFactory = new ContactNodeFactory();
		this._addressFactory = new ContactNodeAddressFactory();
	}

	create (buffer:NodeBuffer):ReadableMessageInterface {
		return new ReadableMessage(buffer, this._nodeFactory, this._addressFactory);
	}
}

export = ReadableMessageFactory;