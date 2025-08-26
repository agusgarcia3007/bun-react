import { Database } from "bun:sqlite";

export interface Task {
  id: string;
  title: string;
  description?: string;
  day: string; // 'monday', 'tuesday', etc.
  priority: number; // 1 (highest) to n (lowest)
  completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface PomodoroSession {
  id: string;
  task_id: string | null;
  duration: number; // in seconds
  started_at: string;
  completed_at: string | null;
  type: 'work' | 'short_break' | 'long_break';
}

export interface TimerPreferences {
  id: string;
  work_duration: number;
  short_break_duration: number;
  long_break_duration: number;
  sessions_until_long_break: number;
  auto_start_breaks: boolean;
  auto_start_pomodoros: boolean;
  notifications_enabled: boolean;
  updated_at: string;
}

class TodoDatabase {
  private db: Database;

  constructor(filename = "todos.db") {
    this.db = new Database(filename);
    this.init();
  }

  private init() {
    // Enable WAL mode for better performance
    this.db.exec("PRAGMA journal_mode = WAL;");
    
    // Create tables
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        day TEXT NOT NULL,
        priority INTEGER NOT NULL DEFAULT 1,
        completed BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS pomodoro_sessions (
        id TEXT PRIMARY KEY,
        task_id TEXT,
        duration INTEGER NOT NULL,
        started_at TEXT NOT NULL,
        completed_at TEXT,
        type TEXT NOT NULL,
        FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE SET NULL
      );
    `);

    // Create indexes for better performance
    this.db.exec("CREATE INDEX IF NOT EXISTS idx_tasks_day ON tasks (day);");
    this.db.exec("CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks (priority);");
    this.db.exec("CREATE INDEX IF NOT EXISTS idx_pomodoro_task ON pomodoro_sessions (task_id);");
  }

  // Task operations
  createTask(task: Omit<Task, "id" | "created_at" | "updated_at">): Task {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const newTask: Task = {
      ...task,
      id,
      created_at: now,
      updated_at: now,
    };

    const query = this.db.query(`
      INSERT INTO tasks (id, title, description, day, priority, completed, created_at, updated_at)
      VALUES ($id, $title, $description, $day, $priority, $completed, $created_at, $updated_at)
    `);

    query.run({
      $id: newTask.id,
      $title: newTask.title,
      $description: newTask.description,
      $day: newTask.day,
      $priority: newTask.priority,
      $completed: newTask.completed,
      $created_at: newTask.created_at,
      $updated_at: newTask.updated_at,
    });

    return newTask;
  }

  getTasksByDay(day: string): Task[] {
    const query = this.db.query("SELECT * FROM tasks WHERE day = $day ORDER BY priority ASC, created_at ASC");
    return query.all({ $day: day }) as Task[];
  }

  getAllTasks(): Task[] {
    const query = this.db.query("SELECT * FROM tasks ORDER BY day, priority ASC, created_at ASC");
    return query.all() as Task[];
  }

  updateTask(id: string, updates: Partial<Omit<Task, "id" | "created_at">>): Task | null {
    const updated_at = new Date().toISOString();
    const fields = Object.keys(updates).map(key => `${key} = $${key}`).join(", ");
    
    if (fields.length === 0) {
      return this.getTask(id);
    }

    const query = this.db.query(`
      UPDATE tasks SET ${fields}, updated_at = $updated_at WHERE id = $id
    `);

    const params = {
      $id: id,
      $updated_at: updated_at,
      ...Object.fromEntries(Object.entries(updates).map(([key, value]) => [`$${key}`, value]))
    };

    query.run(params);
    return this.getTask(id);
  }

  deleteTask(id: string): boolean {
    const query = this.db.query("DELETE FROM tasks WHERE id = $id");
    const result = query.run({ $id: id });
    return result.changes > 0;
  }

  getTask(id: string): Task | null {
    const query = this.db.query("SELECT * FROM tasks WHERE id = $id");
    return query.get({ $id: id }) as Task | null;
  }

  reorderTasks(day: string, taskIds: string[]) {
    const transaction = this.db.transaction((ids: string[]) => {
      ids.forEach((id, index) => {
        const query = this.db.query("UPDATE tasks SET priority = $priority WHERE id = $id");
        query.run({ $priority: index + 1, $id: id });
      });
    });

    transaction(taskIds);
  }

  // Pomodoro operations
  createPomodoroSession(session: Omit<PomodoroSession, "id">): PomodoroSession {
    const id = crypto.randomUUID();
    const newSession: PomodoroSession = { ...session, id };

    const query = this.db.query(`
      INSERT INTO pomodoro_sessions (id, task_id, duration, started_at, completed_at, type)
      VALUES ($id, $task_id, $duration, $started_at, $completed_at, $type)
    `);

    query.run({
      $id: newSession.id,
      $task_id: newSession.task_id,
      $duration: newSession.duration,
      $started_at: newSession.started_at,
      $completed_at: newSession.completed_at,
      $type: newSession.type,
    });

    return newSession;
  }

  completePomodoroSession(id: string): PomodoroSession | null {
    const completed_at = new Date().toISOString();
    const query = this.db.query("UPDATE pomodoro_sessions SET completed_at = $completed_at WHERE id = $id");
    query.run({ $id: id, $completed_at: completed_at });
    
    const getQuery = this.db.query("SELECT * FROM pomodoro_sessions WHERE id = $id");
    return getQuery.get({ $id: id }) as PomodoroSession | null;
  }

  getPomodoroSessions(taskId?: string): PomodoroSession[] {
    if (taskId) {
      const query = this.db.query("SELECT * FROM pomodoro_sessions WHERE task_id = $task_id ORDER BY started_at DESC");
      return query.all({ $task_id: taskId }) as PomodoroSession[];
    }
    
    const query = this.db.query("SELECT * FROM pomodoro_sessions ORDER BY started_at DESC");
    return query.all() as PomodoroSession[];
  }

  close() {
    this.db.close();
  }
}

// Create a singleton instance
export const db = new TodoDatabase();