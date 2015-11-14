/* eslint-disable no-console */

/*
TODO:
    1. Don't --cat a file that has been removed!
*/

(() => {
    'use strict';

    let fs = require('fs'),
        inquirer = require('inquirer'),
        jcrypt = require('jcrypt'),
        osenv = require('osenv'),
        Notefile, add, remove, locateConfigFile, writeConfigFile, writeNotefile;

    function _reduce(arr) {
        return arr.reduce((acc, curr) => {
            acc.push({
                name: curr,
                value: curr
            });

            return acc;
        }, []);
    }

    add = (() => {
        let pushNotefile = (entries, toAdd, fn) => {
            if (entries.indexOf(toAdd) === -1) {
                entries.push(toAdd);

                if (fn) {
                    fn();
                }
            } else {
                console.log(`Not adding ${toAdd}, it already exists!`);
            }
        };

        return (newEntry, field) => {
            return Notefile.getConfigFile().then((res) => {
                let json = JSON.parse(res.data),
                    entries = json[field],
                    // Chop off the last character ('s') since the field will be plural!
                    f = field.slice(0, -1),
                    currentLen, i, len;

                if (!entries) {
                    entries = json[field] = [];
                }

                if (newEntry) {
                    currentLen = entries.length;

                    // Multiple entries (notefiles or noteservers) could have been passed.
                    newEntry = newEntry.split(',');

                    for (i = 0, len = newEntry.length; i < len; i++) {
                        pushNotefile(entries, newEntry[i]);
                    }

                    if (currentLen < entries.length) {
                        writeConfigFile(JSON.stringify(json, null, 4))
                            .then(console.log.bind(null, `Added ${f}(s) ${newEntry.join(', ')}.\n\n`))
                            .catch((err) => {
                                throw err;
                            });
                    }
                } else {
                    inquirer.prompt([{
                        type: 'input',
                        name: 'entry',
                        message: 'Name of ' + f + ':'
                    }], (answers) => {
                        if (answers.entry) {
                            pushNotefile(entries, answers.entry, () => {
                                writeConfigFile(JSON.stringify(json, null, 4))
                                    .then(console.log)
                                    .catch((err) => {
                                        throw err;
                                    });
                            });
                        } else {
                            console.log(`No ${f} given, aborting.`);
                        }
                    });
                }
            }).catch((err) => {
                throw err;
            });
        };
    })();

    locateConfigFile = (() => {
        let config = '.notefilerc';

        // Here we're just checking for the existence of a config file (check locally first).
        try {
            fs.statSync(config);
        } catch (err) {
            try {
                config = osenv.home() + '/' + config;
                fs.statSync(config);
            } catch (e) {
                console.log(
                    '.notefilerc does not exist!\n',
                    'The current operation expects that the config file has already been created, do `notefile --init`.'
                );

                return e;
            }
        }

        return config;
    });

    remove = (() => {
        function rm(json, notefiles, toRemove) {
            let i, n;

            // We can't assume it's a sorted list, entries could have been added by hand.
            // We'll reverse sort b/c we will be removing entries.
            notefiles.reverse();

            // Multiple files could have been passed as CVS if values were given on cli..
            // If called from inquirer callback, notefile will be an array of values.
            if (typeof toRemove === 'string') {
                toRemove = toRemove.split(',');
            }

            toRemove = toRemove.reverse();

            for (i = toRemove.length; i > -1; i--) {
                if ((n = notefiles.indexOf(toRemove[i])) > -1) {
                    notefiles.splice(n, 1);
                }
            }

            notefiles.sort();

            writeConfigFile(JSON.stringify(json, null, 4))
                .then(console.log.bind(null, `The value(s) ${toRemove.join(', ')} have been removed.\n\n`))
                .catch((err) => {
                    throw err;
                });
        }

        return (notefile, field) => {
            Notefile.getConfigFile().then((res) => {
                let json = JSON.parse(res.data),
                    notefiles = json[field],
                    choices;

                if (!notefile) {
                    choices = _reduce(notefiles);

                    inquirer.prompt([{
                        type: 'checkbox',
                        name: 'notefile',
                        message: 'Please choose the value(s) to remove:',
                        choices: choices
                    }], (answers) => {
                        if (!answers.notefile.length) {
                            console.log('No value(s) have been selected for removal, aborting.');
                        } else {
                            rm(json, notefiles, answers.notefile);
                        }
                    });
                } else {
                    rm(json, notefiles, notefile);
                }
            }).catch((err) => {
                throw err;
            });
        };
    })();

    writeConfigFile = (data, configFile) => {
        return new Promise((resolve, reject) => {
            let writable = fs.createWriteStream(configFile || locateConfigFile());

            writable.write(data, 'utf8', () => {
                resolve(data);
            });

            writable.end(reject);
        });
    };

    writeNotefile = (filename, data) => {
        return new Promise((resolve, reject) => {
            fs.writeFile(filename, data, {
                encoding: 'utf8',
                flag: 'a',
                // Octal 0666.
                mode: 438
            }, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        });
    };

    // Public API.
    Notefile = {
        addNotefile: (notefile) => {
            add(notefile, 'notefiles');
        },

        addNoteserver: (noteserver) => {
            add(noteserver, 'noteservers');
        },

        catNotefile: (() => {
            let read = (notefile) => {
                return new Promise((resolve, reject) => {
                    let readable = fs.createReadStream(notefile),
                        arr = [];

                    readable.on('data', (chunk) => {
                        arr.push(chunk);
                    });

                    readable.on('error', (err) => {
                        reject(err);
                    });

                    readable.on('end', () => {
                        resolve(arr.join(''));
                    });
                });
            };

            return (notefile) => {
                if (!notefile) {
                    Notefile.getConfigFile().then((res) => {
                        let json = JSON.parse(res.data),
                            choices = _reduce(json.notefiles);

                        inquirer.prompt([{
                            type: 'list',
                            name: 'notefile',
                            message: 'Choose the notefile to display:',
                            choices: choices,
                            default: json.defaults.notefile || null
                        }, {
                            type: 'list',
                            name: 'encrypted',
                            message: 'Is the file encrypted?',
                            default: false,
                            choices: [
                                {name: 'Yes', value: true},
                                {name: 'No', value: false}
                            ]
                        }], (answers) => {
                            let notefile = answers.notefile;

                            read(notefile).then((data) => {
                                if (answers.encrypted) {
                                    // Not passing an output stream will stream to stdout.
                                    jcrypt.stream(notefile, null, ['--decrypt']).catch(console.log);
                                } else {
                                    console.log(data);
                                }
                            });
                        });
                    }).catch((err) => {
                        throw err;
                    });
                } else {
                    read(notefile).then((data) => {
                        console.log(data);
                    });
                }
            };
        })(),

        edit: (() => {
            let notefile;

            function openEditor(callback) {
                require('child_process').spawn(process.env.EDITOR || 'vim', [notefile], {
                    stdio: 'inherit'
                }).on('exit', callback);
            }

            return () => {
                Notefile.getConfigFile().then((res) => {
                    let json = JSON.parse(res.data),
                        choices = _reduce(json.notefiles);

                    inquirer.prompt([{
                        type: 'list',
                        name: 'notefile',
                        message: 'Choose the notefile to edit:',
                        choices: choices,
                        default: json.defaults.notefile || null
                    }, {
                        type: 'list',
                        name: 'encrypted',
                        message: 'Is the file encrypted?',
                        default: false,
                        choices: [
                            {name: 'Yes', value: true},
                            {name: 'No', value: false}
                        ]
                    }], (answers) => {
                        notefile = answers.notefile;

                        // http://stackoverflow.com/a/17110285
                        if (answers.encrypted) {
                            // Not passing an output will replace the notefile.
                            jcrypt(notefile, null, ['--decrypt']).then(() => {
                                openEditor(() => {
                                    // Re-encrypt once done.
                                    // TODO: Remove my credentials.
                                    jcrypt(notefile, null, ['--encrypt', '-r', 'benjam72@yahoo.com', '--armor'])
                                        .then(() => {
                                            console.log(`Re-encrypting and closing ${notefile}`);
                                        })
                                        .catch(console.log);
                                });
                            });
                        } else {
                            openEditor(() => {
                                console.log(`Finished editing ${notefile}`);
                            });
                        }
                    });
                }).catch((err) => {
                    throw err;
                });
            };
        })(),

        getConfigFile: () => {
            return new Promise((resolve, reject) => {
                let configFile = locateConfigFile(),
                    readable = fs.createReadStream(configFile),
                    arr = [];

                readable.on('data', (chunk) => {
                    arr.push(chunk);
                });

                readable.on('error', (err) => {
                    reject(err);
                });

                readable.on('end', () => {
                    resolve({
                        configFile: configFile,
                        data: arr.join('')
                    });
                });
            });
        },

        init: () => {
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
                name: 'useGPG',
                message: 'Use GPG?',
                default: false,
                choices: [
                    {name: 'Yes', value: true},
                    {name: 'No', value: false}
                ]
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
            }], (answers) => {
                let config = '.notefilerc',
                    notefile = answers.notefiles,
                    noteserver = answers.noteservers;

                // Even though we only asked for a default notefile/server, we want the json to reflect an array
                // as more values will/could be added to each.
                answers.notefiles = [notefile];
                answers.noteservers = [noteserver];

                answers.defaults = {
                    notefile: notefile,
                    noteserver: noteserver
                };

                if (answers.global) {
                    config = osenv.home() + '/' + config;
                }

                delete answers.global;

                writeConfigFile(JSON.stringify(answers, null, 4), config)
                    .then(console.log.bind(null, `Created ${config} config file.\n\n`))
                    .catch((err) => {
                        throw err;
                    });
            });
        },

        makeRequest: (() => {
            // This will capture the protocol, domain name and port of a URL.
            let urlRe = /^(?:(.*):\/\/)?((?:[a-zA-Z0-9]+\.)?[a-zA-Z0-9]+(?:\.[a-zA-Z0-9]+)?)(?::(\d+))?$/,
                generateNewlines;

            generateNewlines = (() => {
                let map = {
                    unix: '\n',
                    windows: '\r\n'
                };

                return (json) => {
                    let system = json.system,
                        newlines = json.newlines,
                        eol = map[system],
                        str = '',
                        i;

                    if (!(system && newlines)) {
                        return '';
                    }

                    for (i = 0; i < newlines; i++) {
                        str += eol;
                    }

                    return str;
                };
            })();

            function doWriteFile(notefile, note) {
                return writeNotefile(notefile, note).then(() => {
                    console.log(`Note successfully written to ${notefile}`);
                }).catch(() => {
                    console.log(`\nThere was a problem, the note was not written to ${notefile}`);
                });
            }

            function send(noteserver, data) {
                let postData = JSON.stringify(data),
                    parts = urlRe.exec(noteserver),
                    options, req;

                if (!parts) {
                    console.log('[ERROR] Invalid URL');
                    return;
                }

                return new Promise((resolve, reject) => {
                    options = {
                        hostname: parts[2],
                        port: parts[3] || 80,
                        method: 'POST',
                        headers: {
                            'Content-Length': postData.length
                        }
                    };

                    // Could be http or https.
                    req = require(parts[1]).request(options, (res) => {
                        let data = [];

                        res.on('data', (chunk) => {
                            data.push(chunk);
                        });

                        res.on('end', () => {
                            resolve(data.join(''));
                        });
                    });

                    req.on('error', (e) => {
                        reject('[ERROR] ' + e.message);
                    });

                    req.write(postData);
                    req.end();
                });
            }

            return (note, notefile) => {
                if (!notefile) {
                    Notefile.getConfigFile().then((res) => {
                        let json = JSON.parse(res.data),
                            fileChoices = _reduce(json.notefiles),
                            serverChoices = _reduce(json.noteservers);

                        note += generateNewlines(json);

                        fileChoices.push({
                            name: 'Other',
                            value: 'other'
                        });

                        inquirer.prompt([{
                            type: 'list',
                            name: 'noteserver',
                            message: 'Choose the noteserver to which the request should be sent:',
                            choices: serverChoices,
                            default: json.defaults.noteserver || null
                        }, {
                            type: 'rawlist',
                            name: 'notefile',
                            message: 'Choose the notefile to which the note should be written:',
                            choices: fileChoices,
                            default: json.defaults.notefile || null
                        }, {
                            // Note that this block has intentionally also named itself `notefile` so it will Just Work
                            // if selected.
                            type: 'input',
                            name: 'notefile',
                            message: 'Name of new notefile:',
                            when: (answers) => {
                                answers.newNotefile = true;
                                return answers.notefile === 'other';
                            }
                        }, {
                            type: 'list',
                            name: 'encrypted',
                            message: 'Is the file encrypted?',
                            default: false,
                            choices: [
                                {name: 'Yes', value: true},
                                {name: 'No', value: false}
                            ],
                            when: () => {
                                // Only present this prompt if using GPG (set when --init'ing).
                                return json.useGPG;
                            }
                        }], (answers) => {
                            let notefile = answers.notefile,
                                noteserver = answers.noteserver,
                                local = (noteserver === 'filesystem');

                            if (answers.encrypted) {
                                if (!local) {
                                    console.log(`[WARN] Remote encryption isn't supported`);
                                } else {
                                    // Decrypt, write and re-encrypt.
                                    jcrypt(notefile, null, ['--decrypt'])
                                    .then(doWriteFile.bind(null, notefile, note))
                                    .then(() => {
                                        // Re-encrypt once done.
                                        // TODO: Remove my credentials.
                                        jcrypt(notefile, null, ['--encrypt', '-r', 'benjam72@yahoo.com', '--armor'])
                                            .then(() => {
                                                console.log(`Re-encrypting and closing ${notefile}`);
                                            });
                                    })
                                    .then(() => {
                                        // Lastly, if new add to the config file.
                                        if (answers.newNotefile) {
                                            add(notefile, 'notefiles');
                                        }
                                    })
                                    .catch(console.log);
                                }
                            } else {
                                if (local) {
                                    doWriteFile(notefile, note).catch(console.log);

                                    if (answers.newNotefile) {
                                        // Also, add the new notefile to the config file.
                                        add(notefile, 'notefiles').catch(console.log);
                                    }
                                } else {
                                    send(noteserver, {
                                        notefile: notefile,
                                        note: note
                                    })
                                    .then(console.log)
                                    .catch(console.log);
                                }
                            }
                        });
                    }).catch(console.log);
                } else {
                    // TODO
                    return;
        //            Notefile.getConfigFile((err, json) => {
        //                if (err) {
        //                    throw err;
        //                }
        //
        //                let notefiles = json.notefiles;
        //
        //                if (notefiles.indexOf(notefile) > -1) {
        //                    if (json.defaults.cipher) {
        //                        encryptFile(note, json.defaultCipher, (enciphered) => {
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
        })(),

        removeNotefile: (notefile) => {
            remove(notefile, 'notefiles');
        },

        removeNoteserver: (noteserver) => {
            remove(noteserver, 'noteservers');
        },

        setDefault: (() => {
            let json, configFile;

            function update(key, value) {
                json.defaults[key] = value;

                writeConfigFile(JSON.stringify(json, null, 4), configFile).then(() => {
                    console.log(`${configFile} successfully updated!`);
                }).catch(() => {
                    console.log('There was a problem!');
                });
            }

            return () => {
                Notefile.getConfigFile().then((res) => {
                    let choices = [],
                        d, defaults;

                    json = JSON.parse(res.data);
                    configFile = res.configFile;
                    defaults = json.defaults;

                    for (d in defaults) {
                        choices.push(d);
                    }

                    inquirer.prompt([{
                        type: 'list',
                        name: 'key',
                        message: 'Choose the key for which the default value should be changed:',
                        choices: choices
                    }], (answers) => {
                        let key = answers.key,
                            promptCfg = {
                                name: 'value',
                                message: 'New value for ' + key + ':',
                                default: defaults[key],
                                filter: (v) => {
                                    if (v === 'false') {
                                        v = false;
                                    }

                                    return v;
                                }
                            };

                        if (key !== 'cipher') {
                            // Key in .notefilerc is plural!
                            choices = json[key + 's'].concat();
                            choices.push('Other');

                            promptCfg.type = 'rawlist';
                            promptCfg.choices = choices;
                        } else {
                            promptCfg.type = 'input';
                        }

                        inquirer.prompt([
                            promptCfg
                        ], (answers) => {
                            let value = answers.value;

                            if (value === 'Other') {
                                inquirer.prompt([{
                                    type: 'input',
                                    name: 'value',
                                    message: 'New value for ' + key + ':',
                                    default: defaults[key]
                                }], (answers) => {
                                    update(key, answers.value);
                                });
                            } else {
                                update(key, value);
                            }
                        });
                    });
                }).catch((err) => {
                    throw err;
                });
            };
        })()
    };

    module.exports = Notefile;
})();

