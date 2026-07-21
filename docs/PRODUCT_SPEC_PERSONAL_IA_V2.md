# Product Spec — Personal IA 30 Dias OS v2

Data: 2026-07-13 · Dono do produto: Willian Sousa (CREF 2904-G/GO) · Produção: https://app.wsdigital.site
Este documento NÃO é o projeto Corpo Lúcido.

## Visão

Transformar o app de um cadastro/acompanhamento de período em um **sistema de execução, adesão e acompanhamento** do programa de 30 dias. O aluno abre o app e sabe o que fazer hoje; o coach monta, publica e acompanha — a IA (futura) apenas sugere, o coach decide.

## Navegação do aluno (visão completa)

Bottom nav com 5 áreas: **Hoje · Treino · Nutrição · Mente · Progresso** (perfil pelo avatar).
Release 1 implementa **Hoje, Treino e o necessário de Progresso**. Nutrição e Mente não ganham telas nem botões até a Release 2 — nada de UI morta.

## Posicionamento profissional (limites permanentes)

O app NUNCA: prescreve plano alimentar individualizado · calcula/recomenda calorias ou macros · prescreve suplementos · faz diagnóstico psicológico ou testes psicológicos · oferece psicoterapia · substitui nutricionista, médico ou psicólogo · publica automaticamente conteúdo gerado por IA.
Nutrição = educação alimentar e hábitos. Mente = comportamento, disciplina e aderência. IA sugere → coach revisa, decide e publica.

## LGPD

Anamnese contém dados sensíveis de saúde (Art. 11): dores, lesões, medicamentos, condições. Regras: consentimento explícito com finalidade clara, checkbox **não pré-marcado**, timestamp gravado; sem consentimento, não salva. RLS restrita (aluno dono + coach vinculado). Política de privacidade: item do roadmap (Release 2). Fotos (futuras): bucket privado, nunca público.

---

## RELEASE 1 — Núcleo de Treino (esta execução)

| Bloco | Entrega | Migration |
|---|---|---|
| 1 | Cadastro com nome + WhatsApp obrigatórios (metadata → handle_new_user existente) | não |
| 2 | Anamnese operacional com consentimento LGPD; aluno edita a sua, coach vê a dos vinculados | 001 `anamneses` |
| 3 | Biblioteca de exercícios do coach (CRUD, busca, filtro, ativo/inativo) | 002 `exercicios` |
| 4 | Programas → sessões (semana como coluna) → exercícios da sessão; rascunho/publicado/pausado/concluido; aluno só vê publicado | 003 `programas`, `sessoes`, `sessao_exercicios` |
| 5 | Tela Hoje: saudação, Dia X de 30, treino do dia, iniciar treino, últimas atividades, empty states úteis; bottom nav Hoje/Treino/Progresso | não |
| 6 | Player de execução: séries/carga/reps por série, esforço 1–10, dor 0–10 (≥7 → orientação de parar + alerta ao coach), status parcial/concluído/abandonado | 004 `execucoes`, `execucao_series`, `alertas` |
| 7 | Histórico do aluno (frequência, sessões, evolução de carga) + acompanhamento na ficha do coach (planejado×realizado, alertas, dor) | não |
| — | Check-in básico = card "próximo check-in" na tela Hoje (dado do ciclo), sem estrutura própria nesta release | não |
| — | PWA básica: manifest + ícones + instalável | não |

Modelagem: relacional, execução granular por série com timestamps (histórico imutável — o que foi executado congela valores; portas abertas para wearables SEM implementar nada disso agora). JSONB apenas para `dias_sugeridos` (array). WhatsApp: botão "falar com o coach" usando o whatsapp do coach já armazenado — sem expor dados de terceiros, sem chat interno.

## RELEASE 2 — Nutrição Prática + Mente e Consistência

- Missões diárias de nutrição (educação alimentar, hábitos; sem dieta, sem calorias).
- Mente: atividades de consistência, hábitos, conteúdos curtos.
- Check-ins estruturados (peso/medidas/fotos com consentimento).
- Fotos privadas (bucket privado Supabase Storage + policies por dono).
- Progresso ampliado (hábitos + treino).
- Política de privacidade publicada no app.

## RELEASE 3 — Escala e inteligência

- Modelos de programa duplicáveis (templates).
- Alertas inteligentes (inatividade, dor recorrente, queda de aderência).
- Resumo semanal gerado por IA → rascunho para o coach revisar e enviar.
- Sugestão de ajustes de treino (IA sugere, coach decide).
- Relatório de encerramento dos 30 dias + fluxo de renovação.
- Notificações push + PWA aprimorada (offline básico).

## FORA DE ESCOPO (explícito, todas as releases planejadas)

Pagamento no app · smartwatch/wearables · prescrição alimentar · diagnóstico psicológico · chat interno · rede social · ranking público · marketplace · geração e publicação autônoma de treino por IA.

## Critérios transversais de qualidade

Mobile-first 360px · identidade WS Digital (cream/ink/terracotta/sage, Playfair + DM Sans) · estados de loading/vazio/erro em toda tela · confirmação antes de ação destrutiva · sem policy RLS `true` · sem service_role no frontend · migrations aditivas versionadas com rollback documentado · backup cobre toda tabela nova no mesmo bloco.
