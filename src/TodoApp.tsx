import { useState, useEffect } from "react";
import { Task, PomodoroSession } from "./database";
import { PomodoroTimer } from "./components/PomodoroTimer";
import { TaskList } from "./components/TaskList";
import { AddTaskForm } from "./components/AddTaskForm";

interface WebSocketMessage {
  type: string;
  task?: Task;
  session?: PomodoroSession;
  id?: string;
  day?: string;
  taskIds?: string[];
}

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function TodoApp() {
  const [tasks, setTasks] = useState<{ [key: string]: Task[] }>({});
  const [loading, setLoading] = useState(true);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [selectedDay, setSelectedDay] = useState<string>("monday");

  useEffect(() => {
    // Initialize WebSocket connection
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const websocket = new WebSocket(`${protocol}//${window.location.host}/ws`);
    
    websocket.onopen = () => {
      console.log('WebSocket connected');
      setWs(websocket);
    };

    websocket.onmessage = (event) => {
      const message: WebSocketMessage = JSON.parse(event.data);
      handleWebSocketMessage(message);
    };

    websocket.onclose = () => {
      console.log('WebSocket disconnected');
      setWs(null);
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      websocket.close();
    };
  }, []);

  useEffect(() => {
    fetchAllTasks();
  }, []);

  const fetchAllTasks = async () => {
    try {
      const response = await fetch('/api/tasks');
      const data = await response.json();
      
      // Group tasks by day
      const tasksByDay: { [key: string]: Task[] } = {};
      DAYS.forEach(day => {
        tasksByDay[day] = data.tasks.filter((task: Task) => task.day === day);
      });
      
      setTasks(tasksByDay);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWebSocketMessage = (message: WebSocketMessage) => {
    switch (message.type) {
      case 'task_created':
        if (message.task) {
          setTasks(prev => ({
            ...prev,
            [message.task!.day]: [...(prev[message.task!.day] || []), message.task!]
          }));
        }
        break;
      case 'task_updated':
        if (message.task) {
          setTasks(prev => {
            const newTasks = { ...prev };
            DAYS.forEach(day => {
              newTasks[day] = newTasks[day]?.map(task => 
                task.id === message.task!.id ? message.task! : task
              ) || [];
            });
            return newTasks;
          });
        }
        break;
      case 'task_deleted':
        if (message.id) {
          setTasks(prev => {
            const newTasks = { ...prev };
            DAYS.forEach(day => {
              newTasks[day] = newTasks[day]?.filter(task => task.id !== message.id) || [];
            });
            return newTasks;
          });
        }
        break;
      case 'tasks_reordered':
        if (message.day && message.taskIds) {
          setTasks(prev => ({
            ...prev,
            [message.day!]: message.taskIds!.map(id => 
              prev[message.day!]?.find(task => task.id === id)!
            ).filter(Boolean)
          }));
        }
        break;
    }
  };

  const addTask = async (title: string, description: string, day: string) => {
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, day }),
      });

      if (!response.ok) {
        throw new Error('Failed to create task');
      }

      // Task will be added via WebSocket message
    } catch (error) {
      console.error('Error adding task:', error);
      // Fallback: refresh tasks
      fetchAllTasks();
    }
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update task');
      }

      // Task will be updated via WebSocket message
    } catch (error) {
      console.error('Error updating task:', error);
      // Fallback: refresh tasks
      fetchAllTasks();
    }
  };

  const deleteTask = async (id: string) => {
    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete task');
      }

      // Task will be deleted via WebSocket message
    } catch (error) {
      console.error('Error deleting task:', error);
      // Fallback: refresh tasks
      fetchAllTasks();
    }
  };

  const reorderTasks = async (day: string, taskIds: string[]) => {
    try {
      const response = await fetch('/api/tasks/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ day, taskIds }),
      });

      if (!response.ok) {
        throw new Error('Failed to reorder tasks');
      }

      // Tasks will be reordered via WebSocket message
    } catch (error) {
      console.error('Error reordering tasks:', error);
      // Fallback: refresh tasks
      fetchAllTasks();
    }
  };

  if (loading) {
    return <div className="loading">Loading tasks...</div>;
  }

  return (
    <div className="todo-app">
      <header className="app-header">
        <h1>Weekly Todo Manager</h1>
        <PomodoroTimer />
        <div className="connection-status">
          {ws ? (
            <span className="connected">🟢 Connected</span>
          ) : (
            <span className="disconnected">🔴 Disconnected</span>
          )}
        </div>
      </header>

      <main className="app-main">
        <div className="day-selector">
          {DAYS.map((day, index) => (
            <button
              key={day}
              className={`day-tab ${selectedDay === day ? 'active' : ''}`}
              onClick={() => setSelectedDay(day)}
            >
              {DAY_NAMES[index]}
              {tasks[day]?.length > 0 && (
                <span className="task-count">{tasks[day].length}</span>
              )}
            </button>
          ))}
        </div>

        <div className="day-content">
          <div className="day-header">
            <h2>{DAY_NAMES[DAYS.indexOf(selectedDay)]}</h2>
            <AddTaskForm 
              onAdd={(title, description) => addTask(title, description, selectedDay)} 
            />
          </div>

          <TaskList
            tasks={tasks[selectedDay] || []}
            onUpdate={updateTask}
            onDelete={deleteTask}
            onReorder={(taskIds) => reorderTasks(selectedDay, taskIds)}
          />
        </div>
      </main>
    </div>
  );
}