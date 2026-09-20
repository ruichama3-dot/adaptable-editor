import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/aicheck")({
  server: {
    handlers: {
      GET: async () => {
        const key = process.env["GEMINI_API_KEY"]?.trim() ?? "";
        if (!key.startsWith("AIza")) {
          return Response.json({ ok: false, reason: "no-aiza-key", prefix: key.slice(0, 4) });
        }
        const res = await fetch(
          "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
          {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-goog-api-key": key },
            body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: "diz OK" }] }] }),
          },
        );
        return Response.json({ ok: res.ok, status: res.status, body: (await res.text()).slice(0, 200) });
      },
    },
  },
});
