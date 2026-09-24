# Roadmap — RuJe IA

## Concluído
- [x] Autenticação resiliente (auth-guard.ts, auth-attach.ts) — validar em produção
- [x] Geração de trabalhos com Gemini (models: gemini-3.6-flash primeiro)
- [x] Administrador com acesso ilimitado (access.ts: has_role + fallback user_roles)
- [x] Pagamento aprovado → acesso ao plano comprado (validade desde a aprovação)
- [x] Botão instalar PWA no painel; logo actualizada; PWA persistente
- [x] Quiz pós-registo → planos; overlay "A gerar o seu trabalho…"

## Em curso
- [ ] Esconder selo "Edit with Lovable" (CSS adicionado a styles.css — definição oficial exige plano Pro)
- [ ] Typecheck e verificação final dos fluxos de acesso

## Bloqueado / depende do utilizador
- [ ] Vercel: GEMINI_API_KEY + LOVABLE_API_KEY em Settings → Environment Variables; redeploy
- [ ] Selo da Lovable via definição oficial — exige plano Pro (workaround CSS aplicado)
