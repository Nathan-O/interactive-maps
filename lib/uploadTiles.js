'use strict';

var Q = require('q'),
	dfs = require('./dfs'),
	config = require('./config'),
	utils = require('./utils'),
	logger = require('./logger');

module.exports = function uploadTiles(job) {
	var data = job.data,
		deferred = Q.defer(),
		filePaths = '{' + data.minZoom + '..' + data.maxZoom + '}/*/*.png',
		bucketName = utils.getBucketName(
			config.bucketPrefix + config.tileSetPrefix,
			data.tileSetId
		);

	data.bucket = bucketName;
	logger.info('Uploading files to: ' + bucketName);

	if (config.upload !== false) {
		if (data.status.uploaded) {
			deferred.resolve(job);
			logger.debug('Tiles already upladed to ' + bucketName);
		} else {
			dfs
				.sendFiles(bucketName, data.dir, filePaths)
				.then(function () {
					logger.debug('Tiles upladed to ' + bucketName);
					data.status.uploaded = true;
					job.save();
					deferred.resolve(job);
				})
			.catch (deferred.reject);
		}

	} else {
		logger.notice('Uploading images disabled');

		deferred.resolve(job);
	}

	return deferred.promise;
};
