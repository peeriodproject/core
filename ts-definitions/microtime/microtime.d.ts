// Type definitions for node-microtime
// Project: https://github.com/wadey/node-microtime

declare module "microtime" {

	export function now():number;
	export function nowDouble():number;
	export function nowStruct():Array<number>;

}