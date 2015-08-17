// https://github.com/JCMais/node-libcurl/blob/master/examples/post-data.js
// curl -H "Accept: application/json" -H "Content-Type: application/json" -X POST -d '{"file":"bar.txt", "note": "aaaaaaahhh!!"}' http://localhost:1972
var exports = module.exports = {},
    Curl = require('node-libcurl').Curl,
    fs = require('fs'),
    inquirer = require('inquirer'),
    readline = require('readline'),
    Getopt = require('node-getopt'),
    curl = new Curl(),
    url  = 'http://localhost:1972',
    addNotefile, getNotefiles, makeRequest, writeFile,
    note, notefile, getopt, opt, rl;

getopt = new Getopt([
    ['' , 'add-notefile=FILE', 'Add a new notefile'],
    ['h', 'help', 'display this help'],
    ['v', 'version', 'show version']
]).bindHelp();

addNotefile = exports.addNotefile = function (filename) {
    var json;

    if (fs.existsSync('.notaterc')) {
        getNotefiles(function (json) {
            var notefiles = json.notefiles;

            if (notefiles.indexOf(filename) === -1) {
                notefiles.push(filename);
                notefiles.sort();

                writeFile(json);
            } else {
                console.log('Not adding, it already exists!');
            }
        });

        /*
        fs.readFile('.notaterc', {
            encoding: 'utf8'
        }, function (err, data) {
            var notefiles;

            if (err) {
                throw err;
            }

            json = JSON.parse(data);
            notefiles = json.notefiles;

            if (notefiles.indexOf(filename) === -1) {
                notefiles.push(filename);
                notefiles.sort();

                writeFile(json);
            } else {
                console.log('Not adding, it already exists!');
            }
        });
        */
    } else {
        json = {
            'notefiles': [
                filename
            ]
        };

        writeFile(json);
        console.log('.notaterc does not exist so creating it now!');
    }
};

getNotefiles = exports.getNotefiles = function (callback) {
    fs.readFile('.notaterc', {
        encoding: 'utf8'
    }, function (err, data) {
        if (err) {
            throw err;
        }

        callback(JSON.parse(data));
    });
};

makeRequest = exports.makeRequest = function (note) {
    var data = {
        note: note
    };

    getNotefiles(function (json) {
        var notefiles = json.notefiles,
            choices = [];

        notefiles.forEach(function (val) {
            choices.push({
                name: val,
                value: val
            });
        });

        inquirer.prompt([{
            type: 'list',
            name: 'notefile',
            message: 'Please choose the notefile to which the note should be written:',
            choices: choices
        }], function (answers) {
            data.notefile = answers.notefile;

            curl.setOpt(Curl.option.URL, url);
            curl.setOpt(Curl.option.POSTFIELDS, JSON.stringify(data));
            //curl.setOpt(Curl.option.VERBOSE, true);

            curl.perform();

            curl.on('end', function (statusCode, body) {
                // TODO: Check statusCode!
                console.log(body);
                this.close();
            });

            curl.on('error', curl.close.bind(curl));
        });
    });
};

writeFile = exports.writeFile = function (json) {
    fs.writeFile('.notaterc', JSON.stringify(json, null, 4), {
        encoding: 'utf8',
        mode: 0666,
        flag: 'w'
    }, function (err) {
        if (err) {
            throw err;
        }

        console.log('.notaterc successfully updated!');
    });
};

// `parseSystem` is alias  of parse(process.argv.slice(2)).
opt = getopt.parseSystem();
notefile = opt.options['add-notefile'];

if (notefile) {
    addNotefile(notefile);
} else {
    note = opt.argv[0];

    if (!note) {
        //throw new Error('You did not pass a note!');
        rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            terminal: true
        });

        rl.on('line', function (line) {
            note += line;
        });

        rl.on('close', function () {
            makeRequest(note);
        });
    } else {
        makeRequest(note);
    }
}

