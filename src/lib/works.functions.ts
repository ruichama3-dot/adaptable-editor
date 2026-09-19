import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { FREE_DAILY_LIMIT } from "@/lib/plans";

const GenerateInput = z.object({ workId: z.string().uuid() });

function buildPrompt(w: Record<string, unknown>) {
  const opt = (w['options'] ?? {}) as Record<string, boolean>;
  const f = (k: string) => (w[k] ? String(w[k]) : "—");
  const isGroup = String(w['work_mode'] ?? "individual") === "grupo";
  const manualRefs = String(w['references_mode'] ?? "automatica") === "manual";

  return `És um assistente académico especialista. Escreve um trabalho académico COMPLETO em ${f("language")}, do tipo "${f("work_type")}", nível ${f("academic_level")}, seguindo rigorosamente as normas ${f("norms")}.

DADOS:
- Tema: ${f("theme")}
- Título: ${f("title")}
- Modalidade: ${isGroup ? "TRABALHO EM GRUPO" : "TRABALHO INDIVIDUAL"}
${isGroup ? `- Elementos do grupo (lista numerada na folha de rosto): ${f("group_members")}` : `- Estudante: ${f("student_name")} (nº ${f("student_number")})`}
- Curso: ${f("course")} | Turma: ${f("class_group")} | Classe/Ano: ${f("grade_year")}
- Instituição: ${f("institution")} | Faculdade: ${f("faculty")} | Departamento: ${f("department")}
- Disciplina: ${f("subject")} | Docente: ${f("teacher")}
- Local: ${f("city")}, ${f("country")} | Data de entrega: ${f("due_date")}
- Extensão alvo: aproximadamente ${f("pages")} páginas (escreve texto extenso e denso, sem repetições).

ESTRUTURA OBRIGATÓRIA, por esta ordem:
${opt['cover'] === false ? "" : "1. Capa\n2. Folha de Rosto\n"}${opt['index'] === false ? "" : "3. Índice\n"}4. Introdução
5. Objetivo Geral
6. Objetivos Específicos
7. Fundamentação Teórica
8. Desenvolvimento (com subtítulos)
9. Metodologia
10. Resultados
11. Discussão
12. Conclusão
13. Recomendações
14. Referências Bibliográficas
15. Anexos (se aplicável)

REFERÊNCIAS BIBLIOGRÁFICAS:
${manualRefs
  ? `- O utilizador escolheu REFERÊNCIAS MANUAIS. Usa EXACTAMENTE e apenas as referências indicadas abaixo, formatando-as segundo as normas ${f("norms")}, e cita-as no corpo do texto:\n${f("manual_references")}`
  : `- Gera referências bibliográficas reais e credíveis segundo as normas ${f("norms")}${opt['citations'] === false ? "" : ", com citações no corpo do texto"}.`}

REGRAS DE SAÍDA:
- Devolve APENAS HTML simples do corpo do documento: <h1>, <h2>, <h3>, <p>, <ul>, <li>, <table>, <strong>. Sem markdown, sem \`\`\`, sem <html> ou <body>.
- SEPARAÇÃO EM PÁGINAS OBRIGATÓRIA: separa cada página com exactamente <hr class="page-break">. A capa é uma página; a folha de rosto é outra; o índice é outra; a introdução começa em página nova; a conclusão, as recomendações e as referências bibliográficas ficam cada uma em página própria. Distribui o desenvolvimento por várias páginas, com cerca de 350 a 450 palavras por página, até atingir aproximadamente ${f("pages")} páginas no total.
- A capa deve ser centrada com <p style="text-align:center"> contendo instituição, faculdade, departamento, curso, título, ${isGroup ? "a indicação \"Trabalho em grupo\"" : "estudante"}, docente, cidade e data.
${isGroup ? "- A folha de rosto deve conter a lista numerada dos elementos do grupo." : ""}
- Linguagem académica formal, rigorosa e original. Nada de texto de exemplo tipo "insira aqui".`;
}

function startOfTodayISO() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

const DEFAULT_GEMINI_KEY = "AQ.Ab8RN6L1wPvBFqHAyZYqGi948wEy-lI8K79IgCpMf2JVEakYeg";

async function callAI(prompt: string): Promise<string> {
  const geminiKey =
    process.env["GEMINI_API_KEY"] ||
    process.env["GOOGLE_API_KEY"] ||
    (process.env["LOVABLE_API_KEY"]?.startsWith("AQ.") || process.env["LOVABLE_API_KEY"]?.startsWith("AIza")
      ? process.env["LOVABLE_API_KEY"]
      : "") ||
    DEFAULT_GEMINI_KEY;

  if (geminiKey) {
    // Modelos Google Gemini com fallback automático em caso de sobrecarga (503/429/404)
    const models = ["gemini-3.5-flash", "gemini-3.6-flash", "gemini-3.8-flash", "gemini-3.1-flash-lite"];
    let lastError: Error | null = null;

    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 8192,
            },
          }),
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          if (res.status === 503 || res.status === 429 || res.status === 404) {
            lastError = new Error(`Modelo ${model} indisponível (${res.status}): ${errText}`);
            continue;
          }
          throw new Error(`Falha na geração com Gemini (${res.status}): ${errText}`);
        }

        const data = (await res.json()) as {
          candidates?: { content?: { parts?: { text?: string }[] } }[];
        };
        const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
        if (text.trim()) {
          return text;
        }
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        continue;
      }
    }

    if (lastError) {
      console.warn("Aviso na tentativa com modelos Gemini:", lastError.message);
    }
  }

  // Fallback para Lovable Gateway caso configurado e diferente da chave Gemini
  const lovableApiKey = process.env["LOVABLE_API_KEY"];
  if (lovableApiKey && !lovableApiKey.startsWith("AQ.") && !lovableApiKey.startsWith("AIza")) {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": lovableApiKey },
      body: JSON.stringify({
        model: "google/gemini-3.8-flash",
        stream: true,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (res.ok && res.body) {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let content = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const payload = trimmed.slice(5).trim();
          if (payload === "[DONE]") continue;
          try {
            const json = JSON.parse(payload) as {
              choices?: { delta?: { content?: string } }[];
            };
            content += json.choices?.[0]?.delta?.content ?? "";
          } catch {
            /* ignore partial chunks */
          }
        }
      }
      if (content.trim()) return content;
    }
  }

  throw new Error("Não foi possível comunicar com o serviço de IA. Tente novamente dentro de instantes.");
}

export const generateWork = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => GenerateInput.parse(d))
  .handler(async ({ data, context }) => {
    // Administradores têm acesso ilimitado.
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });

    if (!isAdmin) {
      const { data: subs } = await context.supabase
        .from("subscriptions")
        .select("daily_limit, expires_at")
        .gt("expires_at", new Date().toISOString())
        .order("expires_at", { ascending: false })
        .limit(1);

      const limit = subs?.[0]?.daily_limit ?? FREE_DAILY_LIMIT;

      if (!subs?.[0]) {
        throw new Error(
          "Precisa de um plano activo para criar trabalhos. Escolha um plano na página Planos.",
        );
      }

      const { count } = await context.supabase
        .from("works")
        .select("id", { count: "exact", head: true })
        .eq("user_id", context.userId)
        .neq("content", "")
        .gte("created_at", startOfTodayISO());

      if ((count ?? 0) >= limit) {
        throw new Error(
          `Atingiu o limite de ${limit} trabalhos por dia do seu plano. Tente novamente amanhã.`,
        );
      }
    }

    const { data: work, error } = await context.supabase
      .from("works")
      .select("*")
      .eq("id", data.workId)
      .single();
    if (error || !work) throw new Error("Trabalho não encontrado.");

    const rawContent = await callAI(buildPrompt(work as Record<string, unknown>));

    const html = rawContent
      .replace(/^```(?:html)?/i, "")
      .replace(/```$/i, "")
      .trim();
    if (!html) throw new Error("A IA não devolveu conteúdo. Tente novamente.");

    const { error: upErr } = await context.supabase
      .from("works")
      .update({ content: html })
      .eq("id", data.workId);
    if (upErr) throw new Error(upErr.message);

    return { content: html };
  });

