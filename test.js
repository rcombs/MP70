#! /usr/bin/env node

var MP70 = require('./index.js');

var spec;

try {
  spec = JSON.parse(process.argv[2]);
} catch (e) {
  spec = process.argv[2];
}

var sb = new MP70(spec);
sb.on('data', (data) => {
	console.log(data);
});
