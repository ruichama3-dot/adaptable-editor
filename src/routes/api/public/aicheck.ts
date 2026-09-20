import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/aicheck")({
  server: {
    handlers: {
      GET: async () => {
        const gem = process.env["GEMINI_API_KEY"]?.trim() ?? "";
        const lov = process.env["LOVABLE_API_KEY"]?.trim() ?? "";
        const key = [gem, lov].find((k) => k.startsWith("AQ.")) ?? "";
        if (!key) return Response.json({ ok: false, reason: "no-gateway-key" });
        const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
          body: JSON.stringify({
            model: "google/gemini-3-flash",
            messages: [{ role: "user", content: "diz OK" }],
          }),
        });
        return Response.json({ ok: res.ok, status: res.status, body: (await res.text()).slice(0, 200) });
      },
    },
  },
});
