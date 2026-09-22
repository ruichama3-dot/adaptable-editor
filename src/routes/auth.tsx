import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SignupQuiz } from "@/components/SignupQuiz";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  validateSearch: z.object({ modo: z.enum(["entrar", "registo"]).optional() }),
  head: () => ({
    meta: [
      { title: "Entrar ou criar conta | RuJe IA" },
      { name: "description", content: "Aceda à sua conta RuJe IA e crie trabalhos académicos com IA." },
      { property: "og:title", content: "Entrar ou criar conta | RuJe IA" },
      { property: "og:description", content: "Aceda à sua conta RuJe IA." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { modo } = Route.useSearch();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/painel", replace: true });
    });
  }, [navigate]);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: String(form.get("email")).trim(),
      password: String(form.get("password")),
    });
    setLoading(false);
    if (error) { toast.error("E-mail ou palavra-passe incorrectos."); return; }
    navigate({ to: "/painel" });
  }

  async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password"));
    if (password !== String(form.get("confirm"))) { toast.error("As palavras-passe não coincidem."); return; }
    if (password.length < 6) { toast.error("A palavra-passe deve ter pelo menos 6 caracteres."); return; }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: String(form.get("email")).trim(),
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: String(form.get("full_name")), phone: String(form.get("phone")) },
      },
    });
    setLoading(false);
    if (error) { toast.error(signupErrorMessage(error.message)); return; }
    toast.success("Conta criada com sucesso!");
    setShowQuiz(true);
  }

  async function handleReset() {
    const email = window.prompt("Indique o seu e-mail para recuperar a palavra-passe:");
    if (!email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Enviámos um link de recuperação para o seu e-mail.");
  }

  if (showQuiz) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-5 py-10">
        <Link to="/" className="mb-8">
          <Logo size="lg" />
        </Link>
        <SignupQuiz onFinish={() => navigate({ to: "/planos" })} />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-5 py-10">
      <Link to="/" className="mb-8">
        <Logo size="lg" />
      </Link>
      <div className="shadow-soft w-full max-w-md rounded-2xl border border-border bg-card p-6">
        <Tabs defaultValue={modo === "registo" ? "registo" : "entrar"}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="entrar">Entrar</TabsTrigger>
            <TabsTrigger value="registo">Criar conta</TabsTrigger>
          </TabsList>

          <TabsContent value="entrar">
            <form onSubmit={handleLogin} className="mt-5 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="l-email">E-mail</Label>
                <Input id="l-email" name="email" type="email" required placeholder="voce@email.com" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="l-pass">Palavra-passe</Label>
                <Input id="l-pass" name="password" type="password" required />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                Entrar
              </Button>
              <button type="button" onClick={handleReset} className="text-muted-foreground w-full text-sm underline">
                Esqueci a minha palavra-passe
              </button>
            </form>
          </TabsContent>

          <TabsContent value="registo">
            <form onSubmit={handleSignup} className="mt-5 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="s-name">Nome completo</Label>
                <Input id="s-name" name="full_name" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-email">E-mail</Label>
                <Input id="s-email" name="email" type="email" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-phone">Número de telefone</Label>
                <Input id="s-phone" name="phone" type="tel" placeholder="+258 84 000 0000" required />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="s-pass">Palavra-passe</Label>
                  <Input id="s-pass" name="password" type="password" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="s-confirm">Confirmar</Label>
                  <Input id="s-confirm" name="confirm" type="password" required />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                Criar conta
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
