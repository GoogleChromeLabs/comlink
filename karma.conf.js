module.exports = function(config) {
  const configuration = {
      basePath: '',
      frameworks: ['mocha', 'chai', 'karma-typescript'],
      files: [
        'tests/prelude.js',
        'comlink.ts',
        'tests/postlude.js',
        'tests/*.test.js',
      ],
      preprocessors: {
        '*.ts': ['karma-typescript'],
      },
      karmaTypescriptConfig: {
        tsconfig: './tsconfig.json',
        coverageOptions: {
          instrumentation: false,
        },
      },
      reporters: ['progress', 'karma-typescript'],
      port: 9876,
      colors: true,
      logLevel: config.LOG_INFO,
      autoWatch: true,
      singleRun: true,
      concurrency: Infinity,
      browsers: ['Chrome', 'ChromeCanaryHarmony', 'Firefox', 'Safari'],
      customLaunchers: {
        ChromeCanaryHarmony: {
          base: 'ChromeCanary',
          flags: ['--js-flags=--harmony'],
        },
        ChromeCanaryHeadlessHarmony: {
          base: 'ChromeCanary',
          flags: ['--js-flags=--harmony', /* '--headless', */ '--disable-gpu'],
        },
        DockerChrome: {
            base: 'ChromeHeadless',
            flags: ['--no-sandbox'],
        },
      },
    };

    if (process.env.INSIDE_DOCKER)
      configuration.browsers = ['DockerChrome'];

    config.set(configuration);
};
