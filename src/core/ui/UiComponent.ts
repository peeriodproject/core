/// <reference path='../../../ts-definitions/node/node.d.ts' />

import UiComponentInterface = require('./interfaces/UiComponentInterface');

/**
 * @class core.ui.UiComponent
 * @implements core.ui.UiComponentInterface
 */
class UiComponent implements UiComponentInterface {

	getChannelName ():string {
		return undefined;
	}

	/*onMessage (message:any):void {
	}*/

	onConnection (spark:any) {
	}

}

export = UiComponent;