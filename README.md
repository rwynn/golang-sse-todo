golang server sent events (sse) todo example
===============

This example was inspired by [golang-html5-sse-example](https://github.com/kljensen/golang-html5-sse-example) and [TodoMVC](http://todomvc.com/). It uses [knockout.js](http://knockoutjs.com) for the UI and [mongodb](http://www.mongodb.org/) for storage.  It's a little different than the other TodoMVC examples in that it adds SSE capabilities to synchronize the todo list. 

<img src="https://raw.github.com/rwynn/golang-sse-todo/master/static/example/todo-screen.png"/>

### Up and Running ###

#### Install Dependencies ####

Install [golang](http://golang.org/doc/install)

Install git and bazaar

	sudo apt-get install git bzr

Install [mongodb](http://www.mongodb.org/downloads)

Install [mgo](https://labix.org/mgo), the mongodb driver for golang

	mkdir -p ~/Go/vendor
	export GOPATH=~/Go/vendor
	go get gopkg.in/mgo.v2

Clone this repository to your local filesystem

	git clone https://github.com/rwynn/golang-sse-todo.git

#### Start the Servers ####
Start the mongo server if it's not already running

	sudo mongod -f /etc/mongodb.conf

Run the Go server (assumes that $GOPATH already includes ~/Go/vendor to find mgo)

	cd /path/to/golang-sse-todo
	export GOPATH=$GOPATH:`pwd`
	go run todo.go

#### Create some Todos ####
Open 2 instances of your browser side by side (your browser should support html5 EventSource). Navigate
each browser to http://localhost:9080/static/

Start typing todo items in one of the browser instances.  The todo should be listed and dynamically updated
in both browser instances.  Pressing return/enter will allow you to start entering a new todo.  

Stop the Go server by pressing Control-c in the terminal.

