import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessageCircle, GraduationCap, Sparkles } from "lucide-react";

type Answers = {
  institution: string;
  course: string;
  level: string;
  goal: string;
};

const LEVELS = ["Ensino Secundário", "Ensino Técnico", "Licenciatura", "Mestrado", "Doutoramento"];
const GOALS = [
  "Trabalhos escolares",
  "Trabalhos científicos",
  "Monografia / Tese",
  "Relatórios e artigos",
];

/**
 * Pequeno questionário mostrado logo após a criação da conta.
 * Guarda instituição e curso no perfil e encaminha para os planos.
 */
export function SignupQuiz({ onFinish }: { onFinish: () => void }) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [a, setA] = useState<Answers>({ institution: "", course: "", level: "", goal: "" });

  const total = 4;

  async function save() {
    setSaving(true);
    try {
      const { data } = await supabase.auth.getUser();
      const id = data.user?.id;
      if (id) {
        await supabase
          .from("profiles")
          .update({ institution: a.institution || null, course: a.course || null })
          .eq("id", id);
      }
    } catch {
      // Não bloqueia o utilizador se o perfil não puder ser actualizado.
    } finally {
      setSaving(false);
      setStep(total);
    }
  }

  return (
    <div className="shadow-soft w-full max-w-md rounded-2xl border border-border bg-card p-7">
      {step < total ? (
        <>
          <div className="flex items-center gap-2">
            <div className="bg-brand grid h-10 w-10 place-items-center rounded-xl text-primary-foreground">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <p className="font-extrabold">Conte-nos sobre si</p>
              <p className="text-muted-foreground text-xs">Passo {step + 1} de {total}</p>
            </div>
          </div>

          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="bg-brand h-full rounded-full transition-all"
              style={{ width: `${((step + 1) / total) * 100}%` }}
            />
          </div>

          <div className="mt-6 space-y-4">
            {step === 0 && (
              <div className="space-y-1.5">
                <Label htmlFor="q-inst">Onde estuda?</Label>
                <Input
                  id="q-inst"
                  autoFocus
                  placeholder="Ex.: Universidade Eduardo Mondlane"
                  value={a.institution}
                  onChange={(e) => setA({ ...a, institution: e.target.value })}
                />
              </div>
            )}

            {step === 1 && (
              <div className="space-y-1.5">
                <Label htmlFor="q-course">Qual é o seu curso?</Label>
                <Input
                  id="q-course"
                  autoFocus
                  placeholder="Ex.: Gestão de Empresas"
                  value={a.course}
                  onChange={(e) => setA({ ...a, course: e.target.value })}
                />
              </div>
            )}

            {step === 2 && (
              <div className="space-y-2">
                <Label>Qual é o seu nível académico?</Label>
                <div className="grid gap-2">
                  {LEVELS.map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setA({ ...a, level: l })}
                      className={`rounded-xl border-2 px-4 py-3 text-left text-sm font-medium transition-colors ${
                        a.level === l ? "border-primary bg-secondary/50" : "border-border hover:border-primary/40"
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-2">
                <Label>O que vai criar com a RuJe IA?</Label>
                <div className="grid gap-2">
                  {GOALS.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setA({ ...a, goal: g })}
                      className={`rounded-xl border-2 px-4 py-3 text-left text-sm font-medium transition-colors ${
                        a.goal === g ? "border-primary bg-secondary/50" : "border-border hover:border-primary/40"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 flex items-center gap-2">
            {step > 0 && (
              <Button variant="outline" onClick={() => setStep(step - 1)} disabled={saving}>
                Voltar
              </Button>
            )}
            <Button
              className="flex-1"
              disabled={saving}
              onClick={() => (step === total - 1 ? save() : setStep(step + 1))}
            >
              {step === total - 1 ? "Concluir" : "Continuar"}
            </Button>
          </div>

          <button
            type="button"
            onClick={save}
            className="text-muted-foreground mt-3 w-full text-xs underline"
          >
            Saltar por agora
          </button>
        </>
      ) : (
        <div className="text-center">
          <div className="bg-brand mx-auto grid h-14 w-14 place-items-center rounded-2xl text-primary-foreground">
            <Sparkles className="h-7 w-7" />
          </div>
          <h1 className="mt-5 text-2xl font-extrabold">Tudo pronto 🎉</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Escolha um plano para começar a gerar os seus trabalhos. Se quiser, entre também na nossa
            comunidade de WhatsApp para falar com outros estudantes.
          </p>
          <div className="mt-6 space-y-3">
            <Button className="w-full" size="lg" onClick={onFinish}>
              Ver planos e começar
            </Button>
            <Button asChild variant="outline" className="w-full">
              <a
                href="https://chat.whatsapp.com/CU2WmZIWDDvJURM2eqOtKT"
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="h-4 w-4" /> Comunidade WhatsApp
              </a>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
