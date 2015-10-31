### The Big Idea
I frequently save little notes to myself, usually one line commands, but I never know where I should put them for later perusal.

I decided it would be a fun project to create an easy way to save these to any file on my HDD or to a remote server.  It would need to be a CLI tool that would allow me to choose where and how the note should be saved (plaintext or enciphered) and would allow me to manage the number of notefiles and noteservers as I see fit.

### Installation

`npm install https://github.com/btoll/notefile.git -g`

### Howto
The first step is to create a `.notefilerc` config file.  To accomplish this, simply run:

    notefile --init

This will ask a number of questions about the environment, most of which are self-explanatory.  The main idea is to tell the system where the notefiles reside and on what machine.  For example, choose the default `noteserver` value of `filesystem` for all local notefiles and then add any remote servers after the config file has been created.  This can be done by doing:

    notefile --add-noteserver=http://www.benjamintoll.com/foo/

Note that more than one can be added at a time by separating each value by with a comma.

If created, a global `.notefilerc` config file will be written to the user's home directory.  Note, however, that the program will first look in the current working directory for the existence of a local config file that would take precedence over the global one.

### Usage

    Property | Description
    ------------ | -------------
    --add-notefile[=file(,s)] | Add a new notefile(s).
    --add-noteserver[=server(,s)] | Add a new noteserver(s).
    --cat[=notefile] | Dump the contents of a notefile to STDIN.
    -c, --config | Show the contents of the `.notefilerc` config file.
    -e, --edit | Edit a notefile.
    --init | Setup and create the .notefilerc config file.
    -n, --notefile=file | When piping from STDIN the notefile to write to MUST be specified.
    --remove-notefile[=file(,s)] | Remove a notefile(s).
    --remove-noteserver[=server(,s)] | Remove a noteserver(s).
    --set-default | Change a default value.
    -h, --help | Display help.

### Screenshots
![ScreenShot](/resources/screenshots/notefile_created.png?raw=true)

