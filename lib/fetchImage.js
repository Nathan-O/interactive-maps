/**
 * Module that handles fetching an image from an URL
 */
'use strict';

var http = require('http'),
	url = require('url'),
	fs = require('fs'),
	Q = require('q'),
	logger = require('./logger');

/**
 * @desc  uploading custom map image
 * @param data {object} object with data about map that will be created (name, image url, temp dir etc.)
 * @returns {object} - promise
 */

module.exports = function getFile(data) {
	var deferred = Q.defer(),
		fileName = url.parse(data.fileUrl).pathname.split('/').pop(),
		file = fs.createWriteStream(data.dir + fileName);

	logger.debug('Fetching file: ' + data.fileUrl);

	http.get(data.fileUrl, function (res) {
		if (res.statusCode === 200) {
			res.on('data', function (data) {
				file.write(data);
			}).on('end', function () {
				file.end();
				logger.debug('File "' + fileName + '" downloaded to: ' + data.dir);

				data.image = fileName;

				deferred.resolve(data);
			});
		} else {
			deferred.reject({
				message: 'Could not fetch file'
			});
		}
	}).on('error', function (e) {
		deferred.reject(e);
	});

	return deferred.promise;
};
