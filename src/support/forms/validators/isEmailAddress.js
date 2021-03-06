"use strict";

var validator = require('validator');




/**
 * Validator to check whether given string represents an email address.
 *
 * @throws Error If not an email address.
 */
module.exports = function() {
  return function*(form, field, value) {
    if (!validator.isEmail(value)) {
      throw new Error('Must be an email address');
    }
  }
};

