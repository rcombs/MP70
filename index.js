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
	constructor(path) {
		super();
		var self = this;
		this.port = new SerialPort(path, {baudRate: 9600});
		this.parser = this.port.pipe(new Delimiter({ delimiter: '\x03' }));
		this.port.on('close', () => { self.reopen(); });
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
			self.emit('data', data, obj);
			self.emit(data[0], obj);
		});
	}

	reopen() {
		var self = this;
		// Emit a delimiter to flush the parser
		this.parser.push('\x03');
		this.port.open(function (err) {
			setTimeout(self.reopen.bind(self), 1000);
		});
	}
}

module.exports = MP70;
