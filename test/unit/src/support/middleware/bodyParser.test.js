var co = require('co'),
  moment = require('moment'),
  path = require('path'),
  Promise = require('bluebird');

var _testUtils = require(path.join(process.cwd(), 'test', '_base'))(module),
  test = _testUtils.test,
  testUtils = _testUtils.utils,
  assert = testUtils.assert,
  expect = testUtils.expect,
  should = testUtils.should,
  waigo = testUtils.waigo;


var bodyParser = null;


test['body parser'] = {
  beforeEach: function(done) {
    waigo.__modules = {};
    waigo.initAsync()
      .then(function() {
        bodyParser = waigo.load('support/middleware/bodyParser');
      })
      .nodeify(done);
  },

  'uses co-body': function() {
    expect(bodyParser._bodyParser).to.eql(require('co-body'));
  },

  'parses the body': function(done) {
    var ctx = {
      request: {}
    };

    bodyParser._bodyParser = test.mocker.stub().returns({
      dummy: true
    });

    var next = function*() {
      ctx.nextCalled = 1;
    };

    testUtils.spawn(bodyParser(), ctx, next)
      .then(function() {
        expect(ctx.request.body).to.eql({
          dummy: true
        });
        expect(ctx.nextCalled).to.eql(1);
      })
      .nodeify(done);
  }
};
