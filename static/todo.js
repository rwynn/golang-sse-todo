$(document).ready(function() {
	var evtSource = new EventSource("/todos");

	var ViewController = function() {
		var self = this;
		self.taskIndex = {};
		self.task = ko.observable();
		self.todos = ko.observableArray();
		self.markAll = ko.observable(false);
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
			if (self.markAll()) {
				$.each(self.todos(), function(index, todo) {
					todo.done(true);
					self.markDone.call(todo);
				});
			}
			return true;
		};
		self.markDone = function() {
			self.markAll(self.allDone());
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
				self.taskIndex[todo.guid] = {
					"task" : ko.observable(todo.task),
					"done" : ko.observable(todo.done),
					"guid" : todo.guid }
				self.todos.push(self.taskIndex[todo.guid]);
			}
		};
		self.clearTasks = function() {
			$.ajax({
				type: "DELETE",
				url: "/todos",
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
			return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, 
				function(c) {
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
	vc.addListeners();
	ko.applyBindings(vc);

	evtSource.onmessage = function(e) {
		vc.processTodo(JSON.parse(e.data));
	}

});
