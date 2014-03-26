module.exports = {
	db: {
		host: 'localhost',
		user: 'root',
		password: '',
		database: 'interactive_maps'
	},
	minZoom: 0,
	maxZoom: 3,
	firstBatchZoomLevels: 1,
	optimize: false,
	cleanup: false,
	bucketPrefix: 'intmap_',
	redis: {
		port: 6379,
		host: 'localhost',
		password: ''
	},
	kue: {
		port: 3000,
		title: 'Interactive Maps Queue',
		maxFetchJobs: 1,
		maxCutTilesJobs: 1
	}
};
