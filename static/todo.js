$(document).ready(function() {

	var ViewController = function() {
		var self = this;
		self.evtSource = new EventSource("/todos");
		self.taskIndex = {};
		self.task = ko.observable();
		self.todos = ko.observableArray();
		self.markAll = ko.observable(false);
		self.init = function() {
			self.evtSource.onmessage = self.onmessage;
			self.addListeners();
		};
		self.onmessage = function(e) {
			if (e.lastEventId == "delete") {
				self.removeTodo(e.data);	
			} else if (e.lastEventId == "update") {
				self.processTodo(JSON.parse(e.data));
			}
		};
		self.removeTodo = function(todoId) {
			self.todos.remove(function(todo) {
				return todo.guid == todoId; 
			});
		};
		self.numLeft = ko.computed(function() {
			var left = 0;
			$.each(self.todos(), function(index, todo) {
				if (todo.done() == false) {
					left += 1;	
				}
			});
			return left;
		});	
		self.allDone = ko.computed(function() {
			var allDone = true;
			$.each(self.todos(), function(index, todo) {
				if (todo.done() == false) {
					allDone = false;
					return false;
				}
			});
			return allDone;	
		});
		self.someDone = ko.computed(function() {
			var someDone = false;
			$.each(self.todos(), function(index, todo) {
				if (todo.done()) {
					someDone = true;
					return false;
				}
			});
			return someDone;	
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
			} 
			else {
				var newTodo = {
					"editing": ko.observable(false),
					"task" : ko.observable(todo.task),
					"done" : ko.observable(todo.done),
					"guid" : todo.guid };
				newTodo.task.subscribe(function(taskVal) {
					newTodo.editing(false);
					self.remoteUpdate(
						{	task: taskVal, 
							guid: newTodo.guid, 
							done: newTodo.done()
						}
					);
				});
				self.taskIndex[todo.guid] = newTodo;
				self.todos.push(newTodo);
			}
			self.markAll(self.allDone());
		};
		self.clearTasks = function() {
			var done = [];
			$.each(self.todos(), function(index, todo) {
				if (todo.done()) {
					done.push(todo.guid);
				}
			});
			$.ajax({
				type: "DELETE",
				url: "/todos",
				data: JSON.stringify(done),
				success: function() {
					self.todos.remove(function(todo) {
						return todo.done();
					});	
				}
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
					done: false
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
			$("#task").keyup(function() { 
				self.updateTask($(this).val()); 
			}).keypress(function(e) {
				if (e.keyCode == 13) {
					self.updateTask($(this).val(), 
					function() { self.completeTask()});
				}
			});
		};
	};

	var vc = new ViewController();
	ko.applyBindings(vc);
	vc.init();

});
