package todo

import "net/http"
import "labix.org/v2/mgo"
import "labix.org/v2/mgo/bson"
import "io"
import "encoding/json"
import "fmt"
import "bytes"
import "log"
import "strings"

type Message struct {
	Id string
	Data string
}

type Broker struct {
	// Create a map of clients, the keys of the map are the channels
	// over which we can push messages to attached clients. (The values
	// are just booleans and are meaningless.)
	//
	clients map[chan *Message]bool

	// Channel into which new clients can be pushed
	//
	newClients chan chan *Message

	// Channel into which disconnected clients should be pushed
	//
	defunctClients chan chan *Message

	// Channel into which messages are pushed to be broadcast out
	// to attahed clients.
	//
	messages chan *Message
}

type RequestFunc func(http.ResponseWriter, *http.Request)

type Guard func(*http.Request) bool

type Handler struct {
	Body  RequestFunc
	Check Guard
	Next  *Handler
}

func WasPost(req *http.Request) bool {
	return req.Method == "POST"
}

func WasJson(req *http.Request) bool {
	return strings.HasPrefix(req.Header.Get("Content-Type"),
		"application/json")
}

func WasJsonPost(req *http.Request) bool {
	return WasPost(req) && WasJson(req)
}

func (this *Handler) Execute(resp http.ResponseWriter, req *http.Request) {
	if this.Check(req) {
		if this.Next != nil {
			this.Next.Execute(resp, req)
		} else {
			this.Body(resp, req)
		}
	} else {
		http.Error(resp, "Bad Request", http.StatusBadRequest)
	}
}

type RestConfig struct {
	Get RequestFunc
	Post RequestFunc
	Delete RequestFunc
}

type Todo struct {
	Task string `json:"task"`
	Guid string `json:"guid"`
	Done bool `json:"done"`
}


func ReadJson(from io.Reader, to interface{}) error {
	dec := json.NewDecoder(from)
	if err := dec.Decode(to); err != nil {
		log.Println(err)
		return err
	}
	return nil
}

func WriteJson(to io.Writer, from interface{}) error {
	enc := json.NewEncoder(to)
	if err := enc.Encode(from); err != nil {
		log.Println(err)
		return err
	}
	return nil
}

func (this *Todo) ReadJson(reader io.Reader) error {
	return ReadJson(reader, this)
}

func (this *Todo) WriteJson(writer io.Writer) error {
	return WriteJson(writer, this)
}

func (this *Todo) ToJsonString() string {
	var buf bytes.Buffer
	result, _ := json.Marshal(this)
	buf.Write(result)
	return buf.String()
}

func TodoCollection(session *mgo.Session) *mgo.Collection {
	collection := session.DB("todos").C("todos")
	return collection
}

func InitSession(session *mgo.Session) {
	TodoCollection(session).EnsureIndexKey("guid")
}

func SaveTodo(resp http.ResponseWriter, req *http.Request,
		b *Broker, session *mgo.Session) {
	defer session.Close()
	var todo = new(Todo)
	if err := todo.ReadJson(req.Body); err != nil {
		http.Error(resp, "Bad Request", http.StatusBadRequest)
	} else {
		collection := TodoCollection(session)
		collection.Upsert(bson.M{"guid": todo.Guid}, todo)
		message := &Message{"update", todo.ToJsonString()}
		b.messages <- message
	}
}

func DeleteTodos(resp http.ResponseWriter, req *http.Request,
		b *Broker, session *mgo.Session) {
	defer session.Close()
	var todos []string
	if ReadJson(req.Body, &todos) == nil {
		collection := TodoCollection(session)
		collection.RemoveAll(bson.M{"guid": bson.M{"$in": todos}})
		for _, todo := range todos {
			message := &Message{"delete", todo}
			b.messages <- message
		}
	}
}

func MakeTodoSaver(b *Broker, session *mgo.Session) RequestFunc {
	return func(resp http.ResponseWriter, req *http.Request) {
		SaveTodo(resp, req, b, session.Copy())
	}
}

func MakeTodosDeleter(b *Broker, session *mgo.Session) RequestFunc {
	return func(resp http.ResponseWriter, req *http.Request) {
		DeleteTodos(resp, req, b, session.Copy())
	}
}

func ProduceTodos(resp http.ResponseWriter, req *http.Request,
		b *Broker, session *mgo.Session) {
	f, ok := resp.(http.Flusher)
	if !ok {
		http.Error(resp, "Streaming unsupported!",
			http.StatusInternalServerError)
		return
	}
	// Create a new channel, over which the broker can
	// send this client messages.
	messageChan := make(chan *Message)
	// Add this client to the map of those that should
	// receive updates
	b.newClients <- messageChan
	// Queue existing todos from mongo in a go routine
	go QueueTodos(session, messageChan)
	// Remove this client from the map of attached clients
	// when `EventHandler` exits.
	defer func() {
		b.defunctClients <- messageChan
	}()
	resp.Header().Set("Content-Type", "text/event-stream")
	resp.Header().Set("Cache-Control", "no-cache")
	resp.Header().Set("Connection", "keep-alive")
	for {
		msg := <-messageChan
		fmt.Fprintf(resp, "id: %s\n", msg.Id)
		fmt.Fprintf(resp, "data: %s\n\n", msg.Data)
		f.Flush()
	}
}

func QueueTodos(session *mgo.Session, messageChan chan *Message ) {
	var todos []Todo
	defer session.Close()
	collection := TodoCollection(session)
	iter := collection.Find(nil).Iter()
	err := iter.All(&todos)
	if err != nil {
		return
	}
	for _, todo := range todos {
		message := &Message{"update", todo.ToJsonString()}
		messageChan <- message
	}
}

func MakeTodoProducer(b *Broker, session *mgo.Session) RequestFunc {
	return func(resp http.ResponseWriter, req *http.Request) {
		ProduceTodos(resp, req, b, session.Copy())
	}
}

func MakeRestEndpoint(config *RestConfig) RequestFunc {
	return func(resp http.ResponseWriter, req *http.Request) {
		if req.Method == "GET" {
			config.Get(resp, req)
			return
		} else if req.Method == "POST" {
			config.Post(resp, req)
			return
		} else if req.Method == "DELETE" {
			config.Delete(resp, req)
			return
		} else {
			http.NotFound(resp, req)
		}
	}
}

func HandlerFunc(h *Handler) RequestFunc {
	return func(resp http.ResponseWriter, req *http.Request) {
		h.Execute(resp, req)
	}
}

func (b *Broker) Start() {
	// Start a goroutine
	//
	go func() {
		// Loop endlessly
		//
		for {
			// Block until we receive from one of the
			// three following channels.
			select {
			case s := <-b.newClients:
				// There is a new client attached and we
				// want to start sending them messages.
				b.clients[s] = true
				log.Println("Added new client")
			case s := <-b.defunctClients:
				// A client has dettached and we want to
				// stop sending them messages.
				delete(b.clients, s)
				log.Println("Removed client")
			case msg := <-b.messages:
				// There is a new message to send. For each
				// attached client, push the new message
				// into the client's message channel.
				for s, _ := range b.clients {
					s <- msg
				}
				log.Printf("Broadcast message to %d clients", len(b.clients))
			}
		}
	}()
}

func NewBroker() *Broker {
	b := &Broker{
		make(map[chan *Message]bool),
		make(chan (chan *Message)),
		make(chan (chan *Message)),
		make(chan *Message),
	}
	return b;
}

func AddRestEndpoint(broker *Broker, session *mgo.Session) {
	saveTodo := new(Handler)
	saveTodo.Body = MakeTodoSaver(broker, session)
	saveTodo.Check = WasJson

	config := new (RestConfig)
	config.Get = MakeTodoProducer(broker, session)
	config.Post = HandlerFunc(saveTodo)
	config.Delete = MakeTodosDeleter(broker, session)
	http.HandleFunc("/todos", MakeRestEndpoint(config))
}
