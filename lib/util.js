// https://github.com/JCMais/node-libcurl/blob/master/examples/post-data.js
// curl -H "Accept: application/json" -H "Content-Type: application/json" -X POST -d '{"file":"bar.txt", "note": "aaaaaaahhh!!"}' http://localhost:1972
var exports = module.exports = {},
    crypto = require('crypto'),
    fs = require('fs'),
    inquirer = require('inquirer'),
    osenv = require('osenv'),
    Curl = require('node-libcurl').Curl,
    curl = new Curl(),
    add, remove, decrypt, encrypt, generateNewlines,
    getConfigFile, showConfigFile, writeFile;

add = function (notefile, field) {
    getConfigFile(function (err, json) {
        if (err) {
            console.log(err.name);
            console.log(err.message);
            return;
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

        writeFile('.notefilerc', JSON.stringify(json, null, 4), function (err) {
            if (err) {
                throw err;
            }

            console.log('.notefilerc successfully updated!');
        });
    });
};

exports.addNotefile = function (notefile) {
    add(notefile, 'notefiles');
};

exports.addNoteserver = function (notefile) {
    add(notefile, 'noteservers');
};

/*
decrypt = function (ciphertext) {
    var decipher = crypto.createDecipher(algorithm,password)
    var dec = decipher.update(text,'hex','utf8')
    dec += decipher.final('utf8');
    return dec;
};
*/

encrypt = function (plaintext, defaultCipher, callback) {
    inquirer.prompt([{
        type: 'list',
        name: 'cipher',
        message: 'Choose a cipher:',
        default: defaultCipher,
        choices: [
            {name: 'AES-256', value: 'aes256'},
            {name: 'Blowfish', value: 'blowfish'},
            {name: 'Triple DES', value: 'des3'},
            {name: 'None', value: false}
        ]
    }, {
        type: 'password',
        name: 'password',
        message: 'Encryption password:',
        when: function (answers) {
            return answers.cipher;
        }
    }], function (answers) {
        var cipher, enciphered;

        if (answers.cipher) {
            cipher = crypto.createCipher(answers.cipher, answers.password);
            enciphered = cipher.update(plaintext, 'utf8', 'hex');
            enciphered += cipher.final('hex');
            callback(enciphered);
        } else {
            callback(false);
        }
    });

};

generateNewlines = exports.generateNewlines = (function () {
    var map = {
        unix: '\n',
        windows: '\r\n'
    };

    return function (json) {
        var system = json.system,
            newlines = json.newlines;

        if (!(system && newlines)) {
            return '';
        }

        var eol = map[system],
            str = '',
            i;

        for (i = 0; i < newlines; i++) {
            str += eol;
        }

        return str;
    };
}());

getConfigFile = exports.getConfigFile = function (callback, transform) {
    var e = {
            name: '\n.notefilerc does not exist!\n',
            message: 'The current operation expects that the config file has already been created, do `notefile --init`.\n'
        },
        config = '.notefilerc';

    // Here we're just checking for the existence of a config file (check locally first).
    try {
        fs.statSync(config);
    } catch (foo) {
        try {
            config = osenv.home() + '/' + config;
            fs.statSync(config);
        } catch (err) {
            return callback(e);
        }
    }

    fs.readFile(config, {
        encoding: 'utf8'
    }, function (err, data) {
        if (err) {
            callback(e);
        }

        if (transform !== false) {
            data = JSON.parse(data);
        }

        callback(null, data, config);
    });
};

exports.init = function () {
    inquirer.prompt([{
        type: 'list',
        name: 'global',
        message: 'Create a global config file.',
        default: true,
        choices: [
            {name: 'Yes', value: true},
            {name: 'No', value: false}
        ]
    }, {
        type: 'input',
        name: 'notefiles',
        message: 'Add a default notefile.',
        default: 'foo.txt'
    }, {
        type: 'input',
        name: 'noteservers',
        message: 'Add a default noteserver.',
        default: 'filesystem'
    }, {
        type: 'list',
        name: 'encryption',
        message: 'Use encryption?',
        default: true,
        choices: [
            {name: 'Yes', value: true},
            {name: 'No', value: false}
        ]
    }, {
        type: 'list',
        name: 'cipher',
        message: 'Default cipher:',
        default: 'blowfish',
        choices: [
            {name: 'AES-256', value: 'aes256'},
            {name: 'Blowfish', value: 'blowfish'},
            {name: 'Triple DES', value: 'des3'},
            {name: 'None', value: false}
        ],
        when: function (answers) {
            return answers.encryption;
        }
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
        var config = '.notefilerc',
            notefile = answers.notefiles,
            noteserver = answers.noteservers;

        // Even though we only asked for a default notefile/server, we want the json to reflect an array
        // as more values will/could be added to each.
        answers.notefiles = [notefile];
        answers.noteservers = [noteserver];

        answers.default = {
            notefile: notefile,
            noteserver: noteserver
        };

        if (answers.encryption) {
            answers.default.cipher = answers.cipher;
            delete answers.cipher;
        }

        if (answers.global) {
            config = osenv.home() + '/' + config;
        }

        delete answers.global;

        writeFile(config, JSON.stringify(answers, null, 4), function (err) {
            if (err) {
                throw err;
            }

            showConfigFile(function (err) {
                if (!err) {
                    console.log('\nCreated ' + config + ' config file!\n');
                }
            });

        });
    });
};

exports.makeRequest = (function () {
    function doWriteFile(notefile, note) {
        writeFile(notefile, note, function (err) {
            if (err) {
                console.log('\nThere was a problem, the note was not written to ' + notefile);
            }

            console.log('\nNote successfully written to ' + notefile);
        });
    }

    function send(data) {
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
                    console.log(err.name);
                    console.log(err.message);
                    return;
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
                        var noteserver = data.noteserver = answers.noteserver,
                            local = (noteserver === 'filesystem');

                        if (json.encryption) {
                            encrypt(note, json.default.cipher, function (enciphered) {
                                if (enciphered) {
                                    data.note = enciphered + generateNewlines(json);
                                }

                                if (local) {
                                    doWriteFile(data.notefile, data.note);
                                } else {
                                    send(data);
                                }
                            });
                        } else {
                            if (local) {
                                doWriteFile(data.notefile, data.note);
                            } else {
                                send(data);
                            }
                        }
                    });
                });
            });
        } else {
            // TODO
            console.log('TODO');
            return;
//            getConfigFile(function (err, json) {
//                if (err) {
//                    throw err;
//                }
//
//                var notefiles = json.notefiles;
//
//                if (notefiles.indexOf(notefile) > -1) {
//                    if (json.default.cipher) {
//                        encrypt(note, json.defaultCipher, function (enciphered) {
//                            if (enciphered) {
//                                data.note = enciphered + generateNewlines(json);
//                            }
//
//                            send(data);
//                        });
//                    } else {
//                        send(data);
//                    }
//                } else {
//                    console.log('The specified notefile has not been added, use --add-notefile.');
//                }
//            });
        }
    };
}());

remove = (function () {
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

        writeFile('.notefilerc', JSON.stringify(json, null, 4), function (err) {
            if (err) {
                throw err;
            }

            console.log('The value ' + notefile + ' has been deleted.');
        });
    }

    return function (notefile, field) {
        getConfigFile(function (err, json) {
            if (err) {
                console.log(err.name);
                console.log(err.message);
                return;
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
    };
}());

exports.removeNotefile = function (notefile) {
    remove(notefile, 'notefiles');
};

exports.removeNoteserver = function (noteserver) {
    remove(noteserver, 'noteservers');
};

showConfigFile = exports.showConfigFile = function (callback) {
    getConfigFile(function (err, json, config) {
        if (err) {
            console.log(err.name);
            console.log(err.message);
            return;
        }

        console.log(json);

        if (callback) {
            callback(err, json, config);
        }
    }, /*transform*/ false);
};

writeFile = function (filename, data, callback) {
    var flag = (filename === '.notefilerc') ? 'w' : 'a';

    fs.writeFile(filename, data, {
        encoding: 'utf8',
        flag: flag,
        // Octal 0666.
        mode: 438
    }, function (err) {
        if (err) {
            return callback(err);
        }

        callback(null);
    });
};
