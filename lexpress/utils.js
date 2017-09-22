function _typeof(obj) {
  const class2type = {};

  'Boolean Number String Function Array Date RegExp Object Error'.split(' ').forEach(function (e, i) {
    class2type['[object ' + e + ']'] = e.toLowerCase();
  });
  if (obj === null) {
    return String(obj);
  }
  return typeof obj === 'object' || typeof obj === 'function' ?
    class2type[class2type.toString.call(obj)] || 'object' :
    typeof obj;
}
/**
 * Merge object b with object a.
 *
 *     var a = { foo: 'bar' }
 *       , b = { bar: 'baz' };
 *
 *     merge(a, b);
 *     // => { foo: 'bar', bar: 'baz' }
 *
 * @param {Object} a
 * @param {Object} b
 * @return {Object}
 * @api public
 */

function merge(a, b) {
  if (a && b) {
    for (var key in b) {
      a[key] = b[key];
    }
  }
  return a;
};

module.exports.merge = merge;
module.exports.typeof = _typeof;
