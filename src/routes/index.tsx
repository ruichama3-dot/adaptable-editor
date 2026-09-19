import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import {
  BookOpenCheck,
  FileText,
  GraduationCap,
  Languages,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Wand2,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RuJe IA 🇲🇿 — Trabalhos académicos criados por IA" },
      {
        name: "description",
        content:
          "Monografias, TCC, relatórios e artigos científicos completos, com capa, índice e referências em normas APA, ABNT ou Vancouver.",
      },
      { property: "og:title", content: "RuJe IA 🇲🇿 — Trabalhos académicos criados por IA" },
      {
        property: "og:description",
        content: "Crie trabalhos escolares, técnicos e universitários completos em minutos.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: Wand2, title: "Estrutura completa", text: "Capa, folha de rosto, índice, desenvolvimento, conclusão e referências." },
  { icon: BookOpenCheck, title: "Normas académicas", text: "APA, ABNT e Vancouver com citações e referências automáticas." },
  { icon: FileText, title: "Editor tipo Word", text: "Edite texto, fontes, tabelas e imagens antes de exportar." },
  { icon: GraduationCap, title: "Todos os níveis", text: "Ensino médio, técnico, licenciatura, mestrado e doutoramento." },
  { icon: Languages, title: "Multilíngue", text: "Português, inglês, francês e espanhol." },
  { icon: ShieldCheck, title: "Conta segura", text: "Palavras-passe encriptadas e trabalhos guardados na sua conta." },
];

function Landing() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Logo />
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost">
            <Link to="/auth">Entrar</Link>
          </Button>
          <Button asChild>
            <Link to="/auth" search={{ modo: "registo" }}>
              Criar conta
            </Link>
          </Button>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-5 pt-10 pb-16 text-center sm:pt-20">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-4 py-1.5 text-xs font-semibold text-secondary-foreground">
            <Sparkles className="h-3.5 w-3.5" /> Inteligência Artificial académica moçambicana
          </span>
          <h1 className="mt-6 text-4xl leading-tight font-extrabold sm:text-6xl">
            Trabalhos académicos completos <span className="text-brand-gradient">em minutos</span>
          </h1>
          <p className="text-muted-foreground mx-auto mt-5 max-w-2xl text-base sm:text-lg">
            A RuJe IA analisa o seu tema e gera monografias, TCC, relatórios, seminários e artigos
            científicos prontos a entregar — com capa, índice e bibliografia.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="shadow-brand">
              <Link to="/auth" search={{ modo: "registo" }}>
                Começar gratuitamente
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/auth">Já tenho conta</Link>
            </Button>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-24">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="shadow-soft rounded-2xl border border-border bg-card p-6">
                <div className="bg-brand grid h-11 w-11 place-items-center rounded-xl text-primary-foreground">
                  <f.icon className="h-5 w-5" />
                </div>
                <h2 className="mt-4 text-lg font-semibold">{f.title}</h2>
                <p className="text-muted-foreground mt-1.5 text-sm">{f.text}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8 text-center">
        <div className="mx-auto max-w-6xl px-5">
          <Button asChild variant="outline" className="mb-4">
            <a
              href="https://chat.whatsapp.com/CU2WmZIWDDvJURM2eqOtKT"
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle className="h-4 w-4" /> Comunidade WhatsApp — converse, dê opiniões e fique atento aos cursos com certificado
            </a>
          </Button>
          <p className="text-muted-foreground text-sm">
            RuJe IA 🇲🇿 — a plataforma africana de criação de trabalhos académicos.
          </p>
        </div>
      </footer>
    </div>
  );
}
