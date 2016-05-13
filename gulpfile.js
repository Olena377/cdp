var gulp = require('gulp');
var bower = require('gulp-bower');
var less = require('gulp-less');
var del = require('del');
var util = require('gulp-util');
var cached = require('gulp-cached');
var remember = require('gulp-remember');
var autoprefixer = require('gulp-autoprefixer');
var csso = require('gulp-csso');
var concat = require('gulp-concat');
var gulpif = require('gulp-if');
var imagemin = require('gulp-imagemin');
var spritesmith = require('gulp.spritesmith');
var htmlreplace = require('gulp-html-replace');
var uglify = require('gulp-uglify');
var filter = require('gulp-filter');
var browserify = require('browserify');
var debowerify = require('debowerify');
var source = require('vinyl-source-stream');
var eslint = require('gulp-eslint');
var postcss     = require('gulp-postcss');
var reporter    = require('postcss-reporter');
var syntax_less = require('postcss-less');
var stylelint   = require('stylelint');
var plato = require('gulp-plato');


var argv = require('minimist')(process.argv.slice(2), {
    string: 'env',
    default: {env: process.env.NODE_ENV || 'development'}
});

var conf = {
    less: 'src/less/*.less',
    images: ['src/images/**/*.{png,svg}', '!src/images/icons/**'],
    icons: 'src/images/icons/*.png',
    html: 'src/*.html',
    js: {
        folder: 'src/js',
        main: 'main.js'
    },
    sprite: {
        imgName: 'images/build/sprite.png',
        cssName: 'less/build/sprite.less',
        imgPath: '../images/build/sprite.png'
    },
    build: {
        tmpFolders: '**/build',
        folder: 'build',
        css: 'build/css',
        images: 'build/images',
        js: 'build/js',
        html: 'build/html'
    }
};

var bootstrap = {
    less: 'bower_components/bootstrap/less/bootstrap.less'
};

gulp.task('bower', function () {
    return bower()
        .pipe(gulp.dest('bower_components'));
});

gulp.task('style', ['clean', 'bower', 'images', 'less-lint'], function () {
    return gulp.src([bootstrap.less, conf.less])
        .pipe(less())
        .pipe(autoprefixer(['last 2 version']))
        .pipe(concat('cdp.css'))
        // Compress code only on production build
        .pipe(gulpif(argv.env === 'production', csso()))
        .pipe(gulp.dest(conf.build.css));
});

gulp.task('style-watch', function () {
    return gulp.src([bootstrap.less, conf.less])
        .pipe(cached())
        .pipe(less())
        .on('error', errorHandler)
        .pipe(autoprefixer(['last 2 version']))
        .pipe(concat('cdp.css'))
        .pipe(remember())
        .pipe(gulp.dest(conf.build.css))
});

gulp.task('images', ['clean', 'bower', 'sprite'], function () {
    return gulp.src(conf.images)
        .pipe(gulpif(argv.env === 'production', imagemin()))
        .pipe(gulp.dest(conf.build.images))
});

gulp.task('sprite', ['clean'], function () {
    return gulp.src(conf.icons)
        .pipe(spritesmith(conf.sprite))
        .pipe(gulp.dest('src/'));
});

gulp.task('html', ['clean'], function () {
    return gulp.src(conf.html)
        .pipe(htmlreplace({
            'css': '../css/cdp.css',
            'js': '../js/cdp.js',
            'logo': {
                src: '../images/logo_gray-blue_80px.svg',
                tpl: '<img src="%s" alt="Epam logo"/>'
            }
        }))
        .pipe(gulp.dest(conf.build.html));
});

gulp.task('script', ['clean', 'bower', 'eslint'], function() {
    var result = browserify({
        entries: conf.js.folder + '/' + conf.js.main,
        debug: true
    })
        .transform('debowerify');
    return result
        .bundle()
        .pipe(gulpif(argv.env === 'production', uglify()))
        .pipe(source('cdp.js'))
        .pipe(gulp.dest(conf.build.js));
});


gulp.task('clean', function () {
    return del([conf.build.folder, conf.build.tmpFolders]);
});

gulp.task('build', ['style', 'images', 'html', 'script', 'plato']);

gulp.task('watch', ['build'], function () {
    return gulp.watch(conf.less, ['style-watch']);
});

gulp.task('eslint', function () {
    return gulp.src([
            '**/main.js',
            '!node_modules{,/**}'
        ])
        .pipe(eslint())
        .pipe(eslint.format());
});
gulp.task("less-lint", function() {
    var stylelintConfig = {
        "rules": {
            "color-no-invalid-hex": true,
            "declaration-colon-space-after": "always",
            "max-empty-lines": 2,
            "indentation": 2,
            "value-list-comma-space-before": "never",
            "declaration-block-semicolon-newline-after": "always",
            "block-closing-brace-newline-after": "always"
        }
    };
    var processors = [
        stylelint(stylelintConfig),
        reporter({
            clearMessages: true,
            throwError: true
        })
    ];
    return gulp.src([conf.less])
        .pipe(postcss(processors, {syntax: syntax_less}));
});

gulp.task("plato", function() {
    return gulp.src('src/js/main.js')
        .pipe(plato('reports', {
            jshint: {
                options: {
                    strict: true
                }
            },
            complexity: {
                trycatch: true
            }
        }));
});

function errorHandler(error) {
    util.log(util.colors.red('Error'), error.message);
    this.end();
}
