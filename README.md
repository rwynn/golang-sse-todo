golang server send events (sse) todo example
===============

<img style="float:right" src="//raw.github.com/rwynn/golang-sse-todo/master/static/example/todo-screen.png"/>

This example was inspired by [golang-html5-sse-example](https://github.com/kljensen/golang-html5-sse-example). It uses [knockout.js](http://knockoutjs.com) and [foundation](http://foundation.zurb.com/) for the UI. The UX is heavily inspired by [backbone todos](http://backbonejs.org/docs/todos.html).

### Up and Running ###

#### Install Dependencies ####
Install git and the go runtime

	sudo apt-get install git golang

Install mongodb.  Packages and instructions for multiple OSes available at http://www.mongodb.org/downloads 

Install mgo, the mongodb driver for golang

	sudo go get labix.org/v2/mgo

Clone this repository to your local filesystem

	git clone https://github.com/rwynn/golang-sse-todo.git

#### Start the Servers ####
Start the mongo server if it's not already running

	sudo mongod -f /etc/mongodb.conf

Run the server

	export GOPATH=/path/to/golang-sse-todo
	cd $GOPATH 
	go run todo.go

#### Create some Todos ####
Open 2 instances of your browser side by side (your browser should support html5 EventSource). Navigate
each browser to http://localhost:9080/static/todo.html

Start typing todo items in one of the browser instances.  The todo should be listed and dynamically updated
in both browser instances.  Pressing return/enter will allow you to start entering a new todo.  

Stop the server by pressing Control-c in the terminal.

