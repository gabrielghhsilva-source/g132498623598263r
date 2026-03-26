export type TaskStatus = "todo" | "in-progress" | "done";

export interface TaskTextStyle {
  size: "sm" | "base" | "lg" | "xl";
  weight: "light" | "normal" | "medium" | "semibold" | "bold";
  color: string;
}

export interface TaskComment {
  id: string;
  text: string;
  createdAt: string;
}

export interface RecurrenceRule {
  type: "weekly" | "monthly";
  daysOfWeek?: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
  dayOfMonth?: number;   // 1-31
  advanceDays: number;   // how many days in advance to create task
}

export interface Task {
  id: string;
  text: string;
  status: TaskStatus;
  style: TaskTextStyle;
  dueDate?: string;
  createdAt: string;
  comments: TaskComment[];
  recurrence?: RecurrenceRule;
  recurrenceSourceId?: string; // links generated tasks to their template
}

export interface TaskArea {
  id: string;
  name: string;
  icon: string;
  tasks: Task[];
  collapsed: boolean;
}

export type ThemeId = "mono-light" | "mono-dark" | "beige" | "cyan" | "lavender" | "rose" | "custom";

export interface CustomThemeColors {
  background: string;
  foreground: string;
  card: string;
  border: string;
}

export interface ThemeOption {
  id: ThemeId;
  name: string;
  preview: string;
}
