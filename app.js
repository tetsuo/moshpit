var koa = require('koa'),
    signal = require('koa-signal'),
    cors = require('koa-cors');

module.exports = function () {
  return koa().use(cors()).use(signal());
};
