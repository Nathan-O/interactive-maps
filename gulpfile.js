'use strict';

var gulp = require('gulp'),
	nodemon = require('gulp-nodemon'),
	jasmine = require('gulp-jasmine'),
	istanbul = require('gulp-istanbul'),
	download = require('gulp-download'),
	translationUrl = 'http://mediawiki119.evgeniy.wikia-dev.com/' +
		'wikia.php?controller=WikiaInteractiveMaps&method=translation',
	localesDir = './locales/';

gulp.task('dev', function () {
	nodemon({
		script: 'app.js',
		ext: 'js',
		ignore: ['tmp/**', 'node_modules/**'],
		env: {
			'NODE_ENV': 'devbox' //'production'
		}
	});

	//here at least it is not restarted on file changes
	//and this is not strictly needed for development
	require('./kueServer');
});

gulp.task('test', function (cb) {
	gulp
		.src(['lib/*.js'])
		.pipe(istanbul()) // Covering files
		.on('end', function () {
			gulp
				.src('specs/**')
				.pipe(jasmine())
				.pipe(istanbul.writeReports()) // Creating the reports after tests runned
				.on('end', cb);
		});
});

gulp.task('translation', function () {
	download(translationUrl)
		.pipe(gulp.dest(localesDir));
});

gulp.task('default', ['dev'], function () {

});
