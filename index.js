// https://github.com/JCMais/node-libcurl/blob/master/examples/post-data.js
// curl -H "Accept: application/json" -H "Content-Type: application/json" -X POST -d '{"file":"bar.txt", "note": "aaaaaaahhh!!"}' http://localhost:1972
var notefile = require('/usr/local/www/notefile/lib/util.js'),
    readline = require('readline'),
    Getopt = require('node-getopt'),
    file, note, getopt, opt, rl;

getopt = new Getopt([
    ['' , 'add-notefile=FILE(,S)', 'Add a new notefile(s).'],
    ['' , 'add-noteserver=SERVER(,S)', 'Add a new noteserver(s).'],
    ['c' , 'config', 'Show the contents of the `.notefilerc` config file.'],
    ['' , 'init', 'Setup and create the .notefilerc config file.'],
    ['n' , 'notefile=FILE', 'When piping from STDIN the notefile to write to MUST be specified.'],
    ['' , 'remove-notefile[=FILE(,S)]', 'Remove a notefile(s).'],
    ['' , 'remove-noteserver[=SERVER(,S)]', 'Remove a noteserver(s).'],
    ['' , 'set-default', 'Change a default value.'],
    ['h', 'help', 'Display help.']
]).bindHelp();

// `parseSystem` is an alias of parse(process.argv.slice(2)).
opt = getopt.parseSystem();

switch (true) {
    case !!opt.options['init']:
        notefile.init();
        break;

    case !!opt.options['config']:
        // TODO
        notefile.showConfigFile(function (err, json, config) {
            if (!err) {
                console.log('\nReading ' +
                    ((config === '.notefilerc') ? 'local' : 'global') +
                    ' config file.\n'
                );
            }
        });
        break;

    case !!opt.options['add-notefile']:
        notefile.addNotefile(file);
        break;

    case !!opt.options['add-noteserver']:
        notefile.addNoteserver(file);
        break;

    // The value of --remove-notefile is optional so we must check for !== undefined.
    case ((file = opt.options['remove-notefile']) !== undefined):
        notefile.removeNotefile(file);
        break;

    // The value of --remove-notefile is optional so we must check for !== undefined.
    case ((file = opt.options['remove-noteserver']) !== undefined):
        notefile.removeNoteserver(file);
        break;

    case !!opt.options['set-default']:
        notefile.setDefault();
        break;

    default:
        note = opt.argv[0] || '';

        notefile.getConfigFile(function (err, json) {
            if (err) {
                console.log(err.name);
                console.log(err.message);
                return;
            }

            if (!note) {
                rl = readline.createInterface({
                    input: process.stdin,
                    output: process.stdout,
                    terminal: true
                });

                rl.on('line', function (line) {
                    note += line + '\n';
                });

                rl.on('close', function () {
                    notefile.makeRequest(note + notefile.generateNewlines(json), opt.options['notefile']);
                });
            } else {
                notefile.makeRequest(note + notefile.generateNewlines(json));
            }
        });
}

