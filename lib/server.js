/* eslint-disable no-console */

var http = require('http'),
    fs = require('fs'),
    port = process.argv[2] || 1972,
    startServer;

startServer = module.exports.startServer = function () {
    var server = http.createServer(function (req, res) {
        if (req.method === 'POST') {
            req.on('data', function (body) {
                var data = JSON.parse(body);

                fs.writeFile(data.notefile, data.note, {
                    encoding: 'utf8',
                    flag: 'a+',
                    // Octal 0666.
                    mode: 438
                }, function (err) {
                    res.end(!err ?
                        'Filenote logged.' :
                        '[ERROR] Bad path.'
                    );
                });

                // Flood attack or faulty client, nuke request!
                if (body.length > 1e6) {
                    req.connection.destroy();
                }
            });
        }
    }).on('error', function (err) {
        console.log(err);
    });

    server.listen(port);
};

startServer();

