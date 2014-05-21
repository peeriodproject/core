// sandbox exit callback
declare function exit(output?:any):void;

// api methods
declare function getState():any;
declare function setState(state:any):void;

// plugin globals
declare function getFileName():string;
declare function getStats():Object;

export module main {

	export function onTest() {
		setState('foobar');
		var bar = getState();

		exit({ foo: 'foo', bar: bar });
	}

	export function onBeforeItemAdd () {
		var data = {
			name: getFileName(),
			stats: getStats()
		};

		exit(data);
	}
}