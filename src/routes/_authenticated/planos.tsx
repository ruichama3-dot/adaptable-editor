import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PLANS, PAYMENT_METHODS, planById } from "@/lib/plans";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Check, Copy, Crown, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/planos")({
  head: () => ({
    meta: [
      { title: "Planos e pagamento | RuJe IA" },
      { name: "description", content: "Escolha o seu plano RuJe IA e pague por Emola ou M-Pesa." },
      { property: "og:title", content: "Planos e pagamento | RuJe IA" },
      { property: "og:description", content: "Planos semanais, de 14 e de 30 dias para criar trabalhos com IA." },
    ],
  }),
  component: Planos,
});

function Planos() {
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState(PLANS[1]!.id);
  const [method, setMethod] = useState(PAYMENT_METHODS[0]!.id);
  const [busy, setBusy] = useState(false);

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

  const { data: pedidos = [] } = useQuery({
    queryKey: ["my-payments"],
    queryFn: async () => {
      const { data } = await supabase
        .from("payment_requests")
        .select("*")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  async function copy(text: string) {
    await navigator.clipboard.writeText(text).catch(() => undefined);
    toast.success(`Número ${text} copiado!`);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const plan = planById(selected)!;
    setBusy(true);
    const { error } = await supabase.from("payment_requests").insert({
      user_id: user.id,
      plan: plan.name,
      amount: plan.price,
      method: PAYMENT_METHODS.find((m) => m.id === method)!.name,
      full_name: String(f.get("full_name") ?? "").trim(),
      phone: String(f.get("phone") ?? "").trim(),
      proof: String(f.get("proof") ?? "").trim(),
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    e.currentTarget.reset();
    void queryClient.invalidateQueries({ queryKey: ["my-payments"] });
    toast.success("Comprovativo enviado! A equipa RuJe IA vai confirmar o seu plano.");
  }

  return (
    <main className="mx-auto max-w-5xl px-5 py-8">
      <h1 className="text-3xl font-extrabold">Planos RuJe IA</h1>
      <p className="text-muted-foreground mt-1">
        Escolha o plano, faça o pagamento por Emola ou M-Pesa e envie o comprovativo.
      </p>

      {sub && (
        <div className="mt-5 rounded-2xl border border-primary bg-secondary/60 p-5">
          <p className="flex items-center gap-2 font-semibold">
            <Crown className="h-4 w-4 text-primary" /> Plano activo: {sub.plan}
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            {sub.daily_limit} trabalhos por dia · válido até{" "}
            {new Date(sub.expires_at).toLocaleDateString("pt-PT")}
          </p>
        </div>
      )}

      <div className="mt-7 grid gap-4 sm:grid-cols-3">
        {PLANS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setSelected(p.id)}
            className={`shadow-soft rounded-2xl border-2 bg-card p-6 text-left transition-colors ${
              selected === p.id ? "border-primary" : "border-border hover:border-primary/40"
            }`}
          >
            {p.highlight && (
              <span className="bg-brand rounded-full px-2.5 py-1 text-[11px] font-bold text-primary-foreground">
                Mais popular
              </span>
            )}
            <p className="mt-2 font-bold">{p.name}</p>
            <p className="mt-2 text-3xl font-extrabold">
              {p.price} <span className="text-base font-semibold">MT</span>
            </p>
            <p className="text-muted-foreground mt-1 text-sm">{p.days} dias de acesso</p>
            <p className="mt-3 flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-primary" /> {p.dailyLimit} trabalhos por dia
            </p>
            <p className="mt-1.5 flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-primary" /> Exportação PDF e Word
            </p>
            <p className="mt-1.5 flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-primary" /> Editor completo e partilha
            </p>
          </button>
        ))}
      </div>

      <section className="mt-10 grid gap-4 sm:grid-cols-2">
        {PAYMENT_METHODS.map((m) => (
          <div
            key={m.id}
            className={`shadow-soft rounded-2xl border-2 bg-card p-6 ${
              method === m.id ? "border-primary" : "border-border"
            }`}
          >
            <button type="button" onClick={() => setMethod(m.id)} className="text-left">
              <p className="text-lg font-bold">{m.name}</p>
              <p className="mt-1 text-2xl font-extrabold tracking-wide">{m.number}</p>
              {m.holder ? (
                <p className="text-muted-foreground mt-1 text-sm">Nome: {m.holder}</p>
              ) : null}
            </button>

            <Button variant="outline" className="mt-3 w-full" onClick={() => copy(m.number)}>
              <Copy className="h-4 w-4" /> Copiar número
            </Button>
          </div>
        ))}
      </section>

      <section className="shadow-soft mt-8 rounded-2xl border border-border bg-card p-6">
        <h2 className="text-lg font-bold">Confirmar pagamento</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Plano seleccionado: <strong>{planById(selected)!.name}</strong> · {planById(selected)!.price} MT ·
          pagamento via <strong>{PAYMENT_METHODS.find((m) => m.id === method)!.name}</strong>
        </p>
        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="full_name">Nome?</Label>
            <Input id="full_name" name="full_name" required placeholder="Nome completo" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Número?</Label>
            <Input id="phone" name="phone" required placeholder="84 000 0000" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="proof">Comprovativo da transacção</Label>
            <Textarea
              id="proof"
              name="proof"
              required
              rows={3}
              placeholder="Cole aqui a mensagem de confirmação ou o código da transacção"
            />
          </div>
          <Button type="submit" size="lg" className="shadow-brand w-full" disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Enviar comprovativo
          </Button>
        </form>
      </section>

      {pedidos.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-bold">Os meus pedidos</h2>
          <div className="mt-4 grid gap-3">
            {pedidos.map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-card p-4 text-sm"
              >
                <span className="font-semibold">
                  {p.plan} · {p.amount} MT · {p.method}
                </span>
                <span className="text-muted-foreground">
                  {new Date(p.created_at).toLocaleDateString("pt-PT")} ·{" "}
                  <strong className="capitalize">{p.status}</strong>
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
