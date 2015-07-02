var through = require('through2'),
    request = require('request'),
    split = require('split2'),
    combine = require('stream-combiner2'),
    pumpify = require('pumpify'),
    duplexify = require('duplexify'),
    xtend = require('xtend');

module.exports = function (_uri) {

  return moshpit;

  function moshpit (id) {
    var uri = _uri;

    id && (uri = geturi(uri, id));

    var cid, token,
        sse = pumpify.obj(request({ uri: uri }), parse()),
        dup = duplexify.obj(null, sse);

    return dup;

    function parse () {
      return combine(split('\n\n'), through.obj(write));

      function write (row, enc, cb) {
        var pair = row.toString().split('\n')
          .reduce(function (acc, line, i) {
            line = line.split(': ')[1];
            i && (line = JSON.parse(line));
            acc.push(line);
            return acc;
          }, []),
          event = pair[0], data = pair[1];

        if ('connect' === event) {
          id || (uri = geturi(uri, data.id));
          id = data.id;
          token = data.token;
          cid = data.cid;
          dup.setWritable(forward());
        }

        process.nextTick(dup.emit.bind(dup, event, data));
        cb(null, pair);
      }
    }

    function forward () {
      return through.obj(function (row, enc, cb) {
        var data = xtend(row),
            form = { data: data, token: token };

        if ('string' === typeof row._cid) {
          delete data._cid;
          form.cid = row._cid;
        }

        process.nextTick(request.post.bind(null, { uri: uri, form: form }));
        cb(null);
      });
    }
  }
};

function geturi (base, id) {
  var uri = base;
  if (/^http:\/{2}unix\:+/.test(base)) uri += ':';
  uri += '/' + id;
  return uri;
}