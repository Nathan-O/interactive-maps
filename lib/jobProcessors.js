'use strict';

var dbCon = require('./db_connector'),
	sizeOf = require('image-size'),
	utils = require('./utils'),
	config = require('./config'),
	Q = require('q'),
	fetchImage = require('./fetchImage'),
	generateTiles = require('./generateTiles'),
	optimizeTiles = require('./optimizeTiles'),
	uploadTiles = require('./uploadTiles'),
	cleanupTiles = require('./cleanupTiles'),
	jobs = require('kue').createQueue(config),
	logger = require('./logger'),
	dbTable = 'map',
	tmpDir = config.tmp,
	context;

function removeFailedMap(id) {
	dbCon.destroy(dbTable, {
		id: id
	})
		.then(function () {
			context = {
				job: 'db',
				action: 'removing failed map',
				id: id
			};
			logger.info('Deleted map with id: ' + id, logger.getContext(context));
		});
}

// queue job process for creating tiles from image
jobs.process('tiling', config.kue.maxCutTilesJobs, function (job, done) {
	logger.debug('job tiling starts ' + job.data.name);

	generateTiles(job.data)
		.then(optimizeTiles)
		.then(uploadTiles)
		.then(cleanupTiles)
		.then(updateMap)
		.then(done)
		.catch (function (error) {
			context = {
				job: 'tiling',
				error: error
			};
			logger.error(error, logger.getContext(context));

			done({
				message: 'generating tiles failed'
			});
		})
		.done();
});

jobs.process('process', config.kue.maxFetchJobs, function (job, done) {

	job.data.dir = tmpDir;

	fetchImage(job.data)
		.then(setupTiling)
		.then(function(){
			done();
		})
		.catch (function (error) {
			context = {
				job: 'fetching image',
				error: error
			};
			logger.error(error, logger.getContext(context));

			done({
				message: 'Fetching a file failed'
			});
		})
		.done();
});

/**
 *
 * @param {String} image image file name
 * @param {String} dir directory that the file is sored in
 * @param {Object} dimensions dimensions of an image
 * @param {Object} data Additional info about a map
 * @returns {Function} Function that returns object that represents a given job
 */
function createJobDataGetter(image, dir, dimensions, data) {
	return function (minZoom, maxZoom) {
		return {
			image: image,
			dir: dir,
			minZoom: minZoom,
			maxZoom: maxZoom || minZoom,
			width: dimensions.width,
			height: dimensions.height,
			user: data.user,
			name: data.name,
			mapId: data.mapId
		};
	};
}

/**
 * Function that adds a tiling job to a queue
 *
 * @param data job data
 * @param priority
 * @param attempts
 */
function createJob(data, priority, attempts){
	jobs.create('tiling', data)
		.priority(priority)
		.attempts(attempts)
		.save()
		.on('complete', function(){
			logger.debug('Job tiling complete');
		}).on('failed', function(){
			logger.error('Job tiling failed');

			removeFailedMap(data.mapId);
		}).on('failed attempt', function(){
			logger.warning('Job tiling failed but will retry');
		});
}

/**
 * @desc Create tiling job for uploaded image
 * @param data {object} - object with data for setup tiling
 * @returns {object} - promise
 */
function setupTiling(data) {
	var deferred = Q.defer(),
		fullPath = data.dir + data.image,
		dimensions = sizeOf(fullPath),
		maxZoomLevel = utils.getMaxZoomLevel(dimensions.width, dimensions.height, config.maxZoom),
		dir = tempName('TILES_', data.image),
		firstMaxZoomLevel = Math.min(config.minZoom + config.firstBatchZoomLevels, maxZoomLevel),
		jobData = createJobDataGetter(fullPath, dir, dimensions, data),
		i = firstMaxZoomLevel + 1,
		attempts = config.kue.cutTilesAttempts || 1,
		context = {
			job: 'tiling',
			action: 'setup',
			fullPath: fullPath,
			dimensions: dimensions,
			maxZoomLevel: maxZoomLevel
		};

	logger.info('Creating tiling job', logger.getContext(context));
	logger.info('Original size: ' + dimensions.width + ' x ' + dimensions.height);
	logger.info('Max zoom level: ' + maxZoomLevel);
	logger.info('First batch levels: ' + config.minZoom + ' ' + firstMaxZoomLevel);

	// create tiling job for initial zoom levels with high priority
	createJob(jobData(config.minZoom, firstMaxZoomLevel, true), 'high', attempts);

	// create tiling jobs for higher zoom levels with low priority not to block tiling processing for new uploaded maps
	for (; i <= maxZoomLevel; i++) {
		createJob(jobData(i), 'low', attempts);
	}

	deferred.resolve();

	return deferred.promise;
}

/**
 * @desc returns temporary directory name based on given params
 * @param prefix {string} - prefix added to dir name
 * @param fileName {string} - name of the file
 * @returns {string} - temporary directory name
 */

function tempName(prefix, fileName) {
	return tmpDir + prefix + fileName; //+ '_' + (+new Date());
}

/**
 * Function that adds a map to DB or update its status
 * Query DB with map CREATE and UPDATE
 *
 * @param data object with data to send to DB
 * @returns {Q.promise}
 */
function updateMap(data) {
	var deferred = Q.defer(),
		object,
		where;

	// object mapped to db columns for updating map
	// TODO: if data properties would be mapped to db columns we could avoid this step
	object = {
		max_zoom: data.maxZoom,
		width: data.width,
		height: data.height
	};
	// update map of given name
	where = {
		id: data.mapId
	};
	context = {
		job: 'db',
		action: 'updating Map',
		object: object,
		id: data.mapId
	};
	// update map in DB with higher zoom levels
	logger.info('Updating: ' + [data.mapId, data.name, data.maxZoom].join(' '));

	dbCon.update(dbTable, object, where)
		.then(function () {
			logger.info('Updated: ' + data.name + ' ' + data.mapId, logger.getContext(context));
			deferred.resolve();
		})
		.
	catch (function (err) {
		context.error = err;
		logger.error(err, logger.getContext(context));
		deferred.reject(err);
	});

	return deferred.promise;
}
