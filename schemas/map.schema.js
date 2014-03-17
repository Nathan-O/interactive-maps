module.exports = {
	// name of table in DB
	dbTable: 'map',

	// table columns used for SELECT query
	dbColumns: ['id', 'name', 'type', 'width', 'height', 'min_zoom', 'max_zoom', 'created_by', 'created_on'],

	// overwrite default CURD actions
	customMethods: {
		create: require('./../lib/add_map' ),
		destroy: false,
		update: false
	},

	// Schema used for validation JSON for POST requests
	createSchema: {
		description: "Schema for creating map",
		type: "Object",
		properties: {
			name: {
				description: "Map name",
				type: "string",
				required: true
			},
			url: {
				description: "Url image from which tiles wil be created",
				type: "string",
				pattern: '(https?:\/\/(?:www\.|(?!www))[^\s\.]+\.[^\s]{2,}|www\.[^\s]+\.[^\s]{2,})',
				required: true
			},
			created_by: {
				description: "creator user name",
				type: "string",
				required: true
			}
		},
		maxProperties: 3,
		additionalProperties: false
	}
}