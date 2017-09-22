const EventEmitter = require('events');
const utils = require('./utils');
const proto = {};
const env = process.env.NODE_EVN || 'development';
const LISTENER = ['scan', 'notify', 'hub', 'le'];
const PROPERTY = ['name', 'uuid'];
const DEFAULT = {
  address: 'all',
  hubMac: 'all',
  listener: 'all',
  property: 'all',
  route: 'all',
  handle: null
};

var defer = typeof setImmediate === 'function' ? setImmediate : function (fn) {
  process.nextTick(fn.bind.apply(fn, arguments));
};

module.exports = lexpress;

function lexpress() {
  function app(req, next) {
    app.handle(req, next);
  }
  utils.merge(app, proto);
  utils.merge(app, EventEmitter.prototype);
  app.route = '/';
  app.stack = [];
  return app;
}

/**
 * 
 * 
 * @param {String|Array} address 
 * @param {String|Array} router 
 * @param {String|Array} listener 
 * @param {String|Array} property 
 * @param {String|Function} route 
 * @param {Function} fn 
 * @return {app} for chaining 
 * {
 * address,
 * listener,
 * property,
 * route,
 * fn
 * }
 * 
 */

proto.use = function use(option, fn) {
  let _option = null;

  if (typeof option === 'function') {
    _option = Object.assign({}, DEFAULT, {
      handle: option
    });
  } else {
    option.handle = fn;
    _option = Object.assign({}, DEFAULT, option);
  }

  this.stack.push(_option);
  return this;
};

// ['scan', 'notify', 'hub', 'le'];
LISTENER.forEach((ele, index, arr) => {
  proto[ele].use = function (option, fn) {
    let _option = Object.assign({}, DEFAULT, {
      listener: ele
    });

    if (typeof option === 'function') {
      fn = option;
    } else {
      _option = Object.assign({}, _option, {
        listener: ele
      });
    }
    proto.use(_option, fn);
  };
});

proto.notify.use = proto.use();
proto.hub.use = proto.use();
proto.le.use = proto.use();

proto.handle = function (req, res, out) {
  let index = 0;
  const stack = this.stack;
  const done = out;

  function next(err) {
    const layer = stack[index++];

    if (!layer) {
      defer(done, err);
      return;
    }

    call(layer.handle, layer.route, err, req, next);
  }
  next();
};

function call(handle, route, err, req, res, next) {
  const arity = handle.length;
  const hasError = Boolean(err);
  let error = err;

  try {
    if (hasError && arity === 4) {
      // error-handling middleware
      handle(err, req, res, next);
      return;
    } else if (!hasError && arity < 4) {
      // request-handling middleware
      handle(req, res, next);
      return;
    }
  } catch (e) {
    // replace the error
    error = e;
  }

  // continue
  next(error);
}
