/* eslint-disable no-console */

(() => {
    'use strict';

    let fs = require('fs'),
        inquirer = require('inquirer'),
        jcrypt = require('jcrypt'),
        osenv = require('osenv'),
        Scratchpad, add, remove, locateConfigFile, writeConfigFile,
        readStream, writeStream, writeScratchpad;

    function _reduce(arr) {
        return arr.reduce((acc, curr) => {
            acc.push({
                name: curr,
                value: curr
            });

            return acc;
        }, []);
    }

    function fileExists(file) {
        return new Promise((resolve, reject) => {
            fs.stat(file, (err) => {
                if (err) {
                    reject(err);
                } else {
                    // Return the filename so we can easily chain.
                    resolve(file);
                }
            });
        });
    }

    add = (() => {
        let pushScratchpad = (entries, toAdd, fn) => {
            // Note that entries is a live reference to json[field]!
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
            return Scratchpad.getConfigFile().then((data) => {
                let json = JSON.parse(data),
                    entries = json[field],
                    // Chop off the last character ('s') since the field will be plural!
                    f = field.slice(0, -1),
                    currentLen, i, len;

                if (!entries) {
                    entries = json[field] = [];
                }

                if (newEntry) {
                    currentLen = entries.length;

                    // Multiple entries (scratchpads or servers) could have been passed.
                    newEntry = newEntry.split(',');

                    for (i = 0, len = newEntry.length; i < len; i++) {
                        pushScratchpad(entries, newEntry[i]);
                    }

                    if (currentLen < entries.length) {
                        writeConfigFile(JSON.stringify(json, null, 4))
                            .then(console.log.bind(null, `Added ${f}(s) ${newEntry.join(', ')}.\n\n`))
                            .catch(console.log);
                    }
                } else {
                    inquirer.prompt([{
                        type: 'input',
                        name: 'entry',
                        message: 'Name of ' + f + ':'
                    }], (answers) => {
                        if (answers.entry) {
                            pushScratchpad(entries, answers.entry, () => {
                                writeConfigFile(JSON.stringify(json, null, 4))
                                    .then(console.log)
                                    .catch(console.log);
                            });
                        } else {
                            console.log(`No ${f} given, aborting.`);
                        }
                    });
                }
            }).catch(console.log);
        };
    })();

    locateConfigFile = (() => {
        let config = '.scratchpadrc';

        // Here we're just checking for the existence of a config file (check locally first).
        return fileExists(config).then((file) => {
            return file;
        }, () => {
            config = osenv.home() + '/' + config;

            return fileExists(config).then((file) => {
                return file;
            }, () => {
                throw '.scratchpadrc does not exist!\n\nThe current operation expects that the config file has already been created, do `scratchpad --init`.';
            });
        });
    });

    readStream = (file) => {
        return new Promise((resolve, reject) => {
            let readable = fs.createReadStream(file),
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

    remove = (() => {
        function rm(json, scratchpads, toRemove) {
            let i, n;

            // We can't assume it's a sorted list, entries could have been added by hand.
            // We'll reverse sort b/c we will be removing entries.
            scratchpads.reverse();

            // Multiple files could have been passed as CVS if values were given on cli..
            // If called from inquirer callback, scratchpad will be an array of values.
            if (typeof toRemove === 'string') {
                toRemove = toRemove.split(',');
            }

            toRemove = toRemove.reverse();

            for (i = toRemove.length; i > -1; i--) {
                if ((n = scratchpads.indexOf(toRemove[i])) > -1) {
                    scratchpads.splice(n, 1);
                }
            }

            scratchpads.sort();

            writeConfigFile(JSON.stringify(json, null, 4))
                .then(console.log.bind(null, `The value(s) ${toRemove.join(', ')} have been removed.\n\n`))
                .catch(console.log);
        }

        return (scratchpad, field) => {
            Scratchpad.getConfigFile().then((data) => {
                let json = JSON.parse(data),
                    scratchpads = json[field],
                    choices;

                if (!scratchpad) {
                    choices = _reduce(scratchpads);

                    inquirer.prompt([{
                        type: 'checkbox',
                        name: 'scratchpad',
                        message: 'Please choose the value(s) to remove:',
                        choices: choices
                    }], (answers) => {
                        if (!answers.scratchpad.length) {
                            console.log('No value(s) have been selected for removal, aborting.');
                        } else {
                            rm(json, scratchpads, answers.scratchpad);
                        }
                    });
                } else {
                    rm(json, scratchpads, scratchpad);
                }
            }).catch(console.log);
        };
    })();

    writeConfigFile = (data) => {
        return locateConfigFile().then(writeStream.bind(null, data));
    };

    writeScratchpad = (filename, data) => {
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

    writeStream = (data, file) => {
        return new Promise((resolve, reject) => {
            let writable = fs.createWriteStream(file);

            writable.write(data, 'utf8', () => {
                resolve(data);
            });

            writable.end(reject);
        });
    };

    // Public API.
    Scratchpad = {
        addScratchpad: (scratchpad) => {
            add(scratchpad, 'scratchpads');
        },

        addServer: (server) => {
            add(server, 'servers');
        },

        catScratchpad: (() => {
            let read = (scratchpad) => {
                return fileExists(scratchpad).then(readStream);
            };

            return (scratchpad) => {
                if (!scratchpad) {
                    Scratchpad.getConfigFile().then((data) => {
                        let json = JSON.parse(data),
                            choices = _reduce(json.scratchpads);

                        inquirer.prompt([{
                            type: 'list',
                            name: 'scratchpad',
                            message: 'Choose the scratchpad to display:',
                            choices: choices,
                            default: json.defaults.scratchpad || null
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
                            let scratchpad = answers.scratchpad;

                            read(scratchpad).then((data) => {
                                if (answers.encrypted) {
                                    // Not passing an output stream will stream to stdout.
                                    jcrypt.stream(scratchpad, null, ['--decrypt'])
                                        .catch(console.log);
                                } else {
                                    console.log(data);
                                }
                            }).catch(() => {
                                console.log('[ERROR] No such file or directory');
                            });
                        });
                    }).catch(console.log);
                } else {
                    read(scratchpad).then(console.log).catch(() => {
                        console.log('[ERROR] No such file or directory');
                    });
                }
            };
        })(),

        edit: (() => {
            let scratchpad;

            function openEditor(callback) {
                require('child_process').spawn(process.env.EDITOR || 'vim', [scratchpad], {
                    stdio: 'inherit'
                }).on('exit', callback);
            }

            return () => {
                Scratchpad.getConfigFile().then((data) => {
                    let json = JSON.parse(data),
                        choices = _reduce(json.scratchpads);

                    inquirer.prompt([{
                        type: 'list',
                        name: 'scratchpad',
                        message: 'Choose the scratchpad to edit:',
                        choices: choices,
                        default: json.defaults.scratchpad || null
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
                        scratchpad = answers.scratchpad;

                        // http://stackoverflow.com/a/17110285
                        if (answers.encrypted) {
                            // Not passing an output will replace the scratchpad.
                            jcrypt(scratchpad, null, ['--decrypt']).then(() => {
                                openEditor(() => {
                                    // Re-encrypt once done.
                                    // TODO: Remove my credentials.
                                    jcrypt(scratchpad, null, ['--encrypt', '-r', 'benjam72@yahoo.com', '--armor'])
                                        .then(() => {
                                            console.log(`Re-encrypting and closing ${scratchpad}`);
                                        })
                                        .catch(console.log);
                                });
                            });
                        } else {
                            openEditor(() => {
                                console.log(`Finished editing ${scratchpad}`);
                            });
                        }
                    });
                }).catch(console.log);
            };
        })(),

        getConfigFile: () => {
            return locateConfigFile().then(readStream);
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
                name: 'scratchpads',
                message: 'Add a default scratchpad.',
                default: 'foo.txt'
            }, {
                type: 'input',
                name: 'servers',
                message: 'Add a default server.',
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
                let config = '.scratchpadrc',
                    scratchpad = answers.scratchpads,
                    server = answers.servers;

                // Even though we only asked for a default scratchpad/server, we want the json to reflect an array
                // as more values will/could be added to each.
                answers.scratchpads = [scratchpad];
                answers.servers = [server];

                answers.defaults = {
                    newlines: answers.newlines,
                    scratchpad: scratchpad,
                    server: server
                };

                if (answers.global) {
                    config = osenv.home() + '/' + config;
                }

                delete answers.global;

                writeConfigFile(JSON.stringify(answers, null, 4))
                    .then(console.log.bind(null, `Created ${config} config file.\n\n`))
                    .catch(console.log);
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

            function doWriteFile(scratchpad, note) {
                return writeScratchpad(scratchpad, note).then(() => {
                    console.log(`Note successfully written to ${scratchpad}`);
                }).catch(() => {
                    console.log(`\nThere was a problem, the note was not written to ${scratchpad}`);
                });
            }

            function send(server, data) {
                let postData = JSON.stringify(data),
                    parts = urlRe.exec(server),
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

            return (note, scratchpad) => {
                if (!scratchpad) {
                    Scratchpad.getConfigFile().then((data) => {
                        let json = JSON.parse(data),
                            fileChoices = _reduce(json.scratchpads),
                            serverChoices = _reduce(json.servers);

                        note += generateNewlines(json);

                        fileChoices.push({
                            name: 'Other',
                            value: 'other'
                        });

                        inquirer.prompt([{
                            type: 'list',
                            name: 'server',
                            message: 'Choose the server to which the request should be sent:',
                            choices: serverChoices,
                            default: json.defaults.server || null
                        }, {
                            type: 'rawlist',
                            name: 'scratchpad',
                            message: 'Choose the scratchpad to which the note should be written:',
                            choices: fileChoices,
                            default: json.defaults.scratchpad || null
                        }, {
                            // Note that this block has intentionally also named itself `scratchpad` so it will Just Work
                            // if selected.
                            type: 'input',
                            name: 'scratchpad',
                            message: 'Name of new scratchpad:',
                            when: (answers) => {
                                let res = false;

                                if (answers.scratchpad === 'other') {
                                    res = answers.newScratchpad = true;
                                }

                                return res;
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
                            let scratchpad = answers.scratchpad,
                                server = answers.server,
                                local = (server === 'filesystem');

                            if (answers.encrypted) {
                                if (!local) {
                                    console.log(`[WARN] Remote encryption isn't supported`);
                                } else {
                                    // Decrypt, write and re-encrypt.
                                    jcrypt(scratchpad, null, ['--decrypt'])
                                    .then(doWriteFile.bind(null, scratchpad, note))
                                    .then(() => {
                                        // Re-encrypt once done.
                                        // TODO: Remove my credentials.
                                        jcrypt(scratchpad, null, ['--encrypt', '-r', 'benjam72@yahoo.com', '--armor'])
                                            .then(() => {
                                                console.log(`Re-encrypting and closing ${scratchpad}`);
                                            });
                                    })
                                    .then(() => {
                                        // Lastly, if new add to the config file.
                                        if (answers.newScratchpad) {
                                            add(scratchpad, 'scratchpads');
                                        }
                                    })
                                    .catch(console.log);
                                }
                            } else {
                                if (local) {
                                    doWriteFile(scratchpad, note).catch(console.log);

                                    if (answers.newScratchpad) {
                                        // Also, add the new scratchpad to the config file.
                                        add(scratchpad, 'scratchpads').catch(console.log);
                                    }
                                } else {
                                    send(server, {
                                        scratchpad: scratchpad,
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
        //            Scratchpad.getConfigFile((err, json) => {
        //                if (err) {
        //                    throw err;
        //                }
        //
        //                let scratchpads = json.scratchpads;
        //
        //                if (scratchpads.indexOf(scratchpad) > -1) {
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
        //                    console.log('The specified scratchpad has not been added, use --add-scratchpad.');
        //                }
        //            });
                }
            };
        })(),

        readConfigFile: () => {
            return locateConfigFile().then((file) => {
                console.log(`Reading config file ${file}\n`);

                return Scratchpad.getConfigFile().then(console.log);
            }).catch(console.log);
        },

        removeScratchpad: (scratchpad) => {
            remove(scratchpad, 'scratchpads');
        },

        removeServer: (server) => {
            remove(server, 'servers');
        },

        setDefault: (() => {
            let json;

            function update(key, value) {
                json.defaults[key] = value;

                writeConfigFile(JSON.stringify(json, null, 4)).then(() => {
                    console.log('Config file successfully updated.');
                }).catch(() => {
                    console.log('[ERROR] There was a problem');
                });
            }

            return () => {
                Scratchpad.getConfigFile().then((data) => {
                    let choices = [],
                        d, defaults;

                    json = JSON.parse(data);
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

                        if (key === 'scratchpads' || key === 'servers') {
                            // Key in .scratchpadrc is plural!
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
                }).catch(console.log);
            };
        })()
    };

    module.exports = Scratchpad;
})();

