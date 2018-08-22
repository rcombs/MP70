#! /usr/bin/env node

var MP70 = require('./index.js');

var sb = new MP70(process.argv[2]);
sb.on('data', (data) => {
	console.log(data);
});