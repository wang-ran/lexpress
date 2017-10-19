module.exports = function (req, res, next) {
  //console.log('tttttt',this)
  next.call(this);
}
