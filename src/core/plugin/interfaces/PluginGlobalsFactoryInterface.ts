/// <reference path='../../../../ts-definitions/node/node.d.ts' />

import fs = require('fs');

/**
 * @interface
 * @class core.search.SearchPluginApiInterface
 */
interface PluginGlobalsFactoryInterface {

	create(itemPath:string, stats:fs.Stats):Object;

}

export = PluginGlobalsFactoryInterface;