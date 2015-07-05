# moshpit

exchange messages between peers using http+sse.

# example

fork a server:

```sh
$ moshpit -p 5000
```

ping and pong:

```js
var pit = require('moshpit')('http://localhost:5000');

var initiator = pit();

initiator.on('connect', function (data) {
  var initiatorId = data.cid;

  initiator
    .on('join', function (data) {
      var peerId = data.cid;

      this.write({
        message: 'ping ' + data.cid,
        from: initiatorId,
        _cid: peerId
      });
    })
    .on('signal', function (data) {
      console.log(data.message);
      this.destroy();
    });

  var peer = pit(data.id);

  peer.on('signal', function (data) {
    console.log(data.message);
    this.write({
      message: 'pong ' + data.from,
      _cid: data.from // omit this to send a broadcast message
    });
  });
});
```

# api

```js
var pit = require('moshpit')(uri)
```

## var peer = pit(id)

Returns a duplex object stream that takes in broadcast (or direct) messages as input and produces rows of `[event label, message body]` pairs.

This connects to the moshpit http server at given `url` (optionally at given channel specified by `id`) and starts a server-sent events stream. Writing to `peer` makes a POST request to send supplied data.

You can immediately start writing objects to `peer`, it will buffer up writes until the sse connection is made. When the sse connection is established, the `connect` event will be emitted.

```js
var pit = require('moshpit')('http://localhost:5000');

var owner = pit();
owner.on('data', console.log.bind(null));
owner.write({ 'hello': 'me' });
```

outputs:

```
[ 'connect',
  { id: 'a1ad1a210063392d29027dbdd5fc9dd7',
    cid: 'a31b6b15326ca2907b3b492df1e6385a',
    token: '3b970f792805fd3081b058a5655a534d' } ]
[ 'signal', { hello: 'me' } ]
```

If `id` is not supplied, server creates a new channel and assigns an `id` to it. The peer that created this channel, becomes the `initiator` or `owner`. When `owner` leaves, all connections are closed and the channel is destroyed.

To join an existing channel, you pass `id` of it:

```js
var peer = pit('a1ad1a210063392d29027dbdd5fc9dd7');
peer.on('data', console.log.bind(null));
```

outputs:

```
[ 'connect',
  { id: 'a1ad1a210063392d29027dbdd5fc9dd7',
    cid: 'a31b6b15326ca2907b3b492df1e6385a',
    token: '3b970f792805fd3081b058a5655a534d' } ]
```

When `peer` joins, `owner` is also dispatched a `join` event with `peer`'s `cid`. Likewise when it leaves, a `leave` event will be emitted.

### pushing broadcast messages

```js
peer.write({ boom: 'boom' });
```

### pushing direct messages

`_cid` property is reserved to send direct messages:

```js
peer.write({
  boom: 'boom',
  _cid: 'a31b6b15326ca2907b3b492df1e6385a'
});
```

# events

## peer.on('connect', function (data))

Emitted when the sse connection is established. `data` contains:

- `id` of the connected channel
- `cid` is connection id that identifies this `peer`
- `token` is a secret value which is internally used to authenticate

## peer.on('signal', function (data))

Emitted when a signal is received.

## owner.on('join', function (data))

Emitted when a new peer is subscribed. `data` contains `cid` of the joining client.

## owner.on('join', function (data))

Emitted when a peer leaves, `data` contains `cid` of the leaving client.

# server

```js
var createApp = require('moshpit/app')
```

## var app = createApp()

Returns a [koa](https://github.com/koajs/koa) application which is a thin wrapper around [koa-signal](https://github.com/tetsuo/koa-signal) and [koa-cors](https://github.com/koajs/cors).

# usage

```
usage: moshpit {options}

Options:
  --help, -h     show this message
  --version, -V  show version number
  --port, -p     listen for connections on this port
  --uid, -u      drop permissions to this uid
  --gid, -g      drop permissions to this gid
```

# license

mit
