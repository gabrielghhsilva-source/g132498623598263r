import { useCallback, useEffect, useState } from "react";
import { Task, TaskTemplate } from "@/lib/types";
import { AddTaskInput } from "@/lib/taskOperations";

const STORAGE_KEY = "task-templates";

function loadTemplates(): TaskTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function cleanName(text: string) {
  return (text || "Template").trim().slice(0, 48) || "Template";
}

export function templateToTaskInput(template: TaskTemplate, date?: string): AddTaskInput {
  return {
    text: template.text,
    dueDate: date,
    dueTime: template.dueTime,
    endTime: template.endTime,
    priority: template.priority || "none",
    tagIds: [...(template.tagIds || [])],
    subtasks: (template.subtasks || []).map(s => ({ text: s.text })),
    recurrence: template.recurrence,
  };
}

export function useTaskTemplateStore() {
  const [templates, setTemplates] = useState<TaskTemplate[]>(loadTemplates);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(templates)); } catch {}
  }, [templates]);

  const addTemplate = useCallback((template: Omit<TaskTemplate, "id" | "createdAt">) => {
    const item: TaskTemplate = {
      ...template,
      id: crypto.randomUUID(),
      name: cleanName(template.name || template.text),
      createdAt: new Date().toISOString(),
    };
    setTemplates(prev => [item, ...prev]);
    return item;
  }, []);

  const createFromTask = useCallback((areaId: string, task: Task) => {
    return addTemplate({
      name: cleanName(task.text),
      areaId,
      text: task.text,
      dueTime: task.dueTime,
      endTime: task.endTime,
      priority: task.priority || "none",
      tagIds: [...(task.tagIds || [])],
      subtasks: (task.subtasks || []).map(s => ({ text: s.text })),
      recurrence: task.recurrence,
    });
  }, [addTemplate]);

  const deleteTemplate = useCallback((id: string) => {
    setTemplates(prev => prev.filter(t => t.id !== id));
  }, []);

  return { templates, addTemplate, createFromTask, deleteTemplate };
}