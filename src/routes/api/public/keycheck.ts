import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/keycheck")({
  server: {
    handlers: {
      GET: async () => {
        const p = (n: string) => (process.env[n] ?? "").slice(0, 6);
        return new Response(
          JSON.stringify({
            LOVABLE_API_KEY: p("LOVABLE_API_KEY"),
            GEMINI_API_KEY: p("GEMINI_API_KEY"),
          }),
          { headers: { "content-type": "application/json" } },
        );
      },
    },
  },
});
