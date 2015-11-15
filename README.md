### The Big Idea
I frequently save little notes to myself, usually one line commands, but I never know where I should put them for later perusal.

I decided it would be a fun project to create an easy way to save these to any file on my HDD or to a remote server.  It would need to be a CLI tool that would allow me to choose where and how the note should be saved (plaintext or enciphered) and would allow me to manage the number of scratchpads and servers as I see fit.

### Installation

`npm install https://github.com/btoll/scratchpad.git -g`

### Howto
The first step is to create a `.scratchpadrc` config file.  To accomplish this, simply run:

    scratchpad --init

This will ask a number of questions about the environment, most of which are self-explanatory.  The main idea is to tell the system where the scratchpads reside and on what machine.  For example, choose the default `server` value of `filesystem` for all local scratchpads and then add any remote servers after the config file has been created.  This can be done by doing:

    scratchpad --add-server=http://www.benjamintoll.com/foo/

Note that more than one can be added at a time by separating each value by with a comma.

If created, a global `.scratchpadrc` config file will be written to the user's home directory.  Note, however, that the program will first look in the current working directory for the existence of a local config file that would take precedence over the global one.

### Usage

    Property | Description
    ------------ | -------------
    --add-scratchpad[=pad(,s)] | Add a new scratchpad(s).
    --add-server[=server(,s)] | Add a new server(s).
    --cat[=scratchpad] | Dump the contents of a scratchpad to STDIN.
    -c, --config | Show the contents of the `.scratchpad` config file.
    -e, --edit | Edit a scratchpad in $EDITOR.
    --init | Setup and create the .scratchpad config file.
    -n, --scratchpad=pad | When piping from STDIN the scratchpad to write to MUST be specified.
    --remove-scratchpad[=pad(,s)] | Remove a scratchpad(s).
    --remove-server[=server(,s)] | Remove a server(s).
    --set-default | Change a default value.
    -h, --help | Display help.

