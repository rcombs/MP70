#! /usr/bin/env node

const SerialPort = require('serialport');
const Delimiter = require('@serialport/parser-delimiter');
const EventEmitter = require('events');

function parseNanZero(num) {
  num = parseInt(num, 10);
  if (isNaN(num))
    return 0;
  return num;
}

function pad(s, n) {
  s = s.toString();
  while (s.length < n)
    s = '0' + s;
  return s;
}

class MP70 extends EventEmitter {
  constructor(spec) {
    super();
    var self = this;
    this.parser = new Delimiter({ delimiter: '\x03' });
    this.parser.on('data', (data) => {
      // Complete records always start with 0x02; discard partial ones
      if (data[0] != 0x02)
        return;
      data = data.slice(1).toString();
      var obj = {};
      switch (data[0]) {
      case 'C':
        obj.ClkMin = parseNanZero(data.substr(1, 2));
        obj.ClkSec = parseNanZero(data.substr(3, 2));
        obj.ClkDS = parseNanZero(data[5]);
        obj.ClkFullSeconds = pad(obj.ClkSec, 2);
        if (data[5] == ' ') {
          obj.GameClk = obj.ClkMin + ':' + pad(obj.ClkSec, 2);
        } else {
          obj.ClkFullSeconds += '.' + obj.ClkDS;
          obj.GameClk = obj.ClkFullSeconds;
        }
        obj.Period = parseNanZero(data[6]);
        obj.ShotClk = parseNanZero(data.substr(7, 2));
        break;
      case 'F':
        obj.HTName = data.substr(1, 10);
        obj.HScore = parseNanZero(data.substr(11, 2));
        obj.HToL = parseNanZero(data[13]);
        obj.VTName = data.substr(14, 10);
        obj.VScore = parseNanZero(data.substr(24, 2));
        obj.VToL = parseNanZero(data[26]);
        obj.Down = parseNanZero(data[27]);
        obj.ToGo = parseNanZero(data.substr(28, 2));
        obj.BallOn = parseNanZero(data.substr(30, 2));
        obj.Poss = data[32];
        break;
      }
      self.emit('data', obj, data);
      self.emit(data[0], obj, data);
    });
    this.open(spec);
  }

  openPath(path) {
    var self = this;
    this.port = new SerialPort(path, {baudRate: 9600});
    this.port.on('close', () => { self.open(); });
    this.port.pipe(this.parser);
  }

  open(spec) {
    var self = this;
    this.cancel();
    if (!spec)
      spec = this.spec;
    this.spec = spec;
    if (typeof spec == "string") {
      this.openPath(spec);
    } else {
      SerialPort.list((err, list) => {
        if (err) {
          self.emit('error', err);
          self.timeout = setTimeout(self.open.bind(self), 1000);
          return;
        }
        var port;
        for (var i = 0; i < list.length; i++) {
          var valid = true;
          for (var j in spec) {
            if (spec[j] != list[i][j]) {
              valid = false;
              break;
            }
          }
          if (valid) {
            port = list[i].comName;
            break;
          }
        }

        if (port)
          self.openPath(port);
        else
          self.timeout = setTimeout(self.open.bind(self), 1000);
      });
    }
  }

  opened() {
    var self = this;
    // Emit a delimiter to flush the parser
    this.parser.push('\x03');

    this.port.open(function (err) {
      clearTimeout(self.timeout);
      self.timeout = setTimeout(self.open.bind(self), 1000);
    });
  }

  cancel() {
    clearTimeout(this.timeout);
  }
}

module.exports = MP70;
