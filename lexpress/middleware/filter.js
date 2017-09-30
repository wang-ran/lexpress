module.exports = function (req, res, next, filter) {
  if (filter(req.data)) {
    next();
  }
};
