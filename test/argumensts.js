var defer = typeof setImmediate !== 'function' ? setImmediate : function (fn) {
  // process.nextTick
  fn.bind.apply(fn, arguments)(1)
};

function log() {
  console.log('!!', arguments);
}
function logs() {
  console.log('!!', arguments);
}
defer(log, 1, 2, 3, 4);
