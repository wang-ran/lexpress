module.exports = function (address, developer, secret) {

  const EventEmitter = require('events');
  const request = require('request');
  const EventSource = require('./eventsource');
  const querystring = require('querystring');
  const getModel = require('./getModel');
  const headers = {
    Authorization: 'Basic ' + new Buffer(developer + ':' + secret, 'ascii').toString('base64')
  };

  const req = request.defaults({
    baseUrl: address,
    json: true,
    headers: headers
  });

  function auth() {
    auth.t && clearTimeout(auth.t);
    auth.t = setTimeout(auth, 59 * 60 * 1000);
    const getToken = function () {
      return new Promise(function (resolve, reject) {
        req.post('/oauth2/token', {
          headers: {
            Authorization: 'Basic ' + new Buffer(developer + ':' + secret, 'ascii').toString('base64')
          },
          body: {
            'grant_type': 'client_credentials'
          }
        }, function (err, res, body) {
          if (err) {
            console.error('get token fail', req.url);
            return reject(err);
          }
          if (res.statusCode !== 200) {
            console.error('get token fail--', req.url);
            typeof body === 'object' ? body = JSON.stringify(body) : body;
            reject(`${body}-${res.statusCode}`);
          }
          if (res.statusCode === 200) {
            console.log('get token success', req.url);
            headers.Authorization = 'Bearer ' + body.access_token;
            resolve(body.access_token);
          }
        });
      });
    };

    return getToken();
  }

  /**
   * safe parse eventsource data
   * @params {String} str
   * @return {Array} array of parsed object
   */
  function safeParse(str) {
    let ret = [];
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

  /**
   * @return {Object} an instance of EventSource
   * */
  function hubStatus() {
    const watcher = new EventSource(`${address}/cassia/hubStatus`, {
      headers: headers,
      timeout: 60000
    });

    watcher.onerror = function (e) {
      console.error(`watch ${address} hubStatus error`);
    };

    return [watcher];
  }

  /**
   * get uuid from addata
   * @param {String} data - addata from scan
   * @return {String} ret - the uuid
   * */
  function getUuid(data) {
    var uuid = '';
    var isFinding = true;
    var basePos = 0;

    while (isFinding && basePos < data.length) {
      var len = data.slice(basePos, basePos + 2);

      len = parseInt(len, 16);
      var type = data.slice(basePos + 2, basePos + 4);

      type = parseInt(type, 16);
      if (type === 6) {
        isFinding = false;
        uuid = data.slice(basePos + 4, basePos + 2 * len + 2);
      }
      basePos += 2 + 2 * len;
    }
    // eslint-disable-next-line
    var i = l = uuid.length
    var ret = '';

    while (i > 0) {
      ret += uuid.slice(i - 2, i);
      i = i - 2;
    }
    return ret;
  }

  /**
   * turn string to a uuid
   * @param {String} str
   * @param {Boolean} [_] - is split with -
   * @return {String} ret - the uuid
   * @example
   * //return 7365642E6A6975616E2E425041563130
   * toUUID('sed.jiuan.BPAV10')
   * */
  function toUUID(str, _) {
    let ret = '';

    for (let i = 0, l = str.length; i < l; i++) {
      ret += str.charCodeAt(i).toString(16).toUpperCase();
    }
    if (_) {
      ret = ret.slice(0, 8) + '-' + ret.slice(8, 12) + '-' + ret.slice(12, 16) +
        '-' + ret.slice(16, 20) + '-' + ret.slice(20);
    }
    return ret;
  }
  /**
      return  position by hub *
   * */
  function getLocationAll() {
    return new Promise(function (resolve, reject) {
      req.get('/middleware/position/by-ap/*',
        function (err, res, body) {
          if (err) {
            return reject(err);
          };
          if (res.statusCode !== 200) {
            return reject(`${body}-${res.statusCode}`);
          };
          resolve(body);
        });
    });
  };
  /**
   * get Location By Device
   * @param deviceMac - device
   * @return device positon 
   * */
  function getLocationByDevice(deviceMac) {
    return new Promise(function (resolve, reject) {
      req.get(`/middleware/position/by-device/${deviceMac}`,
        function (err, res, body) {
          if (err) {
            return reject(err);
          };
          if (res.statusCode !== 200) {
            return reject(`${body}-${res.statusCode}`);
          }
          resolve(body);
        });
    });
  }

  /**
   * transform hex number to string
   * @param {String} str
   * @return {String} ret
   * @example
   * 4b4e2d35353042542031313037300000 => KN-550BT 11070
   * */
  function hexToString(str) {
    let ret = '';

    for (let i = 0, l = str.length; i < l; i += 2) {
      let tmp = str.slice(i, i + 2);

      ret += String.fromCharCode(parseInt(tmp, 16));
    }
    return ret;
  }

  function getOnlineHubs() {
    return new Promise(function (resolve, reject) {
      req.get('/cassia/hubs', function (err, res, body) {
        if (err) {
          return reject([]);
        }
        if (res.statusCode && res.statusCode === 200) {
          return resolve(body);
        }
        return reject([]);
      });
    });
  }

  /**
     * create a Hub which is a sub class of EventEmitter,
     * it has three builtin events
     *  - notify, will emit when bluetooth device has notify
     *  - scan, will emit when hub has scan data
     *  - offline, will emit when hub offline
     *  - error, will emit when some error happen(include offline)
    
     * @class
     * @param {String} hubMac
     * */
  class Hub extends EventEmitter {
    constructor(hubMac) {
      super();
      this.model = getModel(hubMac);
      this.mac = hubMac;
      this.notifyEs = null;
      this.scanEs = null;

      this.on('newListener', (eventName) => {
        switch (eventName) {
          case 'notify':
            this.notifyEs = this.listenNotify();
            break;
          case 'scan':
            this.scanEs = this.scan();
            break;
        }
      });
      this.on('removeListener', (eventName) => {
        const count = this.listenerCount(eventName);

        switch (eventName) {
          case 'notify':
            if (!count) {
              this.notifyEs.close();
              this.notifyEs = null;
              console.log(address, this.mac, 'removeListener stop notify');
            }
            break;
          case 'scan':
            if (!count) {
              this.scanEs.close();
              this.scanEs = null;
              console.log(address, this.mac, 'removeListener stop scan');
            }
            break;
        }
      });
      this.on('offline', () => {
        this.emit('error', 'offline');
      });
    }

    /**
     * let the hub start scan, this method will return a EventSource
     * @param {Object} [option]
     * return EventSource
     * */
    scan(option = {
      active: 1
    }) {
      if (this.scanEs) {
        return this.scanEs;
      }
      const self = this;
      const query = querystring.stringify(option);

      console.info(`${address} ${this.mac} start scan`, option);
      const es = new EventSource(`${address}/gap/nodes?mac=${this.mac}&event=1&${query}`, {
        headers: headers,
        timeout: 60000
      });

      es.onmessage = function (e) {
        // if (e.data.match('offline')) {
        //   this.emit('offline');
        //   return;
        // }
        self.emit('scan', {
          origin: e.data
        });
      };
      es.onerror = function (e) {
        self.emit('error', e);
      };
      return es;
    }

    /**
     * connect device
     * @param {String} deviceMac
     * @param {String} [type]
     * @param {Object} body
     * @param {String} body.sub_type
     * @param {String} body.product_id
     * @param {String} body.product_seq
     * */
    connect(deviceMac, type, body) {
      const self = this;

      if (nodeConnecting[this.mac]) {
        return Promise.reject('busy');
      };
      console.info('connect', deviceMac, type, body);
      if (typeof type === 'object') {
        body = type;
        type = 'public';
      }
      nodeConnecting[this.mac] = true;
      return new Promise((resolve, reject) => {
        const t = setTimeout(function () {
          nodeConnecting[self.mac] = false;
          return reject('timeout');
        }, 10000);

        req.post('/gap/nodes/' + deviceMac + '/connection', {
          qs: {
            mac: this.mac
          },
          body: Object.assign({
            type: type || 'public',
            timeOut: 6000
          }, body)
        }, function (err, res, body) {
          t && clearTimeout(t);
          nodeConnecting[self.mac] = false;
          console.log(self.mac, 'connect', deviceMac, body, err);
          typeof body === 'object' ? body = JSON.stringify(body) : body;
          if (err) {
            return reject(err);
          }
          if (res && res.statusCode !== 200) {
            return reject(`${body}-${res.statusCode}`);
          }
          return resolve();
        });
      });
    }

    disConnect(deviceMac) {
      return new Promise((resolve, reject) => {
        req.delete('gap/nodes/' + deviceMac + '/connection', {
          qs: {
            mac: this.mac
          }
        }, function (err, res, body) {
          typeof body === 'object' ? body = JSON.stringify(body) : body;
          if (err) {
            return reject(err);
          }
          if (res && res.statusCode !== 200) {
            return reject(body);
          }
          return resolve(body);
        });
      });
    }

    /**
     * write by handler
     * @param {String} deviceMac
     * @param {String} handle
     * @param {String} value
     * */
    writeByHandle(deviceMac, handle, value) {
      let self = this;

      return new Promise(function (resolve, reject) {
        req.get(`/gatt/nodes/${deviceMac}/handle/${handle}/value/${value}`, {
          qs: {
            mac: self.mac
          }
        }, function (err, res, body) {
          if (err) {
            console.error('write handle error', body, handle, value);
            return reject(err);
          };
          typeof body === 'object' ? body = JSON.stringify(body) : body;
          if (res && res.statusCode !== 200) {
            console.error('write handle error', body, handle, value);
            return reject(`${body}-${res.statusCode}`);
          }
          console.log('write handle ok', body, handle, value);
          return resolve(body);
        });
      });
    }

    /**
     * read by handle
     * @param {String} deviceMac
     * @param {String} handle
     * */
    readByHandle(deviceMac, handle) {
      let self = this;

      return new Promise(function (resolve, reject) {
        req.get(`/gatt/nodes/${deviceMac}/handle/${handle}/value`, {
          qs: {
            mac: self.mac
          }
        }, function (err, res, body) {
          if (err) {
            return reject(err);
          };
          typeof body === 'object' ? body = JSON.stringify(body) : body;
          if (res.statusCode !== 200) {
            return reject(`${body}-${res.statusCode}`);
          };
          resolve(body);
        });
      });
    }

    /**
     * @param {String} deviceMac
     * @param {String} [uuid]
     * */
    getCharacteristic(deviceMac, uuid) {
      return new Promise((resolve, reject) => {
        req.get(`/gatt/nodes/${deviceMac}/characteristics`, {
          qs: {
            mac: this.mac,
            uuid: uuid
          }
        }, function (err, res, body) {
          if (err) {
            return reject(err);
          };
          typeof body === 'object' ? body = JSON.stringify(body) : body;
          if (res.statusCode !== 200) {
            return reject(`${body}-${res.statusCode}`);
          };
          resolve(body.characteristics);
        });
      });

    }

    listenNotify() {
      let self = this;

      if (this.notifyEs) {
        return this.notifyEs;
      };
      const es = new EventSource(`${address}/gatt/nodes?event=1&mac=${this.mac}`, {
        headers: headers,
        timeout: 60000
      });

      es.onmessage = function (e) {
        if (e.data.match('keep-alive')) {
          return;
        };
        if (e.data.match('offline')) {
          self.emit('offline');
        }
        // let datas = safeParse(e.data);

        // datas.forEach(d => {
        self.emit('notify', e.data);
        // });
      };
      es.onerror = function (e) {
        self.emit('error', e);
      };
      return es;
    }

    destroy() {
      this.removeAllListeners();
    }
  }

  return {
    connect: auth,
    hubStatus: hubStatus,
    getUuid: getUuid,
    toUUID: toUUID,
    hexToString: hexToString,
    getOnlineHubs: getOnlineHubs,
    Hub: Hub,
    safeParse,
    getLocationAll: getLocationAll,
    getLocationByDevice: getLocationByDevice
  };
};
