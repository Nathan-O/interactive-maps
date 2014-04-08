'use strict';

var yaml = require('js-yaml'),
	fs = require('fs'),
	logger = require('./logger'),
	configuration,
	swiftConfiguration,
	confPath,
	swiftConf,
	env = process.env;

if (!process.env.WIKIA_CONFIG_ROOT) {
	throw 'WIKIA_CONFIG_ROOT seems to be not set';
}

if (!process.env.WIKIA_SWIFT_YML) {
	throw 'WIKIA_SWIFT_YML seems to be not set';
}

if (!process.env.WIKIA_PROD_DATACENTER) {
	throw 'WIKIA_PROD_DATACENTER seems to be not set';
}

if (!process.env.NODE_ENV) {
	throw 'NODE_ENV seems to be not set';
}

confPath = env.WIKIA_CONFIG_ROOT + '/interactiveMapsConfig.yml';
swiftConf = env.WIKIA_SWIFT_YML;

try {
	configuration = yaml.safeLoad(
		fs.readFileSync(confPath, 'utf8')
	);

	swiftConfiguration = yaml.safeLoad(
		fs.readFileSync(swiftConf, 'utf8')
	);

	logger.debug('Using conf file: ' + confPath + ' for process id: ' + process.pid);
	logger.debug('Using swift conf file: ' + swiftConf + ' for process id: ' + process.pid);
} catch (e) {
	var error = 'Problem with config: ' + e;
	logger.error(error);
	throw error;
}

configuration.swift = swiftConfiguration.wgFSSwiftConfig[env.NODE_ENV || 'production'][env.WIKIA_PROD_DATACENTER];

configuration.setRoot = function (dir) {
	dir = dir || '';

	configuration.tmp = dir + configuration.tmp;
	configuration.root = dir;
};

module.exports = configuration;
