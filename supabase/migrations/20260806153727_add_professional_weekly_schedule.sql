-- AgendaBless: escala semanal por profissional (entrada/saída por dia).
--
-- Contexto: até aqui o profissional tinha um único par work_hours_start/
-- work_hours_end para todos os dias marcados em work_days. Isso impedia
-- casos como "Ter a Sex das 08h às 19h, mas Sáb das 07h às 20h".
--
-- Esta migração é apenas ADITIVA: cria a coluna weekly_schedule (jsonb) na
-- tabela professionals e não remove nem altera work_days/work_hours_start/
-- work_hours_end, que continuam sendo preenchidos pelo app (derivados da
-- escala semanal) para manter qualquer integração antiga funcionando.
--
-- Formato de weekly_schedule: array com 7 posições, índice 0 = Domingo,
-- 1 = Segunda, ..., 6 = Sábado. Cada posição:
--   { "enabled": boolean, "start": "HH:MM", "end": "HH:MM", "hasLunchBreak": boolean }
--
-- hasLunchBreak controla, por dia, se a agenda bloqueia o intervalo de
-- almoço (lunch_start/lunch_end, que continuam sendo um único horário para
-- o profissional todo). Ex: false aos sábados = agenda corrida nesse dia.
--
-- IMPORTANTE - passo manual necessário:
-- Esta migração não tem acesso ao corpo atual das functions
-- `upsert_my_professional` e `get_my_professionals` (nem de eventuais
-- variantes usadas pelo agendamento público/acesso do profissional, como
-- `get_public_booking_context` ou `get_my_professional_by_access_token`).
-- Após rodar este script, edite essas functions no SQL Editor do Supabase
-- para:
--   1) `upsert_my_professional`: gravar p_professional->'weekly_schedule'
--      (jsonb) na coluna weekly_schedule, além dos campos que já grava hoje.
--   2) `get_my_professionals` e as demais functions que retornam
--      profissionais: incluir weekly_schedule no SELECT/JSON de retorno.
-- Enquanto isso não for feito, o app funciona normalmente (cai no horário
-- único legado), mas a escala por dia só é salva/lida no armazenamento
-- local do navegador, não no banco.

alter table public.professionals
  add column if not exists weekly_schedule jsonb;

comment on column public.professionals.weekly_schedule is
  'Escala semanal do profissional: array de 7 posições (0=Domingo..6=Sábado) com {enabled, start, end, hasLunchBreak}. Ver migração 20260806153727.';
