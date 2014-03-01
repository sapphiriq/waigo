/**
 * @file
 * Test code utilities
 */

var _ = require('lodash'),
  co = require('co'),
  mkdirp = require('mkdirp'),
  sinon = require('sinon'),
  chai = require("chai"),
  fs = require('fs'),
  path = require('path'),
  Promise = require('bluebird'),
  rimraf = require('rimraf');

fs = Promise.promisifyAll(fs);
fs.existsAsync = Promise.promisify(function(file, cb) {
  fs.exists(file, function(exists) {
    cb(null, exists);
  });
});

rimrafAsync = Promise.promisify(rimraf);
mkdirpAsync = Promise.promisify(mkdirp);
chai.use(require('sinon-chai'));


var testUtils = {},
  testDataFolder = path.join(__dirname, 'data');

testUtils.appFolder = path.join(testDataFolder, 'app');
testUtils.pluginsFolder = path.join(process.cwd(), 'node_modules');




/**
 * Get whether given function is a generator function.
 * @return {boolean} true if so; false otherwise
 */
testUtils.isGeneratorFunction = function(obj) {
  return obj && obj.constructor && 'GeneratorFunction' == obj.constructor.name;
};




/**
 * Spawn a Bluebird + co coroutine around given generator function.
 * @return {Function} Function which returns a Promise.
 */
testUtils.spawn = function(generatorFunction, thisObject, arg1) {
  var args = _.toArray(arguments).slice(2);
  
  return Promise.promisify(co(function*() {
    return yield generatorFunction.apply(thisObject, args);
  }))();
};





/**
 * Create a test object for the given module.
 * @param testModule {Object} a `module` object.
 * @return {Object} a test object.
 */
testUtils.createTest = function(testModule) {
  var test = {
    mocker: null,
    beforeEach: function() {
      test.mocker = sinon.sandbox.create();  
    },
    afterEach: function() {
      test.mocker.restore();
    }
  };
  testModule.exports[require('path').basename(testModule.filename)] = test;
  return test;
}






/**
 * Create test folders.
 *
 * @return {Promise}
 */
testUtils.createTestFolders = function() {
  /*
  node-findit fails to finish for empty directories, so we create dummy files to prevent this
  https://github.com/substack/node-findit/pull/26
   */
  return mkdirpAsync(testUtils.appFolder)
    .then(function() {
      return fs.writeFileAsync(path.join(testUtils.appFolder, 'README'), 'The presence of this file ensures that node-findit works');
    });
};




/**
 * Delete test folders.
 *
 * @return {Promise}
 */
testUtils.deleteTestFolders = function() {
  return rimrafAsync(testUtils.appFolder)
    .then(function() {
      return fs.readdirAsync(testUtils.pluginsFolder)
        .then(function deletePlugins(files) {
          var plugins = _.filter(files, function(file) {
            return file.endsWith('_TESTPLUGIN');
          });
          return Promise.all(
            _.map(plugins, function(plugin) {
              return rimrafAsync(path.join(testUtils.pluginsFolder, plugin));
            })
          );
        });
    });
};






/**
 * Create modules within given test plugin.
 *
 * The content of each created module will be a string containing the plugin name.
 *
 * @param name {String} name of plugin to create. Should be suffixed with '_TESTPLUGIN';
 * @param [modules] {Array|Object} CommonJS modules to create within the plugin.
 *
 * @return {Promise}
 */
testUtils.createPluginModules = function(name, modules) {
  if (!name.endsWith('_TESTPLUGIN')) {
    throw new Error('Test plugin name has incorrect suffix');
  }

  var pluginFolderPath = path.join(testUtils.pluginsFolder, name),
    srcFolderPath = path.join(pluginFolderPath, 'src');

  return mkdirpAsync(pluginFolderPath)
    .then(function() {
      return Promise.all([
        fs.writeFileAsync(path.join(pluginFolderPath, 'package.json'), '{ "name": "' + name + '", "version": "0.0.1" }'),
        fs.writeFileAsync(path.join(pluginFolderPath, 'index.js'), 'module.exports = {}')
      ]);
    })
    .then(function createPluginSrcFolder() {
      return mkdirpAsync(srcFolderPath);
    })
    .then(function createPluginSrcFolder(exists) {
      return fs.writeFileAsync(path.join(srcFolderPath, 'README'), 'The presence of this file ensures that node-findit works');
    })
    .then(function createModules() {
      return testUtils.createModules(srcFolderPath, modules, name);
    });
};




/**
 * Create modules in the app folder tree.
 *
 * @param [modules] {Array|Object} CommonJS modules to create within the app.
 *
 * @return {Promise}
 */
testUtils.createAppModules = function(modules) {
  return testUtils.createModules(testUtils.appFolder, modules, 'app');
};






/**
 * Create modules.
 *
 * @param srcFolder {String} folder in which to create the module. Expected to exist.
 * @param modules {Object|Array} CommonJS modules to create.
 * @param defaultContent {String} the default content to use for a module if none provided.
 *
 * @return {Promise}
 */
testUtils.createModules = function(srcFolder, modules, defaultContent) {
  var promise = Promise.resolve();

  if (modules) {
    // if an array then generate default module content
    if (_.isArray(modules)) {
      var moduleContent = _.map(modules, function(moduleName) {
        return 'module.exports="' + defaultContent + '";';
      });

      modules = _.zipObject(modules, moduleContent);
    }

    var __createModule = function(moduleName, moduleContent) {
      var fileName = path.join(srcFolder, moduleName) + '.js',
        folderPath = path.dirname(fileName);    

      return mkdirpAsync(folderPath)
        .then(function createModuleFile() {
          return fs.writeFileAsync(fileName, moduleContent);
        });
    };

    // sequentially create each module - this avoids conflicting async calls to mkdir() for the same folder
    _.each(modules, function(moduleContent, moduleName) {
      promise = promise.then(function() {
        return __createModule(moduleName, modules[moduleName]);
      });
    });

  } // if modules set

  return promise;
};


waigo = require('../index');
waigo.initAsync = Promise.coroutine(waigo.init);


module.exports = {
  assert: chai.assert,
  expect: chai.expect,
  should: chai.should(),
  utils: testUtils,
  waigo: waigo
};

