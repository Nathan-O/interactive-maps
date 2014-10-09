'use strict';

var config = require('./config'),
	Q = require('q'),
	dbCon = require('./db_connector'),
	utils = require('./utils'),
	config = {
		rawColumns: {
			map: [
				'id',
				'title',
				'city_id',
				'deleted'
			],
			poi: [
				'id',
				'name',
				'link',
				'link_title',
				'description',
				'poi_category_id'
			],
			poiCategory: [
				'id',
				'name'
			]
		},
		fullColumns: {
			map: [
				'map.id',
					'map.title',
					'map.city_title',
					'map.city_url',
					'map.city_id',
					'map.locked',
					'map.updated_on',
					'map.tile_set_id',
					'tile_set.name',
					'tile_set.type',
					'tile_set.url',
					'tile_set.width',
					'tile_set.height',
					'tile_set.min_zoom',
					'tile_set.max_zoom',
					'tile_set.background_color',
					'tile_set.status',
					'tile_set.attribution',
					'tile_set.subdomains'
				],
			poi: [
				'id',
				'name',
				'poi_category_id',
				'description',
				'link',
				'link_title',
				'photo',
				'lat',
				'lon'
			],
			poiCategory: [
				'id',
				'parent_poi_category_id',
				'map_id',
				'name',
				'marker',
				'status'
			]
		}
	}

/**
 * @desc Load Map instance
 * @param {object} conn Database connection
 * @param {number} mapId
 * @returns {object} - promise
 */
function getMapInfo(conn, mapId) {
	return dbCon.knex('map')
		.join('tile_set', 'tile_set.id', '=', 'map.tile_set_id')
		.column(config.fullColumns.map)
		.where('map.id', '=', mapId)
		.andWhere(function () {
			this.whereIn('tile_set.status', [
				utils.tileSetStatus.ok,
				utils.tileSetStatus.processing,
				utils.tileSetStatus.private
			]);
		})
		.connection(conn)
		.select();
}

/**
 * @desc Fetches basic map information from DB
 * @param {object} conn Database connection
 * @param {number} mapId
 * @returns {object} promise
 */
function getRawMapInfo(conn, mapId) {
	return dbCon.knex('map')
		.column(config.rawColumns.map)
		.where('map.id', '=', mapId)
		.connection(conn)
		.select();
}

/**
 * @desc Load Points for map instance
 * @param {object} conn Database connection
 * @param {number} mapId
 * @param {bool} raw - indicates if just basic data needed (id, name and category id)
 * @returns {object} - promise
 */
function loadPois(conn, mapId, raw) {
	var columns = raw ? config.rawColumns.poi : config.fullColumns.poi;
	return dbCon.select(
		conn,
		'poi', columns, {
			map_id: mapId
		}
	).then(
		function (collection) {
			collection.forEach(function (item) {
				item.name = utils.escapeHtml(item.name);

				if (item.description) {
					item.description = utils.escapeHtml(item.description);
				}
			});
			return collection;
		}
	);
}

/**
 * @desc Load point types
 *
 * @param {object} conn Database connection
 * @param {number} mapId
 * @returns {object} - promise
 */
function loadPoiCategories(conn, mapId, raw) {
	var columns = raw ? config.rawColumns.poiCategory: config.fullColumns.poiCategory;
	return dbCon.select(
		conn,
		'poi_category',
		columns,
		{
			'map_id': mapId
		}
	).then(
		function (collection) {
			if(!raw){
				utils.handleDefaultMarker(collection);
				utils.convertMarkersNamesToUrls(collection, config.dfsHost, config.bucketPrefix, config.markersPrefix);
			}
			collection.forEach(function (item) {
				item.name = utils.escapeHtml(item.name);
			});
			return collection;
		}
	);
}

/**
 * @desc Get points
 * @param {object} conn Database connection
 * @param {object} mapData
 * @param {bool} raw - should return only basic info (id, name, poi category)
 * @returns {object} - promise
 */
function getPois(conn, mapData, raw) {
	var deferred = Q.defer();

	loadPois(conn, mapData.id, raw)
		.then(
		function (points) {
			mapData.pois = points;
			deferred.resolve(mapData);
		},
		function (error) {
			deferred.reject({
				code: 500,
				message: error
			});
		}
	);
	return deferred.promise;
}

/**
 * @desc Gets points types for map instance
 * @param {object} conn Database connection
 * @param {object} mapData
 * @param {bool} raw - should return only basic data (name, id)
 * @returns {object} - promise
 */
function getPoiCategories(conn, mapData, raw) {
	var deferred = Q.defer();

	loadPoiCategories(conn, mapData.id, raw).then(
		function (points) {
			mapData.poi_categories = points;

			deferred.resolve(mapData);
		},
		function (error) {
			deferred.reject({
				code: 500,
				message: error
			});
		}
	);

	return deferred.promise;
}

/**
 * @desc Gets only raw info about points (id, name, desc and poi category)
 * @param {object} conn Database connection
 * @param {object} mapData
 */
function getRawPois(conn, mapData) {
	return getPois(conn, mapData, true);
}

/**
 * @desc Gets only raw info about point types (id and name)
 * @param {object} conn Database connection
 * @param {object} mapData
 */
function getRawPoiCategories(conn, mapData) {
	return getPoiCategories(conn, mapData, true);
}

module.exports = {
	getMapInfo: getMapInfo,
	getRawMapInfo: getRawMapInfo,
	getPois: getPois,
	getRawPois: getRawPois,
	getPoiCategories: getPoiCategories,
	getRawPoiCategories: getRawPoiCategories
};
