import { useTaskStore } from "@/hooks/useTaskStore";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { StatsBar } from "@/components/StatsBar";
import { TaskAreaCard } from "@/components/TaskAreaCard";
import { TodayPanel } from "@/components/TodayPanel";
import { AddAreaDialog } from "@/components/AddAreaDialog";
import { ClipboardList } from "lucide-react";

const DEFAULT_AREA_IDS = ["work", "games", "leisure", "home", "investments"];

const Index = () => {
  const store = useTaskStore();

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ClipboardList className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold tracking-tight">Minhas Tarefas</h1>
          </div>
          <ThemeSwitcher
            current={store.theme}
            onChange={store.setTheme}
            customColors={store.customColors}
            onCustomColorsChange={store.setCustomColors}
          />
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6 pr-12 sm:pr-6">
        <StatsBar stats={store.stats} />

        <div className="space-y-4">
          {store.areas.map(area => (
            <TaskAreaCard
              key={area.id}
              area={area}
              isCustom={!DEFAULT_AREA_IDS.includes(area.id)}
              onToggleCollapse={() => store.toggleCollapse(area.id)}
              onAddTask={(text, date, rec) => store.addTask(area.id, text, date, rec)}
              onUpdateStatus={(taskId, s) => store.updateTaskStatus(area.id, taskId, s)}
              onUpdateStyle={(taskId, s) => store.updateTaskStyle(area.id, taskId, s)}
              onUpdateText={(taskId, t) => store.updateTaskText(area.id, taskId, t)}
              onDeleteTask={taskId => store.deleteTask(area.id, taskId)}
              onDeleteArea={!DEFAULT_AREA_IDS.includes(area.id) ? () => store.deleteArea(area.id) : undefined}
              onAddComment={(taskId, text) => store.addComment(area.id, taskId, text)}
              onDeleteComment={(taskId, commentId) => store.deleteComment(area.id, taskId, commentId)}
            />
          ))}
          <AddAreaDialog onAdd={store.addArea} />
        </div>
      </main>

      {/* Today's tasks panel */}
      <TodayPanel
        tasks={store.todayTasks}
        onMarkDone={(areaId, taskId) => store.updateTaskStatus(areaId, taskId, "done")}
      />
    </div>
  );
};

export default Index;
