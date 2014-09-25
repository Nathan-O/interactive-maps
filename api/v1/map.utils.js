'use strict';

var dbCon = require('./../../lib/db_connector'),
	config = require('./../../lib/config'),
	utils = require('./../../lib/utils'),
	mapConfig = require('./map.config');

/**
 * @desc Builds object which is later used in knex.orderBy()
 *       Default value is { column: 'created_on', direction: 'desc' }
 * @param {String} sort description of sorting passed as GET parameter i.e. title_asc
 * @returns {object}
 */
function buildSort(sort) {
	if (mapConfig.sortingOptions.hasOwnProperty(sort)) {
		return mapConfig.sortingOptions[sort];
	}

	// default sorting type
	return mapConfig.sortingOptions.created_on;
}

/**
 * @desc Builds maps collection list
 * @param {array} collection List of maps
 * @param {object} req Express request object
 * @returns {array}
 */
function buildMapCollectionResult(collection, req) {
	collection.forEach(function (value) {
		value.image = utils.imageUrl(
			config.dfsHost,
			utils.getBucketName(
				config.bucketPrefix + config.tileSetPrefix,
				value.tile_set_id
			),
			value.image
		);
		value.url = utils.responseUrl(
			req,
			utils.addTrailingSlash(req.route.path),
			value.id
		);

		delete value.tile_set_id;
	});
	return collection;
}

/**
 * @desc Returns an instance of knex query
 * @param {object} conn database connection object
 * @param {object} filter filtering options (passed to WHERE clause in SQL query)
 * @param {object} tileSetStatuses another parameter passed to WHERE clause in SQL query
 * @param {object} sort sorting options object; it's required for it to have column and direction fields
 * @returns {object} knex query instance
 */
function getMapsCollectionQuery(conn, filter, tileSetStatuses, sort) {
	return dbCon.knex(mapConfig.dbTable)
		.join('tile_set', 'tile_set.id', '=', 'map.tile_set_id')
		.column(mapConfig.mapsCollectionColumns)
		.where(filter)
		.whereIn('tile_set.status', tileSetStatuses)
		.orderBy(sort.column, sort.direction)
		.connection(conn);
}

/**
 * @desc Returns an instance of knex query with results of count() on map table
 * @param {Object} conn database connection object
 * @param {Object} filter filtering options (passed to WHERE clause in SQL query)
 * @param {Object} tileSetStatuses another parameter passed to WHERE clause in SQL query
 * @returns {Object} knex query instance
 */
function getMapsCountQuery(conn, filter, tileSetStatuses) {
	return dbCon.knex(mapConfig.dbTable)
		.join('tile_set', 'tile_set.id', '=', 'map.tile_set_id')
		.where(filter)
		.whereIn('tile_set.status', tileSetStatuses)
		.connection(conn);
}

module.exports = {
	getMapsCollectionQuery: getMapsCollectionQuery,
	getMapsCountQuery: getMapsCountQuery,
	buildSort: buildSort,
	buildMapCollectionResult: buildMapCollectionResult
};
