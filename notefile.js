// https://github.com/JCMais/node-libcurl/blob/master/examples/post-data.js
// curl -H "Accept: application/json" -H "Content-Type: application/json" -X POST -d '{"file":"bar.txt", "note": "aaaaaaahhh!!"}' http://localhost:1972
var exports = module.exports = {},
    fs = require('fs'),
    inquirer = require('inquirer'),
    Getopt = require('node-getopt'),
    Curl = require('node-libcurl').Curl,
    readline = require('readline'),
    curl = new Curl(),
    addNotefile, getNotefiles, makeRequest, removeNotefile, writeFile,
    notefile, note, getopt, opt, rl;

getopt = new Getopt([
    ['' , 'add-notefile=FILE(,S)', 'Add a new notefile(s)'],
    ['n' , 'notefile=FILE', 'When piping from STDIN the notefile to write to MUST be specified.'],
    ['' , 'remove-notefile[=FILE(,S)]', 'Remove a notefile(s)'],
    ['h', 'help', 'display this help']
]).bindHelp();

addNotefile = exports.addNotefile = function (notefile) {
    var json;

    if (fs.existsSync('.notefilerc')) {
        getNotefiles(function (json) {
            var notefiles = json.notefiles,
                i, len, file;

            // Multiple notefiles could have been passed.
            notefile = notefile.split(',');

            for (i = 0, len = notefile.length; i < len; i++) {
                file = notefile[i];

                if (notefiles.indexOf(file) === -1) {
                    notefiles.push(file);
                } else {
                    console.log('Not adding ' + file + ', it already exists!');
                }
            }

            notefiles.sort();
            writeFile(json);
        });
    } else {
        json = {
            'notefiles': [
                notefile
            ]
        };

        writeFile(json);
        console.log('.notefilerc does not exist so creating it now!');
    }
};

getNotefiles = exports.getNotefiles = function (callback) {
    fs.readFile('.notefilerc', {
        encoding: 'utf8'
    }, function (err, data) {
        if (err) {
            // TODO: custom error handler?
            // If .notefilerc does not exist, probably they are trying to add a note. There needs to be
            // some warning that they should do --init or add a notefile, etc.
            throw err;
        }

        callback(JSON.parse(data));
    });
};

makeRequest = exports.makeRequest = (function () {
    function send(data) {
        // TODO: Don't hardcode url!
        curl.setOpt(Curl.option.URL, 'http://localhost:1972');
        curl.setOpt(Curl.option.POSTFIELDS, JSON.stringify(data));
        //curl.setOpt(Curl.option.VERBOSE, true);

        curl.perform();

        curl.on('end', function (statusCode, body) {
            // TODO: Check statusCode!
            console.log(body);
            this.close();
        });

        curl.on('error', curl.close.bind(curl));
    }

    return function (note, notefile) {
        var data = {
            note: note,
            notefile: notefile
        };

        if (!notefile) {
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

                    send(data);
                });
            });
        } else {
            send(data);
        }
    };
}());

removeNotefile = exports.removeNotefile = (function () {
    function remove(json, notefiles, notefile) {
        var i, n;

        // We can't assume it's a sorted list, entries could have been added by hand.
        // We'll reverse sort b/c we will be removing entries.
        notefiles.reverse();

        // Multiple files could have been passed as CVS if values were given on cli..
        // If called from inquirer callback, notefile will be an array of values.
        if (typeof notefile === 'string') {
            notefile = notefile.split(',');
        }

        notefile = notefile.reverse();

        for (i = notefile.length; i > -1; i--) {
            if ((n = notefiles.indexOf(notefile[i])) > -1) {
                notefiles.splice(n, 1);
            }
        }

        notefiles.sort();
        writeFile(json);
    }

    return function (notefile) {
        if (fs.existsSync('.notefilerc')) {
            getNotefiles(function (json) {
                var notefiles = json.notefiles,
                    choices = [];

                if (!notefile) {
                    notefiles.forEach(function (val) {
                        choices.push({
                            name: val,
                            value: val
                        });
                    });

                    inquirer.prompt([{
                        type: 'checkbox',
                        name: 'notefile',
                        message: 'Please choose the notefile(s) to remove:',
                        choices: choices
                    }], function (answers) {
                        remove(json, notefiles, answers.notefile);
                    });
                } else {
                    remove(json, notefiles, notefile);
                }
            });
        } else {
            console.log('.notefilerc does not exist so there cannot be a notefile to remove!');
        }
    };
}());

writeFile = exports.writeFile = function (json) {
    fs.writeFile('.notefilerc', JSON.stringify(json, null, 4), {
        encoding: 'utf8',
        flag: 'w',
        // Octal 0666.
        mode: 438
    }, function (err) {
        if (err) {
            throw err;
        }

        console.log('.notefilerc successfully updated!');
    });
};

// `parseSystem` is alias  of parse(process.argv.slice(2)).
opt = getopt.parseSystem();

if (notefile = opt.options['add-notefile']) {
    addNotefile(notefile);
}
// The value of --remove-notefile is optional so we must check for !== undefined.
else if ((notefile = opt.options['remove-notefile']) !== undefined) {
    removeNotefile(notefile);
} else {
    note = opt.argv[0] || '';

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
            makeRequest(note, opt.options['notefile']);
        });
    } else {
        makeRequest(note);
    }
}

