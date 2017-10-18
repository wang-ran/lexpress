const EventEmitter = require('events').EventEmitter;
const utils = require('./utils');
const proto = {};
const env = process.env.NODE_EVN || 'development';
const METHOD = ['scan', 'notify', 'hub', 'le'];
const PROPERTY = ['name', 'uuid', 'rssi'];
const Sdk = require('./bi/api');
const UNIQUE = '<_all_>';
const DEFAULT = {
  address: UNIQUE,
  mac: UNIQUE,
  method: METHOD,
  handle: (req, res, next) => next()
};

module.exports = lexpress;

function lexpress() {
  function app(req, res, next) {
    app.handle(req, res, next);
  }
  utils.merge(app, proto);
  utils.merge(app, EventEmitter.prototype);
  app.stack = {
    scan: [],
    notify: [],
    le: [],
    hub: []
  };
  return app;
}

/**
 * 
 * 
 * @param {String|Array} address 
 * @param {String|Array} router 
 * @param {String|Array} method 
 * @param {String|Array} property 
 * @param {String|Function} route 
 * @param {Function} fn 
 * @return {app} for chaining 
 * {
 * address,
 * method,
 * property,
 * route,
 * fn
 * }
 * 
 */

proto.use = function use(option, handles) {
  const len = arguments.length;
  const optionType = utils.typeof(option);
  const handlesType = utils.typeof(handles);

  if (len === 1) {
    if (optionType === 'array') {
      handles = option;
    } else if (optionType === 'function') {
      handles = [option];
    }
    option = DEFAULT;
  } else if (len === 2) {
    if (optionType === 'function') {
      option = Object.assign({}, DEFAULT, {
        route: option
      });
    } else if (optionType === 'object') {
      option = Object.assign({}, DEFAULT, option);
    }
    if (handlesType === 'function') {
      handles = [handles];
    }
  }
  if (utils.typeof(option.method) === 'array') {
    option.method.forEach(function (ele) {
      if (proto[ele]) {
        this[ele](option, handles);
      }
    }, this);
  } else if (proto[option.method]) {
    this.stack[option.method].push(option, handles);
  }
  return this;
};

// ['scan', 'notify', 'hub', 'le'];
METHOD.forEach(function (ele, index, arr) {
  proto[ele] = function (option, handles) {
    const len = arguments.length;
    const optionType = utils.typeof(option);
    const handlesType = utils.typeof(handles);

    if (len === 1) {
      if (optionType === 'function') {
        handles = [option];
        option = Object.assign({}, DEFAULT, {
          method: ele
        });
      } else if (optionType === 'array') {
        handles = option;
        option = Object.assign({}, DEFAULT, {
          method: ele
        });
      }
    } else if (len === 2) {
      if (optionType === 'function') {
        option = Object.assign({}, DEFAULT, {
          route: option,
          method: ele
        });
      } else if (optionType === 'object') {
        option = Object.assign({}, DEFAULT, option, {
          method: ele
        });
      }
      if (handlesType === 'function') {
        handles = [handles];
      }
    }
    handles.forEach(function (handle) {
      this.stack[option.method].push(Object.assign(option, {
        handle: handle
      }));
    }, this);
    return this;
  };
});

proto.handle = function (req, res, out) {
  let index = 0;
  const stack = this.stack[req.method];

  function next(err) {
    const layer = stack[index++];

    if (!layer) {
      // defer(done, err);
      return;
    }
    if (compare.call(this, req, layer, next.bind(this, err))) {
      call.call(this, layer.handle, layer.route, err, req, res, next);
    }
  }
  next.call(this);
};

proto.listen = function (cfg, callback) {
  let sdk = new Sdk(cfg);

  sdk.on('data', this);
  sdk.init.call(sdk).then(function () {
    callback && callback(this);
  }, function (e) {
    console.error('----', e);
    sdk.removeAllListeners();
  });
};

function compare(req, layer, fn) {
  function routeCompare(str, layerRule) {
    const ruleType = utils.typeof(layerRule);

    if (layerRule === UNIQUE) {
      return true;
    }
    if (ruleType === 'string') {
      return str === layerRule;
    }
    if (ruleType === 'regexp') {
      return layerRule.exec(str);
    }
    if (ruleType === 'function') {
      return layerRule(str);
    }
    if (ruleType === 'array') {
      return layerRule.includes(str);
    }
    if (ruleType === 'number') {
      return layerRule < str;
    }
    if (ruleType === 'undefined') {
      return true;
    }
  }
  if (!req.data) {
    return true;
  }
  for (let key in layer) {
    if (layer.hasOwnProperty(key)) {
      if (key === 'route') {
        if (!routeCompare(req, layer[key], req)) {
          return fn();
        }
      } else if (key === 'address' || key === 'mac') {
        if (!routeCompare(req[key], layer[key], req)) {
          return fn();
        }
      } else if (key !== 'handle' && key !== 'method') {
        if (!routeCompare(req.data[key], layer[key], req)) {
          return fn();
        }
      }
    }
  }
  return true;
}

function call(handle, route, err, req, res, next) {
  const arity = handle.length;
  const hasError = Boolean(err);
  let error = err;

  try {
    if (hasError && arity === 4) {
      // error-handling middleware
      handle.call(this, err, req, res, next);
      return;
    } else if (!hasError && arity < 4) {
      // request-handling middleware
      handle.call(this, req, res, next);
      return;
    }
  } catch (e) {
    // replace the error
    error = e;
    console.error(e);
  }

  // continue
  // next(error);
}
