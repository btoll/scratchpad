// https://github.com/JCMais/node-libcurl/blob/master/examples/post-data.js
// curl -H "Accept: application/json" -H "Content-Type: application/json" -X POST -d '{"file":"bar.txt", "note": "aaaaaaahhh!!"}' http://localhost:1972
var exports = module.exports = {},
    fs = require('fs'),
    inquirer = require('inquirer'),
    Curl = require('node-libcurl').Curl,
    curl = new Curl(),
    getConfigFile, showConfigFile, writeConfigFile;

var add = function (notefile, field) {
    var json;

    if (fs.existsSync('.notefilerc')) {
        getConfigFile(function (err, json) {
            if (err) {
                throw err;
            }

            var notefiles = json[field],
                i, len, file;

            if (!notefiles) {
                notefiles = json[field] = [];
            }

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

            // TODO: No need to do the following operations if all added files already exist!
            notefiles.sort();

            writeConfigFile(json, function (err) {
                if (err) {
                    throw err;
                }

                console.log('.notefilerc successfully updated!');
            });
        });
    } else {
        json = {};
        json[field] = notefile.split(',').sort()

        writeConfigFile(json, function (err) {
            if (err) {
                throw err;
            }

            console.log('.notefilerc does not exist so creating it now!');
        });
    }
};

var remove = (function () {
    function rm(json, notefiles, notefile) {
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

        writeConfigFile(json, function (err) {
            if (err) {
                throw err;
            }

            console.log('The value ' + notefile + ' has been deleted.');
        });
    }

    return function (notefile, field) {
        if (fs.existsSync('.notefilerc')) {
            getConfigFile(function (err, json) {
                if (err) {
                    throw err;
                }

                var notefiles = json[field],
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
                        rm(json, notefiles, answers.notefile);
                    });
                } else {
                    rm(json, notefiles, notefile);
                }
            });
        } else {
            console.log('.notefilerc does not exist so there cannot be a notefile to remove!');
        }
    };
}());

exports.addNotefile = function (notefile) {
    add(notefile, 'notefiles');
};

exports.addNoteserver = function (notefile) {
    add(notefile, 'noteservers');
};

getConfigFile = exports.getConfigFile = function (callback) {
    // TODO: Let dev customize name of config file?
    fs.readFile('.notefilerc', {
        encoding: 'utf8'
    }, function (err, data) {
        if (err) {
            // If .notefilerc does not exist, probably they are trying to add a note.
            err.name = 'notefilerc does not exist';
            err.message = 'The current operation expects that the config file has already been created, use --init or --add-notefile.';
            return callback(err);
        }

        callback(null, JSON.parse(data));
    });
};

exports.init = function () {
    inquirer.prompt([{
        type: 'input',
        name: 'notefiles',
        message: 'Add a default notefile.',
        default: 'foo.txt'
    }, {
        type: 'input',
        name: 'noteservers',
        message: 'Add a default noteserver.',
        default: 'http://localhost:80'
    }, {
        type: 'list',
        name: 'system',
        message: 'What line endings do you use?',
        default: 'unix',
        choices: [
            {name: 'Unix', value: 'unix'},
            {name: 'Windows', value: 'windows'}
        ]
    }, {
        type: 'list',
        name: 'newlines',
        message: 'How many newlines in between notes?',
        default: 1,
        choices: [
            {name: 'Zero', value: 0},
            {name: 'One', value: 1},
            {name: 'Two', value: 2}
        ]
    }], function (answers) {
        answers.notefiles = [answers.notefiles];
        answers.noteservers = [answers.noteservers];

        writeConfigFile(answers, function (err) {
            if (err) {
                throw err;
            }

            console.log('Created .notefilerc config file!\n');
            showConfigFile();
        });
    });
};

exports.makeRequest = (function () {
    function send(data) {
        // TODO: Don't hardcode url!
        curl.setOpt(Curl.option.URL, data.noteserver);
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
            getConfigFile(function (err, json) {
                if (err) {
                    throw err;
                }

                var notefiles = json.notefiles,
                    noteservers = json.noteservers,
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
                    message: 'Choose the notefile to which the note should be written:',
                    choices: choices
                }], function (answers) {
                    data.notefile = answers.notefile;

                    choices.length = 0;

                    noteservers.forEach(function (val) {
                        choices.push({
                            name: val,
                            value: val
                        });
                    });

                    inquirer.prompt([{
                        type: 'list',
                        name: 'noteserver',
                        message: 'Choose the noteserver to which the request should be sent:',
                        choices: choices
                    }], function (answers) {
                        data.noteserver = answers.noteserver;

                        send(data);
                    });
                });
            });
        } else {
            getConfigFile(function (err, json) {
                if (err) {
                    throw err;
                }

                var notefiles = json.notefiles;

                if (notefiles.indexOf(notefile) > -1) {
                    send(data);
                } else {
                    console.log('The specified notefile has not been added, use --add-notefile.');
                }
            });
        }
    };
}());

exports.removeNotefile = function (notefile) {
    remove(notefile, 'notefiles');
};

exports.removeNoteserver = function (noteserver) {
    remove(noteserver, 'noteservers');
};

showConfigFile = exports.showConfigFile = function () {
    var readStream = fs.createReadStream('.notefilerc');

    readStream.pipe(process.stdout);
    readStream.on('end', function () {
        console.log('\n');
    });
};

writeConfigFile = exports.writeConfigFile = function (json, callback) {
    fs.writeFile('.notefilerc', JSON.stringify(json, null, 4), {
        encoding: 'utf8',
        flag: 'w',
        // Octal 0666.
        mode: 438
    }, function (err) {
        if (err) {
            return callback(err);
        }

        callback(null);
    });
};

