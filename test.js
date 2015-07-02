var test = require('tap').test;
var path = require('path');
var os = require('os');
var request = require('request');
var createApp = require('./app');
var moshpit = require('./');
var http = require('http');

function tmpfile () {
  return path.join((os.tmpdir || os.tmpDir)(), 'moshpit-' + Math.random());
}

test('cors', function (t) {
  t.plan(1);

  var app = createApp(),
      server = http.createServer(app.callback()),
      socket = tmpfile();

  server.listen(socket, function () {
    var req = request('http://unix:/' + socket);

    req.on('response', function (res) {
      t.equal(res.headers['access-control-allow-origin'], '*');
      req.abort();
    }).on('end', server.close.bind(server));
  });
});

test('events', function (t) {
  t.plan(2);

  var app = createApp(),
      server = http.createServer(app.callback()),
      socket = tmpfile(),
      uri = 'http://unix:/' + socket,
      pit = moshpit(uri);

  server.listen(socket, function () {
    pit()
      .on('connect', function (data) {
        pit(data.id)
          .on('signal', function (data) {
            t.equal(data.x, '555');
            this.destroy();
          })
          .on('close', function () {
            t.ok(this.destroyed);
          });
      })
      .on('join', function (data) {
        this.write({ x: 555 });
      })
      .on('leave', function (data) {
        this.destroy();
      })
      .on('close', server.close.bind(server));
  });
});