// Service Worker básico para o PWA "Lista de Tarefas G"
// Permite exibir notificações vindas do app mesmo quando a aba está em segundo plano.

const CACHE_NAME = "tarefas-g-v1";

self.addEventListener("install", (event) => {
  // Ativa imediatamente a nova versão
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Recebe mensagens do app principal para disparar notificações
self.addEventListener("message", (event) => {
  if (event.data?.type === "SHOW_NOTIFICATION") {
    const { title, body, icon, tag } = event.data.payload || {};
    self.registration.showNotification(title || "Tarefas G", {
      body: body || "",
      icon: icon || "/icon-192.png",
      badge: "/icon-192.png",
      tag: tag || "task-notification",
      requireInteraction: false,
      vibrate: [200, 100, 200],
    });
  }
});

// Ao clicar na notificação, foca/abre a janela do app
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow("/");
    })
  );
});

// Fallback simples (não cacheia agressivamente para evitar problemas de versão)
self.addEventListener("fetch", () => {
  // Pass-through: não interceptamos requests para evitar servir conteúdo desatualizado
});
