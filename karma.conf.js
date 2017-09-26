/**
 * Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

module.exports = function(config) {
  const configuration = {
      basePath: '',
      frameworks: ['mocha', 'chai', 'karma-typescript'],
      files: [
        {
          pattern: 'tests/fixtures/*',
          included: false,
        },
        'tests/prelude.js',
        'comlink.ts',
        'tests/comlink_postlude.js',
        'messagechanneladapter.ts',
        'tests/messagechanneladapter_postlude.js',
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
