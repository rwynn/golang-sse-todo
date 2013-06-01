$(document).ready(function() {
	var ViewController = function() {
		var self = this;
		self.evtSource = new EventSource("/todos");
		self.taskIndex = {};
		self.task = ko.observable();
		self.todos = ko.observableArray();
		self.markAll = ko.observable(false);
		self.view = ko.observable();
		self.init = function() {
			self.evtSource.onmessage = self.onmessage;
			self.addListeners();
		};
		self.doView = function() {
			self.view(location.hash);
		};
		self.viewingActive = ko.computed(function() {
			return self.view() == "#/active";
		});
		self.viewingCompleted = ko.computed(function() {
			return self.view() == "#/completed";
		});
		self.viewingAll = ko.computed(function() {
			return self.viewingActive() == false 
				&& self.viewingCompleted() == false;	
		});
		self.todosView = ko.computed(function() {
			if (self.view() == "#/active") {
				return ko.utils.arrayFilter(self.todos(), function(todo) {
					return todo.done() == false;
				});
			} else if (self.view() == "#/completed") {
				return ko.utils.arrayFilter(self.todos(), function(todo) {
					return todo.done();
				});
			} else {
				return self.todos();
			}
		});
		self.onmessage = function(e) {
			if (e.lastEventId == "delete") {
				self.removeTodo(e.data);	
			} else if (e.lastEventId == "update") {
				self.processTodo(JSON.parse(e.data));
			}
			self.markAll(self.allDone());
		};
		self.removeTodo = function(todoId) {
			self.todos.remove(function(todo) {
				return todo.guid == todoId;
			});
			delete self.taskIndex[todoId];
		};
		self.hasTodos = ko.computed(function() {
			return self.todos().length > 0;
		});
		self.numLeft = ko.computed(function() {
			var left = 0;
			$.each(self.todos(), function(index, todo) {
				if (todo.done() == false) {
					left += 1;	
				}
			});
			return left;
		});	
		self.numDone = ko.computed(function() {
			return self.todos().length - self.numLeft();
		});
		self.allDone = ko.computed(function() {
			return self.hasTodos() && self.numLeft() == 0;	
		});
		self.someDone = ko.computed(function() {
			return self.numDone() > 0;	
		});
		self.markAllTasks = function() {
			$.each(self.todos(), function(index, todo) {
				todo.done(self.markAll());
				self.markDone.call(todo);
			});
			return true;
		};
		self.doEdit = function() {
			this.editing(true);
			return true;
		};
		self.todoChanged = function() {
			self.remoteUpdate(
				{	task: this.task(), 
					guid: this.guid, 
					done: this.done()
				}
			);
			this.editing(false);
			return true;
		};
		self.stopEditing = function() {
			this.editing(false);
			return true;
		};
		self.markDone = function() {
			self.remoteUpdate(
			{
				"task" : this.task(),
				"done" : this.done(),
				"guid" : this.guid 
			});
			return true;
		};
		self.processTodo = function(todo) {
			if (todo.guid in self.taskIndex) {
				self.taskIndex[todo.guid].task(todo.task);
				self.taskIndex[todo.guid].done(todo.done);
			} else {
				var newTodo = {
					"editing": ko.observable(false),
					"task" : ko.observable(todo.task),
					"done" : ko.observable(todo.done),
					"guid" : todo.guid 
				};
				self.taskIndex[todo.guid] = newTodo;
				self.todos.push(newTodo);
			}
		};
		self.cancelTask = function() {
			self.remoteDelete([this.guid]);
		};
		self.clearTasks = function() {
			var done = [];
			$.each(self.todos(), function(index, todo) {
				if (todo.done()) {
					done.push(todo.guid);
				}
			});
			self.remoteDelete(done);
		};
		self.remoteDelete = function(data) {
			$.ajax({
				type: "DELETE",
				url: "/todos",
				data: JSON.stringify(data)
			});
		};
		self.remoteUpdate = function(data, success) {
			$.ajax({
				type: "POST",
				url: "/todos",
				data: JSON.stringify(data),
				contentType: "application/json",
				success: success	
			});
		};
		self.updateTask = function(val, success) {
			if (!val && !(self.guid() in self.taskIndex)) { 
				return;
			}
			self.remoteUpdate(
				{	task: val, 
					guid: self.guid(), 
					done: false,
				}, success
			);
		};
		self.completeTask = function() {
			self.guid(self.genGuid());
			self.task("");
		}
		self.genGuid = function() {
			var pat = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
			return pat.replace(/[xy]/g, function(c) {
				var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
				return v.toString(16);
			});
		}
		self.guid = ko.observable(self.genGuid());
		self.addListeners = function() {
			$("#new-todo").keyup(function() { 
				self.updateTask($(this).val()); 
			}).keypress(function(e) {
				if (e.keyCode == 13) {
					self.updateTask($(this).val(), 
					function() { self.completeTask()});
				}
			});
			window.onhashchange = self.doView;
		};
	};
	var vc = new ViewController();
	ko.applyBindings(vc);
	vc.init();
});
