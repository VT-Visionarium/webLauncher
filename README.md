# webLauncher

> a program launcher web service

webLauncher is a web server and supporting HTML, CSS, and javaScript files
that are used to provide an app launcher as a web service.  You run
webLauncher on a particular computer and then any web browser can launch
programs on that computer.  The network connections are secured via TLS
and the browser authenticates via passcode and cookies.


## Quick Install and Demo

### Prerequisite Software

##### nodejs

From https://nodejs.org/.  We are currently using a build from
github source via git source repo with git tag v6.2.2
So for example run:
> git clone --branch v6.2.2 https://github.com/nodejs/node.git
to get nodejs source with tag v6.2.2.

#### For Development

##### yui-compressor

Compressing the installed files via yui-compressor is optional.


### Build and Install

run (bash):

<pre>./configure && make && make install</pre>


### Run a Demo

run:

<pre>
make &&\
 ./webLauncher &
 # wait for the server to start
 while ! nc -z  localhost 8080;do echo "waiting";sleep 0.3;done
 firefox http://localhost:8080/
</pre>

## Why

We needed a demo launcher for running programs on a computer which had no
monitor, and we needed to launch said programs without having to spend
much time focusing on the commands that needed to be typed.  We wanted a
selection of icons that we click on which launch corresponding programs.
It had to be some kind of graphical user interface without a lot of setup.
The file systems tree structure provides the hierarchal structure of the
launcher programs.  Changes in the files are immediately reflected in the
web service, making configuration of the service very straight forward,
and on-the-fly.  It's a web based file browser that restricts the function
to that of just running programs, with additional descriptions and state
information.  User just need to make a directory with programs in it.
The web server uses this directory as its server root.

## Results

We got more than we needed, because web servers and web browsers are very
highly evolved things now-a-days.  This beats the crap out of a single
process GUI app written with a GUI widget API.  Since most of the time
people are using web browsers anyway, there's not a big cost to doing it
this way.


## Ports

### Server Code

The current development platform is GNU/Linux, Xubuntu 14.04.  We expect
that other GNU/Linux systems should work.

We plan to port to Windoz and Mac OSX.


### Browsers

The served HTML, CSS, and javaScript are ported to:
currently firefox on Xubuntu.  We find that Chrome on an Android phone works too.


## Developer Notes

<b>small and simple over fancy:</b>
We don't like it when the "hello world" program is 10,000 lines of code.
We don't like depending of 100 package modules when we can do it with
zero.  We don't like broken code, due to depending on too many packages.
We don't use JQuery on the client side.  If you think that javaScript is
missing something than change the standard.

add a repo build 'bootstrap' script
> We are developing this code with the aid of a repository and we do not
> check-in generated files into the repository.  Some files in a tar-ball
> release are generated so we require that these files be generated via
> the script 'bootstrap'.

ws
> We use nodejs module ws for Web Sockets because it works without lots
> of dependences, especially good in that there of no added dependences
> needed on the client (browser) side, as socket.io has.

Add other build and install methods like Cmake, npm, deb, rpm, mac, windoz
packages; ya, maybe some day.  We need to keep the code simple enough to
allow the use of other build systems, so we don't want to become dependent
on a particular build system.  Adding a npm build/install method is an
obvious thing to do.  Note: npm lacks the age based dependency chain that
make has, so it "misses the boat" as a basic build and test, on-the-fly,
developer tool.  Something else was needed, and we already know "make".
So npm can be used to build and install, but it makes build/test scenarios
relatively cumbersome, compared to the "make" method.

<b>scope of this project:</b>
This package is not intended to be large. Name space conflicts will not
be a problem.  Do not over engineer this code.

<b>server initialization:</b> There's not much to gain by adding more code
to make the startup of the server more asynchronous in nature, and
therefore faster at startup.  Currently "less code" beats "faster startup
time."  The interdependences of the startup "steps" could make startup
fail, if we blindly make the startup steps asynchronous.  Unless we start
and stop servers many times a second, there would be no appreciable gain
in using asynchronous forms at server startup.  The nodejs built-in
require() function uses a synchronous blocking file read, and we
understand why.  After server initialization we should keep things in the
standard nodejs asynchronous way in as much as is practical.

### Options Parsing

<b>Why we made our own options parser:</b>

* Most of the option parse out there have far too many dependences, and

* most of the option parse out there do not do what we want.

* In our case, the argument options parsing code is smaller than
the options object.  Most of the work is in listing and documenting
options, not writing the argument options parsing code.  It seems that
most people using argument options parsing modules got it backwards;
designing the options is more work than writing the parser.

* Lastly we tried what was out there and they all suck for one reason or
another.

### Next Generation

Evolve this into a launcher protocol layer that sits on http/https and
ws/wss to provide program launch service.  Make it a nodejs module that
extends the nodejs grouped ws(s) server by protocol extension in a similar
way in that ws extends http.

Consider adding mime types based on file suffix and/or prefix.

How does this extend the read only file browser which a web browser is
for the file:// protocol.

