'use strict';

var dbCon = require('./../../lib/db_connector'),
	reqBodyParser = require('./../../lib/requestBodyParser'),
	utils = require('./../../lib/utils'),
	errorHandler = require('./../../lib/errorHandler'),
	tileSetConfig = require('./tile_set.config'),
	tileSetUtils = require('./tile_set.utils'),
	crudUtils = require('./crud.utils.js'),
	addTileSet = require('./../../lib/addTileSet'); // custom action for POST method

/**
 * @desc CRUD function for getting collection of tileSets
 * @param {Object} req - HTTP request object
 * @param {Object} res - HTTP response object
 * @param {Function} next
 */
function getTileSetsCollection(req, res, next) {
	var filter = {
			status: utils.tileSetStatus.ok
		},
		limit = parseInt(req.query.limit, 10) || false,
		offset = parseInt(req.query.offset, 10) || 0,
		search = req.query.search || false,
		query = dbCon.knex(tileSetConfig.dbTable).column(tileSetConfig.getCollectionDbColumns).where(filter);

	// add search term to DB query
	if (search) {
		search = search.trim();

		if (!tileSetUtils.validateSearchTerm(search)) {
			next(
				errorHandler.badRequestError([tileSetConfig.searchErrorMsg])
			);
		}

		limit = tileSetUtils.setupSearchLimit(limit);
		tileSetUtils.addSearchToQuery(query, search);
	}

	if (limit) {
		crudUtils.addPaginationToQuery(query, limit, offset);
	}

	dbCon
		.getConnection(dbCon.connType.all)
		.then(function (conn) {
			return query
				.connection(conn)
				.select();
		})
		.then(function (collection) {
			utils.sendHttpResponse(
				res,
				200,
				tileSetUtils.processTileSetCollection(collection, req, tileSetUtils.extendTileSetObject)
			);
		})
		.fail(next);
}

/**
 * @desc CRUD function for getting tileSet
 * @param {Object} req - HTTP request object
 * @param {Object} res - HTTP response object
 * @param {Function} next
 */
function getTileSet(req, res, next) {
	var id = req.pathVar.id,
		filter;

	crudUtils.validateIdParam(id);
	id = parseInt(req.pathVar.id);
	filter = {
		id: id,
		status: utils.tileSetStatus.ok
	};

	dbCon
		.getConnection(dbCon.connType.all)
		.then(function (conn) {
			return dbCon.select(conn, tileSetConfig.dbTable, tileSetConfig.getTileSetDbColumns, filter);
		})
		.then(function (collection) {
			if (collection.length <= 0) {
				throw errorHandler.elementNotFoundError(tileSetConfig.dbTable, id);
			}

			utils.sendHttpResponse(res, 200, tileSetUtils.extendTileSetObject(collection[0], req));
		})
		.fail(next);
}

/**
 * @desc CRUD function for creating new tileSets
 * @param {Object} req - HTTP request object
 * @param {Object} res - HTTP response object
 * @param {Function} next
 */
function createTileSet(req, res, next) {
	var reqBody = reqBodyParser(req.rawBody);

	crudUtils.validateData(reqBody, tileSetConfig.createSchema);

	dbCon
		.getConnection(dbCon.connType.master)
		.then(function (conn) {
			return addTileSet(conn, tileSetConfig.dbTable, reqBody);
		})
		.then(function (data) {
			utils.sendHttpResponse(
				res,
				data.exists ? 200 : 201,
				tileSetUtils.setupCreateTileSetResponse(data, req)
			);
		})
		.fail(next);
}

/**
 * @desc Creates tileSet CRUD collection
 * @returns {object} - CRUD collection
 */
module.exports = function createCRUD() {
	return {
		handler: {
			GET: getTileSetsCollection,
			POST: createTileSet
		},
		wildcard: {
			GET: getTileSet
		}
	};
};
