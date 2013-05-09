package main

import "net/http"
import "todo"
import "log"
import "labix.org/v2/mgo"
import "os"

func main() {
	// read go path
	gopath := os.Getenv("GOPATH")
	if gopath == "" {
		panic("unable to read go path from env")
	}
	// connect to mongo
	session, err := mgo.Dial("localhost")
	if err != nil {
		panic(err)
	}
	defer session.Close()
	session.SetMode(mgo.Monotonic, true)
	todo.InitSession(session)

	// Make a new Broker instance
	broker := todo.NewBroker()
	// Start processing events
	broker.Start()

	// Add a REST handler for /todos GET POST and DELETE
	todo.AddRestEndpoint(broker, session)

	// Add a handler for static assets
	http.Handle("/static/",
		http.FileServer(http.Dir(gopath)))
	err = http.ListenAndServe(":9080", nil)
	if err != nil {
		log.Fatal("ListenAndServe: ", err)
	}
}
