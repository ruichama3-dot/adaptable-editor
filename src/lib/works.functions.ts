import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/auth-guard";
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

/** Modelos reais da API pública do Google Gemini, por ordem de preferência. */
const GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-flash-latest",
  "gemini-2.5-pro",
];

/** Todas as chaves candidatas, lidas apenas do servidor (nunca VITE_*). */
function readKeys() {
  const env = (n: string) => process.env[n]?.trim() ?? "";
  const all = [
    env("GEMINI_API_KEY"),
    env("GOOGLE_API_KEY"),
    env("GOOGLE_GENERATIVE_AI_API_KEY"),
    env("LOVABLE_API_KEY"),
  ].filter(Boolean);

  // Chaves da Google AI Studio começam por "AIza"; as do gateway Lovable por "AQ.".
  const geminiKey = all.find((k) => k.startsWith("AIza")) ?? "";
  const gatewayKey = all.find((k) => k.startsWith("AQ.")) ?? "";
  return { geminiKey, gatewayKey };
}

async function callGemini(prompt: string, apiKey: string): Promise<string> {
  const errors: string[] = [];

  for (const model of GEMINI_MODELS) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 8192 },
          }),
        },
      );

      if (!res.ok) {
        const errText = (await res.text().catch(() => "")).slice(0, 300);
        if (res.status === 400 || res.status === 401 || res.status === 403) {
          throw new Error(
            "A chave da API Gemini é inválida ou não tem permissões. Verifique a variável GEMINI_API_KEY no seu projecto (e na Vercel).",
          );
        }
        errors.push(`${model}: ${res.status} ${errText}`);
        continue;
      }

      const data = (await res.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
      if (text.trim()) return text;
      errors.push(`${model}: resposta vazia`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.startsWith("A chave da API Gemini")) throw err;
      errors.push(`${model}: ${message}`);
    }
  }

  console.error("[IA] Falha em todos os modelos Gemini:", errors.join(" | "));
  return "";
}

async function callLovableGateway(prompt: string, apiKey: string): Promise<string> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
    body: JSON.stringify({
      model: "google/gemini-3-flash",
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const errText = (await res.text().catch(() => "")).slice(0, 300);
    if (res.status === 429) throw new Error("Demasiados pedidos em simultâneo. Tente novamente dentro de instantes.");
    if (res.status === 402) throw new Error("Créditos de IA esgotados. Recarregue para continuar a gerar trabalhos.");
    console.error("[IA] Falha no gateway:", res.status, errText);
    return "";
  }

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content ?? "";
}

async function callAI(prompt: string): Promise<string> {
  const geminiKey = readGeminiKey();
  const lovableKey = process.env["LOVABLE_API_KEY"]?.trim();
  const gatewayKey =
    lovableKey && !lovableKey.startsWith("AIza") && !lovableKey.startsWith("AQ.") ? lovableKey : "";

  if (!geminiKey && !gatewayKey) {
    throw new Error(
      "Nenhuma chave de IA configurada. Adicione a variável GEMINI_API_KEY nas definições do projecto (e na Vercel) e tente novamente.",
    );
  }

  if (geminiKey) {
    const text = await callGemini(prompt, geminiKey);
    if (text.trim()) return text;
  }

  if (gatewayKey) {
    const text = await callLovableGateway(prompt, gatewayKey);
    if (text.trim()) return text;
  }

  throw new Error(
    "O serviço de IA não respondeu. Tente novamente dentro de instantes — se persistir, verifique a chave GEMINI_API_KEY.",
  );
}


export const generateWork = createServerFn({ method: "POST" })
  .middleware([requireAuth])
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

