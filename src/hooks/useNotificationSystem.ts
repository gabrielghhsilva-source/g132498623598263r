import { useEffect, useRef, useState, useCallback } from "react";
import { Task, NotificationSettings } from "@/lib/types";
import { minutesUntilDue, getNowInTimezone } from "@/lib/timeUtils";

export interface NotificationTaskRef {
  taskId: string;
  areaId: string;
}

interface NotificationEvent {
  id: string;
  taskNames: string[];
  taskRefs: NotificationTaskRef[];
  advanceMinutes: number;
}

interface TodayTask extends Task {
  areaName: string;
  areaIcon: string;
  areaId: string;
}

export function useNotificationSystem(
  allTasks: { task: Task; areaName: string }[],
  settings: NotificationSettings,
  timezone: string,
) {
  const [currentEvent, setCurrentEvent] = useState<NotificationEvent | null>(null);
  const firedRef = useRef<Set<string>>(new Set());

  const showNotification = useCallback((title: string, body: string, tag: string) => {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    // Prefere o Service Worker (entrega melhor em background); fallback para Notification API
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: "SHOW_NOTIFICATION",
        payload: { title, body, icon: "/icon-192.png", tag },
      });
    } else {
      try {
        new Notification(title, { body, icon: "/icon-192.png", tag });
      } catch {}
    }
  }, []);

  const playSound = useCallback((volume: number, customUrl?: string) => {
    if (customUrl) {
      const audio = new Audio(customUrl);
      audio.volume = volume;
      audio.play().catch(() => {});
      return;
    }
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 830;
      osc.type = "sine";
      gain.gain.value = volume;
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.stop(ctx.currentTime + 0.5);
    } catch {}
  }, []);

  useEffect(() => {
    if (settings.advanceTimes.length === 0) return;

    const check = () => {
      const pendingTasks = allTasks.filter(
        ({ task }) => task.dueDate && task.dueTime && task.status !== "done"
      );

      for (const advMin of settings.advanceTimes) {
        const matching: string[] = [];
        const matchingNames: string[] = [];

        for (const { task } of pendingTasks) {
          const mins = minutesUntilDue(task.dueDate!, task.dueTime, timezone);
          // Fire if within a 1-minute window of the advance time
          if (mins >= advMin - 1 && mins <= advMin + 1) {
            const key = `${task.id}-${advMin}`;
            if (!firedRef.current.has(key)) {
              firedRef.current.add(key);
              matching.push(task.id);
              matchingNames.push(task.text);
            }
          }
        }

        if (matching.length > 0) {
          showNotification(
            `⏰ Tarefa em ${advMin} minuto${advMin !== 1 ? "s" : ""}`,
            matchingNames.join(", "),
            `advance-${advMin}-${Date.now()}`
          );

          // Sound
          playSound(settings.volume, settings.customSoundUrl);

          // In-app popup
          setCurrentEvent({
            id: `${Date.now()}-${advMin}`,
            taskNames: matchingNames,
            advanceMinutes: advMin,
          });
        }
      }

      // Also check for tasks due right now (0 minutes)
      const dueNow: string[] = [];
      const dueNowNames: string[] = [];
      for (const { task } of pendingTasks) {
        const mins = minutesUntilDue(task.dueDate!, task.dueTime, timezone);
        if (mins >= -1 && mins <= 1) {
          const key = `${task.id}-0`;
          if (!firedRef.current.has(key)) {
            firedRef.current.add(key);
            dueNow.push(task.id);
            dueNowNames.push(task.text);
          }
        }
      }

      if (dueNow.length > 0) {
        showNotification("⏰ Tarefa agora!", dueNowNames.join(", "), `due-now-${Date.now()}`);
        playSound(settings.volume, settings.customSoundUrl);
        setCurrentEvent({
          id: `${Date.now()}-now`,
          taskNames: dueNowNames,
          advanceMinutes: 0,
        });
      }
    };

    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, [allTasks, settings, timezone, playSound, showNotification]);

  // Request notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const dismissEvent = useCallback(() => setCurrentEvent(null), []);

  return { currentEvent, dismissEvent };
}
