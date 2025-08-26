import { serve } from "bun";
import index from "./index.html";
import { db } from "./database";
import type { Task } from "./database";

const server: ReturnType<typeof serve> = serve({
  port: 5173,
  routes: {
    // Serve index.html for all unmatched routes.
    "/*": index,

    // Task API endpoints
    "/api/tasks": {
      async GET(req) {
        try {
          const url = new URL(req.url);
          const day = url.searchParams.get("day");

          const tasks = day ? db.getTasksByDay(day) : db.getAllTasks();
          return Response.json({ tasks });
        } catch (error) {
          console.error("Error fetching tasks:", error);
          return Response.json(
            { error: "Failed to fetch tasks" },
            { status: 500 }
          );
        }
      },
      async POST(req) {
        try {
          const body = await req.json();
          const { title, description, day } = body;

          if (!title || !day) {
            return Response.json(
              { error: "Title and day are required" },
              { status: 400 }
            );
          }

          const task = db.createTask({
            title,
            description,
            day,
            priority: 1,
            completed: false,
          });

          // Broadcast to all connected WebSocket clients
          server.publish(
            "tasks",
            JSON.stringify({ type: "task_created", task })
          );

          return Response.json({ task });
        } catch (error) {
          console.error("Error creating task:", error);
          return Response.json(
            { error: "Failed to create task" },
            { status: 500 }
          );
        }
      },
    },

    "/api/tasks/:id": {
      async PUT(req) {
        try {
          const { id } = req.params;
          const body = await req.json();

          const task = db.updateTask(id, body);
          if (!task) {
            return Response.json({ error: "Task not found" }, { status: 404 });
          }

          // Broadcast to all connected WebSocket clients
          server.publish(
            "tasks",
            JSON.stringify({ type: "task_updated", task })
          );

          return Response.json({ task });
        } catch (error) {
          console.error("Error updating task:", error);
          return Response.json(
            { error: "Failed to update task" },
            { status: 500 }
          );
        }
      },
      async DELETE(req) {
        try {
          const { id } = req.params;
          const deleted = db.deleteTask(id);

          if (!deleted) {
            return Response.json({ error: "Task not found" }, { status: 404 });
          }

          // Broadcast to all connected WebSocket clients
          server.publish("tasks", JSON.stringify({ type: "task_deleted", id }));

          return Response.json({ success: true });
        } catch (error) {
          console.error("Error deleting task:", error);
          return Response.json(
            { error: "Failed to delete task" },
            { status: 500 }
          );
        }
      },
    },

    "/api/tasks/reorder": {
      async POST(req) {
        try {
          const body = await req.json();
          const { day, taskIds } = body;

          if (!day || !Array.isArray(taskIds)) {
            return Response.json(
              { error: "Day and taskIds array are required" },
              { status: 400 }
            );
          }

          db.reorderTasks(day, taskIds);

          // Broadcast to all connected WebSocket clients
          server.publish(
            "tasks",
            JSON.stringify({ type: "tasks_reordered", day, taskIds })
          );

          return Response.json({ success: true });
        } catch (error) {
          console.error("Error reordering tasks:", error);
          return Response.json(
            { error: "Failed to reorder tasks" },
            { status: 500 }
          );
        }
      },
    },

    // Pomodoro API endpoints
    "/api/pomodoro/sessions": {
      async GET(req) {
        try {
          const url = new URL(req.url);
          const taskId = url.searchParams.get("taskId") || undefined;

          const sessions = db.getPomodoroSessions(taskId);
          return Response.json({ sessions });
        } catch (error) {
          console.error("Error fetching pomodoro sessions:", error);
          return Response.json(
            { error: "Failed to fetch sessions" },
            { status: 500 }
          );
        }
      },
      async POST(req) {
        try {
          const body = await req.json();
          const { task_id, duration, type } = body;

          if (!duration || !type) {
            return Response.json(
              { error: "Duration and type are required" },
              { status: 400 }
            );
          }

          const session = db.createPomodoroSession({
            task_id: task_id || null,
            duration,
            started_at: new Date().toISOString(),
            completed_at: null,
            type,
          });

          // Broadcast to all connected WebSocket clients
          server.publish(
            "pomodoro",
            JSON.stringify({ type: "session_started", session })
          );

          return Response.json({ session });
        } catch (error) {
          console.error("Error creating pomodoro session:", error);
          return Response.json(
            { error: "Failed to create session" },
            { status: 500 }
          );
        }
      },
    },

    "/api/pomodoro/sessions/:id/complete": {
      async POST(req) {
        try {
          const { id } = req.params;
          const session = db.completePomodoroSession(id);

          if (!session) {
            return Response.json(
              { error: "Session not found" },
              { status: 404 }
            );
          }

          // Broadcast to all connected WebSocket clients
          server.publish(
            "pomodoro",
            JSON.stringify({ type: "session_completed", session })
          );

          return Response.json({ session });
        } catch (error) {
          console.error("Error completing pomodoro session:", error);
          return Response.json(
            { error: "Failed to complete session" },
            { status: 500 }
          );
        }
      },
    },

    // WebSocket endpoint
    "/ws": {
      async GET(req: Request): Promise<Response | undefined> {
        const upgraded: boolean = server.upgrade(req);
        return upgraded
          ? undefined
          : new Response("Upgrade failed", { status: 500 });
      },
    },
  },

  websocket: {
    open(ws) {
      console.log("WebSocket connected");
      ws.subscribe("tasks");
      ws.subscribe("pomodoro");
    },
    message(ws, message) {
      console.log("WebSocket message received:", message);
      // Handle incoming messages if needed
    },
    close(ws) {
      console.log("WebSocket disconnected");
      ws.unsubscribe("tasks");
      ws.unsubscribe("pomodoro");
    },
  },

  development: process.env.NODE_ENV !== "production" && {
    // Enable browser hot reloading in development
    hmr: true,

    // Echo console logs from the browser to the server
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
