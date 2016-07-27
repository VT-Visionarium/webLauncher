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


### Build and Install

run (bash):

<pre>./configure && make && make install</pre>


### Run a Demo

run:

<pre>
make &&\
./webLauncher testDocRoot/ &\
# wait for the server to start\
while ! nc -z  localhost 8080;do echo "waiting";sleep 0.3;done&&\
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
highly evolved things.  This beats the crap out of a single process GUI
app written with a C/C++ GUI widget API.  Since most of the time people
are using web browsers anyway, there's not a big cost to doing it this
way.


## Ports

### Server Code

The current development platform is GNU/Linux, Xubuntu 14.04.  We expect
that other GNU/Linux systems should work.

We plan to port to Windoz and Mac OSX.


### Browsers

The served HTML, CSS, and javaScript are ported to:
currently firefox on Xubuntu.  We find that Chrome on an Android phone works too.


## Developer Notes

bootstrap
> We are developing this code with the aid of a repository and we do not
> check-in generated files into the repository.  Some files in a tar-ball
> release are generated so we require that these files be generated via
> the script 'bootstrap'.


markdown
> .md files in this pachage compile into HTML with markdown

