var gulp = require('gulp');

//1. Generate Typescript
var ts = require('gulp-typescript');

// 1.1 Typescript Renderer
gulp.task('buildRenderer', function () {
    return gulp.src('com.yasoon.jira/dialogs/renderer/**/*.ts')
        .pipe(ts({
            "experimentalDecorators": true,
            "outFile": "./renderer.js",
            "allowJs": true,
            "target": "es5",
			"module": "amd"
        }))
        .pipe(gulp.dest('distribution/com.yasoon.jira/dialogs/js'));
});
gulp.start('buildRenderer');

// 1.2 Typescript Dialogs
gulp.task('buildDialogs', function () {
    return gulp.src('com.yasoon.jira/dialogs/js/*.ts')
        .pipe(ts({
            "experimentalDecorators": true,
            "allowJs": true,
            "target": "es5"
        }))
        .pipe(gulp.dest('distribution/com.yasoon.jira/dialogs/js'));
});
gulp.start('buildDialogs');

//1.3 Controllers
gulp.task('buildControllers', function () {
    return gulp.src(['com.yasoon.jira/controller/*.ts','com.yasoon.jira/models/*.ts'])
        .pipe(ts({
            "experimentalDecorators": true,
            "allowJs": true,
            "outFile": "./controllerModels.js",
            "target": "es5"
        }))
        .pipe(gulp.dest('distribution/com.yasoon.jira'));
});
gulp.start('buildControllers');

//1.4 Models
/*
gulp.task('buildModels', function () {
    return gulp.src('com.yasoon.jira/models/*.ts')
        .pipe(ts({
            "experimentalDecorators": true,
            "allowJs": true,
            "outFile": "./models.js",
			"noResolve": true,
            "target": "es5"
        }))
        .pipe(gulp.dest('distribution/com.yasoon.jira'));
});
gulp.start('buildModels');
*/
//2. Compile Templates
var handlebars = require('gulp-handlebars');
var wrap = require('gulp-wrap');
var declare = require('gulp-declare');
gulp.task('generateTemplates', function () {
    return gulp.src(['com.yasoon.jira/templates/*.hbs', 'com.yasoon.jira/templates/*.handlebars'])
        .pipe(handlebars({
            handlebars: require('handlebars')
        }))
        .pipe(wrap('Handlebars.template(<%= contents %>)'))
        .pipe(declare({
            namespace: 'jira.templates',
            //noRedeclare: true, // Avoid duplicate declarations
        }))
        .pipe(gulp.dest('distribution/com.yasoon.jira/templates/'));
});

gulp.start('generateTemplates');

//3. Copy files into distribution folders
var copyfiles = require('copyfiles');
var pathes = [
    'com.yasoon.jira/*',
    'com.yasoon.jira/assets/*',
    'com.yasoon.jira/dialogs/*',
    'com.yasoon.jira/dialogs/js/*.js',
    'com.yasoon.jira/dialogs/css/*',
	'com.yasoon.jira/templates/issueNotification.handlebars',
    'com.yasoon.jira/images/*',
    'com.yasoon.jira/libs/**/*',
    'com.yasoon.jira/locale/*',
    'distribution'
];

copyfiles(pathes, {}, function () {

});