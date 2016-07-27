# webLauncher

a program launcher web service

webLauncher is a web server and supporting HTML, CSS, and javaScript files
that are used to provide an app launcher as a web service.  You run
webLauncher-server on a particular computer and then any web browser can
launch programs on that computer.  The network connections are secured via
TLS and the browser authenticates via passcode and cookies.


## Quick Install and Demo

### Prerequisite Software

nodejs  MORE HERE


### Install

Try running:

MORE HERE


### Run Demo

MORE HERE


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




