# This is a GNU makefile

hostname = $(shell hostname)

# from running ./configure [options]
-include config.make

####################################################
#  CONFIGURATION if file config.make does not exist
####################################################
PREFIX ?= /usr/local/encap/webLauncher
jscompress ?= cat
csscompress ?= cat
shabang ?= \#!/usr/bin/env node
####################################################


WS = ws@1.1.1 # This version of the nodejs package ws works

built_js_files = $(patsubst %.jsp,%.js,$(wildcard etc/*.jsp))
built_css_files = $(patsubst %.cs,%.css,$(wildcard etc/*.cs))
webLauncher_sources = $(sort $(wildcard *_wl.js))

keys = etc/key.pem etc/cert.pem

built_files = $(sort\
 $(built_js_files)\
 $(built_css_files)\
 $(keys)\
 node_modules/ws\
 webLauncher)

sep = ////////////////////////////////////////////\n

js_files = $(sort $(wildcard etc/*.js) $(built_js_files))
css_files = $(sort $(wildcard etc/*.css) $(built_css_files))


# Stuff we install in etc/
etc_files = $(js_files) $(css_files) $(keys)\
 $(wildcard etc/*.htm etc/*.png etc/*.jpg)

BIN = $(PREFIX)/bin
ETC = $(PREFIX)/etc



build: $(built_files)

# everyone's favorite build tool is cat
webLauncher: $(webLauncher_sources)
	echo "$(shabang)" > $@
	echo "// This is a generated file" >> $@
	for i in $^ ; do echo "$(sep)// START $$i" >> $@; cat $$i >> $@; done
	chmod 755 $@

# We npm install a copy of ws
node_modules/ws:
	npm install $(WS)

# ref: http://superuser.com/questions/226192/openssl-without-prompt
$(keys):
	openssl req\
 -new\
 -nodes\
 -x509\
 -newkey rsa:2048\
 -keyout etc/key.pem\
 -subj "/C=US/ST=Denial/L=Bleaksburg/O=Dis/CN=$(hostname)" \
 -out etc/cert.pem\
 -days 36500

%.js: %.jsp
	echo "// This is a generated file" > $@
	$(jscompress) $^ >> $@
%.css: %.cs
	echo "/* This is a generated file */" > $@
	$(csscompress) $^ >> $@
mkdirs:
	rm -rf $(ETC) $(BIN) && mkdir -p $(ETC) $(BIN)

install: mkdirs build
	cp  -r $(etc_files) $(ETC)/
	cp webLauncher $(BIN)/
	cp -r node_modules/ $(BIN)/

clean:
	rm -rf node_modules/[a-z]* $(built_files) package-lock.json

distclean cleaner: clean
	rm -f config.make

