const Base = require('./base');
const co = require('co');
const EventEmitter = require('events');

class Api extends EventEmitter {
  constructor(cfg, cb) {
    super();
    this.cfg = cfg;
    this.cb = cb;
    this.hubs = {};
  }
  init(cfg = this.cfg, cb = this.cb) {
    return co(function* () {
      const _sdk = new Base(cfg.address, cfg.developer, cfg.secret);

      this.name = cfg.name;
      this.address = cfg.address;
      this._sdk = _sdk;
      this.getLocationAll = this._sdk.getLocationAll;
      this.getLocationByDevice = this._sdk.getLocationByDevice;
      yield _sdk.connect();
      let hubs = yield _sdk.getOnlineHubs();

      hubs.forEach((hub) => {
        this.hubOnline(hub.mac, hub);
      }, this);

      let timer = null;

      if (Number(cfg.watchStatus) === 1) {
        this.watchStatus1();
      } else {
        console.log('watch hub status in way 2');
        timer && clearInterval(timer);
        timer = setInterval(() => {
          this.watchStatus2();
        }, Math.max(cfg.interval, 10000));
      }
      cb && cb();
    }.bind(this));
  };
  watchStatus1() {
    console.log('watch hub status in way 1');
    const statusWatchers = this._sdk.hubStatus();
    statusWatchers.forEach(watch => {
      watch.onmessage = function (e) {
        if (e.data.match('keep-alive')) {
          return;
        };
        const data = JSON.parse(e.data);

        if (data.status === 'offline') {
          this.hubOffline(data.mac, data);
        } else {
          this.hubOnline(data.mac, data);
        }
      };
      watch.onerror = function (e) {
        // console.log('watch hub status err', e);
        // watch.close();
        // setTimeout(watchStatus1, 200);
      };

    });
  };
  watchStatus2() {
    this._sdk.getOnlineHubs().then(function (hubs2) {
      const hubs2Mac = [];

      hubs2.forEach(function (element) {
        hubs2Mac.push(element.mac);
        if (!this.hubs[element.mac]) {
          this.hubOnline(element.mac, element);
        }
      }, this);
      for (let v in this.hubs) {
        if (!hubs2Mac.includes(v)) {
          this.hubOffline(v, this.hubs[v].info);
        }
      }
    }.bind(this));
  };
  hubOnline(mac, info) {
    const self = this;

    if (this.hubs[mac]) {
      console.error('repeat online', mac);
      this.hubOffline(mac, info);
    } else {
      console.log('+++++++ hub online', mac);
    }
    this.emit('data', {
      address: this.name || this.address,
      method: 'hub',
      mac,
      data: {
        type: 'hubonline',
        info
      }
    });
    this.hubs[mac] = new this._sdk.Hub(mac);
    this.hubs[mac].info = info;
    this.hubs[mac].on('scan', (data) => {
      const d = {
        method: 'scan',
        address: this.name || this.address,
        origin: data.origin,
        mac
      };

      this.emit('data', d);
      this.emit('scan', d);
    });

    this.hubs[mac].on('notify', (notifyData) => {
      const d = {
        method: 'notify',
        address: this.name || this.address,
        data: notifyData,
        mac
      };

      this('data', d);
      this('notify', d);
    });

    this.hubs[mac].on('error', (err) => {
      let statusCode = [401, 404, 502];

      if (statusCode.indexOf(err.status) !== -1) {
        this.hubOffline(mac, info);
      }
      console.error('hub', mac, err);
    });
  };
  hubOffline(mac, info) {
    this.emit('hubOffline', info);
    this.emit('data', {
      method: 'hub',
      address: this.name || this.address,
      mac,
      data: {
        type: 'hubOffline',
        info
      }
    });
    console.log('------- hub offline', mac);
    this.hubs[mac] && this.hubs[mac].destroy();
    delete this.hubs[mac];
  };
  get(mac) {
    return this.hubs[mac];
  };
  getHubs() {
    return this.hubs;
  };
};

module.exports = Api;
