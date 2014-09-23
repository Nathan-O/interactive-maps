'use strict';

var dbCon = require('./../../lib/db_connector'),
	errorHandler = require('./../../lib/errorHandler'),
	utils = require('./../../lib/utils'),
	Q = require('q'),
	config = require('./../../lib/config'),
	poiCategoryConfig = require('./poi_category.config'),
	poiConfig = require('./poi.config');

function updatePoisFromUsedCategory(conn, id) {
	return dbCon.update(
		conn,
		poiConfig.dbTable,
		{
			poi_category_id: config.catchAllCategoryId
		},
		{
			poi_category_id: id
		}
	);
}

function deleteCategory(conn, id) {
	return dbCon.destroy(
		conn,
		poiCategoryConfig.dbTable,
		{
			id: id
		}
	);
}

/**
 * @desc Handle deleting used categories by moving all points to CatchAll category
 *
 * @param {object} conn
 * @param {number} id
 * @param {object} res
 * @param {function} next
 */
function handleUsedCategories(conn, id, res, next) {
	updatePoisFromUsedCategory(conn, id).then(function (rowsAffected) {
		if (rowsAffected > 0) {
			deleteCategory(conn, id).then(function (affectedRows) {
				if (affectedRows > 0) {
					utils.sendHttoResponse(res, 204, {});
				} else {
					next(errorHandler.elementNotFoundError(poiCategoryConfig.dbTable, id));
				}
			}, next);
		} else {
			next(errorHandler.elementNotFoundError(poiCategoryConfig.dbTable, id));
		}
	}, next);
}

/**
 * @desc Gets map id for a POI category
 *
 * @param {Object} conn - Database connection
 * @param {Number} poiCategoryId
 * @returns {Object} - promise
 */
function getMapId(conn, poiCategoryId) {
	var deferred = Q.defer(),
		query = dbCon.knex(poiCategoryConfig.dbTable)
			.column(['map_id'])
			.connection(conn)
			.where({
				id: poiCategoryId
			});

	query.select().then(
		function (collection) {
			if (collection[0]) {
				deferred.resolve(parseInt(collection[0].map_id, 10));
			} else {
				deferred.reject();
			}
		}
	);

	return deferred.promise;
}

function processPoiCategoriesCollection(collection) {
	utils.handleDefaultMarker(collection);
	utils.convertMarkersNamesToUrls(
		collection,
		config.dfsHost,
		config.bucketPrefix,
		config.markersPrefix
	);

	return collection;
}

function setupCreatePoiCategoryResponse(id, req) {
	return {
		message: 'POI category successfully created',
		id: id,
		url: utils.responseUrl(req, utils.addTrailingSlash(req.route.path), id)
	};
}

// If the delete request results an error, check if the error is reference error
// (caused by non able to delete foreign key) and handle this case by calling
// the handleUsedCategories function, otherwise handle the error as regular
// error

function isDeletedCategoryUsed(err) {
	return errorHandler.isHandledSQLError(err.clientError.name) &&
	err.clientError.cause.code === 'ER_ROW_IS_REFERENCED_';
}

module.exports = {
	handleUsedCategories: handleUsedCategories,
	getMapId: getMapId,
	processPoiCategoriesCollection: processPoiCategoriesCollection,
	setupCreatePoiCategoryResponse: setupCreatePoiCategoryResponse,
	isDeletedCategoryUsed: isDeletedCategoryUsed
};
