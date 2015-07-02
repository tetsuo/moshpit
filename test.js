var test = require('tap').test;
var path = require('path');
var os = require('os');
var request = require('request');
var createApp = require('./app');
var moshpit = require('./');
var http = require('http');
var through = require('through2');

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

test('direct', function (t) {
  t.plan(6);

  var app = createApp(),
      server = http.createServer(app.callback()),
      socket = tmpfile(),
      uri = 'http://unix:/' + socket,
      pit = moshpit(uri),
      peers = [];

  server.listen(socket, function () {
    pit()
      .on('connect', function (data) {
        pit(data.id)
          .on('signal', function (data) {
            if (!data.y) {
              t.notEqual(data.x, '777');
              t.equal(data.x, '555');
              return;
            }
            t.equal(data.y, '333');
            process.nextTick(this.destroy.bind(this));
          });
        pit(data.id)
          .on('signal', function (data) {
            if (!data.y) {
              t.notEqual(data.x, '555');
              t.equal(data.x, '777');
              return;
            }
            t.equal(data.y, '333');
            process.nextTick(this.destroy.bind(this));
          });
      })
      .on('join', function (data) {
        if (peers.push(data.cid) > 1) {
          this.write({ _cid: peers[1], x: 777 });
          this.write({ _cid: peers[0], x: 555 });
          process.nextTick(this.write.bind(this, { y: 333 }));
        }
      })
      .on('leave', function (data) {
        peers.splice(peers.indexOf(data.cid), 1);
        if (!peers.length) this.destroy();
      })
      .on('close', server.close.bind(server));
  });
});

test('buffer up writes', function (t) {
  t.plan(1);

  var app = createApp(),
      server = http.createServer(app.callback()),
      socket = tmpfile(),
      uri = 'http://unix:/' + socket,
      pit = moshpit(uri);

  server.listen(socket, function () {
    var peer = pit();
    peer.write({ x: 555 });
    peer.on('signal', function (data) {
      t.equal(data.x, '555');
      this.destroy();
    })
    .on('close', server.close.bind(server));
  });
});

test('pipes', function (t) {
  t.plan(4);

  var app = createApp(),
      server = http.createServer(app.callback()),
      socket = tmpfile(),
      uri = 'http://unix:/' + socket,
      pit = moshpit(uri);

  server.listen(socket, function () {
    var peer = pit(), cnt = -1;
    peer.on('close', server.close.bind(server));

    peer.pipe(through.obj(function (row, enc, cb) {
      if (++ cnt < 1)
        t.equal(row[0], 'connect');
      else {
        t.equal(row[0], 'signal');
        t.equal(row[1].x, '555');
      }
      cb(null);
    }));

    peer.once('signal', function (data) {
      t.equal(data.x, '555');
      this.destroy();
    });

    peer.write({ x: 555 });
  });
});