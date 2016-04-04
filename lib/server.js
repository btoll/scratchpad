(() => {
    'use strict';

    let http = require('http'),
        fs = require('fs'),
        logger = require('logger'),
        port = process.argv[2] || 1972,
        startServer;

    startServer = module.exports.startServer = (() => {
        let server = http.createServer((req, res) => {
            if (req.method === 'POST') {
                req.on('data', (body) => {
                    let data = JSON.parse(body);

                    fs.writeFile(data.scratchpad, data.note, {
                        encoding: 'utf8',
                        flag: 'a+',
                        // Octal 0666.
                        mode: 438
                    }, (err) => {
                        res.end(!err ?
                            'Scratchpad logged.' :
                            '[ERROR] Bad path.'
                        );
                    });

                    // Flood attack or faulty client, nuke request!
                    if (body.length > 1e6) {
                        req.connection.destroy();
                    }
                });
            }
        }).on('error', (err) => {
            logger.error(err);
        });

        server.listen(port);
    });

    startServer();
})();

