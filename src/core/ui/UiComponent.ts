/// <reference path='../../../ts-definitions/node/node.d.ts' />

import events = require('events');

import UiComponentInterface = require('./interfaces/UiComponentInterface');

/**
 * @class core.ui.UiComponent
 * @implements core.ui.UiComponentInterface
 */
class UiComponent extends events.EventEmitter implements UiComponentInterface {

	public getEventNames ():Array<string> {
		return [];
	}

	public getChannelName ():string {
		return undefined;
	}

	public getState ():Object {
		return {};
	}

	public onUiUpdate (listener:() => any):void {
		this.addListener('updateUi', listener);
	}

	public onAfterUiUpdate ():void {
	}

	public updateUi ():void {
		this.emit('updateUi');
	}

}

export = UiComponent;