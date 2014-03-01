var moment = require('moment'),
  path = require('path'),
  Promise = require('bluebird');

var testBase = require('../../../_base'),
  assert = testBase.assert,
  expect = testBase.expect,
  should = testBase.should,
  testUtils = testBase.utils,
  test = testUtils.createTest(module),
  waigo = testBase.waigo;


var app = null,
  routes = null,
  router = null,
  mapper = null;


var errors = null;


test['errors'] = {
  beforeEach: function(done) {
    waigo.initAsync()
      .then(function() {
        errors = waigo.load('support/errors');        
      })
      .nodeify(done);
  },

  'Error.toViewObject': function(done) {
    var err = new Error('test');

    Promise.spawn(function*() {
      return yield* err.toViewObject();      
    })
      .then(function(vo) {
        vo.should.eql({
          type: 'Error',
          msg: 'test'
        });
      })
      .nodeify(done);
  },


  'RuntimeError': {
    'defaults': function() {
      var e = new errors.RuntimeError();

      e.should.be.instanceOf(Error);
      e.message.should.eql('An error occurred');
      e.name.should.eql('RuntimeError');
      e.status.should.eql(500);
    },
    'with params': function() {
      var e = new errors.RuntimeError('my msg', 505);

      e.message.should.eql('my msg');
      e.name.should.eql('RuntimeError');
      e.status.should.eql(505);
    },
    'view object': function(done) {
      var e = new errors.RuntimeError('my msg', 505);

      Promise.spawn(function*() {
        return yield* e.toViewObject();
      })
        .then(function(viewObject) {
          viewObject.should.eql({
            type: 'RuntimeError',
            msg: 'my msg'
          });
        })
        .nodeify(done);
    }
  },

  'MultipleError': {
    'defaults': function() {
      var e = new errors.MultipleError();

      e.should.be.instanceOf(errors.RuntimeError);
      e.message.should.eql('Multiple errors occurred');
      e.name.should.eql('MultipleError');
      e.status.should.eql(500);
      e.errors.should.eql({});
    },
    'with params': function() {
      var multiErrors = {
        e1: new errors.RuntimeError()        
      };

      var e = new errors.MultipleError('blah', 505, multiErrors);

      e.message.should.eql('blah');
      e.name.should.eql('MultipleError');
      e.status.should.eql(505);
      e.errors.should.eql(multiErrors);
    },
    'view object': function(done) {
      var multiErrors = {
        e1: new errors.RuntimeError('test error 1', 403),
        e2: new Error('bad'),
        e3: new errors.RuntimeError()
      };

      var e = new errors.MultipleError('blah', 404, multiErrors);

      var toViewObjectCoRoutine = Promise.coroutine(function*() {
        return yield* e.toViewObject();
      });

      toViewObjectCoRoutine()
        .then(function(viewObject) {
          expect(viewObject).to.eql({
            type: 'MultipleError',
            msg: 'blah',
            errors: {
              e1: {
                type: 'RuntimeError',
                msg: 'test error 1'
              },
              e2: {
                type: 'Error',
                msg: 'bad'
              },
              e3: {
                type: 'RuntimeError',
                msg: 'An error occurred'
              }
            }
          });
        })
        .nodeify(done);
    }    
  },


  'define sub type': {
    beforeEach: function() {
      this.RuntimeError2 = errors.defineSubType(errors.RuntimeError, 'RuntimeError2');
      this.MultipleError2 = errors.defineSubType(errors.MultipleError, 'MultipleError2');
    },

    'defaults - RuntimeError': function() {
      var e = new this.RuntimeError2();

      e.should.be.instanceOf(errors.RuntimeError);
      e.message.should.eql('An error occurred');
      e.name.should.eql('RuntimeError2');
      e.status.should.eql(500);
    },
    'defaults - MultipleError': function() {
      var e = new this.MultipleError2();

      e.should.be.instanceOf(errors.MultipleError);
      e.message.should.eql('Multiple errors occurred');
      e.name.should.eql('MultipleError2');
      e.status.should.eql(500);        
    },
    'with params - RuntimeError': function() {
      var e = new this.RuntimeError2('my msg', 505);

      e.message.should.eql('my msg');
      e.name.should.eql('RuntimeError2');
      e.status.should.eql(505);
    },
    'with params - MultipleError': function() {
      var errors = {
        hello: new Error('blaze')
      };
      var e = new this.MultipleError2('my msg', 505, errors);

      e.message.should.eql('my msg');
      e.name.should.eql('MultipleError2');
      e.status.should.eql(505);
      e.errors.should.eql(errors);
    },
    'view object - RuntimeError': function(done) {
      var e = new this.RuntimeError2('my msg', 505);
      var eParent = new errors.RuntimeError('my msg', 505);

      Promise.all([
        Promise.spawn(function*() { return yield* e.toViewObject(); }),
        Promise.spawn(function*() { return yield* eParent.toViewObject(); })
      ])
        .spread(function(child, parent) {
          child.type.should.eql('RuntimeError2');
          delete child.type;
          delete parent.type;
          child.should.eql(parent);
        })
        .nodeify(done);
    },
    'view object - MultipleError': function(done) {
      var e = new this.MultipleError2('my msg', 505);
      var eParent = new errors.MultipleError('my msg', 505);

      Promise.all([
        Promise.spawn(function*() { return yield* e.toViewObject(); }),
        Promise.spawn(function*() { return yield* eParent.toViewObject(); })
      ])
        .spread(function(child, parent) {
          child.type.should.eql('MultipleError2');
          delete child.type;
          delete parent.type;
          child.should.eql(parent);
        })
        .nodeify(done);
    }
  }  
};



