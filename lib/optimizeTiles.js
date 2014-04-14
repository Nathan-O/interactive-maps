'use strict';

var Q = require('q'),
	exec = require('child_process').exec,
	config = require('./config'),
	logger = require('./logger'),
	utils = require('./utils');

/**
 * @desc optimize tile images
 * @param job {object} - job object
 * @returns {object} - promise
 */

module.exports = function optimizeTiles(job) {
	var data = job.data,
		deferred = Q.defer(),
		cmd = 'optipng -o7 ' + utils.getGlob(data.dir, data.minZoom, data.maxZoom, '/*/*.png');

	if (config.optimize !== false) {
		if (data.status.optimized) {
			deferred.resolve(job);
			logger.info('Tiles already optimized');
		} else {
			logger.info('Optimizing tiles in folder: ' + data.dir + ' with command: ' + cmd);

			exec(cmd, function (error, stdout, stderr) {
				if (error) {
					deferred.reject(job);
					//logger.error(stderr);
				} else {
					logger.info(stdout);
					data.status.optimized = true;
					job.save();
					deferred.resolve(job);
				}
			});
		}

	} else {
		logger.notice('Optimizing images disabled');
		deferred.resolve(data);
	}

	return deferred.promise;
};
