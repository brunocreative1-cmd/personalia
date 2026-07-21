# Auditoria — Personal IA 30 Dias OS (pré-Release 1)

Data: 2026-07-13 · Auditor: Claude (sessão autônoma Release 1)
Método: leitura integral do código + inspeção read-only do schema real via Session pooler (pg_class, pg_policies, pg_constraint, information_schema, pg_proc). Nenhuma escrita executada.

---

## 1. O QUE EXISTE

### 1.1 Stack e infraestrutura
- React 19 + Vite 8 + TypeScript 6 + Tailwind 4 (`@theme` em `src/index.css` com as cores da identidade: cream `#F0EDE6`, ink `#252320`, terracotta `#C4623A`, sage `#4A6B52`; Playfair Display + DM Sans via Google Fonts).
- Supabase: Auth (e-mail+senha com confirmação ativa) + Postgres com RLS.
- Produção: `https://app.wsdigital.site` (Hostinger, `public_html/app`), deploy via `npm run deploy` (FTPS, guarda anti-desastre).
- Backup: `npm run backup` diário agendado 12h (Task Scheduler), dumps em `C:\Users\willg\backups-personalia\`, 4 checagens de integridade + keep-alive. **Cobre apenas `profiles` e `alunos` — precisa ser estendido a cada tabela nova.**
- Lint: oxlint. Sem testes automatizados no repo.

### 1.2 Rotas e telas
| Rota | Tela | Guarda |
|---|---|---|
| `/auth` | Login/Signup (e-mail+senha apenas) | pública |
| `/` | Redirect por papel | sessão |
| `/coach` | Dashboard (contadores Total/Ativos/Novos) | `RoleGate coach` |
| `/coach/alunos` | Lista com busca | idem |
| `/coach/alunos/vincular` | Vincular aluno existente | idem |
| `/coach/alunos/:id` | Ficha com edição (status/objetivo/nível/data_inicio) | idem |
| `/aluno` | Painel único: Dia X de 30, barra, status, objetivo, nível | `RoleGate aluno` |
| `*` | redirect `/` | — |

### 1.3 Padrões de código relevantes
- **Acesso a dados**: `src/lib/api.ts` fala com PostgREST via `fetch` direto (token da sessão), NUNCA pelo query builder do supabase-js — contorna deadlock do navigator lock. Timeout 10s em tudo. `usePgQuery` para leitura com loading/erro/refetch.
- **Autorização**: fonte de verdade é `profiles.role`; `RoleGate` na UI + RLS no banco (defesa em profundidade). Nenhum e-mail hardcoded.
- **Datas**: `src/lib/dates.ts` — `progressoPrograma` (fuso America/Sao_Paulo) usado na visão do aluno; `diaDoCiclo` (fuso local) usado na visão do coach. Ciclo fixo de 30 dias.
- Mensagens de erro amigáveis; `Prefer: return=representation` para detectar RLS negando silenciosamente.

### 1.4 Banco real (inspecionado, não presumido)
**Tabelas: apenas `profiles` e `alunos`. RLS ativo em ambas.**

`profiles`: id uuid PK → auth.users ON DELETE CASCADE · role text NOT NULL DEFAULT 'aluno' CHECK (aluno|coach) · nome, whatsapp, cidade text · created_at.
`alunos`: id uuid PK · profile_id → profiles ON DELETE CASCADE · coach_id → profiles (NO ACTION) · status CHECK (novo|ativo|pausado|concluido) DEFAULT 'novo' · objetivo, nivel · data_inicio date NOT NULL DEFAULT CURRENT_DATE · data_fim date · created_at.

**Funções**: `is_coach(uuid)` (SECURITY DEFINER, STABLE) · `handle_new_user()` (trigger AFTER INSERT em auth.users → cria profile role='aluno' lendo `raw_user_meta_data->>'nome'/'whatsapp'/'cidade'`) · `set_aluno_data_fim()` (BEFORE INSERT/UPDATE em alunos: data_fim = data_inicio + 30) · `first_coach_id()` (não usado pelo app hoje) · `rls_auto_enable()` (event trigger: **toda CREATE TABLE em public ganha RLS automaticamente** — rede de segurança).

**Policies** (todas para `authenticated`, nenhuma `true` permissiva):
- profiles: select_own (id=uid) · select_coach_all (is_coach) · update_safe_own (id=uid, CHECK impede mudar o próprio role).
- alunos: select_own (profile_id=uid) · select_coach (is_coach ∧ coach_id=uid) · insert_coach (idem) · update_coach (idem).

**Grants em nível de COLUNA** (defesa extra além de RLS — anon tem ZERO grants):
- profiles: SELECT em tudo; UPDATE só em nome, whatsapp, cidade (role intocável até por grant).
- alunos: INSERT sem id/created_at; UPDATE só em status, objetivo, nivel, data_inicio, data_fim; SELECT em tudo.

**Dados vivos (PRESERVAR)**: coach Willian Sousa (`bab283a5…`) · **Caio** (`526bb55e…`, aluno vinculado, status novo, ciclo 13/07→12/08) · **Samuel** (`b896c789…`, profile role='aluno' AINDA SEM vínculo — candidato real, não é lixo de teste).

---

## 2. O QUE ESTÁ INCOMPLETO (para a visão do produto)

1. **Signup não envia metadados**: `AuthPage` chama `signUp({email, password})` sem `options.data` — `handle_new_user` já sabe ler `nome`/`whatsapp`, mas recebe null. Profiles nascem sem nome (Caio/Samuel foram preenchidos manualmente). → Bloco 1 é **só frontend, zero migration**.
2. **Não existe** estrutura de: anamnese, biblioteca de exercícios, programas, sessões, exercícios de sessão, execuções, séries executadas, alertas, observações privadas do coach.
3. Painel do aluno é uma tela única — não há navegação Hoje/Treino/Progresso.
4. Sem PWA (nenhum manifest/ícones instaláveis).
5. Sem pasta `migrations/` — o schema atual foi criado via Dashboard e não está versionado no repo.
6. `backup.mjs` cobre só as 2 tabelas atuais.

## 3. RISCOS

- **R1 (alto)**: qualquer tabela nova precisa de policies + **grants explícitos** (o padrão do projeto é grant por coluna; sem GRANT, PostgREST retorna 401/permission denied mesmo com policy certa). O `rls_auto_enable` garante RLS, não grants.
- **R2 (alto)**: dados sensíveis de saúde na anamnese (LGPD Art. 11) — exigem consentimento registrado com timestamp e policies restritas (aluno dono + coach vinculado; nunca `anon`).
- **R3 (médio)**: histórico de execuções não pode ser destruído por edição de programa — modelagem deve congelar o que foi executado (séries executadas guardam seus próprios valores, não referências mutáveis soltas).
- **R4 (médio)**: produção tem aluno real; deploy só com autorização explícita. Desenvolvimento em localhost:5173 (já nas Redirect URLs).
- **R5 (baixo)**: backup roda 12h; migrations aplicadas fora desse horário exigem `npm run backup` manual antes (protocolo já prevê).
- **R6 (baixo)**: `dist/` contém `.zip.zip` órfão (ignorado no deploy; remover no próximo build).

## 4. INCONSISTÊNCIAS ENCONTRADAS

- `dates.ts` tem dois calculadores de dia do ciclo (`progressoPrograma` em fuso São Paulo, `diaDoCiclo` em fuso local) — funcionalmente próximos, unificar quando conveniente (não bloqueia).
- Grant de UPDATE em `alunos.data_fim` é redundante (trigger recalcula quando data_inicio muda) — inofensivo, manter (regra: nada destrutivo).
- `first_coach_id()` sem uso no app — manter (pode servir a defaults futuros).
- README ainda é o template do Vite.

## 5. MIGRATIONS NECESSÁRIAS (todas ADITIVAS)

| # | Bloco | Objetos |
|---|---|---|
| 001 | 2 | `anamneses` (1:1 aluno, campos operacionais + consentimento timestamp + status) + policies + grants + índice |
| 002 | 3 | `exercicios` (biblioteca do coach, ativo/inativo) + policies + grants + índices |
| 003 | 4 | `programas`, `sessoes`, `sessao_exercicios` + policies (aluno só vê `status='publicado'`) + grants + índices |
| 004 | 6 | `execucoes`, `execucao_series`, `alertas` + policies + grants + índices |

Bloco 1 não precisa de migration (colunas de profiles existem; handle_new_user já lê metadata).
Cada migration: arquivo versionado em `migrations/` com rollback documentado, aplicada só após `npm run backup` verde, seguida de validação contra o schema real e atualização do `backup.mjs` no mesmo bloco.

## 6. DECISÕES RECOMENDADAS

1. **Baseline versionado**: criar `migrations/000_baseline.sql` (documentação do schema pré-existente, marcado NÃO-EXECUTÁVEL) para as próximas migrations terem contexto no repo.
2. **Modelagem relacional** (não JSONB): séries/cargas/execuções em linhas próprias com timestamps — pesquisável, comparável, progressão calculável, RLS granular, pronto para wearables no futuro. JSONB só em `dias_sugeridos` (array simples) se necessário.
3. **Semana como coluna** (`sessoes.semana int`) em vez de tabela `semanas` — programas de 30 dias têm ≤5 semanas; uma tabela extra só adiciona joins.
4. **Histórico imutável**: `execucao_series` copia carga/reps prescritas no momento da execução; `sessao_exercicios` não pode ser excluído se houver execução (verificação na aplicação + ON DELETE RESTRICT).
5. **Navegação do aluno**: bottom nav com Hoje / Treino / Progresso (Nutrição e Mente só no roadmap — sem botões mortos).
6. **Padrão de acesso**: continuar 100% em `api.ts` + fetch direto (nunca query builder), `usePgQuery` para leituras.
7. **Alerta de dor ≥7**: linha em `alertas` criada pelo próprio fluxo de execução do aluno (INSERT com policy própria), visível só ao coach vinculado e ao aluno dono.
