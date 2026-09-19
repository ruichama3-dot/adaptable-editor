import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Button } from "@/components/ui/button";
import {
  Plus,
  FileText,
  Download,
  Clock,
  Sparkles,
  Settings,
  BookOpen,
  MessageCircle,
  Copy,
  Eye,
  Crown,
  ShieldCheck,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/painel")({
  head: () => ({
    meta: [
      { title: "Painel | RuJe IA" },
      { name: "description", content: "Os seus trabalhos, downloads, planos e estatísticas na RuJe IA." },
      { property: "og:title", content: "Painel | RuJe IA" },
      { property: "og:description", content: "Os seus trabalhos académicos num só lugar." },
    ],
  }),
  component: Painel,
});

function Painel() {
  const { user } = Route.useRouteContext();
  const { isAdmin } = useIsAdmin();

  const { data: works = [], isLoading } = useQuery({
    queryKey: ["works"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("works")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: samples = [] } = useQuery({
    queryKey: ["samples"],
    queryFn: async () => {
      const { data } = await supabase.from("samples").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: sub } = useQuery({
    queryKey: ["subscription"],
    queryFn: async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("*")
        .gt("expires_at", new Date().toISOString())
        .order("expires_at", { ascending: false })
        .limit(1);
      return data?.[0] ?? null;
    },
  });

  const firstName =
    (user.user_metadata?.["full_name"] as string | undefined)?.split(" ")[0] ??
    user.email?.split("@")[0] ??
    "estudante";
  const downloads = works.reduce((s, w) => s + (w.download_count ?? 0), 0);

  const stats = [
    { icon: FileText, label: "Trabalhos criados", value: works.length },
    { icon: Download, label: "Downloads", value: downloads },
    {
      icon: Clock,
      label: "Último trabalho",
      value: works[0] ? new Date(works[0].updated_at).toLocaleDateString("pt-PT") : "—",
    },
  ];

  const planLabel = isAdmin
    ? "Administrador · acesso ilimitado"
    : sub
      ? `${sub.plan} · ${sub.daily_limit} trabalhos/dia até ${new Date(sub.expires_at).toLocaleDateString("pt-PT")}`
      : "Sem plano activo · escolha um plano para criar trabalhos";

  return (
    <main className="mx-auto max-w-6xl px-5 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold capitalize">Olá, {firstName} 👋</h1>
          <p className="text-muted-foreground mt-1">Pronto para criar o próximo trabalho?</p>
        </div>
        <Button asChild size="lg" className="shadow-brand">
          <Link to="/novo-trabalho">
            <Plus className="h-4 w-4" /> Criar Novo Trabalho
          </Link>
        </Button>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary bg-secondary/50 p-5">
        <p className="flex items-center gap-2 font-semibold">
          {isAdmin ? <ShieldCheck className="h-4 w-4 text-primary" /> : <Crown className="h-4 w-4 text-primary" />}
          {planLabel}
        </p>
        <div className="flex gap-2">
          {isAdmin && (
            <Button asChild variant="outline" size="sm">
              <Link to="/admin">Painel admin</Link>
            </Button>
          )}
          {!isAdmin && (
            <Button asChild size="sm">
              <Link to="/planos">{sub ? "Renovar plano" : "Ver planos"}</Link>
            </Button>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="shadow-soft rounded-2xl border border-border bg-card p-5">
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <s.icon className="h-4 w-4" /> {s.label}
            </div>
            <p className="mt-2 text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      {samples.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-bold">Trabalhos de amostra</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Veja um trabalho completo feito na RuJe IA e crie o seu no mesmo modelo.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {samples.map((s) => (
              <div key={s.id} className="shadow-soft rounded-2xl border border-border bg-card p-5">
                <span className="bg-brand rounded-full px-2.5 py-1 text-[11px] font-bold text-primary-foreground">
                  AMOSTRA
                </span>
                <p className="mt-3 font-semibold">{s.title}</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  {s.work_type} · {s.work_mode === "grupo" ? "Trabalho em grupo" : "Individual"}
                  {s.institution ? ` · ${s.institution}` : ""}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link to="/amostra/$id" params={{ id: s.id }}>
                      <Eye className="h-4 w-4" /> Ver trabalho
                    </Link>
                  </Button>
                  <Button asChild size="sm">
                    <Link to="/novo-trabalho" search={{ amostra: s.id }}>
                      <Copy className="h-4 w-4" /> Fazer igual
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-10">
        <h2 className="text-xl font-bold">Histórico de trabalhos</h2>
        {isLoading ? (
          <p className="text-muted-foreground mt-4 text-sm">A carregar…</p>
        ) : works.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-border p-10 text-center">
            <p className="text-muted-foreground">Ainda não criou nenhum trabalho.</p>
            <Button asChild className="mt-4">
              <Link to="/novo-trabalho">Criar o primeiro</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-4 grid gap-3">
            {works.map((w) => (
              <Link
                key={w.id}
                to="/trabalho/$id"
                params={{ id: w.id }}
                className="shadow-soft flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary"
              >
                <div>
                  <p className="font-semibold">{w.title}</p>
                  <p className="text-muted-foreground mt-0.5 text-sm">
                    {w.work_type} · {w.work_mode === "grupo" ? "Grupo" : "Individual"} · {w.theme}
                  </p>
                </div>
                <div className="text-muted-foreground text-right text-xs">
                  <p>Criado: {new Date(w.created_at).toLocaleDateString("pt-PT")}</p>
                  <p>Editado: {new Date(w.updated_at).toLocaleDateString("pt-PT")}</p>
                  <p>{w.download_count} downloads</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-bold">Comunidade WhatsApp</h2>
        <div className="shadow-soft mt-4 rounded-2xl border border-border bg-card p-5">
          <p className="text-muted-foreground text-sm">
            Converse com outros estudantes, partilhe opiniões e fique atento aos cursos com certificado.
          </p>
          <Button asChild className="mt-4">
            <a
              href="https://chat.whatsapp.com/CU2WmZIWDDvJURM2eqOtKT"
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle className="h-4 w-4" /> Entrar na comunidade
            </a>
          </Button>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-bold">Outros programas da RuJe IA</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {[
            { icon: Sparkles, title: "RuJe Resumos", text: "Resumos automáticos de livros e artigos. Em breve." },
            { icon: BookOpen, title: "RuJe Citações", text: "Gerador de referências APA/ABNT. Em breve." },
            { icon: Settings, title: "RuJe Apresentações", text: "Slides académicos automáticos. Em breve." },
          ].map((p) => (
            <div key={p.title} className="rounded-2xl border border-border bg-secondary/50 p-5">
              <p.icon className="h-5 w-5 text-primary" />
              <p className="mt-3 font-semibold">{p.title}</p>
              <p className="text-muted-foreground mt-1 text-sm">{p.text}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
