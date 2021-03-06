"use strict";


var _ = require('lodash'),
  util = require('util');


var waigo = require('../../'),
  mixins = waigo.load('support/mixins');


mixins.applyTo(Error, mixins.HasViewObject);



/**
 * Get renderable representation of this `Error`.
 *
 * Is is better to use `RuntimeError`-derived error classes instead of `Error` 
 * as they provide other useful features. However unexpected errors may occur 
 * which is why it is important to be able to process them for output.
 * 
 * @return {Object} Plain object.
 */
Error.prototype.toViewObject = function*(ctx) {
  return {
    type: this.name || 'Error',
    msg: this.message
  };
};



/**
 * Base runtime error class.
 *
 * Use this in preference to `Error` where possible as it provides for more 
 * descriptive output. 
 *
 * @param {String} msg Error message.
 * @param {Number} status HTTP return status code to set (used by the [error handler middleware](middleware/errorHandler.js.html))
 */
var RuntimeError = exports.RuntimeError = function(msg, status) {
  Error.call(this);
  this.name = 'RuntimeError';
  this.message = msg || 'An error occurred';
  this.status = status || 500;
  Error.captureStackTrace(this, RuntimeError);
};
util.inherits(RuntimeError, Error);







/**
 * Represents multiple errors grouped together.
 *
 * Sometimes we may wish to report multiple related errors (e.g. form field 
 * validation failures). This error class makes it easy to do so.
 *
 * @param {Object} errors Map of errors, where each value is itself an `Error` instance.
 * @param {Number} status HTTP return status code to set.
 */
var MultipleError = exports.MultipleError = function(msg, status, errors) {
  RuntimeError.call(this, msg || 'Multiple errors occurred', status);
  this.name = 'MultipleError';
  this.errors = errors || {};
  Error.captureStackTrace(this, MultipleError);
};
util.inherits(MultipleError, RuntimeError);



/**
 * Get renderable representation of this error.
 *
 * This collects view object representations of all the sub-errors and into a 
 * single object.
 *
 * @return {Object} Plain object.
 */
MultipleError.prototype.toViewObject = function*(ctx) {
  var ret = yield RuntimeError.prototype.toViewObject.call(this, ctx);
  ret.errors = {};

  for (var id in this.errors) {
    ret.errors[id] = yield this.errors[id].toViewObject(ctx);
  }

  return ret;
};




/**
 * Define an `Error` class.
 *
 * This is a convenience method for quickly creating custom error classes which 
 * inherit from `Error` and have all the correct properties setup.
 *
 * @param {String} newClassName Name of this new error type.
 * @param {Class} [baseClass] Base class to derive the new class from. Default is `RuntimeError`.
 *
 * @return {Function} The new error class.
 */
exports.define = function(newClassName, baseClass) {
  baseClass = baseClass || RuntimeError;

  var newErrorClass = function() {
    (baseClass).apply(this, arguments);
    this.name = newClassName;
    Error.captureStackTrace(this, newErrorClass);
  };
  util.inherits(newErrorClass, (baseClass));
  return newErrorClass;
};








