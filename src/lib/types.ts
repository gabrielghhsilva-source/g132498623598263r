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
  daysOfWeek?: number[];
  dayOfMonth?: number;
  advanceDays: number;
}

export interface Task {
  id: string;
  text: string;
  status: TaskStatus;
  style: TaskTextStyle;
  dueDate?: string;
  dueTime?: string;
  createdAt: string;
  comments: TaskComment[];
  recurrence?: RecurrenceRule;
  recurrenceSourceId?: string;
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

// Notification types
export interface NotificationSettings {
  advanceTimes: number[];
  volume: number;
  customSoundUrl?: string;
  popupTemplate: string;
  includeTaskNames: boolean;
  popupBorderColor: string;
  popupTextColor: string;
  popupTextSize: "sm" | "base" | "lg" | "xl";
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  advanceTimes: [30, 15],
  volume: 0.5,
  popupTemplate: "⏰ Ei, não esqueça de fazer {tarefas}!",
  includeTaskNames: true,
  popupBorderColor: "#3b82f6",
  popupTextColor: "#1e293b",
  popupTextSize: "base",
};

// Background types
export type BackgroundMode = "none" | "solid" | "gradient" | "animated-gradient" | "particles" | "image";

export interface BackgroundSettings {
  mode: BackgroundMode;
  solidColor: string;
  gradientColors: string[];
  gradientAngle: number;
  animationSpeed: number;
  animationIntensity: number;
  particleColor: string;
  particleDirection: "up" | "down" | "left" | "right" | "random";
  particleCount: number;
  imageUrl: string;
}

export const DEFAULT_BACKGROUND_SETTINGS: BackgroundSettings = {
  mode: "none",
  solidColor: "#1a1a2e",
  gradientColors: ["#0f0c29", "#302b63", "#24243e"],
  gradientAngle: 135,
  animationSpeed: 5,
  animationIntensity: 50,
  particleColor: "#ffffff",
  particleDirection: "up",
  particleCount: 50,
  imageUrl: "",
};

// Investment types
export interface InvestmentArea {
  id: string;
  name: string;
  color: string;
  logoEmoji: string;
  investments: Investment[];
  goals: InvestmentGoal[];
  debts: Debt[];
}

export interface Investment {
  id: string;
  name: string;
  initialValue: number;
  previouslyInvested: number;
  monthlyContribution: number;
  rateOfReturn: number;
  rateType: "monthly" | "annual";
  passiveIncome: number;
  startDate: string;
  contributions: ContributionRecord[];
}

export interface ContributionRecord {
  id: string;
  date: string;
  amount: number;
}

export interface Debt {
  id: string;
  name: string;
  monthlyAmount: number;
}

export interface InvestmentGoal {
  id: string;
  name: string;
  targetAmount: number;
}

// Stock types
export interface StockPosition {
  id: string;
  symbol: string;
  shares: number;
  avgPrice: number;
  purchaseDate: string;
}

// Navigation
export type AppTab = "tasks" | "investments" | "stocks";
