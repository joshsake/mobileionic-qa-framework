/**
 * Karma configuration for the Angular unit layer.
 *
 * Two things here are deliberate:
 *
 *  - `ChromeHeadlessCI` adds --no-sandbox. Chrome's sandbox cannot start inside
 *    the unprivileged container a GitHub Actions job runs in, so the default
 *    ChromeHeadless browser dies at launch there while working fine locally.
 *  - The coverage thresholds are enforced by the runner, not just reported.
 *    docs/test-strategy.md commits to 80% line coverage as a release gate; a
 *    number that is printed but never checked is not a gate.
 */
module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
      require('@angular-devkit/build-angular/plugins/karma'),
    ],
    client: {
      jasmine: {
        // Randomise execution order so specs cannot come to depend on each
        // other through shared module state.
        random: true,
      },
      clearContext: false,
    },
    jasmineHtmlReporter: {
      suppressAll: true,
    },
    coverageReporter: {
      dir: require('path').join(__dirname, './coverage'),
      subdir: '.',
      reporters: [
        { type: 'html' },
        { type: 'text-summary' },
        { type: 'lcovonly' },
      ],
      check: {
        global: {
          statements: 80,
          lines: 80,
          branches: 70,
          functions: 80,
        },
      },
    },
    reporters: ['progress', 'kjhtml'],
    browsers: ['Chrome'],
    customLaunchers: {
      ChromeHeadlessCI: {
        base: 'ChromeHeadless',
        flags: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
      },
    },
    restartOnFileChange: true,
  });
};
