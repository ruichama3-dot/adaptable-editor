import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DocPages } from "@/components/DocPages";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/partilha/$id")({
  head: () => ({
    meta: [
      { title: "Trabalho partilhado | RuJe IA" },
      { name: "description", content: "Veja um trabalho académico partilhado através da RuJe IA." },
      { property: "og:title", content: "Trabalho partilhado | RuJe IA" },
      { property: "og:description", content: "Trabalho académico criado com a RuJe IA." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Partilha,
});

function Partilha() {
  const { id } = Route.useParams();

  const { data: work, isLoading } = useQuery({
    queryKey: ["shared-work", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("works")
        .select("title, work_type, content, is_public")
        .eq("id", id)
        .eq("is_public", true)
        .maybeSingle();
      return data;
    },
  });

  return (
    <div className="min-h-screen">
      <header className="border-b border-border print:hidden">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <Link to="/">
            <Logo size="sm" />
          </Link>
          <Button asChild size="sm">
            <Link to="/auth" search={{ modo: "registo" }}>
              Criar o meu trabalho
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        {isLoading ? (
          <p className="text-muted-foreground">A carregar…</p>
        ) : !work ? (
          <p className="text-muted-foreground">Este trabalho não está disponível publicamente.</p>
        ) : (
          <>
            <h1 className="text-2xl font-extrabold print:hidden">{work.title}</h1>
            <p className="text-muted-foreground text-sm print:hidden">{work.work_type}</p>
            <DocPages html={work.content} version={id} />
          </>
        )}
      </main>
    </div>
  );
}
