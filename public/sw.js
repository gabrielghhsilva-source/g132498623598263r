// Service Worker do PWA "Lista de Tarefas G"
// Exibe notificações com botões de ação (+5/+30 min) e propaga cliques de volta ao app.

const CACHE_NAME = "tarefas-g-v2";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Recebe mensagens do app principal para disparar notificações
self.addEventListener("message", (event) => {
  // Atualiza badge do ícone do app (PWA instalado) com a contagem de tasks de hoje
  if (event.data?.type === "SET_BADGE") {
    const count = Number(event.data.count) || 0;
    try {
      if (count > 0 && self.navigator.setAppBadge) {
        self.navigator.setAppBadge(count).catch(() => {});
      } else if (self.navigator.clearAppBadge) {
        self.navigator.clearAppBadge().catch(() => {});
      }
    } catch { /* noop */ }
    return;
  }

  if (event.data?.type === "SHOW_NOTIFICATION") {
    const { title, body, icon, tag, taskRefs } = event.data.payload || {};
    const hasRefs = Array.isArray(taskRefs) && taskRefs.length > 0;

    self.registration.showNotification(title || "Tarefas G", {
      body: body || "",
      icon: icon || "/icon-192.png",
      badge: "/icon-192.png",
      tag: tag || "task-notification",
      requireInteraction: true,
      vibrate: [200, 100, 200],
      // Botões aparecem na notificação nativa do Windows quando o app
      // está instalado como PWA. Limite prático = 2 ações.
      actions: hasRefs
        ? [
            { action: "snooze-5", title: "+5 min" },
            { action: "snooze-30", title: "+30 min" },
          ]
        : [],
      data: {
        taskRefs: hasRefs ? taskRefs : [],
      },
    });
  }
});


// Lida com clique nos botões / corpo da notificação
self.addEventListener("notificationclick", (event) => {
  const { action, notification } = event;
  const taskRefs = notification.data?.taskRefs || [];

  notification.close();

  // Snooze: posta mensagem para todas as abas abertas aplicarem o adiamento
  if (action === "snooze-5" || action === "snooze-30") {
    const minutes = action === "snooze-5" ? 5 : 30;
    event.waitUntil(
      self.clients
        .matchAll({ type: "window", includeUncontrolled: true })
        .then(async (clientList) => {
          // Se nenhuma aba estiver aberta, abre uma para que o app receba a mensagem
          if (clientList.length === 0 && self.clients.openWindow) {
            const newClient = await self.clients.openWindow("/");
            if (newClient) {
              newClient.postMessage({
                type: "SNOOZE_TASKS",
                payload: { taskRefs, minutes },
              });
            }
            return;
          }
          for (const client of clientList) {
            client.postMessage({
              type: "SNOOZE_TASKS",
              payload: { taskRefs, minutes },
            });
          }
          // Foca a primeira janela disponível
          const focusable = clientList.find((c) => "focus" in c);
          if (focusable) await focusable.focus();
        })
    );
    return;
  }

  // Clique no corpo da notificação (sem ação): foca/abre o app
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow("/");
    })
  );
});

// Pass-through: não interceptamos requests para evitar conteúdo desatualizado
self.addEventListener("fetch", () => {});
