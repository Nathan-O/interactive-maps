var curd = require('./../../lib/curd'),
	schema = require('./../../configs/v1/poi.config.js'),
	collection = curd.createCollection(schema);

exports.handler = collection.handler;
exports.wildcard = collection.wildcard;
