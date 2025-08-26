import { useState } from "react";

interface AddTaskFormProps {
  onAdd: (title: string, description: string) => void;
}

export function AddTaskForm({ onAdd }: AddTaskFormProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) return;

    onAdd(title.trim(), description.trim());
    
    // Reset form
    setTitle("");
    setDescription("");
    setIsExpanded(false);
  };

  const handleCancel = () => {
    setTitle("");
    setDescription("");
    setIsExpanded(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit(e as any);
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (!isExpanded) {
    return (
      <button 
        className="add-task-button"
        onClick={() => setIsExpanded(true)}
      >
        + Add Task
      </button>
    );
  }

  return (
    <form className="add-task-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <input
          type="text"
          placeholder="Enter task title..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyPress}
          className="task-title-input"
          autoFocus
          required
        />
      </div>

      <div className="form-group">
        <textarea
          placeholder="Add a description (optional)..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={handleKeyPress}
          className="task-description-input"
          rows={3}
        />
      </div>

      <div className="form-actions">
        <button type="submit" className="btn-primary">
          Add Task
        </button>
        <button type="button" className="btn-secondary" onClick={handleCancel}>
          Cancel
        </button>
        <small className="shortcut-hint">
          Press Ctrl/Cmd+Enter to submit, Escape to cancel
        </small>
      </div>
    </form>
  );
}