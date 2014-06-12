'use strict';

var Flightplan = require('flightplan'),
	tmpDir = 'pstadler-sh-' + new Date().getTime(),
	plan = new Flightplan();

plan.briefing({
	debug: true,
	destinations: {
		staging: {
			host: 'dev-interactivemaps',
			username: 'evgeniy',
			agent: process.env.SSH_AUTH_SOCK
		},
		production: [
			{
				host: '10.10.10.229',
				username: 'aquilax',
				agent: process.env.SSH_AUTH_SOCK
			}
		]
	}
});

plan.local(function (local) {
	local.log('Run build');
	local.exec('gulp test');
	local.log('Copy files to remote hosts');
	var filesToCopy = local.exec('git ls-files', {silent: true});
	// rsync files to all the destination's hosts
	local.transfer(filesToCopy, '/tmp/' + tmpDir);
});

// run commands on remote hosts (destinations)
plan.remote(function (remote) {
	remote.log('Move folder to web root');
	remote.sudo('cp -R /tmp/' + tmpDir + ' ~', {user: 'aquilax'});
	remote.rm('-rf /tmp/' + tmpDir);

	remote.log('Install dependencies');
	remote.sudo('npm --production --prefix ~/' + tmpDir + ' install ~/' + tmpDir, {user: 'aquilax'});

	remote.log('Reload application');
	remote.sudo('ln -snf ~/' + tmpDir + ' ~/pstadler-sh', {user: 'aquilax'});
	remote.sudo('pm2 reload pstadler-sh', {user: 'aquilax'});
});
