module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    clean: {
      build: {
        src: [ 'dist' ]
      }
    },
    copy: {
      build: {
        cwd: 'assets',
        src: [ '**' ],
        dest: 'dist/assets',
        expand: true
      }
    },
    pug: {
      compile: {
        options: {
          data: {
            debug: false
          }
        },
        files: {
          'dist/index.html': 'src/index.pug'
        }
      }
    },
    stylus: {
      compile: {
        options: {
          urlfunc: 'data-uri'
        },
        files: {
          'dist/index.css': 'src/index.styl'
        }
      }
    },
    browserify: {
      dist: {
        files: {
          "dist/index.js": "src/index.js"
        }
      }
    },
    watch: {
      stylus: {
        files: 'src/**.styl',
        tasks: ['stylus']
      },
      pug: {
        files: 'src/**.pug',
        tasks: ['pug']
      },
      browserify: {
        files: 'src/**.js',
        tasks: ['browserify']
      }
    }
  });
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks("grunt-browserify");
  grunt.loadNpmTasks("grunt-contrib-watch");
  grunt.loadNpmTasks('grunt-contrib-stylus');
  grunt.loadNpmTasks('grunt-contrib-pug');
  grunt.registerTask("build", ["clean", "copy", "browserify", "pug", "stylus"]);
  grunt.registerTask("default", ["build"]);
  grunt.registerTask("serve", ["build", "watch"]);
};

