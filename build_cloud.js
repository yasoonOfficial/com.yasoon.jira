//1. Copy shared files into onpremise sources folder
var copyfiles = require('copyfiles');
var pathes = [
    'addon/shared/*',
	'addon/shared/css/*',
	'addon/shared/fonts/*',
	'addon/shared/fonts/roboto/*',
	'addon/shared/images/*',
	'addon/shared/img/*',
	'addon/shared/js/*',
	'addon/shared/js/components/*',
	'addon/shared/js/library/*',
    'addon/cloud/*',
	'addon/distribution'
];
copyfiles(pathes, 2, function () {
	
});