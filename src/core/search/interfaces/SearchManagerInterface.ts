/// <reference path='../../../../ts-definitions/node/node.d.ts' />

import fs = require('fs');

import SearchApiInterface = require('./SearchApiInterface');
/**
 * The SearchManager acts as a bridge between the SearchClient and the Indexer.
 * It passes a new file to the PluginManager for further analysis to get additional meta data before adding it to the index.
 *
 * @interface
 * @class core.search.SearchManagerInterface
 */
interface SearchManagerInterface extends SearchApiInterface {
}

export = SearchManagerInterface;