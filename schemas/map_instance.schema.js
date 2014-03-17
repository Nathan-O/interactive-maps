module.exports = {
	// name of table in DB
	dbTable: 'map_instance',

	// table columns used for SELECT query
	dbColumns: ['id', 'title', 'map_id', 'city_id', 'created_by', 'created_on', 'locked'],

	// Schema used for validation JSON for POST requests
	createSchema: {
		description: "Schema for creating map instance",
		type: "object",
		properties: {
			title: {
				description: "Map instance name",
				type: "string",
				required: true
			},
			map_id: {
				description: "Unique identifier for a map",
				type: "integer",
				required: true
			},
			city_id: {
				description: "ID of the Wikia this map instance belongs to",
				type: "integer",
				required: true
			},
			created_by: {
				description: "creator user name",
				type: "string",
				required: true
			}
		},
		maxProperties: 4,
		additionalProperties: false
	},

	// Schema used for validation JSON for PUT requests
	updateSchema: {
		description: "Schema for updating map instance",
		type: "object",
		properties: {
			title: {
				description: "Map instance name",
				type: "string",
				minLength: 2
			},
			map_id: {
				description: "Unique identifier for a map",
				type: "integer"
			}
		},
		maxProperties: 2,
		additionalProperties: false
	}
}
