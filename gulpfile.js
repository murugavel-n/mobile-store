var gulp = require('gulp')
var es = require('event-stream')
var browserSync = require('browser-sync').create()
var del = require('del')
var runSeq = require('run-sequence')
var gulp_plugins = require('gulp-load-plugins')()
var cleanCSS = require('gulp-clean-css')

gulp.task('clean-vendors', function() {
	return del(['src/vendors/**', '!src/vendors']).then(function(paths){
		console.log('cleaned vendor files and folders:\n', paths.join('\n'));
	})
})

gulp.task('copy-vendors', function() {
	var jqueryStream = gulp.src(['./node_modules/jquery/dist/jquery.min.js'/* , './node_modules/jquery/dist/jquery.min.map' */]).pipe(gulp.dest('src/vendors/jquery'))
	var backboneStream = gulp.src(['./node_modules/backbone/backbone-min.js'/* , './node_modules/backbone/backbone-min.map' */]).pipe(gulp.dest('src/vendors/backbone'))
	var underscoreStream = gulp.src(['./node_modules/underscore/underscore-min.js'/* , './node_modules/underscore/underscore-min.js.map' */]).pipe(gulp.dest('src/vendors/underscore'))
	var bootstrapCssStream = gulp.src(['./node_modules/bootstrap/dist/css/bootstrap.min.css', './node_modules/bootstrap/dist/css/bootstrap.css.map']).pipe(gulp.dest('src/vendors/bootstrap/css'))
	var bootstrapJsStream =  gulp.src(['./node_modules/bootstrap/dist/js/bootstrap.min.js', './node_modules/bootstrap/dist/js/bootstrap.min.js.map']).pipe(gulp.dest('src/vendors/bootstrap/js'))
	return es.merge(jqueryStream, backboneStream, underscoreStream, bootstrapCssStream, bootstrapJsStream)
})

gulp.task('dev-inject-css-js', function() {
	var target = gulp.src('./src/index.html')
	var sources = gulp.src([
		'./src/vendors/jquery/*.js',
		'./src/vendors/underscore/*.js',
		'./src/vendors/backbone/*.js',
		'./src/vendors/bootstrap/**/*.js',
		'./src/js/*.js',
		'./src/vendors/bootstrap/**/*.css',
		'./src/css/*.css'
	], {read: false})
	return target.pipe(gulp_plugins.inject(sources, {relative: true})).pipe(gulp.dest('./src'))
})

gulp.task('browser-sync-reload', function(cb) {
	browserSync.reload()
	cb()
})

gulp.task('build-dev', function() {
	return runSeq('clean-vendors', 'copy-vendors', 'dev-inject-css-js', function() {
		console.log('build-dev task completed!')
		browserSync.init({
			server: {
				baseDir: 'src'
			}
		})
		gulp.watch([
			'src/**/*.css',
			'src/**/*.js',
			'src/**/*.html',
			'src/**/*.json'
		], ['browser-sync-reload'])
	})
})

gulp.task('clean-public', function() {
	return del(['public/**']).then(function(paths){
		console.log('cleaned public files and folders:\n', paths.join('\n'));
	})
})

gulp.task('copy-sources', function() {
	// var cssStream = gulp.src('src/css/*.css').pipe(cleanCSS({compatibility: 'ie8'})).pipe(gulp_plugins.concat('style.css')).pipe(gulp.dest('tmp/css'))
	// var jsStream = gulp.src('src/js/*.js').pipe(gulp_plugins.uglify()).pipe(gulp_plugins.concat('app.bundle.js')).pipe(gulp.dest('tmp/js'))
	// var vendorsStream = gulp.src('src/vendors/**/*.*').pipe(gulp.dest('tmp/vendors'))
	var staticStream = gulp.src('src/static/**/*.*').pipe(gulp.dest('tmp/static'))
	var copyIndexStream = gulp.src('src/index.html').pipe(gulp.dest('tmp'))
	return es.merge(/* cssStream, jsStream, vendorsStream,  */staticStream, copyIndexStream)
})

gulp.task('bundle-js', function() {
	return gulp.src([
			'src/vendors/jquery/*.js',
			'src/vendors/underscore/*.js',
			'src/vendors/backbone/*.js',
			'src/vendors/bootstrap/**/*.js',
			'src/js/*.js'
		])
		.pipe(gulp_plugins.uglify())
		.pipe(gulp_plugins.concat('app.bundle.js'))
		.pipe(gulp.dest('tmp/js'))
})

gulp.task('bundle-css', function() {
	return gulp.src([
			'src/vendors/bootstrap/**/*.css',
			'src/css/*.css'
		])
		.pipe(cleanCSS({compatibility: 'ie8'}))
		.pipe(gulp_plugins.concat('style.css'))
		.pipe(gulp.dest('tmp/css'))
})

gulp.task('prepare-public', function() {
	return gulp.src('tmp/**/*.*')
		.pipe(gulp.dest('public'))
	console.log('prepare-public task completed!')
})

gulp.task('prod-inject-css-js', function() {
	var target = gulp.src('./public/index.html')
	var sources = gulp.src([
		'./public/js/*.js',
		'./public/css/*.css'
	], {read: false})
	return target.pipe(gulp_plugins.inject(sources, {relative: true})).pipe(gulp.dest('./public'))
})

gulp.task('build-prod', function() {
	runSeq('clean-public', 'copy-sources', 'bundle-js', 'bundle-css', 'prepare-public', 'prod-inject-css-js', function() {
		console.log('build-prod task completed!')
		console.log('before deleting tmp folder')
		del(['tmp/**']).then(function(paths){
			console.log('cleaned tmp files and folders:\n', paths.join('\n'));
		})
		browserSync.init({
			server: {
				baseDir: "public"
			}
		})
	})
})

gulp.task('default', ['build-dev'], function() {
	console.log('default task completed!')
})
