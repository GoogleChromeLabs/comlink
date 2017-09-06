module.exports = function(config) {
  const configuration = {
      basePath: '',
      frameworks: ['mocha', 'chai', 'karma-typescript'],
      files: [
        {
          pattern: 'rpc.ts',
          included: false,
        },
        {
          pattern: 'tests/*.test.js',
          included: false,
        },
        'tests/tests.js',
      ],
      preprocessors: {
        'rpc.ts': ['karma-typescript'],
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
      browsers: ['ChromeCanary', 'Safari'],
      customLaunchers: {
        ChromeCanaryHarmony: {
          base: 'ChromeCanary',
          flags: ['--js-flags=--harmony'],
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
