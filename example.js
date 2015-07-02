var pit = require('./')('http://localhost:5000');

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