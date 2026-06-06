function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function createTelegramNotifier({ token, chatId, timeoutMs }) {
  if (!token || !chatId) {
    return {
      enabled: false,
      async send(message) {
        console.log(`[BILDIRIM DEVRE DISI]\n${message}`);
      },
    };
  }

  return {
    enabled: true,
    async send(message) {
      const response = await fetch(
        `https://api.telegram.org/bot${token}/sendMessage`,
        {
          method: "POST",
          signal: AbortSignal.timeout(timeoutMs),
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: escapeHtml(message),
            parse_mode: "HTML",
            disable_web_page_preview: true,
          }),
        },
      );

      if (!response.ok) {
        const body = await response.text();
        throw new Error(
          `Telegram bildirimi gonderilemedi: HTTP ${response.status} ${body}`,
        );
      }
    },
  };
}
