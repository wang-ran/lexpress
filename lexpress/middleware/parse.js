module.exports = function (req, res, next) {
  function safeParse(str) {
    const ret = [];
    let nIndex = str.indexOf('\n');

    try {
      if (nIndex !== -1) {
        ret.push(JSON.parse(str.slice(0, nIndex)));
        ret.push(JSON.parse(str.slice(nIndex + 1)));
      } else {
        ret.push(JSON.parse(str));
      }
      return ret;
    } catch (e) {
      console.error('parse json error', str);
      return ret;
    }
  }

  function toUpperCase(req, format, next) {
    const array = req.data;
    const len = array.length;

    for (let i = 0; i < len; i++) {
      array[i].name = String(array[i].name);
      if (array[i].adData) {
        array[i].adData = array[i].adData.toUpperCase();
      }
      if (array[i].scanData) {
        array[i].scanData = array[i].scanData.toUpperCase();
      }
      req.data = format(array[i]);
      req.data.mac = req.mac;
      next.call(this);
    }
  }

  function adDataFormate(data) {
    return {
      name: data.name,
      rssi: data.rssi,
      scanData: data.scanData || '',
      adData: data.adData || '',
      node: data.bdaddrs[0].bdaddr,
      type: data.bdaddrs[0].bdaddrType
    };
  }

  req.data = safeParse(req.origin);
  if (req.method === 'scan') {
    toUpperCase.call(this, req, adDataFormate, next);
  } else if (req.method === 'notify') {
    req.data.forEach(function (element) {
      next.call(this, element);
    }, this);
  }
};
