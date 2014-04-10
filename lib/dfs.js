/**
 * Modules that handles DFS
 */
'use strict';

var Q = require('q'),
	config = require('./config'),
	glob = require('glob'),
	http = require('http'),
	url = require('url'),
	fs = require('fs'),
	logger = require('./logger'),
	auth,
	context;

function getFilePaths(dir, glo) {
	return function () {
		var deferred = Q.defer();

		glob(glo, {
			cwd: dir
		}, function (err, files) {
			if (!err) {
				deferred.resolve(files);
			} else {
				deferred.reject(err);
			}
		});

		return deferred.promise;
	};
}

function uploadFiles(dir, name) {
	return function (files) {
		var deferred = Q.defer(),
			uri = url.parse(auth.url),
			path = uri.path + '/' + name + '/',
			length = files.length;

		files.forEach(function (file) {
			fs.readFile(dir + '/' + file, function (err, data) {
				if (err) {
					logger.error('Cannot read file', {dir: dir, file: file, url: url});
					throw err; // Fail if the file can't be read.
				}

				var req = http.request({
					hostname: uri.hostname,
					path: path + file,
					method: 'PUT',
					headers: {
						'Content-Length': data.length,
						'Content-Type': 'image/' + file.split('.').pop(),
						'X-Auth-Token': auth.token,
						'X-Container-Read': read,
						'X-Container-Write': config.swift.swiftUser
					}
				}, function (res) {
					if (res.statusCode === 201) {
						logger.info('Saved file: ' + file);
					} else if (res.statusCode === 404) {
						logger.error('Cannot save file', {path: path, file: file, response: 404, verb: 'PUT'});
					}

					length -= 1;

					// We have all images in DFS now
					if (length <= 0) {
						deferred.resolve(res);
					}
				});

				req.write(data);
				req.end();
			});
		});

		return deferred.promise;
	};
}

function setBucket(auth, name) {
	var deferred = Q.defer(),
		uri = url.parse(auth.url);

	http.request({
		hostname: uri.hostname,
		path: uri.path + '/' + name,
		method: 'POST',
		headers: {
			'Content-Length': 0,
			'X-Auth-Token': auth.token,
			'X-Container-Read': read,
			'X-Container-Write': config.swift.swiftUser
		}
	}, function (res) {
		logger.info('Setting readable bucket: ' + res.statusCode);
		context = {
			job: 'DFS',
			action: 'Setting bucket',
			path: path,
			verb: 'POST',
			response: res.statusCode
		};
		if (res.statusCode === 202) {
			logger.info(, 'Bucket set', context);
			deferred.resolve(auth);
		} else {
			//TODO: throw an error or reject promise or maybe a retry ?
			logger.warning('Bucket not set', context);
			deferred.reject(auth);
		}

	}).end();

	return deferred.promise;
}

function createBucket(name) {
	return function (auth) {
		var deferred = Q.defer(),
			uri = url.parse(auth.url);

		http.request({
			hostname: uri.hostname,
			path: uri.path + '/' + name,
			method: 'PUT',
			headers: {
				'Content-Length': 0,
				'X-Auth-Token': auth.token,
				'X-Container-Read': read,
				'X-Container-Write': config.swift.swiftUser
			}
		}, function (res) {
			logger.info('Creating a bucket:' + res.statusCode);

			if (res.statusCode === 201) {
				logger.info('Done');

				setBucket(auth, name)
					.then(function () {
						deferred.resolve(auth);
					});
				//not authorized or path has changed
			} else if (res.statusCode === 401 || res.statusCode === 404) {
				deferred.reject({
					message: 'Not authorized or wrong path given'
				});
			} else {
				//TODO: throw an error or reject promise or maybe a retry ?
				deferred.reject(auth);
			}

		}).end();

		return deferred.promise;
	};
}

function getToken(refresh) {
	var deferred = Q.defer(),
		uri = url.parse(config.swift.swiftAuthUrl);

	if (!auth || refresh) {
		logger.info(refresh ? 'Refreshing token' : 'Token empty');

		http.get({
			hostname: uri.hostname,
			path: uri.path,
			headers: {
				'X-Auth-User': config.swift.swiftUser,
				'X-Auth-Key': config.swift.swiftKey
			}
		}, function (res) {
			if (res.statusCode === 204) {
				var headers = res.headers;

				auth = {
					url: headers['x-storage-url'],
					token: headers['x-auth-token']
				};

				logger.info('Token received');

				deferred.resolve(auth);
			} else if (res.statusCode === 403) {
				deferred.reject({
					message: 'Most probably wrong key'
				});
			}
		});
	} else {
		deferred.resolve(auth);
	}

	return deferred.promise;
}

exports.sendFiles = function (bucket, dir, filePaths) {
	var deferred = Q.defer();

	getToken()
		.then(createBucket(bucket))
		.then(getFilePaths(dir, filePaths))
		.then(uploadFiles(dir, bucket))
		.then(deferred.resolve)
		.catch (function (err) {
			logger.error(err);
		});

	return deferred.promise;
};
