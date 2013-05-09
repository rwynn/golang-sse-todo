package todo

import "testing"
import "net/http"
import "strings"

func TestValidatesJsonPost(t *testing.T) {
	r := new (http.Request)
	r.Method = "POST"
	r.Header = make(http.Header)
	r.Header.Set("Content-Type", "application/json")
	if WasJsonPost(r) == false {
		t.Error("Expecting JSON post true");
	}
	r.Method = "GET"
	if WasJsonPost(r) {
		t.Error("Expecting JSON post false");
	}
	r.Method = "POST"
	r.Header.Set("Content-Type", "text/html")
	if WasJsonPost(r) {
		t.Error("Expecting JSON post false")
	}
}

func TestReadsJsonTodo(t *testing.T) {
	var todo = new(Todo)
	reader := strings.NewReader(
		"{\"done\": true, \"task\": \"get milk\",\"guid\": \"123\"}")
	error := todo.ReadJson(reader)
	if error != nil {
		t.Error("Expecting JSON read ok")
	}
	if todo.Task != "get milk" {
		t.Error("Expecting set property Task")
	}
	if todo.Guid != "123" {
		t.Error("Expecting set property Guid")
	}
	if todo.Done == false {
		t.Error("Expecting set property Done")
	}
}
