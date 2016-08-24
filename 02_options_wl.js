
var path = require('path');

var environment_prefix = 'WEB_LAUNCHER_';
var program_name = 'webLauncher';

var usage_text = 'Run a ' + program_name + ' HTTP/webSocket server. ' +
        program_name +
        ' is a nodejs web server that provides a program launcher' +
        ' service using HTTP, HTTPS, Web Sockets and Web Sockets' +
        ' over TLS.';


var opt = {};


// Convert string to regexp and vise-versa
function convertStringRegex(x) {
    if(typeof(x) === 'string')
        // convert to regexp
        return new RegExp(str);
    // else convert to string
    return x.toString();
}

function usage() {

    console.log('Usage: ' + program_name + " [OPTIONS]\n\n" +
            usage_text + " \n\n" +
            "                   OPTIONS\n\n");
    
    var keys = Object.keys(options);
    for(var i=0; i<keys.length; ++i) {

        var opt = options[keys[i]];

       console.log(keys[i] + '  ' + opt.help + "\n\n");
    }

    process.exit(1);
}

function parseOptions() {

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
        help: 'set the server HTTP port to HTTP_PORT.'
    },
    https_port: {
        type: 'string', dflt: '8383',
        help: 'set the server HTTPS port to HTTPS_PORT.'
    },
    exit_on_last: {
        type: 'bool', dflt: false,
        help: 'have server exit after last connection closes.'
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
            "\n\n" +
            '     https://example.com/?passcode=PASSCODE' +
            "\n\n" +
            'after which additional client requests will be secured with' +
            ' cookies.'
    },
    signal: {
        type: 'string',
        eat: 2, // consumes 2 arguments making 2 strings
        argument: 'SIG PID',
        help: 'signal the process with PID with signal SIG just after the' +
            'listening sockets are open.  Example: --signal SIGUSR1 2354.'
    },
    // User configuration/setting dir
    config_dir: {
        type: 'string', dflt: path.join(process.env.HOME, '.' + program_name),
        help: 'set the server configuration and settings directory. ' +
            'The default value or CONFIG_DIR is ${HOME}' +
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
        type: 'string',
        help: 'set the servers root document directory.  The default ' +
            'ROOT_DIR is the current working directory this program ran from.'
    },
    //////////////////////////////////////////////////////////////////////
    //            file types
    //  kind-of like MIME type for webLauncher
    //  The user can configure them though this options interface.
    //  We define them by javaScript regular expression match.
    //////////////////////////////////////////////////////////////////////
    run_script_name: {
        type: 'string', dflt: '/(.*_|)run/',
        help: 'match this to find the files to be launched.'
    },
    run_txt: {
        type: 'string', dflt: '/description\\.txt/',
        help: 'match this to find launch descriptions in simple text.'
    },
    run_icon: {
        type: 'string', dflt: '/^run_icon.*\\.(png|jpg|JPG)/',
        help: 'match this to find launch image icons.'
    },
    main_menu: {
        type: 'string', dflt: '/main_menu/',
        help: 'set the name of the main menu directory.'
    },
    dir_txt: {
        type: 'string', dflt: '/dir_description\\.txt/',
        help: 'match this to find directory descriptions in simple text'
    },
    dir_icon: {
        type: 'string', dflt: '/^dir_icon.*\\.(png|jpg|JPG)/',
        help: 'match this to find directory icon images.'
    },
    help: {
        type: 'bool',
        help: 'print this help.'
    }
    };

    var error = '';
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
        if(type === 'string' && opt.dflt)
            opt.value = opt.dflt;
    }

    for(var i=2; i < alen; ++i) {
        var arg = process.argv[i];
        for(var k=0; k<keys.length; ++k) {
            var name = keys[k];
            var opt = options[name];
            var type = opt.type;
            console.log(name);
            if(type && type == 'string') {
                if(('--'+name === arg || '-'+name === arg) && alen > i+1) {
                    // --option val   -option val
                    var l = (opt.eat && typeof(opt.eat) === 'number')?opt.eat:1;
                    if(l === 1)
                        opt.value = process.argv[++i];
                    else if(alen > i + l) {
                        opt.value = [];
                        while(l--)
                            opt.push(process.argv[++i])
                    }
                    break;
                }
                var optlen = arg.indexOf('=') + 1;
                if(optlen > 0 && ('--'+name+'=' === arg.substr(0,optlen) ||
                            '-'+name+'=' === arg.substr(0, optlen)) &&
                            arg.length > optlen) {
                    // --option=val   -option=val
                    var l = (opt.eat && typeof(opt.eat) === 'number')?opt.eat:1;
                    if(l === 1) {
                         opt.value = arg.substr(optlen);
                    } else if(alen > i + l-1) {
                        // like  % program --option=val0 val2
                        // which is kind of strange
                        opt.value = [];
                        opt.push(arg.substr(optlen));
                        l--;
                        while(l--)
                            opt.push(process.argv[++i]);
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
        if(k === keys.length) {
            if(error.length > 0)
                error += ' ' + arg;
            else
                error = 'unknown option(s): ' + arg;
        }
    }


    console.log("program options:\n------------------------");
    // Test that it worked by printing options
    for(var j=0; j<keys.length; ++j) {
        var opt = options[keys[j]];
        console.log(keys[j] + '=' + opt.value);
    }
    console.log("---------------------------\n");

    if(error.length > 0) {
        console.log(error + "\n\n");
        usage();
    }


    if(options.help.value)
        usage();

    // trash all the options data leaving just the values
    for(var j=0; j<keys.length; ++j) {
        opt[keys[i]] = options[keys[j]].value;
    }
}

parseOptions();

