const lexpress = require('./lexpress/index');
const parse = require('./lexpress/middleware/parse');
const salt = require('./lexpress/middleware/salt');
const filter = require('./utils/filter');
const smartFind = require('./lexpress/middleware/smartFind');
const hubConnectStatus = require('./lexpress/middleware/hubConnectStatus');

const schoolGate = require('./business/schoolgate.js')();
var schoolGateHubs = schoolGate.getSchoolGateHubs();

const app = lexpress();
// const easyMonitor = require('easy-monitor');

// easyMonitor('lexpressss');

// const heapdump = require('heapdump');
// const save = function (flag) {
//   gc();
//   heapdump.writeSnapshot('./' + (new Date()).toLocaleString() + '.heapsnapshot');
//   if (flag) {
//     setTimeout(function () {
//       process.exit();
//     }, 2000);
//   }
// };

// setTimeout(save, 3000);
// setTimeout(save, 5000);
// setTimeout(save, 10000);
// setTimeout(save, 15000, true);
app.scan(parse);
app.scan(filter);
app.notify(parse);
app.scan(salt(['name']));

app.scan(hubConnectStatus);
app.notify(hubConnectStatus);

app.use(function (req, res, next) {
  // console.log('all', req);
  next.call(this);
});
app.hub(function (req, res, next) {
  // console.log('hub', req);
  next.call(this);
});

app.scan({
  mac: function (hubMac) {
    // console.log('api.scan filter mac', req);
    if (hubMac === 'CC:1B:E0:E0:C4:54') {
      return false;
    }

  }
}, function (req, res, next) {
  // console.log('scannnnnnnnnn', req);
  // next.call(this);
});

// school gate
app.scan({
  mac: function (hubMac) {
    // 进出校根据hub mac地址过滤
    for (let door in schoolGateHubs) {
      if (schoolGateHubs[door].in.indexOf(hubMac) || schoolGateHubs[door].out.indexOf(hubMac)) {return true;}
    }

  }
}, function (req, res, next) {
  // console.log('schoolGate scanning~~', req);
  schoolGate.scanParse(req.data);
  next.call(this);
});

app.listen({
  address: 'http://192.168.199.183:3002/api',
  name: 'me',
  developer: 'cassia',
  secret: 'cassia'
});
