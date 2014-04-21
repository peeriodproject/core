// Type definitions for node-webkit v0.8.6
// Project: https://github.com/rogerwang/node-webkit

/// <reference path='../node/node.d.ts' />

declare module "nw.gui" {
	import events = require("events");

	interface MenuItemOptions {
		label?: string;
		icon?: string;
		tooltip?: string;
		type?: string;
		click?: Function;
		checked?: boolean;
		enabled?: boolean;
		submenu?: Menu;
	}

	export class MenuItem extends events.EventEmitter implements MenuItemOptions {
		constructor(opts?:MenuItemOptions);
	}


	interface MenuOptions {
		type?: string;
	}

	export class Menu implements MenuOptions {
		items:MenuItem[];

		constructor(opts?:MenuOptions);

		append(item:MenuItem):void;

		insert(item:MenuItem, index:number):void;

		remove(item:MenuItem):void;

		removeAt(index:number):void;

		popup(x:number, y:number):void;
	}

	interface TrayOptions {
		title?: string;
		icon?: string;
		tooltip?: string;
		menu?: Menu;
		alticon?: string;
	}

	export class Tray extends events.EventEmitter implements TrayOptions {
		constructor(opts?:TrayOptions);

		remove():void;
	}

}

