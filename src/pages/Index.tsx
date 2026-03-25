import { useTaskStore } from "@/hooks/useTaskStore";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { StatsBar } from "@/components/StatsBar";
import { TaskAreaCard } from "@/components/TaskAreaCard";
import { ClipboardList } from "lucide-react";

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
          <ThemeSwitcher current={store.theme} onChange={store.setTheme} />
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <StatsBar stats={store.stats} />

        <div className="space-y-4">
          {store.areas.map(area => (
            <TaskAreaCard
              key={area.id}
              area={area}
              onToggleCollapse={() => store.toggleCollapse(area.id)}
              onAddTask={(text, date) => store.addTask(area.id, text, date)}
              onUpdateStatus={(taskId, s) => store.updateTaskStatus(area.id, taskId, s)}
              onUpdateStyle={(taskId, s) => store.updateTaskStyle(area.id, taskId, s)}
              onUpdateText={(taskId, t) => store.updateTaskText(area.id, taskId, t)}
              onDeleteTask={taskId => store.deleteTask(area.id, taskId)}
            />
          ))}
        </div>
      </main>
    </div>
  );
};

export default Index;
