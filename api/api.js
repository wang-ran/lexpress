const Base = require('./base');
const co = require('co');
const EventEmitter = require('events');
const api = new EventEmitter();

api.hubs = {};
api.init = function (sdkConf, cb) {
  co(function* () {
    const _sdk = new Base(sdkConf.sdkHost, sdkConf.sdkUserId, sdkConf.sdkSecret);

    api._sdk = _sdk;
    api.getLocationAll = api._sdk.getLocationAll;
    api.getLocationByDevice = api._sdk.getLocationByDevice;
    yield _sdk.connect();
    let hubs = yield _sdk.getOnlineHubs();
    // console.log("online hubs", hubs);

    hubs.forEach((hub) => {
      api.hubOnline(hub.mac, hub);
    });

    let statusWatcher;
    let timer = null;

    function watchStatus1() {
      console.log('watch hub status in way 1');
      statusWatcher = _sdk.hubStatus();
      statusWatcher.forEach(watch => {
        watch.onmessage = function (e) {
          if (e.data.startsWith(':keep-alive')) {
            return;
          };
          let data = JSON.parse(e.data);

          if (data.status === 'offline') {
            api.hubOffline(data.mac, data);
          } else {
            api.hubOnline(data.mac, data);
          }
        };
        watch.onerror = function (e) {
          console.log('watch hub status err', e);
          watch.close();
          setTimeout(watchStatus1, 200);
        };

      });
    }

    function watchStatus2() {
      _sdk.getOnlineHubs().then(function (hubs2) {
        const hubs2Mac = [];

        hubs2.forEach(function (element) {
          hubs2Mac.push(element.mac);
          if (!api.hubs[element.mac]) {
            api.hubOnline(element.mac, element);
          }
        }, this);
        for (let v in api.hubs) {
          if (!hubs2Mac.includes(v)) {
            api.hubOffline(v, api.hubs[v].info);
          }
        }
      });
    }

    if (Number(sdkConf.watchStatus) === 1) {
      watchStatus1();
    } else {
      console.log('watch hub status in way 2');
      timer && clearInterval(timer);
      timer = setInterval(function () {
        watchStatus2();
      }, Math.max(sdkConf.interval, 10000));
    }
    cb && cb();
  }).catch((err) => {
    console.log(err);
  });
};

api.hubOnline = function (mac, info) {
  api.emit('hubOnline', info);
  // console.log('hub online', mac);
  if (api.hubs[mac]) {
    console.log('**** repeat online', mac);
    api.hubs[mac].emit('offline');
  } else {
    console.log('+++++++ hub online', mac);
  }
  api.hubs[mac] = new api._sdk.Hub(mac);
  api.hubs[mac].info = info;
  api.hubs[mac].on('scan', function (data) {
    api.emit('scan', {
      data,
      mac
    });
  });

  api.hubs[mac].on('notify', function (notifyData) {
    api.emit('notify', notifyData);
  });

  api.hubs[mac].on('offline', function () {
    api.hubOffline(mac, info);
  });

  api.hubs[mac].on('error', function (err) {
    let statusCode = [401, 404, 502];

    if (statusCode.indexOf(err.status) !== -1) {
      api.hubOffline(mac, info);
    }
    console.error('hub', mac, err);
  });
};

api.hubOffline = function (mac, info) {
  api.emit('hubOffline', info);
  console.log('------- hub offline', mac);
  api.hubs[mac] && api.hubs[mac].destroy();
  delete api.hubs[mac];
};

api.get = function (mac) {
  return api.hubs[mac];
};

api.getHubs = function () {
  return api.hubs;
};
module.exports = api;
