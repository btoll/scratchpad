var exports = module.exports = {},
    http = require('http'),
    fs = require('fs'),
    through = require('through2'),
    tr, data, startServer;

/*
tr = through(function (buff, _, next) {
    data = JSON.parse(buff.toString());
    file = data.file;

    this.push(data.note);
    next();
});
*/

startServer = exports.startServer = function () {
    server = http.createServer(function (req, res) {
        if (req.method === 'POST') {
            req.on('data', function (body) {
                data = JSON.parse(body);

                fs.writeFile(data.notefile, data.note, {
                    encoding: 'utf8',
                    flag: 'a+',
                    // Octal 0666.
                    mode: 438
                });

                // Flood attack or faulty client, nuke request!
                if (body.length > 1e6) {
                    request.connection.destroy();
                }
            });


            req.on('end', function () {
                res.end('Notation completed succesfully.');
            });

            /*
            req.pipe(tr)
            .pipe(fs.createWriteStream('foo.txt', {
                flags: 'a+',
                encoding: 'utf8',
                mode: 0666
            }));

            res.end('Notation completed succesfully.\n');
            */
        }
    });

    server.listen(1972);
};

startServer();

