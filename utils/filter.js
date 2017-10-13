module.exports = function (req, res, next) {
  if (req.data.name.match(/par/i)) {
    next.call(this);
  }
};
