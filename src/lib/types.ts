export type TaskStatus = "todo" | "in-progress" | "done";

export interface TaskTextStyle {
  size: "sm" | "base" | "lg" | "xl";
  weight: "light" | "normal" | "medium" | "semibold" | "bold";
  color: string; // hex color
}

export interface Task {
  id: string;
  text: string;
  status: TaskStatus;
  style: TaskTextStyle;
  dueDate?: string; // ISO date
  createdAt: string;
}

export interface TaskArea {
  id: string;
  name: string;
  icon: string;
  tasks: Task[];
  collapsed: boolean;
}

export type ThemeId = "mono-light" | "mono-dark" | "beige" | "cyan" | "lavender" | "rose";

export interface ThemeOption {
  id: ThemeId;
  name: string;
  preview: string; // CSS color for preview dot
}
