const lexpress = require('./lexpress/index');
const parse = require('./lexpress/middleware/parse');
const salt = require('./lexpress/middleware/salt');
const app = lexpress();

app.scan(parse);
app.scan(salt(['name']));

app.use(function (req, res, next) {
  console.log('all', req);
  // next();
});
app.hub(function (req, res, next) {
  console.log('hub', req);
  // next();
});
app.scan({
  // address:'--',
  // property: 'node',
  route: function (req) {
    console.log('%%%%%%%', req);
    // return true;
  }
}, function (req, res, next) {
  console.log('scan', req);
  // next();
});
app.listen({
  address: 'http://localhost:3002/api',
  name: 'me',
  developer: 'cassia',
  secret: 'cassia'
});
