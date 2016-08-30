

function parseOptions(path) {

    //////////////////////////////////////////////////////////////////////
    //     BEGIN parseOptions() CONFIGURATION
    //////////////////////////////////////////////////////////////////////

    var default_seperator = ',';
    var program_name = 'webLauncher';

    var usage_text = 'Run a ' + program_name + ' HTTP/webSocket server. ' +
        program_name +
        ' is a nodejs web server that provides a program launcher' +
        ' service using HTTP, HTTPS, Web Sockets and Web Sockets' +
        ' over TLS.';

    var environment_prefix = program_name.toUpperCase() + '_';
    
    // The options list is longer than the code that parses the options.
    var options = {

    title: {
        type: 'string', dflt: 'Demos',
        help: 'set the page title text to TITLE.'
    },
    heading: {
        type: 'string', dflt: 'Demos',
        help: 'set <h1> page heading text to HEADING.'
    },
    http_port: {
        type: 'string', dflt: '8080',
        help: 'set the server HTTP port to HTTP_PORT. ' +
            'The HTTP (non-secure) service is only available ' +
            'to localhost. Setting the HTTP_PORT to "0" will ' +
            'disable this HTTP service.'
    },
    https_port: {
        type: 'string', dflt: '8383',
        help: 'set the server HTTPS port to HTTPS_PORT.'
    },
    exit_on_last: {
        type: 'number', dflt: -1, // -1 is off
        argument: 'MILLI_SECS',
        help: 'have server exit after last connection closes.' +
            ' MILLI_SECS is the time to wait after the last ' +
            'connection is closed. MILLI_SECONDS is -1 for not ' +
            'exiting on last connection close.'
    },
    on_exit: {
        type: 'string',
        help: 'run PROGRAM just before the server exits.',
        argument: 'PROGRAM' // as in --on_exit=PROGRAM
    },
    kill_children: {
        type: 'bool', dflt: false,
        help: 'kill all launched children on exiting the server.'
    },
    passcode: {
        type: 'string',
        help: 'set client passcode to PASSCODE, if set the initial URL' +
            ' for the service should be appended with something like:' +
            ' https://example.com/?passcode=PASSCODE' +
            ' after which additional client requests will be secured with' +
            ' cookies.'
    },
    catch_signal: {
        type: 'string', argument: 'SIG',
        help: 'catch signal SIG to exit.  Catchs the signal and then cleanly exits.' +
            ' This is handy to use with the --kill_children option.  Example: ' +
            '--catch_signals SIGINT .  By default termial signals cause the server' +
            ' to terminate immediately with no catcher function. ' +
            'Not all signals are supported in nodejs (SIGINT,SIGQUIT,SIGTERM are).',
        // TODO: parse with this in mind make this get an array of
        // strings:
        array: [0, 64] // range 0 to 64 signals may be set
    },
    signal: {
        type: 'string', seperator: ',',
        default_print: false, // Do no print "The default value is bla bla"
        // in the help.
        len: 2, // consumes 2 arguments making 2 strings
        // example: "--signal=USR1 2314"
        // separator: ' '  is the default.  It separates USR1 and 2314
        argument: 'SIG,PID',
        // sample args for help as in "--signal=USR1,PID"
        // or -signal USR1 2314 or --signal USR1,2314
        // or --signal=USR1,2314  all would work
        help: 'signal the process with PID with signal SIG just after the' +
            ' listening sockets are open.  Example: --signal USR1,2354.'
    },
    // User configuration/setting dir
    config_dir: {
        type: 'string', dflt: path.join(process.env.HOME, '.' + program_name),
        help: 'set the server configuration and settings directory. ' +
            'The default value of CONFIG_DIR is ${HOME}' +
            path.sep + '.' + program_name + '.'
    },
    head: {
        type: 'string', dflt: 'head.htm',
        help: '(ADVANCED) set the launch pages prefix HTML text that' +
            ' is at the top of every launcher page. ' +
            'If the full path is not given the search path will start' +
            ' at the installation prefix in the etc sub-directory.'
    },
    foot: {
        type: 'string', dflt: 'foot.htm',
        help: '(ADVANCED) set the launch pages suffix HTML text that' +
            ' is at the bottom of every launcher page. ' +
            'If the full path is not given the search path will start' +
            ' at the installation prefix in the etc sub-directory.'
    },
    root_dir: {
        type: 'string', dflt: process.cwd(),
        help: 'set the servers root document directory.  The default ' +
            'ROOT_DIR is the current working directory this program ran from.'
    },
    //////////////////////////////////////////////////////////////////////
    //            file types
    //  kind-of like MIME type for webLauncher
    //  The user can configure them though this options interface.
    //  We define them by javaScript regular expression match.
    //////////////////////////////////////////////////////////////////////
    run_script: {
        type: 'regexp', dflt: '(.*_|)run',
        help: 'match this to find the files to be launched.'
    },
    run_txt: {
        type: 'string', dflt: 'description.txt',
        help: 'match this to find launch descriptions in simple text.'
    },
    run_icon: { // TODO: change this and tests and CAVE files
        type: 'regexp', dflt: '^launcherIcon.*\\.(png|jpg|JPG)',
        help: 'match this to find launch image icons.'
    },
    main_menu: {
        type: 'string', dflt: 'main_menu',
        help: 'set the name of the main menu directory.'
    },
    dir_txt: {
        type: 'regexp', dflt: 'dir_description\\.txt',
        help: 'match this to find directory descriptions in simple text'
    },
    dir_icon: {
        type: 'regexp', dflt: '^dir_icon.*\\.(png|jpg|JPG)',
        help: 'match this to find directory icon images.'
    },
    help: {
        type: 'bool',
        help: 'print this help.'
    }
    };

    //////////////////////////////////////////////////////////////////////
    //       END parseOptions() CONFIGURATION
    //////////////////////////////////////////////////////////////////////

    var error = '';

    function addError(str) {
        if(error.length > 0)
            error += ' ' + str;
        else
            error = 'bad option(s): ' + str;
    }
 
    var spaces = '                                                  ' +
        '                                                           ' +
        '                           ',
        right0 = 4,  // chars left margin
        right1 = 31, // position to left side of help
        min_width = 50, // minimum width
        width = 78;  // width of text

    function write(str) {
        process.stdout.write(str);
    }

    function print(str, right, next_right) {

        var i;
        var out = '';

        while(str.length > 0 && str.substr(0,1) == ' ') str = str.substr(1);
        out = spaces.substr(0,right) + str;
        if(arguments.length > 2)
            right = next_right;

        while(out.length > width) {
            for(i=width; i>min_width && out.substr(i,1) != ' '; --i);
            if(i == min_width)
                // We failed to find a space so show it all.
                i = width;

            write(out.substr(0,i) + "\n");
            out = out.substr(i);
            while(out.length > 0 && out.substr(0,1) == ' ') out = out.substr(1);
            if(out.length > 0)
                out = spaces.substr(0,right) + out;
        }
        write(out + "\n");
    }

    function usage() {

        write('  Usage: ' + program_name + " [OPTIONS]\n\n");
        print(usage_text, 2);
        write("\n");

        print(
            'The following options may be set using the command line ' +
            'or via an environment variable with a with the name being ' +
            'prefixed with ' + environment_prefix + ' and in all caps ' +
            'like for example:', 2);

        write("\n      " + environment_prefix + 'TITLE="Cool Examples" ' +
                program_name + "\n\n");

        print('will set the --title option to "Cool Examples"', 2);

        write("\n\n                 --------- OPTIONS --------\n\n");

        var keys = Object.keys(options);
        for(var i=0; i<keys.length; ++i) {
            var pre = '--' + keys[i];
            var opt = options[keys[i]];
            if(opt.type === 'string' ||
                    opt.type === 'regexp' ||
                    opt.type === 'number')
                pre += ' ' + opt.argument;

            if(pre.length < right1 - right0)
                pre += spaces.substr(0, right1 - right0 - pre.length);
            else
                pre += ' ';

            if(typeof(opt.default_print) === 'undefined' && opt.dflt) {
                if(opt.type === 'string')
                    var dflt = ' The default value of ' +
                        opt.argument + ' is "' + opt.dflt + '".';
                else if(opt.type === 'number')
                    var dflt = ' The default value of ' +
                        opt.argument + ' is ' + opt.dflt + '.';
                else if(opt.type === 'regexp')
                    var dflt = ' The default value of ' +
                        opt.argument + ' is /' + opt.dflt + '/.';
                else // if(opt.type === 'bool')
                    var dflt = ' This is not set by default.';
            } else {
                var dflt = '';
            }

            print(pre + options[keys[i]].help + dflt, right0, right1);
            write("\n");
        }

        process.exit(1);
    }

    var keys = Object.keys(options);
    var alen = process.argv.length;

    // initialize all options values
    for(var j=0; j<keys.length; ++j) {
        var name = keys[j];
        var opt = options[name];
        var type = opt.type;
        if(type === 'bool') {
            opt.value = false;
            continue;
        }
        if(type === 'string' || type === 'regexp' || type === 'number') {
            if(opt.dflt)
                opt.value = opt.dflt;
            else
                opt.value = '';
            
            if(opt.len && opt.len > 1) {
                if(typeof(opt.seperator) === 'undefined')
                    opt.seperator = default_seperator;
                if(typeof(opt.dflt) != 'array')
                    opt.value = [];
                else
                    opt.value = opt.dflt;
            } else
                opt.len = 1;

            if(!opt.argument)
                opt.argument = name.toUpperCase();

            continue;
        }
        error = 'bad option parsing opbject with name: ' + name;
        process.exit(1);
    }

    ///////////////// TO REMOVE ///////////////////////////
    console.log('============ default option values =============');
    for(var j=0; j<keys.length; ++j)
         console.log('  ' + j + ' ' + keys[j] + '=' +  options[keys[j]].value);
    console.log('================================================');


    for(var i=2; i < alen; ++i) {
        var arg = process.argv[i];
        for(var k=0; k<keys.length; ++k) {
            var name = keys[k];
            var opt = options[name];
            var type = opt.type;
            //console.log(name);
            if(type === 'string' || type === 'regexp' || type === 'number') {
                if(('--'+name === arg || '-'+name === arg) && alen > i+1) {
                    // --option val   -option val
                    arg = process.argv[++i];
                    if(opt.len === 1)
                        opt.value = arg;
                    else {
                        // Getting multiple values into an array of values
                        // --option val0 --option val1 --option val2 ...
                        // or
                        // --option "val0 val1 val2"
                        var a = arg.split(opt.seperator)
                        opt.value = opt.value.concat(a);
                    }
                    break; // got it
                }

                var optlen = arg.indexOf('=') + 1;
                if(optlen > 0 && ('--'+name+'=' === arg.substr(0,optlen) ||
                            '-'+name+'=' === arg.substr(0, optlen)) &&
                            arg.length > optlen) {
                    if(opt.len === 1) {
                         opt.value = arg.substr(optlen);
                    } else {
                        // Getting multiple values into an array of values
                        // --option=val0 --option=val1 --option=val2 ...
                        // or
                        // --option="val0 val1 val2"
                        // or
                        // "--option=val0 val1 val2"
                        var a = arg.substr(optlen).split(opt.seperator);
                        opt.value = opt.value.concat(a);
                    }
                    break;
                }
                // TODO: add short options like the list command 'ls -al'
            }

            if(type && type == 'bool') {
                if('--'+name === arg || '-'+name === arg) {
                    // --option  -option
                    opt.value = true;
                    break;
                }
            }
        }
        if(k === keys.length) 
            addError(arg);
    }

    // Check that array values are either 0 length or the len length
    for(var j=0; j<keys.length; ++j) {
        var key = keys[j];
        var opt = options[key];
        if(opt.len > 1 &&
                (opt.value.length != 0 && opt.value.length != opt.len))
            addError(key + ' got ' + opt.value.length +
                    ' values, needed ' + opt.len);
    }


    // now parse the environment
    for(var j=0; j<keys.length; ++j) {
        var key = keys[j];
        var name = environment_prefix + key.toUpperCase();
        var env = process.env[name];
        if(env) {
            var opt = options[key];
            if(opt.type === 'string' || opt.type === 'regexp'
                    || opt.type === 'number') {
                if(opt.len === 1)
                    opt.value = env;
                else /* if(len > 1) */ {
                    opt.value = env.split(opt.seperator);
                    if(opt.value.length < opt.len)
                        addError('env: ' + name + '=' + env);
                }
            }
            if(opt.type === 'bool') {
                // Default to true unless it's a false thing like '0' or
                // 'no' etc...
                opt.value = true;
                if(/(f|F|n|N|0).*/.test(env))
                    opt.value = false;
            }
        }
    }

    // Now convert the options that are numbers from strings to numbers
    // and the regexp from strings to regexp.
    for(var j=0; j<keys.length; ++j) {
        var key = keys[j];
        var opt = options[key];
        if(opt.type === 'number') {
            if(opt.len === 1) {
                opt.value = parseInt(opt.value);
            } else {
                for(var i=0; i<opt.value.length; ++i)
                    opt.value[i] = parseInt(opt.value[i]);
            }
        } else if(opt.type === 'regexp') {
            if(opt.value.substr(0,1) == '/')
                opt.value = opt.value.substr(1);
            if(opt.value.substr(opt.value.length-1,1) == '/')
                opt.value = opt.value.substr(0, opt.value.length-1);
            opt.value = new RegExp(opt.value);
        }
    }

    if(error.length > 0) {
        console.log(error + "\n\n");
        options.help.value = true;
    }

    if(options.help.value)
        usage();

    var ret = {}; // returned option values
    // trash all the options data leaving just the values
    for(var j=0; j<keys.length; ++j)
        ret[keys[j]] = options[keys[j]].value;

    ret.program_name = program_name;

    return ret;
}


var path = require('path');

var opt = parseOptions(path);

// opt and path are the other two things that
// are needed a this point



//////////////////////////////////////////
// BEGIN TO REMOVE later
//////////////////////////////////////////
// test print
function testPrint() {
    var keys = Object.keys(opt);

    console.log('============== ' + keys.length +
        ' options =====================');
    for(var j=0; j<keys.length; ++j)
        console.log(' ' + j + ' ' + keys[j] + '=' + opt[keys[j]].toString());
    console.log('=============================================');
}
testPrint();
//////////////////////////////////////////
//   END TO REMOVE later
//////////////////////////////////////////

