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

	export class MenuItem extends events.EventEmitter {
		label: string;
		icon: string;
		tooltip: string;
		type: string;
		checked: boolean;
		enabled: boolean;
		submenu: Menu;

		constructor(opts?:MenuItemOptions);
		click: Function;
	}


	interface MenuOptions {
		type?: string;
	}

	export class Menu implements MenuOptions {
		type: string;
		items: Array<MenuItem>;

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
		title: string;
		icon: string;
		tooltip: string;
		menu: Menu;
		alticon: string;

		constructor(opts?:TrayOptions);
		remove():void;
	}

	interface App extends events.EventEmitter {
		argv: Array<any>;
		fullArgv: Array<any>;

		datapath: string;
		manifest: Object;
		clearCache(): void;
		closeAllWindows(): void;
		crashBrowser(): void;
		crashRenderer(): void;
		getProxyForURL(url: string): string;
		quit(): void;
		setCrashDumpDir(dir: string): void;
	}

	export var App: App;

}

