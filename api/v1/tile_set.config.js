'use strict';

var jsonValidator = require('./../../lib/jsonValidator'),
	cachingUtils = require('./../../lib/cachingUtils'),
	minSearchCharacters = 2;

module.exports = {
	dbTable: 'tile_set',
	getCollectionDbColumns: [
		'tile_set.id',
		'tile_set.name',
		'tile_set.type',
		'tile_set.status',
		'tile_set.width',
		'tile_set.height',
		'tile_set.image'
	],
	getTileSetDbColumns: [
		'id',
		'name',
		'type',
		'image',
		'width',
		'height',
		'min_zoom',
		'max_zoom',
		'status',
		'created_by',
		'created_on',
		'attribution',
		'subdomains'
	],
	responseMessages: {
		created: 'Tile set added to processing queue',
		canceled: 'This tile set already exists'
	},
	createSchema: {
		description: 'Schema for creating tile set',
		type: 'Object',
		properties: {
			name: {
				description: 'Tile set name',
				type: 'string',
				required: true,
				minLength: 1,
				maxLength: 255
			},
			url: {
				description: 'URL to image from which tiles wil be created',
				type: 'string',
				pattern: jsonValidator.getUrlPattern(),
				required: true,
				maxLength: 255
			},
			created_by: {
				description: 'Creator user name',
				type: 'string',
				required: true,
				minLength: 1,
				maxLength: 255
			}
		},
		additionalProperties: false
	},
	sortingOptions: {
		desc: {
			column: 'created_on',
			direction: 'desc'
		},
		asc: {
			column: 'created_on',
			direction: 'asc'
		}
	},
	searchLimit: 50,
	minSearchCharacters: minSearchCharacters,
	searchErrorMsg: 'Search string should be at least ' + minSearchCharacters + ' long.',
	//Unique debug strings naming actions that trigger the purge
	purgeCallers: {
		created: 'tileSetCreated'
	},
	//Cache validity for the public GET methods on / and /:id
	cacheValidity: {
		forCollection: cachingUtils.cacheStandard,
		forWildcard: cachingUtils.cacheStandard
	},
	surrogateKeys: {
		forCollection: 'tileSet-collection'
	},
	path: 'tile_set/'
};
