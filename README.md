golang-sse-todo
===============

golang server send events (sse) example

This example was inspired by code at https://github.com/kljensen/golang-html5-sse-example and uses 
knockout.js and foundation for the UI.

### Getting Started ###

Install git and the go runtime

	sudo apt-get install git golang

Clone this repository to your local filesystem

	git clone https://github.com/rwynn/golang-sse-todo.git

Run the server

	cd golang-sse-todo
	go run todo.go

Open 2 instances of your browser side by side (your browser should support html5 EventSource). Navigate
each browser to http://localhost:9080/static/todo.html

Start typing todo items in one of the browser instances.  The todo should be listed and dynamically updated
in both browser instances.  When you are done editing your todo click the "Submit Task" button.  This will
allow you to start entering a new task.  

Stop the server by pressing Control-c in the terminal you ran go in.

