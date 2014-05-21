/// <reference path='../../../../ts-definitions/node/node.d.ts' />

import fs = require('fs');

/**
 * @interface
 * @class core.plugin.PluginInterface
 */
interface PluginInterface {

	onBeforeItemAdd (itemPath:string, stats:fs.Stats, callback:Function):void;

}

export = PluginInterface;