-- ============================================================================
-- 007_conformidade_542.sql
-- Camada de conformidade CONFEF 542/2024 (Bloco B) — Personal IA 30 Dias OS
--
-- PRINCÍPIOS:
--   * Exclusivamente ADITIVA: nenhum objeto existente é alterado/destruído.
--   * Triggers que MUDAM comportamento de tabelas existentes nascem DESLIGADOS.
--     Sequência: criar (007) -> backfill honesto -> ligar (007b).
--   * Imutabilidade de termos/consentimentos/publicações: sem grant de UPDATE/DELETE.
--   * Hash e versão do termo/snapshot: derivados no SERVIDOR (nunca do front).
--
-- REQUISITOS 542: Art.4 I (teleconsulta <=30d), Art.4 II (teleaula pós-avaliacao),
-- Art.7 (registro: data/forma/modalidade, anamnese, objetivos, metadados,
-- programa periodizado assinado c/ nome+registro), Art.8 (TCLE + guarda),
-- Art.9 (aceite eletronico registrado), Art.11 (nome+CREF visivel).
-- ============================================================================

-- [PATCH search_path 1/4] pgcrypto no schema extensions (layout do Supabase) e
-- search_path da SESSÃO da migration incluindo extensions — o seed do TCLE
-- abaixo chama digest() sem qualificação e precisa resolver mesmo quando a
-- sessão nasce com search_path=public.
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
set search_path = public, extensions;

-- ----------------------------------------------------------------------------
-- 1. COLUNAS NOVAS EM TABELAS EXISTENTES (aditivas, nullable)
-- ----------------------------------------------------------------------------
alter table public.profiles   add column if not exists cref text;
alter table public.programas   add column if not exists atendimento_id uuid;   -- FK adicionada após criar atendimentos

-- ----------------------------------------------------------------------------
-- 2. TABELA termos — fonte canônica do TCLE (imutável; hash server-side)
-- ----------------------------------------------------------------------------
create table if not exists public.termos (
  id         uuid primary key default gen_random_uuid(),
  tipo       text not null check (tipo in ('tcle_telessaude','lgpd_saude','uso_imagem_marketing')),
  versao     text not null,
  titulo     text not null,
  corpo      text not null,
  corpo_hash text not null,                       -- sha256(corpo), calculado abaixo pelo banco
  vigente    boolean not null default true,
  created_at timestamptz not null default now(),
  unique (tipo, versao)
);

-- Seed do TCLE v1.0 (Anexo I da 542 adaptado). Hash calculado pelo BANCO.
insert into public.termos (tipo, versao, titulo, corpo, corpo_hash, vigente)
select 'tcle_telessaude', '1.0',
  'TCLE — Serviço de Atividade Física à Distância (Personal IA 30 Dias)',
  $TCLE$TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO — SERVICO DE ATIVIDADE FISICA A DISTANCIA
Personal IA 30 Dias · Versao 1.0
Profissional responsavel: Willian Sousa — Profissional de Educacao Fisica · CREF 2904-G/GO
Base normativa: Resolucao CONFEF no 542/2024

1. Devo transmitir dados e informacoes veridicas e completas que subsidiarao a avaliacao e a prestacao dos servicos a distancia.
2. Devo estar em ambiente apropriado, com privacidade, seguranca e humanizacao, sem interferencia de outros.
3. A forma de realizacao, a continuidade e a remuneracao ocorrerao conforme acordo previo entre o Profissional e eu.
4. Quando envolver compartilhamento de dados pessoais e sensiveis, o atendimento NAO podera ser gravado nem compartilhado em audios, imagens, videos ou capturas de tela por nenhuma das partes (LGPD 13.709/2018).
5. Nas situacoes que nao envolvam dados sensiveis e que necessitem de gravacao, estas serao previamente acordadas e formalizadas entre as partes.
6. Os meios tecnologicos de comunicacao a distancia deverao ter funcionamento garantido por ambas as partes.
7. Tenho autonomia para optar pela modalidade de atendimento que melhor me convier entre as indicadas pelo Profissional.
8. Este servico e de ORIENTACAO DE EXERCICIO FISICO e NAO constitui atendimento medico, diagnostico ou tratamento, nao substituindo avaliacao medica. Fui orientado a buscar liberacao medica antes de iniciar, especialmente se assinalei SIM em qualquer item do PAR-Q+, sendo obrigatoria a liberacao obstetrica em caso de gestacao.
9. Minha prescricao e individualizada, identificada com nome e registro do profissional, e tem validade maxima de 30 dias, exigindo nova avaliacao antes de qualquer renovacao.
10. A avaliacao sera por videochamada ao vivo (sem gravacao), presencial ou por envio de fotos/videos exclusivamente pela area privada do aplicativo; devo interromper e comunicar em caso de dor, tontura, falta de ar anormal, desconforto no peito ou mal-estar.

Declaro ter recebido as orientacoes, com compreensao e aceitacao integral dos termos, podendo solicitar esclarecimentos e copia dos meus dados a qualquer momento (Art. 8 par.1).$TCLE$,
  encode(digest(
  $TCLE$TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO — SERVICO DE ATIVIDADE FISICA A DISTANCIA
Personal IA 30 Dias · Versao 1.0
Profissional responsavel: Willian Sousa — Profissional de Educacao Fisica · CREF 2904-G/GO
Base normativa: Resolucao CONFEF no 542/2024

1. Devo transmitir dados e informacoes veridicas e completas que subsidiarao a avaliacao e a prestacao dos servicos a distancia.
2. Devo estar em ambiente apropriado, com privacidade, seguranca e humanizacao, sem interferencia de outros.
3. A forma de realizacao, a continuidade e a remuneracao ocorrerao conforme acordo previo entre o Profissional e eu.
4. Quando envolver compartilhamento de dados pessoais e sensiveis, o atendimento NAO podera ser gravado nem compartilhado em audios, imagens, videos ou capturas de tela por nenhuma das partes (LGPD 13.709/2018).
5. Nas situacoes que nao envolvam dados sensiveis e que necessitem de gravacao, estas serao previamente acordadas e formalizadas entre as partes.
6. Os meios tecnologicos de comunicacao a distancia deverao ter funcionamento garantido por ambas as partes.
7. Tenho autonomia para optar pela modalidade de atendimento que melhor me convier entre as indicadas pelo Profissional.
8. Este servico e de ORIENTACAO DE EXERCICIO FISICO e NAO constitui atendimento medico, diagnostico ou tratamento, nao substituindo avaliacao medica. Fui orientado a buscar liberacao medica antes de iniciar, especialmente se assinalei SIM em qualquer item do PAR-Q+, sendo obrigatoria a liberacao obstetrica em caso de gestacao.
9. Minha prescricao e individualizada, identificada com nome e registro do profissional, e tem validade maxima de 30 dias, exigindo nova avaliacao antes de qualquer renovacao.
10. A avaliacao sera por videochamada ao vivo (sem gravacao), presencial ou por envio de fotos/videos exclusivamente pela area privada do aplicativo; devo interromper e comunicar em caso de dor, tontura, falta de ar anormal, desconforto no peito ou mal-estar.

Declaro ter recebido as orientacoes, com compreensao e aceitacao integral dos termos, podendo solicitar esclarecimentos e copia dos meus dados a qualquer momento (Art. 8 par.1).$TCLE$::bytea,
  'sha256'),'hex'),
  true
where not exists (select 1 from public.termos where tipo='tcle_telessaude' and versao='1.0');

-- ----------------------------------------------------------------------------
-- 3. TABELA consentimentos — aceite referencia termo_id (imutável)
-- ----------------------------------------------------------------------------
create table if not exists public.consentimentos (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id),
  termo_id   uuid not null references public.termos(id),
  metodo     text not null default 'eletronico' check (metodo in ('eletronico','gravacao_voz','gravacao_texto')),
  aceito_em  timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (profile_id, termo_id)
);

-- ----------------------------------------------------------------------------
-- 4. TABELA atendimentos — registro da avaliação (Art.7)
-- ----------------------------------------------------------------------------
create table if not exists public.atendimentos (
  id           uuid primary key default gen_random_uuid(),
  aluno_id     uuid not null references public.alunos(id),
  coach_id     uuid not null references public.profiles(id),
  tipo         text not null check (tipo in ('teleconsulta','presencial','reavaliacao')),
  forma        text not null check (forma in ('sincrona','assincrona','presencial')),
  canal        text not null check (canal in ('whatsapp_video','aplicativo','presencial')),
  avaliacao_metodo text not null check (avaliacao_metodo in
                 ('video_ao_vivo','fotos_assincronas','videos_assincronos','presencial','combinada')),
  modalidade   text not null default 'personalizada' check (modalidade in ('personalizada','coletiva','generica')),
  anamnese_analisada boolean not null default false,
  objetivos    text,
  equipamentos text,
  limitacoes   text,
  avaliacao_profissional text,
  decisao      text not null default 'pendente' check (decisao in ('liberado','pendente','encaminhado')),
  decidido_em  timestamptz,
  validade_dias int not null default 30 check (validade_dias between 1 and 30),   -- ponto 5
  realizado_em timestamptz not null,
  registrado_em timestamptz not null default now(),
  registro_retroativo boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create trigger atendimentos_set_updated before update on public.atendimentos
  for each row execute function public.set_updated_at();

-- FK tardia programas.atendimento_id -> atendimentos(id)
do $$ begin
  if not exists (select 1 from pg_constraint where conname='programas_atendimento_fk') then
    alter table public.programas
      add constraint programas_atendimento_fk foreign key (atendimento_id) references public.atendimentos(id);
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 5. TABELA triagens_parq — histórico por ciclo; escrita separada por autor
-- ----------------------------------------------------------------------------
create table if not exists public.triagens_parq (
  id            uuid primary key default gen_random_uuid(),
  aluno_id      uuid not null references public.alunos(id),
  atendimento_id uuid references public.atendimentos(id),
  respostas     jsonb not null,                    -- ALUNO grava
  gestante      boolean not null default false,    -- ALUNO grava
  alguma_positiva boolean,                          -- BANCO deriva
  liberacao_obstetrica_em timestamptz,             -- COACH grava
  aplicada_em   timestamptz not null default now(),-- BANCO
  aplicada_por  uuid,                               -- BANCO (auth.uid no insert)
  created_at    timestamptz not null default now()
);

-- Deriva positividade a partir das respostas (qualquer valor "sim"/true)
create or replace function public.parq_tem_positiva(r jsonb) returns boolean
language sql immutable as $$
  select coalesce(bool_or(
    case jsonb_typeof(v)
      when 'boolean' then v::text::boolean
      else lower(coalesce(v #>> '{}','')) in ('sim','true','yes','1')
    end), false)
  from jsonb_each(case when jsonb_typeof(r)='object' then r else '{}'::jsonb end) as e(k,v)
$$;

-- Autoria/derivação: aluno só (respostas,gestante); coach só (liberacao,atendimento);
-- alguma_positiva e aplicada_por sempre pelo banco. (Um único role 'authenticated'
-- no Supabase => separação por trigger, não por column-grant.)
-- [PATCH search_path 2/4] SECURITY DEFINER com search_path fixo (anti-hijack;
-- roda correto mesmo com sessão em search_path=public)
create or replace function public.triagens_parq_autoria() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.aplicada_por    := auth.uid();
    new.alguma_positiva := public.parq_tem_positiva(new.respostas);
    return new;
  end if;
  -- UPDATE
  if public.is_coach(auth.uid()) then
    new.respostas := old.respostas;          -- coach não reescreve respostas do aluno
    new.gestante  := old.gestante;
  else
    new.liberacao_obstetrica_em := old.liberacao_obstetrica_em;  -- aluno não se autolibera
    new.atendimento_id          := old.atendimento_id;
  end if;
  new.alguma_positiva := public.parq_tem_positiva(new.respostas);
  new.aplicada_por    := old.aplicada_por;   -- autor imutável
  return new;
end $$;
create trigger triagens_parq_autoria_trg before insert or update on public.triagens_parq
  for each row execute function public.triagens_parq_autoria();

-- ----------------------------------------------------------------------------
-- 6. TABELA programa_publicacoes — prescrição imutável versionada (pontos 1,2)
-- ----------------------------------------------------------------------------
create table if not exists public.programa_publicacoes (
  id            uuid primary key default gen_random_uuid(),
  programa_id   uuid not null references public.programas(id),
  atendimento_id uuid references public.atendimentos(id),
  coach_id      uuid not null references public.profiles(id),
  coach_nome    text,
  coach_cref    text,
  versao        int  not null,
  snapshot_json jsonb not null,
  conteudo_hash text not null,
  publicado_em  timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  unique (programa_id, versao)
);

-- ----------------------------------------------------------------------------
-- 7. FUNÇÃO montar_snapshot_programa — congela tudo (ponto 2)
--    Usa to_jsonb(*) para capturar TODAS as colunas (series,reps,carga,
--    intervalo,cadencia,rpe,observacoes,...) sem enumerar nomes.
-- ----------------------------------------------------------------------------
-- [PATCH search_path 3/4] SECURITY DEFINER com search_path fixo
create or replace function public.montar_snapshot_programa(p_programa_id uuid, p_programa jsonb default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_aluno_profile uuid; v_prog jsonb;
begin
  select a.profile_id into v_aluno_profile
    from public.programas pr join public.alunos a on a.id = pr.aluno_id
    where pr.id = p_programa_id;

  v_prog := coalesce(p_programa, (select to_jsonb(pr.*) from public.programas pr where pr.id=p_programa_id));

  return jsonb_build_object(
    'programa',    v_prog,
    'anamnese',    (select to_jsonb(an.*) from public.anamneses an where an.profile_id = v_aluno_profile),
    'atendimento', (select to_jsonb(at.*) from public.atendimentos at
                      where at.id = (v_prog->>'atendimento_id')::uuid),
    'sessoes', (
      select jsonb_agg(jsonb_build_object(
                'sessao', to_jsonb(s.*),
                'exercicios', (select jsonb_agg(to_jsonb(se.*) order by se.ordem)
                                 from public.sessao_exercicios se where se.sessao_id = s.id)
              ) order by s.semana, s.ordem)   -- ordenacao real do app: semana + ordem
      from public.sessoes s where s.programa_id = p_programa_id
    ),
    'congelado_em', now()
  );
end $$;

-- ----------------------------------------------------------------------------
-- 8. TRIGGER de publicação (gate) — INSERT e UPDATE (ponto 3) — nasce DESLIGADO
-- ----------------------------------------------------------------------------
-- [PATCH search_path 4/4] SECURITY DEFINER com search_path fixo INCLUINDO
-- extensions: o gate chama digest() e dispara via PostgREST (sessão em public)
create or replace function public.programas_publicar() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare v_at public.atendimentos%rowtype;
        v_aluno_profile uuid; v_cref text; v_nome text; v_snap jsonb; v_ver int;
begin
  if new.status <> 'publicado' then return new; end if;
  if tg_op='UPDATE' and old.status = 'publicado' then return new; end if;  -- já publicado

  if new.atendimento_id is null then
    raise exception '542: publicacao exige atendimento_id (Art.4 II: teleaula so apos avaliacao)';
  end if;
  select * into v_at from public.atendimentos where id = new.atendimento_id;
  if not found then raise exception '542: atendimento_id inexistente'; end if;
  if v_at.aluno_id <> new.aluno_id then raise exception '542: atendimento e de outro aluno'; end if;
  if v_at.decisao <> 'liberado' then raise exception '542: atendimento sem decisao "liberado"'; end if;

  select nome, cref into v_nome, v_cref from public.profiles where id = new.coach_id;
  if v_cref is null then raise exception '542 Art.7/11: coach sem CREF cadastrado'; end if;

  select a.profile_id into v_aluno_profile from public.alunos a where a.id = new.aluno_id;
  if not exists (select 1 from public.consentimentos c join public.termos t on t.id=c.termo_id
                 where c.profile_id = v_aluno_profile and t.tipo='tcle_telessaude' and t.vigente) then
    raise exception '542 Art.8: aluno sem TCLE de telessaude aceito';
  end if;

  if new.data_inicio is null or new.data_fim is null then
    raise exception '542 Art.7: data_inicio e data_fim obrigatorias na publicacao';
  end if;
  if new.data_inicio < v_at.realizado_em::date then
    raise exception '542: data_inicio anterior a realizado_em do atendimento';
  end if;
  if new.data_fim < new.data_inicio then
    raise exception '542: data_fim anterior a data_inicio';
  end if;
  if new.data_fim > v_at.realizado_em::date + v_at.validade_dias then
    raise exception '542 Art.4 I: prescricao excede validade (<= realizado_em + % dias)', v_at.validade_dias;
  end if;

  v_snap := public.montar_snapshot_programa(new.id, to_jsonb(new));
  select coalesce(max(versao),0)+1 into v_ver from public.programa_publicacoes where programa_id=new.id;
  insert into public.programa_publicacoes
    (programa_id, atendimento_id, coach_id, coach_nome, coach_cref, versao, snapshot_json, conteudo_hash)
  values (new.id, new.atendimento_id, new.coach_id, v_nome, v_cref, v_ver, v_snap,
          encode(digest(v_snap::text::bytea,'sha256'),'hex'));
  return new;
end $$;
create trigger programas_publicar_trg before insert or update on public.programas
  for each row execute function public.programas_publicar();
alter table public.programas disable trigger programas_publicar_trg;   -- LIGAR só após backfill

-- ----------------------------------------------------------------------------
-- 9. BLOQUEIO de alteração após publicação (ponto/correção 1) — nasce DESLIGADO
-- ----------------------------------------------------------------------------
create or replace function public.programas_bloqueia_pos_publicacao() returns trigger
language plpgsql as $$
begin
  if tg_op='DELETE' then
    if old.status='publicado' then raise exception '542: programa publicado nao pode ser excluido'; end if;
    return old;
  end if;
  if old.status='publicado' then
    if (new.titulo,new.objetivo,new.descricao,new.data_inicio,new.data_fim,new.atendimento_id,new.aluno_id,new.coach_id)
       is distinct from
       (old.titulo,old.objetivo,old.descricao,old.data_inicio,old.data_fim,old.atendimento_id,old.aluno_id,old.coach_id)
    then raise exception '542: conteudo de programa publicado e imutavel (crie novo ciclo)'; end if;
  end if;
  return new;
end $$;
create trigger programas_bloqueia_pos_pub_trg before update or delete on public.programas
  for each row execute function public.programas_bloqueia_pos_publicacao();
alter table public.programas disable trigger programas_bloqueia_pos_pub_trg;

create or replace function public.filhos_bloqueia_pos_publicacao() returns trigger
language plpgsql as $$
declare v_prog_id uuid; v_status text;
begin
  if tg_table_name = 'sessoes' then
    v_prog_id := coalesce(new.programa_id, old.programa_id);
  else -- sessao_exercicios
    select s.programa_id into v_prog_id from public.sessoes s
      where s.id = coalesce(new.sessao_id, old.sessao_id);
  end if;
  select status into v_status from public.programas where id = v_prog_id;
  if v_status = 'publicado' then
    raise exception '542: sessoes/exercicios de programa publicado sao imutaveis';
  end if;
  return coalesce(new, old);
end $$;
create trigger sessoes_bloqueia_pos_pub_trg before insert or update or delete on public.sessoes
  for each row execute function public.filhos_bloqueia_pos_publicacao();
alter table public.sessoes disable trigger sessoes_bloqueia_pos_pub_trg;
create trigger se_bloqueia_pos_pub_trg before insert or update or delete on public.sessao_exercicios
  for each row execute function public.filhos_bloqueia_pos_publicacao();
alter table public.sessao_exercicios disable trigger se_bloqueia_pos_pub_trg;

-- ----------------------------------------------------------------------------
-- 10. IMUTABILIDADE de atendimentos/triagens utilizados (correção 2) — DESLIGADO
-- ----------------------------------------------------------------------------
create or replace function public.atendimento_imutavel_se_usado() returns trigger
language plpgsql as $$
begin
  if exists (select 1 from public.programa_publicacoes p where p.atendimento_id = old.id) then
    raise exception '542: atendimento utilizado em publicacao e imutavel';
  end if;
  return coalesce(new, old);
end $$;
create trigger atendimento_imutavel_trg before update or delete on public.atendimentos
  for each row execute function public.atendimento_imutavel_se_usado();
alter table public.atendimentos disable trigger atendimento_imutavel_trg;

create or replace function public.triagem_imutavel_se_usada() returns trigger
language plpgsql as $$
begin
  if old.atendimento_id is not null
     and exists (select 1 from public.programa_publicacoes p where p.atendimento_id = old.atendimento_id) then
    raise exception '542: triagem vinculada a atendimento publicado e imutavel';
  end if;
  return coalesce(new, old);
end $$;
create trigger triagem_imutavel_trg before update or delete on public.triagens_parq
  for each row execute function public.triagem_imutavel_se_usada();
alter table public.triagens_parq disable trigger triagem_imutavel_trg;

-- ----------------------------------------------------------------------------
-- 11. RLS das tabelas novas (espelha padrão is_coach() + vínculo em alunos)
-- ----------------------------------------------------------------------------
alter table public.termos              enable row level security;
alter table public.consentimentos      enable row level security;
alter table public.atendimentos        enable row level security;
alter table public.triagens_parq       enable row level security;
alter table public.programa_publicacoes enable row level security;

-- termos: leitura do vigente
create policy termos_sel on public.termos for select to authenticated using (vigente);

-- consentimentos: aluno insere/le o seu; coach le dos vinculados; ninguem edita/apaga
create policy cons_ins_self on public.consentimentos for insert to authenticated
  with check (profile_id = auth.uid());
create policy cons_sel on public.consentimentos for select to authenticated
  using (profile_id = auth.uid()
         or exists (select 1 from public.alunos a where a.profile_id = consentimentos.profile_id and a.coach_id = auth.uid()));

-- atendimentos: coach ALL dos seus alunos; aluno SELECT do seu
create policy atend_coach_all on public.atendimentos for all to authenticated
  using (exists (select 1 from public.alunos a where a.id = atendimentos.aluno_id and a.coach_id = auth.uid()))
  with check (exists (select 1 from public.alunos a where a.id = atendimentos.aluno_id and a.coach_id = auth.uid()));
create policy atend_aluno_sel on public.atendimentos for select to authenticated
  using (exists (select 1 from public.alunos a where a.id = atendimentos.aluno_id and a.profile_id = auth.uid()));

-- triagens_parq: aluno insert/select/update do seu; coach select/update dos vinculados
create policy triagem_aluno_ins on public.triagens_parq for insert to authenticated
  with check (exists (select 1 from public.alunos a where a.id = triagens_parq.aluno_id and a.profile_id = auth.uid()));
create policy triagem_aluno_sel on public.triagens_parq for select to authenticated
  using (exists (select 1 from public.alunos a where a.id = triagens_parq.aluno_id and a.profile_id = auth.uid()));
create policy triagem_aluno_upd on public.triagens_parq for update to authenticated
  using (exists (select 1 from public.alunos a where a.id = triagens_parq.aluno_id and a.profile_id = auth.uid()));
create policy triagem_coach_sel on public.triagens_parq for select to authenticated
  using (exists (select 1 from public.alunos a where a.id = triagens_parq.aluno_id and a.coach_id = auth.uid()));
create policy triagem_coach_upd on public.triagens_parq for update to authenticated
  using (exists (select 1 from public.alunos a where a.id = triagens_parq.aluno_id and a.coach_id = auth.uid()));

-- programa_publicacoes: leitura coach/aluno; escrita só via trigger SECURITY DEFINER
create policy pub_coach_sel on public.programa_publicacoes for select to authenticated
  using (coach_id = auth.uid()
         or exists (select 1 from public.programas pr join public.alunos a on a.id=pr.aluno_id
                    where pr.id = programa_publicacoes.programa_id and a.profile_id = auth.uid()));

-- ----------------------------------------------------------------------------
-- 12. GRANTS (anon: nada). cref sem grant de UPDATE ao front (ponto 7).
-- ----------------------------------------------------------------------------
-- Padrão do projeto: grants POR COLUNA + anon zero. Colunas derivadas/banco ficam fora.
grant select on public.termos to authenticated;                       -- só leitura

grant select on public.consentimentos to authenticated;               -- sem update/delete => imutável
grant insert (profile_id, termo_id, metodo) on public.consentimentos to authenticated;

grant select on public.atendimentos to authenticated;                 -- RLS filtra linhas; sem delete (trilha de auditoria)
grant insert (aluno_id, coach_id, tipo, forma, canal, avaliacao_metodo, modalidade,
              anamnese_analisada, objetivos, equipamentos, limitacoes, avaliacao_profissional,
              decisao, decidido_em, validade_dias, realizado_em, registro_retroativo)
  on public.atendimentos to authenticated;
grant update (tipo, forma, canal, avaliacao_metodo, modalidade, anamnese_analisada,
              objetivos, equipamentos, limitacoes, avaliacao_profissional, decisao,
              decidido_em, validade_dias, realizado_em, registro_retroativo)
  on public.atendimentos to authenticated;                            -- id/created/updated/registrado_em pelo banco

grant select on public.triagens_parq to authenticated;
grant insert (aluno_id, atendimento_id, respostas, gestante) on public.triagens_parq to authenticated;
grant update (respostas, gestante, liberacao_obstetrica_em, atendimento_id) on public.triagens_parq to authenticated;
-- alguma_positiva / aplicada_por / aplicada_em: SEM grant => só o trigger grava (dupla trava)

grant select on public.programa_publicacoes to authenticated;         -- escrita só via trigger SECURITY DEFINER
-- profiles.cref: intencionalmente SEM grant de update ao front (setado só pela migration).

-- ----------------------------------------------------------------------------
-- 13. CREF do coach (single-coach confirmado por first_coach_id())
-- ----------------------------------------------------------------------------
update public.profiles set cref = '2904-G/GO'
  where id = 'bab283a5-480d-41d5-b1b2-7a3ae9000ebd' and cref is null;

-- FIM 007. Triggers de gate/imutabilidade DESLIGADOS (ligar em 007b pós-backfill).
