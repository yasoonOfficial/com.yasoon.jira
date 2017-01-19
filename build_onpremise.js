//1. Copy onpremise files into distribution folder
//First from addon folder, second from shared folder
var pathes = [
    'addon/onpremise/*',
	'addon/onpremise/src/aps/*',
	'addon/onpremise/src/main/java/com/yasoon/jira/*',
	'addon/onpremise/src/main/resources/*',
	'addon/distribution/onpremise',
 ];
var copyfiles = require('copyfiles');

 copyfiles(pathes, 2, function () {
	pathes = [
		'addon/shared/*',
		'addon/shared/css/*',
		'addon/shared/fonts/*',
		'addon/shared/fonts/roboto/*',
		'addon/shared/images/*',
		'addon/shared/img/*',
		'addon/shared/js/*',
		'addon/shared/js/components/*',
		'addon/shared/js/library/*',
		'addon/distribution/onpremise/src/main/resources'
	];
	copyfiles(pathes, 2, function () {

	});
	
});



