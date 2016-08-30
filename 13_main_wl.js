var

    // We use a separate port for the web sockets
    // so that the code has less chance of braking.
    https = require('https'),
    http = require('http'),
    querystring = require('querystring'),
    child_process = require('child_process'),
    dns = require('dns'),
    url = require('url'),
    fs = require('fs'),
    util = require('util'),
    ws = require('ws').Server,
    launcher = {},
    sockets = {},
    socketCreateCount = 0,
    // clone the actual env vars to avoid overrides
    env = Object.create(process.env),

    // Given the "run rule" that no more than one program of a given
    // executable file name may run at the same time.  Launching a program
    // of the same name stops the current running program of that name
    // before launching the new one.  running_programs maps program base
    // filename to server relative path to run because we must wait for
    // the programs to next before running the next one.
    running_programs = { }, // objects = { program_filename: relPath }


//////////////////////////////////////////////////////////////////////
//         Supporting Files
//////////////////////////////////////////////////////////////////////

    // Files in etc/ used to compose pages served
    serverFiles = { },


//////////////////////////////////////////////////////////////////////

    scriptDir = path.dirname(fs.realpathSync(__filename)),
    cwdOrg = process.cwd(),
    etcDir = '';

//////////////////////////////////////////////////////////////////////

// initialize
serverFiles[opt.head] = '';
serverFiles[opt.foot] = '';



function exit(stat) {
    var ret = 0;
    if(arguments.length > 0)
        ret = stat;

    if(opt.kill_children)
        for(var key in launcher) {
            var child = launcher[key].child;
            if(child) {
                try {
                    child.kill('SIGINT');
                    child.kill('SIGTERM');
                } catch(e) { }
            }
        }

    if(opt.on_exit.length > 0) {

        console.log("Running pre-exit program: " + opt.on_exit);

        try {
            child_process.execSync(opt.on_exit, {
                    cwd: cwdOrg,
                    stdio: [0,1,2],
                    env: env
            });
        } catch(err) {
            console.log('Failed to run ' + opt.on_exit + ': ' + err);
            process.exit(34); // return error status
        }
    }

    console.log("Server Exiting")
    process.exit(ret);
}

function ASSERT(x, msg) {
    if(x) return;

    var txt = "Assertion(" + String(x) + ") FAILED";

    if(arguments.length > 1)
        console.log(txt + "\n" + msg);
    else
        console.log(txt);

    throw('error'); // print stack trace??
    exit(1);
}

function printLauncherObj(pre, json) {
        console.log(pre + JSON.stringify(json));
}

// This is the launcher object factory. It returns the child object from
// the global object launcher{}. Launcher objects are never destroyed so
// long as the server is running so that state is kept about what is
// running independent of what clients are connected, and a client
// (browser) page reload can get current run states.
function getLauncher(relPath, child_in) {

    // Since URIs can have a leading '/' or not and still refer
    // to the same resource, we add the leading '/' if it's not
    // there already, so the lookup for foo is the same as for /foo
    relPath = path.join('/', relPath);

    //console.log('getLauncher("' + relPath + '", ' + child_in + ')');

    var child = null;
    if(arguments.length > 1) {
        child = child_in;
        // There must be a entry already
        ASSERT(launcher[relPath], 'child with relaive path ' + relPath +
                ' not found');
    }

    if(launcher[relPath]) {
        if(child) {
            // set the child_process object
            launcher[relPath].child = child;
            launcher[relPath].json.pid = child.pid;
        }
        // We let the caller set other stuff in the
        // launcher[relPath]
        return launcher[relPath];
    }

    // Create a new launcher object
    launcher[relPath] = {
        json:  /* json is JSON sent to client */ {
            command: 'state',
            state: 'dead', // 'dead' or 'running'
            stateText: 'Not running yet.', // display in browser
            relPath: relPath, // unique relative path to program path to run
                              // also key for launcher
            className: 'launch', // <div> button class for CSS style 
            runCount: 0, // number of times that this ran
            pid: 0 // 0 or child process ID
        },
        child: child, // last returned from child_process.spawn()
        // so child can't be in JSON sent to client.
    };
    if(child) child.Launch = launcher[relPath];

    printLauncherObj("made new launcher=", launcher[relPath].json);

    return launcher[relPath];
}

function fileExists(f) {

    try {
        fs.lstatSync(f);
    } catch (e) {
        return false;
    }
    return true;
}


function addLaunchersToPage(dir, relDir) {
 
    var launcherFooter =
        "    </div>\n" +
        "  </div>\n" +
        "</div>\n\n";
    var page = '';

    try {
        var f = fs.readdirSync(dir);
    } catch(e) {
        return page;
    }

    for(var i=0; i<f.length; ++i) {
        if(opt.run_script.test(f[i]))
            break;
    }
    if(i === f.length) return page; // failed to find a script

    var scriptPath = path.join(dir, f[i]);
    var scriptURI = path.join(relDir, f[i]);


    console.log('found launcher script path=' + scriptPath);

    // We have a script.  For each script we get a child/state
    // launcher object.
    var json = getLauncher(scriptURI).json;
    var onclick = "\"launch(this)\"";
    if(json.state == 'running')
        onclick = "\"kill(this)\""

    page = "<div class=box>\n" +
"  <span class=state>" + json.stateText + "</span>\n" +
"  <div class=head>\n" +
"    <div onclick=" + onclick + " id='" + scriptURI +
"' class='" + json.className + "' title='run: " +
    scriptURI + "'>\n";

    var text = false;
    var images = [];
    
    try {
        // Find any images and add <img> tags to launcher <div>
        var filenames = fs.readdirSync(dir);
    } catch(err) {
        console.log('fs.readdirSync("' + dir + '") failed: ' + err);
        process.exit(1);
    }
    for(var i=0; i<filenames.length; ++i) {
        //console.log('checking img filename=' + filenames[i]);
        if(opt.run_icon.test(filenames[i])) {
            console.log('found img filename=' + filenames[i]);
            images.push(path.join(relDir, filenames[i]));
        }
    }

    f = path.join(dir, opt.run_txt);
    try {
        text = '';
        // Put images at the top with given text
        for(var i=0; i<images.length; ++i)
            text += "      <img class=icon src='" + images + "'>\n";
        text +=
            "      <p>\n" +
            fs.readFileSync(f).toString().replace(/\n\n/g,
            "\n" +
            "      </p>\n" +
            "      <p>\n") +
            "      </p>\n";
    } catch(e) {
        text = false;
    }

    if(!text) {
        text = '';
        // Put images at the top but with generic text
        for(var i=0; i<images.length; ++i)
            text += "      <img class=icon src='" + images[i] + "'>\n";
        text +=
            "      <p class=genericprog>Run " +
            path.basename(path.dirname(scriptURI)) +
            "      <\p>\n" +
            "      <p class=genericdesc>You can add a description to this " +
            "program by creating the\n" +
            "      plain text file " +
            path.join(dir, opt.run_txt) + ".\n      </p>\n";
    }

    page += text + launcherFooter;
    // We how have a script to launch for this directory
    return page;
}

function escapeHTML(s) { 
    return s.replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/@/g, '');
}

function addDirsToPage(dir, relDir) {

    var page = '';


    // Now find directories in this directory
    try {
        var dirs = fs.readdirSync(dir);
    } catch(e) {
        // not able to open as a directory
        dirs = [];
    }

    console.log('relDir=' + relDir + ' dirs=' + dirs);

    for(var i=0; i<dirs.length;++i)
        if(fs.lstatSync(path.join(dir, dirs[i])).isDirectory()) {
            var p = path.join(relDir, dirs[i]);
            page +=
                '    <tr>' +
                '<td><a href="' + p + '">' + p + '</a></td>' +
                '</tr>\n';
        }

    
    return page;
}

// Returns true if dir0 has a directory in it and another directory in
// that (3 levels of directories dir0/dir1/dir2), or a run script in a
// sub-directory (dir0/dir1/script) of dir0.
//
// Note: There is no point in HTML indexing a directory unless there a
// script in a sub-directory of that directory, or there is a in a
// sub-directory of that directory (where there may be a script).  How
// deep does the rabbit hole go?
function checkForDirectories(dir0)
{
    try {
        var ch = fs.lstatSync(dir0).isDirectory();
    } catch(e) {
        return false;
    }
    if(!ch) return false; // it's not a directory


    // Now find directories in this directory
    try {
        var f0 = fs.readdirSync(dir0);
    } catch(e) {
        // not able to open as a directory
        return false;
    }

    try {
        for(var i=0; i<f0.length;++i) {
            var dir1 = path.join(dir0,f0[i]);

            if(fs.lstatSync(dir1).isDirectory()) {
                var f1 = fs.readdirSync(dir1);

                for(var j=0; j<f1.length; ++j)
                    if(opt.run_script.test(f1[j]))
                        // We found a run script in dir1
                        return true;

                if(fs.lstatSync(path.join(dir1,f1[i])).isDirectory())
                    // We have a directory in a directory in dir0.
                    return true;
            }
        }
    } catch(e) {
        return false;
    }

    return false;
}

function getPage(dir, relDir) {

    //console.log('CALLING getPage(dir="' + dir + '", relDir="' + relDir + '")');

    // TODO: This could read head.htm (and foot.htm) each time so
    // that changes go into effect immediately.
    var page = serverFiles[opt.head].toString().
        replace('@TITLE@', opt.title) + "\n" +
        '<div id=heading>' + opt.heading + "</div>\n" + 
        "\n<!-- This was a generated file.\n  END " + opt.head + " -->\n\n";


    /////////////////////////////////////////////
    // Top of page description
    ////////////////////////////////////////////

    // TODO: add images to top like in addLaunchersToPage()
    // but here.
    // TODO: add htmDescFilename option in place of simple
    // text.

    var s = '';

    try {
        // Add simple description text
        var f = path.join(opt.root_dir, opt.run_txt);
        s +=
                "      <p>\n" +
                fs.readFileSync(f).toString().replace(/\n\n/g,
                "\n" +
                "      </p>\n" +
                "      <p>\n") +
                "      </p>\n";
    } catch (e) {
        s = '';
    }

    page += s;
    s = '';

    ///////////////////////////////////////////////////
    // Top directory programs plus main menu programs
    //////////////////////////////////////////////////

   page += 
        "<hr><h2>Main Menu: " + opt.root_dir + "</h2>\n";

    // Top Top launcher
    // TODO: port '/' to Windoz.
    page +=  addLaunchersToPage(opt.root_dir,'/');

    var headerDirFull = path.join(opt.root_dir, opt.main_menu);

    try {

        if(fs.lstatSync(headerDirFull).isDirectory())
            s += addLaunchersToPage(headerDirFull, '/' + opt.main_menu);

        if(checkForDirectories(headerDirFull)) {

            // Now look for scripts in sub-directories of main menu
            var dirs = fs.readdirSync(headerDirFull);

            for(var i=0; i<dirs.length;++i) {
                var d = path.join(headerDirFull,dirs[i]);
                if(fs.lstatSync(d).isDirectory()) {
                    s += addLaunchersToPage(d, path.join('/' +
                                opt.main_menu, dirs[i]));
                }
            }
        }
    } catch(e) {
        // The directory main_menu was not readable which is fine.
        s = '';
        console.log('No header scripts found');
    }

    page += s;
    s = '';
    

    /////////////////////////////////////////////
    // Current directory index 
    /////////////////////////////////////////////

 
    var preTable =
            "<div style='clear:left;'><div>\n" +
            '<hr>\n<table class=index>\n' +
            '  <tr><th colspan=1>' + dir + ' Directories</th</tr>\n';

    var postTable = '</table>\n<hr>\n';

    // Now find directories in this directory
    try {
        var dirs = fs.readdirSync(dir);
    }
    catch(e) {
        // not able to open as a directory
        dirs = [];
    }


    if(relDir != '/') {
        var href = path.dirname(relDir);
        page += preTable +
            '  <tr>' +
            '<td><a href="' + href + '">Parent Directory ..</a></td>' +
            '</tr>\n';
        preTable = false;
    }

    for(var i=0; i<dirs.length;++i) {
        var d = path.join(dir,dirs[i]);
        if(d == headerDirFull)
            // Skip main menu launchers
            continue;
        if(checkForDirectories(d)) {
            if(preTable) {
                page += preTable;
                preTable = false;
            }
            var p = path.join(relDir, dirs[i]);
            page +=
                '    <tr>' +
                '<td><a href="' + p + '">' + p + '</a></td>' +
                '</tr>\n';
        }
    }

    if(!preTable)
        page += postTable;

    /////////////////////////////////////////////
    // Current directory launcher programs
    /////////////////////////////////////////////


    page +=
        "<div style='clear:left;'><div>\n" +
        "<h2>Directory " + dir + "</h2>\n";

    for(var i=0; i<dirs.length;++i)
        if(dir != opt.main_menu &&
                fs.lstatSync(path.join(dir,dirs[i])).isDirectory() ) {
            page += addLaunchersToPage(
                path.join(dir, dirs[i]),
                path.join(relDir, dirs[i]));
        }

    // TODO: This could read foot.htm (and head.htm) each time
    // so that changes go into effect immediately.
    return page + "\n<!-- BEGIN " + opt.foot + " -->\n" +
        serverFiles[opt.foot];
}

function checkHeading() {

    if(!opt.heading.match(/</)) {
        opt.heading = escapeHTML(opt.heading);
        opt.heading = '<h1>' + opt.heading + '</h1>';
    }
}

function config() {

    try {
        process.chdir(opt.root_dir);
    } catch(e) {
        console.log('changing to document root "' +
                opt.root_dir + '" failed: ' + e);
    }
    // Get the full path to the document root
    opt.root_dir = process.cwd();

    opt.title = escapeHTML(opt.title);

    checkHeading();

    var etcDirs = [
        path.join(scriptDir, '../etc'),
        path.join(scriptDir, '/etc')
    ];
    var filenames = Object.keys(serverFiles);


    // Find etcDir with is the directory where files
    // that this service needs are located.
    for(var i = 0; i < etcDirs.length; ++i) {
        // This is total bullshit, i.e. it should be one line.
        etcDir = etcDirs[i];
        headFile = path.join(etcDir, serverFiles[filenames[i]]);
        try {
                fs.accessSync(headFile, fs.R_OK)
        } catch(err) {
            etcDir = '';
        }
        if(etcDir != '') break;
    }
    if(etcDir == '') {
        console.log(
            'Cannot find supporting files in directories: ' +
            etcDirs + "\n\n");
        process.exit(2);
    }

    for(var i=0; i < filenames.length; ++i)
    {
        try {
            serverFiles[filenames[i]] =
                fs.readFileSync(path.join(etcDir, filenames[i]));
        } catch(err) {
            console.log("Error: " + err + "\n\n");
            process.exit(2);
        }
    }
    var d = false;
    try {
        d = fs.statSync(opt.config_dir);
    } catch(err) {
            fs.mkdirSync(opt.config_dir, (err) => {
                if(err)
                {
                    console.log("Failed to make directory: " +
                        opt.config_dir + "\n" + err + "\n\n");
                    process.exit(1);
                }
        });
        console.log("Made directory: " + opt.config_dir);
    } 
    if(d && !d.isDirectory()) {
        console.log(opt.config_dir + " is not a directory.\n");
        process.exit(1);
    }

    // Report
    console.log('Document root is ' + opt.root_dir);
}



config();


function spewObject(obj, pre) {
    console.log(pre + '= ' + JSON.stringify(obj));
}

// Server state is what child programs are running: Launchers has unique
// hash key of the programs servers path relative to the server root.
//
//  The Protocol is:
//     browser (client) sends http GET of /bla/bla?run
//     server replies with JSON "State" object


function run(relPath, response) {

    var launch = getLauncher(relPath);
    var fullPath = path.join(opt.root_dir, relPath);
    
    console.log('server running: ' + fullPath);

    try {
        //////////// async version //////////
        var child = child_process.spawn(fullPath, 
            {
                cwd: path.dirname(fullPath),
                detached: true,
                stdio: [0,1,2],
                stdio: 'ignore',
                env: env
            }
        );
    } catch(err) {

            console.log('Failed to start ' + fullPath + ': ' + err);
            ++launch.json.runCount;
            sendDeadToSockets(launch, 'Failed to run (' +
                        launch.json.runCount + ').');

            if(response) {
                response.writeHead(200, {"Content-Type": "text/plain"});
                response.write(JSON.stringify(launch.json));
                response.end();
            }
            return;
    }

    var basename = path.basename(relPath);
    running_programs[basename] = relPath;

    console.log('ran ' + fullPath + " child.pid=", child.pid);

    launch = getLauncher(relPath, child);
    launch.json.className = 'running';
    launch.json.state = 'running';
    ++launch.json.runCount;
    launch.json.stateText = 'Running (' + launch.json.runCount +
            ') pid: ' + child.pid;
    launch.child = child;
    launch.json.pid = child.pid;

    if(response) {
        response.writeHead(200, {"Content-Type": "text/plain"});
        // The program may of may not be running now.  If it's not
        // running we'll find out in the child "close" event in due
        // time; so for now, to keep things simple, we just say it's
        // running, it gets updated later.
        response.write(JSON.stringify(launch.json));
        response.end();
    }

    socketsSend(JSON.stringify(launch.json));

    child.on('exit', (code) => {
        console.log(launch.json.relPath + ' pid=' +
            child.pid + ' exited with status code=' + code);
        sendDeadToSockets(launch);
        delete running_programs[path.basename(relPath)];

        if(launch.runNext) {
            var nextRelPath = launch.runNext;
            delete launch.runNext;
            launch = getLauncher(nextRelPath);
            if(launch.runNext)
                delete launch.runNext; 
            run(nextRelPath, false);
        }
    });
}


function httpRequest(request, response) {

    function getContentType(file) {

        var suffix = {
            "text/plain": /\.txt$/,
            "application/javascript": /\.js$/,
            "text/css": /\.css$/,
            "image/png": /\.png$/,
            "image/jpeg": /\.(jpg|JPG|jpeg|JPEG)$/,
            "text/html": /\.html$/,
        };
        for (var type in suffix) {
            if(suffix[type].test(file))
                return type;
        }
        return "text/plain";
    }

    console.log('accepted connection from address: ' +
            request.connection.remoteAddress);

    var parse =  url.parse(request.url);

    console.log("parse.path=" + parse.path +
            " parse.query=" + parse.query +
            " parse.pathname=" + parse.pathname);

    var fpath = path.join(opt.root_dir, parse.pathname);

    try {
        var stats = fs.lstatSync(fpath);
    } catch (e) {
        // There is no file with this path.
        stats = false;
    }


    if(stats && /^run/.test(parse.query)) {
        /////////////////////////////////////
        //////////// Run fpath //////////////
        /////////////////////////////////////

        // First check for waiting jobs
        var relPath = path.join('/',parse.pathname);
        var launch = getLauncher(relPath);

        if(launch.child) {
            var sdata = JSON.stringify(launch.json);

            ASSERT(launch.json.state == 'running',
                    'child exists and state != "running"');
            // We are running this already.  This can happen because of
            // a race condition.  Not a big deal.
            response.write(sdata);
            response.end();
            console.log('sent to ' + request.connection.remoteAddress +
                     ' ' + sdata);
            console.log('server ALREADY running: ' + fpath + ' with pid ' +
                    launch.child.pid);
            return;
        }

        if(launch.runNext)
            delete launch.runNext;

        var basename = path.basename(relPath);
        var relPathRunning = running_programs[basename];
        if(relPathRunning) {
            // This should not be the same, because we check
            // for that case just above. if(launch.child) { ...
            ASSERT(relPathRunning != relPath,
                'Two programs with the same relative path "' +
                relPath + '" are running at the same time');
            var otherLaunch = getLauncher(relPathRunning);
            ASSERT(otherLaunch, 'launcher for URI: ' +
                    relPathRunning + ' was not found');
            otherLaunch.runNext = relPath;
            response.write(JSON.stringify({state: 'waiting'}));
            response.end();
            console.log('server queued to run: ' + fpath);
            try {
                console.log("killing " + relPathRunning);
                otherLaunch.child.kill('SIGINT');
                otherLaunch.child.kill('SIGTERM');
            } catch(e) { }
            return;
        }

        run(relPath, response);

    } else if(parse.query == 'etc') {
        /////////////////////////////////////
        ////////// Files from etc/   ////////
        /////////////////////////////////////
        fpath = path.join(etcDir, parse.pathname);

        fs.readFile(fpath, "binary", function(err, file) {
            if(err) {
                response.writeHead(500, {"Content-Type": "text/plain"});
                response.write("err=" +  err + "\n");
                response.end();
                console.log(fpath + ' not found ' + err);
            } else {
                response.writeHead(200, { 'Content-Type': getContentType(fpath) });
                response.write(file, "binary");
                response.end();
                console.log('sent file: ' + fpath);
            }
        });
    } else if(stats && stats.isDirectory()) {
        /////////////////////////////////////
        ////////// Send runner page /////////
        /////////////////////////////////////
        response.writeHead(200, { 'Content-Type': 'text/html' });
        response.write(getPage(fpath, parse.pathname), "binary");
        response.end();
    } else if(stats) {
        /////////////////////////////////////
        //////////// Sent a file ////////////
        /////////////////////////////////////
        fs.readFile(fpath, "binary", function(err, file) {
            if(err) {        
                response.writeHead(500, {"Content-Type": "text/plain"});
                response.write("err=" +  err + "\n");
                response.end();
                console.log(fpath + ' not found ' + err);
            } else {
                response.writeHead(200, { 'Content-Type': getContentType(fpath) });
                response.write(file, "binary");
                response.end();
                console.log('sent file: ' + fpath);
            }
        });


   } else if(parse.query && parse.query.length > 1 && parse.pathname == '/ENV') {
    /////////////////////////////////////
    /////////// Set server env   ////////
    /////////////////////////////////////

    console.log("GOT parse.query=" + parse.query);
    var obj = querystring.parse(parse.query);
    console.log("GOT parse.query JSON=" + JSON.stringify(obj));

    if(obj.HEADING) {
        opt.heading = obj.HEADING;
        checkHeading();
        response.write(JSON.stringify({ type: 'HEADING', heading: opt.heading }));
        socketsSend(JSON.stringify({ type: 'HEADING', heading: opt.heading }));
    }

    // add it to the spawn environment
    for(var key in obj) {
        if(obj[key].length > 0)
            env[key] = obj[key];
        else
            delete env[key];
        console.log('env[' + key + ']="' + env[key] + '"');
    }

    response.end();

   } else if(parse.query && parse.query.length > 1 && parse.pathname == '/QUIT') {
    /////////////////////////////////////
    //////////////  QUIT  ///////////////
    /////////////////////////////////////

    console.log("GOT QUIT command");
    response.writeHead(200, { 'Content-Type': "text/plain" });
    response.write("\n\n\nSERVER EXITING\n\n\n");
    response.end();

    exit();

    } else {
        /////////////////////////////////////
        /////////// file not found //////////
        /////////////////////////////////////
        response.writeHead(404, {"Content-Type": "text/plain"});
        response.write(fpath + " 404 Not Found\n");
        response.end();
    }
}

// The optional http server, is on by default.
if(opt.http_port != '0')
    var server = http.createServer(httpRequest).listen(opt.http_port, 'localhost');

// Just adding one argument is the difference between http and https :)
// For the https server
var sserver = https.createServer({
            key: fs.readFileSync(path.join(etcDir, 'key.pem')),
            cert: fs.readFileSync(path.join(etcDir, 'cert.pem'))
}, function(request, response) {

    function parseCookies (request) {
        var list = {},
            rc = request.headers.cookie;

        rc && rc.split(';').forEach(function( cookie ) {
            var parts = cookie.split('=');
            list[parts.shift().trim()] = decodeURI(parts.join('='));
        });

        return list;
    }
   if(opt.passcode.length > 0) {
        ////////////////////////////////////////////////////////////////////
        // Restrict access to this server.
        // We do this by:
        //
        //      Checking that a valid session cookie (passcode) was sent
        //
        //                 or
        //
        //      A valid query with the passcode
        //
        //

        var obj = querystring.parse(url.parse(request.url).query);
        var cookie = parseCookies(request);
        var need_pass_cookie = (!cookie.passcode ||
                    cookie.passcode != opt.passcode);

        if(need_pass_cookie &&

            (!obj.passcode || obj.passcode.length < 1 ||
             obj.passcode != opt.passcode)) {

                console.log('rejected connection from address:  ' +
                    request.connection.remoteAddress.replace(/^.*:/, '') +
                    ' invalid passcode');
                // TODO: IS there a way to close the socket after the end()

                response.writeHead(500, {"Content-Type": "text/plain"});
                response.write("\nBad passcode\n\n");
                response.end();
                return;
            }
        else if(need_pass_cookie)
            response.setHeader('Set-Cookie', 'passcode=' + opt.passcode);
    }


    httpRequest(request, response);

}).listen(opt.https_port);


function socketsSend(text) {

    var deleteCount = 0;
    for(var key in sockets) {
        try {
            var pre = 'sending to ' +
                sockets[key]._socket.remoteAddress +
                ':' + sockets[key]._socket.remotePort + ' ';
            console.log(pre + text);
            sockets[key].send(text);
        } catch(e) {
            console.log(pre + ': FAILED:' + e);
            // I don't think we can edit the sockets list as we iterate
            // through it, so:
            sockets[key].DeleteMe = true;
            ++deleteCount;
            /* The socket may have been closed already; it's a race
             * we handle here. */
        }
    }

    // I don't think we can edit the sockets list as we iterate through
    // it, so we break at each delete like so:
    while(deleteCount > 0)
        for(var key in sockets) {
            if(sockets[key].DeleteMe) {
                delete sockets[key];
                --deleteCount;
                break;
            }
        }
}


function sendDeadToSockets(launch, stateText) {

    launch.json.state = 'dead';
    launch.child = null;
    launch.json.pid = 0;
    launch.json.className = 'launch';
    if(arguments.length >= 2)
        launch.json.stateText = stateText;
    else
        launch.json.stateText = 'Ran ' + launch.json.runCount + ' times.';

    launch.json.pid = 0;

    socketsSend(JSON.stringify(launch.json));
}

function handleMessageKill(json)
{
    var launch = getLauncher(json.relPath);
    var child = launch.child;

    sendDeadToSockets(launch);
    
    try {
       console.log('will kill pid ' + child.pid);
        // The child close event will change the launcher object
        child.kill('SIGINT');
        child.kill('SIGTERM');
    } catch(err) {
        // The second child.kill('SIGTERM') may or may not fail
        //console.log('signaling child failed: ' + err);
    }
}

function ws_OnConnection(socket) {

    ++socketCreateCount;

    console.log('got WebSocket connection (count=' +
        Object.keys(sockets).length +
        ") address=" + socket._socket.remoteAddress);

    socket.on('message', function(message) {

        var pre = 'WebSocket received from ' +
            socket._socket.remoteAddress + ':' +
            socket._socket.remotePort + ' ' ;
 
        console.log(pre + message);

        var json = JSON.parse(message);

        if(json.command == 'kill')
            handleMessageKill(json);
        else if(json.command == 'quit')
            exit();
        else
            console.log(pre + message + ' IS AN UNKNOWN COMMAND');
    });

    socket.on('close', function() {
        console.log('Web Socket ' + socket._socket.remoteAddress + ' closed');

        // Remove this socket from our list of sockets.
        // TODO: Yes this is stupid.  The wss should already
        // know all the socket connections. Okay, then fix this code.
        for(var key in sockets)
            if(sockets[key] == socket) {
                delete sockets[key];
                break;
            }

        if(Object.keys(sockets).length == 0 && opt.exit_on_last > -1) {

            setTimeout(function() {
                // We exit if no connection came to be in the timeout.
                // This makes a browser page reload possible, if the
                // reload is fast enough.
                if(Object.keys(sockets).length < 1) {
                    console.log('no more Web Socket connections: exiting');
                    exit();
                }
            }, opt.exit_on_last /* milli-seconds */);
        }
        console.log("There are now " + Object.keys(sockets).length +
                " Web Socket connection(s)");
    });

    // Add this socket to our list of sockets.
    sockets[socketCreateCount] = socket;
}


// This server shares the same port as the https server;
// some data in the message header tells it what to do.
(new ws({server: sserver})).on('connection', ws_OnConnection);

if(server)
    // This server shared with the http server; ya.
    (new ws({server: server})).on('connection', ws_OnConnection);



// TODO: Hostname happens to be a value domain name, but this is not
// good for the general server URL.
if(opt.passcode.length < 1)
    console.log(opt.program_name + " service at  => https://" +
            require('os').hostname() + ":" + opt.https_port);
else
    console.log(opt.program_name + " service at  => https://" +
            require('os').hostname() + ":" + opt.https_port +
            '/?passcode=' + opt.passcode);

if(server)
    console.log("          and locally  => http://localhost:" +
        opt.http_port);



if(opt.signal.length >= 1)
{
    try {
        process.kill(opt.signal[1], opt.signal[0]);
    } catch (err) {
        console.log('signaling ' + opt.signal[0] + ' to PID=' +
                opt.signal[1] + ' failed');
    }
}



if(opt.catch_signal.length > 0)
    process.on(opt.catch_signal, () => {
        console.log('Received ' + opt.catch_signal +
            '.  Cleaning up.');
        exit();
    });

