module.exports = function (option) {
  const nodes = new Map();
  const MAXLEN = 8000;
  const names = [];

  function addName(req, res, next) {
    const mac = req.data.node;
    const isRecord = nodes.has(mac);

    if (req.data.name !== 'null' && req.data.name !== '(unknown)') {
      if (!isRecord && names.length >= MAXLEN) {
        nodes.delete(names.shift());
      }
      names.push(mac);
      nodes.set(mac, req.data.name);
    } else if (isRecord) {
      req.data.name = nodes.get(mac);
    }
    next();
  }

  function addPosition(req, res, next) {
    next();
  }

  const handles = {
    name: addName,
    position: addPosition
  };
  const handleUsed = [];

  option.forEach(function (element) {
    if (handles[element]) {
      handleUsed.push(handles[element]);
    }
  });
  return handleUsed;
};
