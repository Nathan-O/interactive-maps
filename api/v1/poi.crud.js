'use strict';

var dbCon = require('./../../lib/db_connector'),
	reqBodyParser = require('./../../lib/requestBodyParser'),
	errorHandler = require('./../../lib/errorHandler'),
	utils = require('./../../lib/utils'),
	squidUpdate = require('./../../lib/squidUpdate'),
	poiConfig = require('./poi.config'),
	poiUtils = require('./poi.utils'),
	crudUtils = require('./crud.utils');

/**
 * @desc CRUD function for listing collection of all POIs
 * @param {Object} req - HTTP request object
 * @param {Object} res - HTTP response object
 * @param {Function} next callback for express.js
 */
function getPoisCollection(req, res, next) {
	dbCon.getConnection(dbCon.connType.all)
		.then(function (conn) {
			return dbCon.select(conn, poiConfig.dbTable, poiConfig.poiCollectionColumns);
		})
		.then(function (collection) {
			utils.sendHttpResponse(res, 200, collection);
		})
		.fail(next);
}

/**
 * @desc CRUD function for creating new POI
 * @param {Object} req - HTTP request object
 * @param {Object} res - HTTP response object
 * @param {Function} next callback for express.js
 */
function createPoi(req, res, next) {
	var reqBody = reqBodyParser(req.rawBody),
		mapId = reqBody.map_id,
		response = {
			message: poiConfig.responseMessages.created
		},
		dbConnection,
		poiId;

	crudUtils.validateData(reqBody, poiConfig.createSchema);

	utils.extendObject(reqBody, {
		updated_by: reqBody.created_by,
		created_on: dbCon.knex.raw('CURRENT_TIMESTAMP')
	});

	dbCon.getConnection(dbCon.connType.master)
		.then(function (conn) {
			dbConnection = conn;
			return dbCon.insert(conn, poiConfig.dbTable, reqBody);
		})
		.then(function (data) {
			poiId = data[0];

			utils.extendObject(response, {
				id: poiId,
				created_on: utils.responseUrl(req, utils.addTrailingSlash(req.route.path), poiId)
			});

			return utils.changeMapUpdatedOn(dbConnection, dbCon, mapId);
		})
		.then(function () {
			squidUpdate.purgeKey(utils.surrogateKeyPrefix + mapId, 'mapPoiCreated');
			poiUtils.addPoiDataToQueue(dbConnection, poiConfig.poiOperations.insert, poiId);
			utils.sendHttpResponse(res, 201, response);
		})
		.fail(next);
}

/**
 * @desc CRUD function for listing a POI data
 * @param {Object} req - HTTP request object
 * @param {Object} res - HTTP response object
 * @param {Function} next callback for express.js
 */
function getPoi(req, res, next) {
	var poiId = req.pathVar.id,
		filter;

	crudUtils.validateIdParam(poiId);
	poiId = parseInt(poiId, 10);
	filter = {
		id: poiId
	};

	dbCon.getConnection(dbCon.connType.all)
		.then(function (conn) {
			return dbCon.select(conn, poiConfig.dbTable, poiConfig.poiColumns, filter);
		})
		.then(function (data) {
			var poiData = data[0];
			if (!poiData) {
				throw errorHandler.elementNotFoundError(poiConfig.dbTable, poiId);
			}

			utils.sendHttpResponse(res, 200, poiData);
		})
		.fail(next);
}

/**
 * @desc CRUD function for deleting a POI
 * @param {Object} req - HTTP request object
 * @param {Object} res - HTTP response object
 * @param {Function} next callback for express.js
 */
function deletePoi(req, res, next) {
	var poiId = req.pathVar.id,
		filter,
		dbConnection,
		mapId;

	crudUtils.validateIdParam(poiId);
	poiId = parseInt(poiId, 10);
	filter = {
		id: poiId
	};

	dbCon.getConnection(dbCon.connType.master)
		.then(function (conn) {
			dbConnection = conn;
			return poiUtils.getMapIdByPoiId(conn, poiId);
		})
		.then(function (rows) {
			if (rows.length <= 0) {
				throw errorHandler.elementNotFoundError(poiConfig.dbTable, poiId);
			}

			mapId = rows[0].map_id;
			return dbCon.destroy(dbConnection, poiConfig.dbTable, filter);
		})
		.then(function () {
			return utils.changeMapUpdatedOn(dbConnection, dbCon, mapId);
		})
		.then(function () {
			squidUpdate.purgeKey(
				utils.surrogateKeyPrefix + mapId,
				'mapPoiDeleted'
			);
			poiUtils.addPoiDataToQueue(dbConnection, poiConfig.poiOperations.delete, poiId);
			utils.sendHttpResponse(res, 200, {message: poiConfig.responseMessages.deleted});
		})
		.fail(next);
}

/**
 * @desc CRUD function for updating a POI
 * @param {Object} req - HTTP request object
 * @param {Object} res - HTTP response object
 * @param {Function} next callback for express.js
 */
function updatePoi(req, res, next) {
	var reqBody = reqBodyParser(req.rawBody),
		poiId = req.pathVar.id,
		filter,
		mapId,
		dbConnection,
		response = {
			message: poiConfig.responseMessages.updated,
			id: poiId
		};

	crudUtils.validateData(reqBody, poiConfig.updateSchema);
	crudUtils.validateIdParam(poiId);
	poiId = parseInt(poiId, 10);
	filter = {
		id: poiId
	};

	dbCon.getConnection(dbCon.connType.master)
		.then(function (conn) {
			dbConnection = conn;
			return poiUtils.getMapIdByPoiId(dbConnection, poiId);
		})
		.then(function (rows) {
			if (rows.length <= 0) {
				throw errorHandler.elementNotFoundError(poiConfig.dbTable, poiId);
			}

			mapId = rows[0].map_id;
			return dbCon.update(dbConnection, poiConfig.dbTable, reqBody, filter);
		})
		.then(function () {
			response.url = utils.responseUrl(req, '/api/v1/poi/', poiId);
			return utils.changeMapUpdatedOn(dbConnection, dbCon, mapId);
		})
		.then(function () {
			squidUpdate.purgeKey(
				utils.surrogateKeyPrefix + mapId,
				'mapPoiUpdated'
			);
			poiUtils.addPoiDataToQueue(dbConnection, poiConfig.poiOperations.update, poiId);
			utils.sendHttpResponse(res, 303, response);
		})
		.fail(next);
}

/**
 * @desc Creates CRUD collection based on configuration object passed as parameter
 * @returns {object} - CRUD collection
 */
module.exports = function createCRUD() {
	return {
		handler: {
			GET: getPoisCollection,
			POST: createPoi
		},
		wildcard: {
			DELETE: deletePoi,
			GET: getPoi,
			PUT: updatePoi
		}
	};
};
