'use strict';

var config = require('./config' ),
	utils = require('./utils' ),
	Q = require('q'),
	dbConnector = require('./db_connector');

/**
 * @desc Load Map instance
 * @param mapInstanceId {integer}
 * @returns {promise}
 */
function loadMapInstance( mapInstanceId ) {
	return dbConnector.select(
		'map_instance',
		[
			'id',
			'map_id',
			'title',
			'locked'
		],
		{
			id: mapInstanceId
		}
	);
}

/**
 * @desc Load Map
 * @param mapId {integer}
 * @returns {promise}
 */
function loadMap(mapId) {
	return dbConnector.select(
		'map',
		[
			'name',
			'type',
			'min_zoom',
			'max_zoom'
		],
		{
			id: mapId
		}
	);
}

/**
 * @desc Load Points for map instance
 * @param mapInstanceId {integer}
 * @returns {promise}
 */
function loadPoints(mapInstanceId) {
	return dbConnector.select(
		'poi',
		[
			'name',
			'poi_category_id',
			'description',
			'link',
			'photo',
			'lat',
			'lon'
		],
		{
			map_instance_id: mapInstanceId
		}
	);
}

/**
 * @desc Load point types
 * @param points {array}
 * @returns {promise}
 */
function loadTypes(points) {
	var typeIds = [];
	points.forEach(function(point) {
		typeIds.push(parseInt(point.poi_category_id, 10));
	});

	return dbConnector.knex('poi_category')
		.column([
			'id',
			'name',
			'marker'
		])
		.whereIn('id', typeIds)
		.select();
}

/**
 * @desc Load Map setup
 * @param mapInstanceId
 * @returns {promise}
 */
function loadMapSetup( mapInstanceId ) {
	var deferred = Q.defer(),
		handleError = function(error) {
			deferred.reject(error);
		};

	loadMapInstance(mapInstanceId).then(
		function (result) {
			if ( (result.length) === 0 ){
				deferred.reject('Map not found');
			} else {
				result = result[0];
				loadMap(result.map_id ).then(
					function(map) {
						map = map[0];
						utils.extendObject(result, map);
						loadPoints(mapInstanceId).then(
							function(points) {
								result.points = points;
								if ( points.length > 0 ) {
									loadTypes(points).then(
										function(types) {
											result.types = types;
											deferred.resolve(result);
										},
										handleError
									);
								} else {
									result.types = [];
									deferred.resolve(result);
								}
							},
							handleError
						);
					},
					handleError
				);
			}
		},
		handleError
	);

	return deferred.promise;
}

/**
 * Generate path template for map
 * @param mapName {string}
 * @returns {string}
 */
function getPathTemplate(mapName) {
	var bucketName = utils.getBucketName(config.bucketPrefix, mapName);
	return 'http://images.wikia.com/' + bucketName + '/{z}/{x}/{y}.png';
}

module.exports = {
	middleware: function(req, res) {
		var mapInstanceId = parseInt(req.params.id, 10),
			latitude = parseFloat(req.params.lat),
			longitude = parseFloat(req.params.lon),
			zoom = parseInt(req.params.zoom, 10);

		loadMapSetup(mapInstanceId ).then(function(mapSetup){
			mapSetup.latitude = latitude;
			mapSetup.longitude = longitude;
			mapSetup.zoom = Math.max(Math.min(zoom, mapSetup.max_zoom), mapSetup.min_zoom);
			mapSetup.pathTemplate = getPathTemplate(mapSetup.name);
			mapSetup.imagePath = config.assetsBase || '';

			res.render('render.html', {
				mapSetup: JSON.stringify(mapSetup)
			});
		}).catch(function(err){
			res.send(404, 'Interactive map not found. An unicorn is weeping');
		});
	}
};
