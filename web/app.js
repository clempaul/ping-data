var express = require('express');
var fs = require('fs');
var Promise = require('promise');
var config = require('config');

if (!config.has('common.domain') ||
    !config.has('common.interval') ||
    !config.has('common.dataDirectory') ||
    !config.has('web.longPingThreshold') ||
    !config.has('web.portNumber')) {
    
    console.error("domain, interval, dataDirectory, longPingThreshold and portNumber are all required.")
    process.exit(1);
}

var app = express();
var columns = 4;

var domain = config.get("common.domain");
var interval = config.get("common.interval");
var dataDir = config.get("common.dataDirectory") + "/";
var timeThreshold = parseFloat(config.get("web.longPingThreshold"));
var portNumber = config.get("web.portNumber");

app.use(express.static('web/static'));

function makeRow(style, values) {
    var r = '<tr';
    if (style) {
        r += ' class="' + style + '"'
    }
    r += '>';
  
    values.forEach(function (v, i) {
        r += '<td';
        if ((values.length < columns) && (i === values.length - 1)) {
            r += ' colspan="' + (columns - i) + '"';
        }
        r += '>' + v + '</td>';
    });
  
    r += '</tr>';
    return r;
}

function processFile(f) {
    return new Promise(function (resolve, reject) {
        fs.readFile(f, 'utf8', function (err, pingData) {
            var rows = [];
            var errors = [];
            var long = [];
      
            function createNormalLine(line) {
                var values = line.match(/\[(\d+\.\d*)\]\s+\d+\s+bytes from.*icmp_(req|seq)=(\d+)\s+ttl=(\d+)\s+time=(\d+\.?\d*) ms/);
                if (!values) {
                    return false;
                }
        
                var timestamp = new Date(parseFloat(values[1], 10) * 1000).toUTCString();
                var icmp_req = values[3];
                var ttl = values[4];
                var time = values[5];
        
                var isLong = time > timeThreshold;
        
                var row = makeRow(isLong ? 'warning' : null, [timestamp, icmp_req, ttl, time]);
        
                rows.unshift(row);
                if (isLong) {
                    long.unshift(row);
                }
        
                return true;
            }
      
            function createErrorLine(line) {
                var values = line.match(/\[(\d+\.\d*)\]\s+(From.*)/);
                if (!values) {
                    return false;
                }
                var timestamp = new Date(parseFloat(values[1], 10) * 1000).toUTCString();
                var row = makeRow('danger', [timestamp, values[2]]);
                rows.unshift(row);
                errors.unshift(row);
                return true;
            }

            function createUntimedErrorLine(line) {
                if (line.indexOf("Network is unreachable") != -1) {
                    var row = makeRow('danger', [line]);
                    rows.unshift(row);
                    errors.unshift(row);
                    return true;
                }

                return false;
            }
      
            pingData.split('\n').forEach(function (line) {
                if (line.length !== 0 &&
                    !createNormalLine(line) &&
                    !createErrorLine(line) &&
                    !createUntimedErrorLine(line)) {

                    rows.unshift(makeRow('info', [line]));
                }
            });
    
            resolve({
                rows: rows,
                errors: errors,
                long: long
            });
        });
    });
}

app.get('/', function (req, res) {
    var files = fs.readdirSync(dataDir);
    files = files.sort().reverse().slice(0, 5).map(function (f) { return dataDir + f; });
    Promise.all(files.map(processFile)).done(function (results) {
        var rowData = [];
        var errorData = "";
        var longData = "";
    
        results.forEach(function (r) {
            rowData = rowData.concat(r.rows);
            errorData += r.errors.join('\n');
            longData += r.long.join('\n');
        });
    
        fs.readFile('./web/page.html', 'utf8', function (err, data) {
            if (err) {
                console.error("Failed to open file :(", err);
                res.send("Failed to load template file :(");
                return;
            }
      
            res.send(data.replace('{{ROWDATA}}', rowData.slice(0, 24 * 60 * 2).join('\n'))
                         .replace('{{ERRORSROWDATA}}', errorData)
                         .replace('{{LONGROWDATA}}', longData)
                         .replace('{{TIMETHRESHOLD}}', timeThreshold)
                         .replace('{{DOMAIN}}', domain)
                         .replace('{{INTERVAL}}', interval));
        });
    }, function (err) {
        console.error(err);
        res.send("An error occurred :(");
    });
});

app.get('/full/', function (req, res) {
    var files = fs.readdirSync(dataDir);
    files = files.sort().reverse().map(function (f) { return dataDir + f; });
    Promise.all(files.map(processFile)).done(function (results) {
        var rowData = "";
    
        results.forEach(function (r) {
            rowData += r.rows.join('\n');
        });
    
        fs.readFile('./web/full.html', 'utf8', function (err, data) {
            if (err) {
                console.error("Failed to open file :(", err);
                res.send("Failed to load template file :(");
                return;
            }
      
            res.send(data.replace('{{ROWDATA}}', rowData)
                         .replace('{{TIMETHRESHOLD}}', timeThreshold)
                         .replace('{{DOMAIN}}', domain)
                         .replace('{{INTERVAL}}', interval));
        });
    }, function (err) {
        console.error(err);
        res.send("An error occurred :(");
    });
});

var server = app.listen(portNumber, function () {
    var host = server.address().address;
    var port = server.address().port;
  
    console.log('Ping data app listening at http://%s:%s', host, port);
});
