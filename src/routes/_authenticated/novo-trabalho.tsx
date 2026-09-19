import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { generateWork } from "@/lib/works.functions";
import { useIsAdmin } from "@/hooks/useIsAdmin";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2, Wand2, Users, User as UserIcon, BookMarked } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/novo-trabalho")({
  validateSearch: z.object({ amostra: z.string().uuid().optional() }),
  head: () => ({
    meta: [
      { title: "Criar novo trabalho | RuJe IA" },
      { name: "description", content: "Preencha os dados académicos e deixe a IA escrever o seu trabalho." },
      { property: "og:title", content: "Criar novo trabalho | RuJe IA" },
      { property: "og:description", content: "A IA escreve o seu trabalho académico completo." },
    ],
  }),
  component: NovoTrabalho,
});

const WORK_TYPES = [
  "Trabalho Escolar",
  "Trabalho Científico",
  "Monografia",
  "Projeto de Pesquisa",
  "Relatório",
  "Artigo Científico",
  "Seminário",
  "Revisão Bibliográfica",
  "Estudo de Caso",
  "Dissertação",
  "TCC",
];
const LEVELS = ["Ensino Médio", "Ensino Técnico", "Licenciatura", "Mestrado", "Doutoramento"];
const LANGS = ["Português", "Inglês", "Francês", "Espanhol"];
const NORMS = ["APA", "ABNT", "Vancouver"];

function Field({ id, label, ...rest }: { id: string; label: string } & React.ComponentProps<typeof Input>) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={id} {...rest} />
    </div>
  );
}

function Sel({
  id,
  label,
  options,
  defaultValue,
}: {
  id: string;
  label: string;
  options: string[];
  defaultValue?: string | undefined;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        name={id}
        defaultValue={defaultValue}
        className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm shadow-xs focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

function Choice({
  active,
  onClick,
  icon: Icon,
  title,
  text,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Users;
  title: string;
  text: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border-2 p-4 text-left transition-colors ${
        active ? "border-primary bg-secondary/50" : "border-border hover:border-primary/40"
      }`}
    >
      <Icon className="h-5 w-5 text-primary" />
      <p className="mt-2 font-semibold">{title}</p>
      <p className="text-muted-foreground mt-0.5 text-sm">{text}</p>
    </button>
  );
}

function NovoTrabalho() {
  const { user } = Route.useRouteContext();
  const { amostra } = Route.useSearch();
  const navigate = useNavigate();
  const generate = useServerFn(generateWork);
  const [busy, setBusy] = useState(false);
  const [opts, setOpts] = useState({ cover: true, index: true, citations: true, references: true });
  const [mode, setMode] = useState<"individual" | "grupo">("individual");
  const [refsMode, setRefsMode] = useState<"automatica" | "manual">("automatica");

  const { isAdmin, isLoading: loadingRole } = useIsAdmin();

  const { data: sub, isLoading: loadingSub } = useQuery({
    queryKey: ["my-subscription", user.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("plan, daily_limit, expires_at")
        .gt("expires_at", new Date().toISOString())
        .order("expires_at", { ascending: false })
        .limit(1);
      return data?.[0] ?? null;
    },
  });

  const { data: sample, isLoading: loadingSample } = useQuery({
    queryKey: ["sample", amostra],
    enabled: Boolean(amostra),
    queryFn: async () => {
      const { data } = await supabase.from("samples").select("*").eq("id", amostra!).maybeSingle();
      if (data?.work_mode === "grupo") setMode("grupo");
      return data;
    },
  });


  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const s = (k: string) => String(f.get(k) ?? "").trim();
    setBusy(true);
    try {
      const { data: work, error } = await supabase
        .from("works")
        .insert({
          user_id: user.id,
          theme: s("theme"),
          title: s("title") || s("theme"),
          work_type: s("work_type"),
          work_mode: mode,
          group_members: mode === "grupo" ? s("group_members") : null,
          references_mode: refsMode,
          manual_references: refsMode === "manual" ? s("manual_references") : null,
          student_name: s("student_name"),
          student_number: s("student_number"),
          course: s("course"),
          class_group: s("class_group"),
          grade_year: s("grade_year"),
          institution: s("institution"),
          faculty: s("faculty"),
          department: s("department"),
          subject: s("subject"),
          teacher: s("teacher"),
          city: s("city"),
          country: s("country"),
          due_date: s("due_date") || null,
          pages: Number(f.get("pages")) || 10,
          language: s("language"),
          academic_level: s("academic_level"),
          norms: s("norms"),
          options: opts,
        })
        .select()
        .single();
      if (error) throw error;
      toast.info("A IA está a escrever o seu trabalho… pode demorar 1 a 3 minutos.");
      await generate({ data: { workId: work.id } });
      toast.success("Trabalho gerado!");
      navigate({ to: "/trabalho/$id", params: { id: work.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível gerar o trabalho.");
    } finally {
      setBusy(false);
    }
  }

  if ((amostra && loadingSample) || loadingSub || loadingRole) {
    return <main className="mx-auto max-w-4xl px-5 py-10 text-muted-foreground">A carregar…</main>;
  }

  if (!isAdmin && !sub) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-16 text-center">
        <h1 className="text-3xl font-extrabold">Precisa de um plano activo</h1>
        <p className="text-muted-foreground mt-3">
          Para criar trabalhos na RuJe IA é necessário ter um plano activo. Escolha o plano que
          melhor lhe serve e envie o comprovativo do pagamento.
        </p>
        <Button asChild size="lg" className="shadow-brand mt-7">
          <Link to="/planos">Ver planos</Link>
        </Button>
      </main>
    );
  }


  return (
    <main className="mx-auto max-w-4xl px-5 py-8">
      <h1 className="text-3xl font-extrabold">Criar novo trabalho</h1>
      <p className="text-muted-foreground mt-1">Quanto mais completo o formulário, melhor o resultado.</p>
      {sample && (
        <p className="mt-3 rounded-xl border border-primary bg-secondary/50 px-4 py-2.5 text-sm">
          A usar o modelo: <strong>{sample.title}</strong>. Altere os dados para o seu trabalho.
        </p>
      )}

      <form onSubmit={onSubmit} className="mt-7 space-y-6">
        <section className="shadow-soft rounded-2xl border border-border bg-card p-6">
          <h2 className="text-lg font-bold">Modalidade do trabalho</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Choice
              active={mode === "individual"}
              onClick={() => setMode("individual")}
              icon={UserIcon}
              title="Trabalho individual"
              text="A capa e a folha de rosto levam o seu nome e número."
            />
            <Choice
              active={mode === "grupo"}
              onClick={() => setMode("grupo")}
              icon={Users}
              title="Trabalho em grupo"
              text="A folha de rosto lista todos os elementos do grupo."
            />
          </div>
          {mode === "grupo" && (
            <div className="mt-4 space-y-1.5">
              <Label htmlFor="group_members">Elementos do grupo (um por linha)</Label>
              <Textarea
                id="group_members"
                name="group_members"
                rows={5}
                placeholder={"1- Abstinência José Pedro\n2- Adélia Agostinho\n3- Ágata Remígio"}
              />
            </div>
          )}
        </section>

        <section className="shadow-soft rounded-2xl border border-border bg-card p-6">
          <h2 className="text-lg font-bold">Informações académicas</h2>
          <div className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="theme">Tema do trabalho</Label>
              <Textarea
                id="theme"
                name="theme"
                required
                rows={2}
                defaultValue={sample?.theme ?? ""}
                placeholder="Ex.: Impacto das energias renováveis em Moçambique"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="title" label="Título do trabalho" defaultValue={sample?.title ?? ""} />
              <Sel id="work_type" label="Tipo de trabalho" options={WORK_TYPES} defaultValue={sample?.work_type} />
              <Field id="student_name" label="Nome do estudante" />
              <Field id="student_number" label="Número do estudante" />
              <Field id="course" label="Curso" />
              <Field id="class_group" label="Turma" />
              <Field id="grade_year" label="Classe / Ano" />
              <Field id="institution" label="Instituição de ensino" defaultValue={sample?.institution ?? ""} />
              <Field id="faculty" label="Faculdade" />
              <Field id="department" label="Departamento" />
              <Field id="subject" label="Disciplina" />
              <Field id="teacher" label="Nome do docente" />
              <Field id="city" label="Cidade" defaultValue="Maputo" />
              <Field id="country" label="País" defaultValue="Moçambique" />
              <Field id="due_date" label="Data de entrega" type="date" />
            </div>
          </div>
        </section>

        <section className="shadow-soft rounded-2xl border border-border bg-card p-6">
          <h2 className="text-lg font-bold">Referências bibliográficas</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Choice
              active={refsMode === "automatica"}
              onClick={() => setRefsMode("automatica")}
              icon={Wand2}
              title="Automáticas"
              text="A IA escolhe e formata as referências e as citações."
            />
            <Choice
              active={refsMode === "manual"}
              onClick={() => setRefsMode("manual")}
              icon={BookMarked}
              title="Manuais"
              text="Indica as suas referências e a IA usa apenas essas."
            />
          </div>
          {refsMode === "manual" && (
            <div className="mt-4 space-y-1.5">
              <Label htmlFor="manual_references">As suas referências (uma por linha)</Label>
              <Textarea
                id="manual_references"
                name="manual_references"
                rows={5}
                placeholder={"LUCKESI, C. C. Avaliação da Aprendizagem Escolar. São Paulo: Cortez, 2011."}
              />
            </div>
          )}
        </section>

        <section className="shadow-soft rounded-2xl border border-border bg-card p-6">
          <h2 className="text-lg font-bold">Configurações</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field id="pages" label="Quantidade de páginas" type="number" min={2} max={60} defaultValue={10} />
            <Sel id="language" label="Idioma" options={LANGS} />
            <Sel id="academic_level" label="Nível académico" options={LEVELS} />
            <Sel id="norms" label="Normas" options={NORMS} />
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              ["cover", "Gerar capa automática"],
              ["index", "Gerar índice automático"],
              ["citations", "Inserir citações automáticas"],
              ["references", "Referências automáticas"],
            ].map(([k, label]) => (
              <label key={k} className="flex items-center justify-between rounded-xl border border-border px-4 py-2.5 text-sm">
                {label}
                <Switch
                  checked={opts[k as keyof typeof opts]}
                  onCheckedChange={(v) => setOpts((o) => ({ ...o, [k as string]: v }))}
                />
              </label>
            ))}
          </div>
        </section>

        <Button type="submit" size="lg" className="shadow-brand w-full" disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
          {busy ? "A gerar o trabalho…" : "Gerar trabalho com IA"}
        </Button>
      </form>
    </main>
  );
}
