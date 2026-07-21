# Runbook de desastre — backup e restore do banco

Sessão 10 (20/07/2026). Supabase **Free não tem PITR**: este backup agendado é
a única rede de segurança. Qualquer escrita entre um backup e o próximo **não
tem recuperação** (RPO real = intervalo do agendamento, hoje 24h).

## 1. Como gerar um backup

```
node scripts/backup.mjs
```

Agendado no Agendador de Tarefas do Windows (`\Backup PersonalIA`, diário
12:00, usuário willg). Aborta no primeiro erro; execução parcial nunca vira
arquivo final (staging + promoção atômica). Exit ≠ 0 em falha (ver
`backup.log`). Conteúdo: `roles.sql` + `schema.sql` + `data.sql` (Supabase CLI
oficial, `--use-copy`, dados de `public` + `auth` + `storage`) +
`auth_storage_schema.sql` (só p/ ensaio local) + `auth_storage_changes.sql`
(customizações próprias, ex.: trigger `on_auth_user_created`) + `manifest.json`.

## 2. Onde está

`C:\Users\willg\backups-personalia\`
- `personalia-<stamp>.tar.gz.enc` — arquivo único, AES-256-GCM;
- `personalia-<stamp>.manifest.json` — manifest sem dados pessoais (inventário,
  contagens, SHA-256 de cada dump e do arquivo final, resultado das guardas).

Nunca commitar esses arquivos. Retenção alvo: 30; limpeza automática
DESATIVADA (o script só avisa) — remover manualmente, nunca o último válido.

## 3. Como obter a chave de criptografia

Windows Credential Manager, credencial **genérica**, target
**`PersonalIA-BackupKey`** (usuário `personalia-backup`), no perfil do usuário
willg desta máquina. Para recuperar o valor (64 hex = AES-256):

```powershell
# cole num PowerShell como willg; o valor NUNCA deve ir para repo/log
Add-Type -TypeDefinition (ver bloco CredRead em scripts/restore.mjs)
[CredMan]::Read('PersonalIA-BackupKey')
```

Guarde uma cópia manual num cofre pessoal: se esta máquina morrer junto com o
Windows, a chave morre com ela — e o backup fica ilegível.

## 4. Como restaurar (SOMENTE banco/projeto descartável)

Ensaio local (Postgres 17 em Docker):
```
docker run -d --name pia-restore-db -p 55433:5432 -e POSTGRES_PASSWORD=restore postgres:17-alpine
node scripts/restore.mjs --target-db-url "postgres://postgres:restore@localhost:55433/postgres" --local-ensaio
```
`--local-ensaio` aplica o andaime que a plataforma proveria (roles baseline,
schema extensions, publication realtime, schema auth/storage) e pula extensões
proprietárias (supabase_vault). Ordem: roles → auth/storage (ensaio) →
schema → customizações → dados (transação única, `session_replication_role=replica`,
`ON_ERROR_STOP=1`).

Projeto Supabase hospedado descartável (prova final — AINDA NÃO EXECUTADA):
usar a connection string do **Session Pooler** do projeto novo, SEM
`--local-ensaio`, com `--permitir-remoto`. O script recusa o host da origem.

## 5. Como validar

```
node scripts/verify-restore.mjs --target-db-url "<url do descartável>"
```
Compara origem×destino: contagem + hash canônico de TODAS as tabelas de
`public`, `auth.users`/`identities` (sem exibir valores), fingerprints de
policies/funções/triggers (incl. estado DISABLE)/grants/RLS, flags do produto
e os 2 hashes canônicos aprovados (mapa muscular `3bbcde46…`, orientações
`c77df6c8…`). Qualquer divergência = exit 1 = restore reprovado.

Depois: suítes no destino (`RLS_DB_URL=<url> node scripts/test-rls.mjs` e
`migrations/tests/*` — os `.sh`/`test_logic*` esperam o ambiente mock:
desligar `on_auth_user_created` e trocar `auth.uid()` pela versão GUC no
descartável antes; ver sessão 10).

## 6/7. RPO e RTO

- **RPO real: 24h** (agendamento diário 12:00; Free sem PITR). Encurtar =
  aumentar a frequência da tarefa agendada — decisão do coach.
- **RTO medido: 11,7s** no ensaio local (banco de 12 MB), da decriptação ao
  dado carregado; + ~2 min de validação completa. Restore hospedado: não
  medido ainda (pendência da prova hospedada).

## Estado da prova (20/07/2026)

- Ensaio local: **restore provado** — 17 tabelas + auth byte-idênticos,
  7 fingerprints iguais, hashes canônicos aprovados conferidos no destino,
  suítes 142/143 (única falha = bug latente da ORIGEM na policy
  `profiles_update_safe_own`, task aberta).
- **Restore hospedado: NÃO PROVADO** — exige projeto Supabase descartável
  (Auth/API/RLS reais + smoke de login). Sessão futura.
