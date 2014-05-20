// todo create propper ts module
declare var exit;
declare var getItemData;
declare var foo;
declare var getState;
declare var setState;

export module main {

	export function onInit() {
		exit(foo);
		/*var foo = getState();

		exit(foo);*/
	}

	export function onTest() {
		setState('foobar');
		var bar = getState();

		exit({ foo: foo, bar: bar });
	}

	/*export function onNewItemWillBeAdded () {
		var data = getItemData();
		exit('foobar');
	}*/
}