import { useState, useCallback } from "react";
import { useTaskStore } from "@/hooks/useTaskStore";
import { useNotificationStore } from "@/hooks/useNotificationStore";
import { useNotificationSystem } from "@/hooks/useNotificationSystem";
import { Preloader } from "@/components/Preloader";
import { SettingsMenu } from "@/components/SettingsMenu";
import { StatsBar } from "@/components/StatsBar";
import { DraggableAreaList } from "@/components/DraggableAreaList";
import { TodayPanel } from "@/components/TodayPanel";
import { AddAreaDialog } from "@/components/AddAreaDialog";
import { NotificationPopup } from "@/components/NotificationPopup";
import { ClipboardList } from "lucide-react";

const Index = () => {
  const store = useTaskStore();
  const notifStore = useNotificationStore();
  const { currentEvent, dismissEvent } = useNotificationSystem(
    store.allTasksWithArea,
    notifStore.settings,
    store.timezone,
  );

  const [preloaderDone, setPreloaderDone] = useState(() => {
    if (sessionStorage.getItem("preloader-shown")) return true;
    return false;
  });

  const handlePreloaderDone = useCallback(() => {
    sessionStorage.setItem("preloader-shown", "true");
    setPreloaderDone(true);
  }, []);

  return (
    <>
      {!preloaderDone && <Preloader onDone={handlePreloaderDone} />}
      <div className={`min-h-screen bg-background transition-all duration-500 ${preloaderDone ? "opacity-100" : "opacity-0"}`}>
        {/* Header */}
        <header className="sticky top-0 z-40 backdrop-blur-md bg-background/80 border-b border-border transition-colors duration-300">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ClipboardList className="w-6 h-6 text-primary" />
              <h1 className="text-xl font-bold tracking-tight">Minhas Tarefas</h1>
            </div>
            <SettingsMenu
              theme={store.theme}
              onThemeChange={store.setTheme}
              customColors={store.customColors}
              onCustomColorsChange={store.setCustomColors}
              timezone={store.timezone}
              onTimezoneChange={store.setTimezone}
              notificationSettings={notifStore.settings}
              onNotificationUpdate={notifStore.setSettings}
              onToggleAdvanceTime={notifStore.toggleAdvanceTime}
              onTestSound={notifStore.playTestSound}
            />
          </div>
        </header>

        {/* Content */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6 pr-12 sm:pr-6">
          <StatsBar stats={store.stats} />

          <DraggableAreaList
            areas={store.areas}
            timezone={store.timezone}
            onReorder={store.reorderAreas}
            onToggleCollapse={store.toggleCollapse}
            onAddTask={(areaId, text, date, rec, time) => store.addTask(areaId, text, date, rec, time)}
            onUpdateStatus={store.updateTaskStatus}
            onUpdateStyle={store.updateTaskStyle}
            onUpdateText={store.updateTaskText}
            onDeleteTask={store.deleteTask}
            onDeleteArea={store.deleteArea}
            onAddComment={store.addComment}
            onDeleteComment={store.deleteComment}
          />

          <AddAreaDialog onAdd={store.addArea} />
        </main>

        {/* Today's tasks panel */}
        <TodayPanel
          tasks={store.todayTasks}
          onMarkDone={(areaId, taskId) => store.updateTaskStatus(areaId, taskId, "done")}
        />

        {/* Notification popup */}
        <NotificationPopup
          event={currentEvent}
          settings={notifStore.settings}
          onDismiss={dismissEvent}
        />
      </div>
    </>
  );
};

export default Index;
