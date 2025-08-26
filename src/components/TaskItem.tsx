import { useState } from "react";
import { Task } from "../database";

interface TaskItemProps {
  task: Task;
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onDelete: (id: string) => void;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}

export function TaskItem({ 
  task, 
  onUpdate, 
  onDelete, 
  isDragging, 
  onDragStart, 
  onDragEnd 
}: TaskItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDescription, setEditDescription] = useState(task.description || "");

  const handleToggleComplete = () => {
    onUpdate(task.id, { completed: !task.completed });
  };

  const handleStartEdit = () => {
    setIsEditing(true);
    setEditTitle(task.title);
    setEditDescription(task.description || "");
  };

  const handleSaveEdit = () => {
    if (editTitle.trim()) {
      onUpdate(task.id, {
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
      });
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditTitle(task.title);
    setEditDescription(task.description || "");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div
      className={`task-item ${task.completed ? 'completed' : ''} ${isDragging ? 'dragging' : ''}`}
      draggable={!isEditing}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="drag-handle" title="Drag to reorder">
        ⋮⋮
      </div>

      <div className="task-content">
        <div className="task-header">
          <input
            type="checkbox"
            checked={task.completed}
            onChange={handleToggleComplete}
            className="task-checkbox"
          />
          
          {isEditing ? (
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={handleKeyPress}
              onBlur={handleSaveEdit}
              className="task-title-edit"
              autoFocus
            />
          ) : (
            <h3 className="task-title" onClick={handleStartEdit}>
              {task.title}
            </h3>
          )}

          <div className="task-priority">
            Priority: {task.priority}
          </div>
        </div>

        {(task.description || isEditing) && (
          <div className="task-description">
            {isEditing ? (
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Add a description..."
                className="task-description-edit"
                rows={2}
              />
            ) : (
              <p onClick={handleStartEdit}>{task.description}</p>
            )}
          </div>
        )}

        <div className="task-meta">
          <span className="task-date">
            Created: {formatDate(task.created_at)}
          </span>
          {task.updated_at !== task.created_at && (
            <span className="task-date">
              Updated: {formatDate(task.updated_at)}
            </span>
          )}
        </div>
      </div>

      <div className="task-actions">
        {isEditing ? (
          <>
            <button
              className="btn-small btn-primary"
              onClick={handleSaveEdit}
              title="Save changes"
            >
              ✓
            </button>
            <button
              className="btn-small btn-secondary"
              onClick={handleCancelEdit}
              title="Cancel editing"
            >
              ✕
            </button>
          </>
        ) : (
          <>
            <button
              className="btn-small btn-secondary"
              onClick={handleStartEdit}
              title="Edit task"
            >
              ✎
            </button>
            <button
              className="btn-small btn-danger"
              onClick={() => onDelete(task.id)}
              title="Delete task"
            >
              🗑
            </button>
          </>
        )}
      </div>
    </div>
  );
}