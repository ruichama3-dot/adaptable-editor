import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DocPages } from "@/components/DocPages";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";

export const Route = createFileRoute("/_authenticated/amostra/$id")({
  head: () => ({
    meta: [
      { title: "Trabalho de amostra | RuJe IA" },
      { name: "description", content: "Veja um trabalho modelo completo e crie o seu no mesmo formato." },
      { property: "og:title", content: "Trabalho de amostra | RuJe IA" },
      { property: "og:description", content: "Modelo de trabalho académico completo da RuJe IA." },
    ],
  }),
  component: Amostra,
});

function Amostra() {
  const { id } = Route.useParams();
  const { data: sample } = useQuery({
    queryKey: ["sample", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("samples").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-extrabold">{sample?.title ?? "A carregar…"}</h1>
          <p className="text-muted-foreground text-sm">
            Amostra · {sample?.work_type} · {sample?.work_mode === "grupo" ? "Trabalho em grupo" : "Individual"}
          </p>
        </div>
        {sample && (
          <Button asChild className="shadow-brand">
            <Link to="/novo-trabalho" search={{ amostra: sample.id }}>
              <Copy className="h-4 w-4" /> Fazer o meu no mesmo modelo
            </Link>
          </Button>
        )}
      </div>

      {sample && <DocPages html={sample.content} version={sample.id} />}
    </main>
  );
}
