### The Big Idea
I frequently save little notes to myself, usually one line commands, but I never know where I should put them for later perusal.

I decided it would be a fun project to create an easy way to save these to any file on my HDD or to a remote server.  It would need to be a CLI tool that would allow me to choose where and how the note should be saved (plaintext or enciphered) and would allow me to manage the number of scratchpads and servers as I see fit.

### GPG Support

**scratchpad** provides support for GPG via the [jcrypt] module. Any encrypted and signed files can be written to and edited by transparently deciphering in the background and enciphering again upon completion of the write/edit operation.

### Installation

`npm install https://github.com/btoll/scratchpad.git -g`

### Howto
The first step is to create a `.scratchpadrc` config file.  To accomplish this, simply run:

    scratchpad init

This will ask a number of questions about the environment, most of which are self-explanatory.  The main idea is to tell the system where the scratchpads reside and on what machine.  For example, choose the default `server` value of `filesystem` for all local scratchpads and then add any remote servers after the config file has been created.  This can be done by doing:

    scratchpad add-server -f http://www.benjamintoll.com/foo/

Note that more than one can be added at a time by separating each value by with a comma.

If created, a global `.scratchpadrc` config file will be written to the user's home directory.  Note, however, that the program will first look in the current working directory for the existence of a local config file that would take precedence over the global one.

One of the most common uses for me is to read from `stdin`. This is accomplished by calling the tool without any commands or options:

    scratchpad

![ScreenShot](https://raw.github.com/btoll/i/master/scratchpad/readline.png)

When done, write to the file by pressing `Ctl-C` and following the prompts as usual.

### Usage

    Command | Description
    ------------ | -------------
    add-scratchpad | Add a new scratchpad(s).
    add-server | Add a new server(s).
    cat | Dump the contents of a scratchpad to `stdin`.
    config | Show the contents of the `.scratchpad` config file.
    edit | Edit a scratchpad in `$EDITOR`.
    init | Setup and create the `.scratchpadrc` config file.
    remove-scratchpad | Remove a scratchpad(s).
    remove-server | Remove a server(s).
    set | Change a default value.

    Option | Description
    ------------ | -------------
    -f, --file[=arg(,s)] | The file(s) on which to operate.
    -h, --help | Display help.

[jcrypt]: https://github.com/btoll/jcrypt

