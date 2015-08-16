var child_process = require('child_process');
var config = require('config');
var fs = require('fs');

if (!config.has('common.domain') ||
    !config.has('common.interval') ||
    !config.has('common.dataDirectory') ||
    !config.has('pinger.filePeriod')) {

    console.error("domain, interval, dataDirectory and filePeriod are all required.")
    process.exit(1);
}

var domain = config.get("common.domain");
var interval = config.get("common.interval"); // seconds
var filePeriod = config.get("pinger.filePeriod"); // seconds
var outputDir = config.get("common.dataDirectory");

console.log("Pinging " + domain + " at " + interval + "s intervals for " + filePeriod + "s");

var timestamp = new Date().getTime().toString();

var filestream = fs.createWriteStream(outputDir + '/' + domain + '.log.' + timestamp);
var cmd = "ping";
var args = [ "-D", "-i", interval, "-c", filePeriod / interval, domain ];

var child = child_process.spawn(cmd, args);
child.stdout.pipe(filestream);
child.stderr.pipe(filestream);

child.on('exit', function(code, signal) {
	if (code === 0) {
		console.log("Exited cleanly");
	}
	else {
		console.error("Exited non-cleanly, rc: ", code);
	}
	filestream.close();
});
	
process.on('SIGTERM', function() {
	// We need to kill our child process when we terminate
	child.kill('SIGINT');
});
