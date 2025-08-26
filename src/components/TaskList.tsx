import { useState } from "react";
import { Task } from "../database";
import { TaskItem } from "./TaskItem";

interface TaskListProps {
  tasks: Task[];
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onDelete: (id: string) => void;
  onReorder: (taskIds: string[]) => void;
}

export function TaskList({ tasks, onUpdate, onDelete, onReorder }: TaskListProps) {
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTask(taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (!draggedTask) return;

    const dragIndex = tasks.findIndex(task => task.id === draggedTask);
    if (dragIndex === -1 || dragIndex === dropIndex) {
      setDraggedTask(null);
      setDragOverIndex(null);
      return;
    }

    // Create new order
    const newTasks = [...tasks];
    const [draggedItem] = newTasks.splice(dragIndex, 1);
    newTasks.splice(dropIndex, 0, draggedItem);

    // Update order
    onReorder(newTasks.map(task => task.id));

    setDraggedTask(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
    setDragOverIndex(null);
  };

  if (tasks.length === 0) {
    return (
      <div className="empty-state">
        <p>No tasks for this day yet.</p>
        <p>Add your first task above!</p>
      </div>
    );
  }

  return (
    <div className="task-list">
      {tasks.map((task, index) => (
        <div
          key={task.id}
          className={`task-item-container ${dragOverIndex === index ? 'drag-over' : ''}`}
          onDragOver={(e) => handleDragOver(e, index)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, index)}
        >
          <TaskItem
            task={task}
            onUpdate={onUpdate}
            onDelete={onDelete}
            isDragging={draggedTask === task.id}
            onDragStart={(e) => handleDragStart(e, task.id)}
            onDragEnd={handleDragEnd}
          />
        </div>
      ))}
    </div>
  );
}