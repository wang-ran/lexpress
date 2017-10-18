const Lexpress = require('');
const filter = require('filter');
const parse = require('parse');
const Salt = require('salt');
const app = new Lexpress();
const hw = require('hw');
const iw = require('iw');
const heartRate = require('heartRate');
const salts = new Salt(['name', 'positon', 'time']);

/**
 * app.scan.use(address, callback)
 * 
 * address
 * Type:String , Array
 * The ACs's address 
 * 
 * callback
 * Type:Function
 * the middleware callback for do somethings
 * 
 */
app.use(parse);
app.scan.use(salts);
app.scan.use(filter);
app.scan.use(hw.scan);
app.scan.use(iw.scan);
app.scan.use(heartRate.scan);

app.scan.names('', '', function () {});
app.scan.uuid('', '', function () {});
app.scan.mac('', '', function () {});
app.scan.rssi('', function () {});

app.notify.use(hw.notify);
app.notify.use(iw.notify);
app.notify.use(heartRate.notify);

app.notify.mac('', '', function () {});
app.notify.handle('', '', function () {});

// app.connect([hubMac, ], deviceMac, type, body);

// app.write([hubMac, ], deviceMac, handle, value);

/**
 * online  offline  all
 */
app.hub('', function () {});

/**
 * online  offline  all
 */
app.le('', function () {});

/**
 *app.listen(address, callaback)
 * address
 * Type:Object,Array
 * the ACs.s config
 * 
 * callback
 * Type:Function
 * callback will be done when the ACs inited
 *   
 */
app.listen([{
  name: 'a1',
  address: '',
  developer: '',
  secret: ''
}], function () {

});
