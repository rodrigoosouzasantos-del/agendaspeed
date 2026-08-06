/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Escala semanal do profissional - AgendaBless.
 *
 * Fonte única de verdade para responder duas perguntas em qualquer tela
 * (cadastro, agenda do dono, agenda do profissional, agendamento público):
 * - o profissional atende neste dia da semana?
 * - se atende, das quantas às quantas horas?
 *
 * Antes, `workDays` + `workHoursStart`/`workHoursEnd` obrigavam o mesmo
 * horário de entrada/saída em todos os dias marcados, o que travava casos
 * como "Ter a Sex das 08h às 19h, mas Sáb das 07h às 20h". Este módulo
 * introduz `weeklySchedule` (um horário por dia da semana) e mantém
 * `workDays`/`workHoursStart`/`workHoursEnd` funcionando como
 * compatibilidade para cadastros antigos que ainda não têm `weeklySchedule`.
 */

import type { Professional } from '../types';

export interface ProfessionalDaySchedule {
  enabled: boolean;
  start: string; // "HH:mm"
  end: string; // "HH:mm"
}

// Índice 0 = Domingo, 1 = Segunda, ..., 6 = Sábado (mesma convenção de Date#getDay()).
export type ProfessionalWeeklySchedule = ProfessionalDaySchedule[];

export const WEEK_DAY_SHORT_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export const DEFAULT_DAY_START = '09:00';
export const DEFAULT_DAY_END = '19:00';

function normalizeTime(value: unknown, fallback: string): string {
  const text = String(value || '').trim();
  return text ? text.slice(0, 5) : fallback;
}

function readRecordValue<T = unknown>(source: unknown, keys: string[]): T | undefined {
  const record = source as Record<string, unknown> | null | undefined;

  for (const key of keys) {
    if (record && record[key] !== undefined && record[key] !== null) {
      return record[key] as T;
    }
  }

  return undefined;
}

export function createEmptyWeeklySchedule(params?: {
  start?: string;
  end?: string;
}): ProfessionalWeeklySchedule {
  const start = normalizeTime(params?.start, DEFAULT_DAY_START);
  const end = normalizeTime(params?.end, DEFAULT_DAY_END);

  return Array.from({ length: 7 }, () => ({
    enabled: false,
    start,
    end,
  }));
}

export function buildWeeklyScheduleFromLegacyFields(params: {
  workDays: number[] | null | undefined;
  workHoursStart: string | null | undefined;
  workHoursEnd: string | null | undefined;
}): ProfessionalWeeklySchedule {
  const { workDays, workHoursStart, workHoursEnd } = params;
  const start = normalizeTime(workHoursStart, DEFAULT_DAY_START);
  const end = normalizeTime(workHoursEnd, DEFAULT_DAY_END);
  const enabledDays = Array.isArray(workDays) ? workDays.map(Number) : [];

  return Array.from({ length: 7 }, (_unused, dayIndex) => ({
    enabled: enabledDays.includes(dayIndex),
    start,
    end,
  }));
}

export function isValidWeeklySchedule(value: unknown): value is ProfessionalWeeklySchedule {
  return (
    Array.isArray(value) &&
    value.length === 7 &&
    value.every((day) => {
      return (
        day &&
        typeof day === 'object' &&
        typeof (day as ProfessionalDaySchedule).enabled === 'boolean'
      );
    })
  );
}

/**
 * Normaliza a escala semanal de um profissional, priorizando `weeklySchedule`
 * quando presente e válida. Cadastros antigos (sem `weeklySchedule`) caem no
 * fallback construído a partir de `workDays`/`workHoursStart`/`workHoursEnd`,
 * garantindo que nada quebre para profissionais já cadastrados.
 */
export function getProfessionalWeeklySchedule(
  professional: Professional | null | undefined,
): ProfessionalWeeklySchedule {
  if (!professional) {
    return createEmptyWeeklySchedule();
  }

  const rawWeeklySchedule = readRecordValue<unknown>(professional, [
    'weeklySchedule',
    'weekly_schedule',
  ]);

  if (isValidWeeklySchedule(rawWeeklySchedule)) {
    return rawWeeklySchedule.map((day) => ({
      enabled: Boolean(day.enabled),
      start: normalizeTime(day.start, professional.workHoursStart || DEFAULT_DAY_START),
      end: normalizeTime(day.end, professional.workHoursEnd || DEFAULT_DAY_END),
    }));
  }

  return buildWeeklyScheduleFromLegacyFields({
    workDays: professional.workDays,
    workHoursStart: professional.workHoursStart,
    workHoursEnd: professional.workHoursEnd,
  });
}

export function getProfessionalDaySchedule(
  professional: Professional | null | undefined,
  weekDay: number,
): ProfessionalDaySchedule {
  const weeklySchedule = getProfessionalWeeklySchedule(professional);

  return (
    weeklySchedule[weekDay] || {
      enabled: false,
      start: DEFAULT_DAY_START,
      end: DEFAULT_DAY_END,
    }
  );
}

export function getProfessionalScheduleForDateStr(
  professional: Professional | null | undefined,
  dateStr: string,
): ProfessionalDaySchedule {
  if (!dateStr) {
    return { enabled: false, start: DEFAULT_DAY_START, end: DEFAULT_DAY_END };
  }

  const weekDay = new Date(`${dateStr}T00:00:00`).getDay();

  return getProfessionalDaySchedule(professional, weekDay);
}

export function isProfessionalWorkingOnWeekDay(
  professional: Professional | null | undefined,
  weekDay: number,
): boolean {
  return getProfessionalDaySchedule(professional, weekDay).enabled;
}

export function isProfessionalWorkingOnDateStr(
  professional: Professional | null | undefined,
  dateStr: string,
): boolean {
  return getProfessionalScheduleForDateStr(professional, dateStr).enabled;
}

export function getWorkDaysFromWeeklySchedule(
  weeklySchedule: ProfessionalWeeklySchedule,
): number[] {
  return weeklySchedule.reduce<number[]>((days, day, index) => {
    if (day.enabled) {
      days.push(index);
    }

    return days;
  }, []);
}

/**
 * Deriva os campos legados (`workDays`, `workHoursStart`, `workHoursEnd`) a
 * partir da escala semanal, para telas/integrações que ainda não foram
 * atualizadas para ler `weeklySchedule` diretamente. `workHoursStart` /
 * `workHoursEnd` viram a faixa mais ampla (menor entrada, maior saída) entre
 * os dias ativos - útil apenas como referência/exibição, nunca para calcular
 * disponibilidade real de horário.
 */
export function deriveLegacyScheduleFields(weeklySchedule: ProfessionalWeeklySchedule): {
  workDays: number[];
  workHoursStart: string;
  workHoursEnd: string;
} {
  const workDays = getWorkDaysFromWeeklySchedule(weeklySchedule);
  const enabledDays = weeklySchedule.filter((day) => day.enabled);

  if (enabledDays.length === 0) {
    return {
      workDays,
      workHoursStart: DEFAULT_DAY_START,
      workHoursEnd: DEFAULT_DAY_END,
    };
  }

  const workHoursStart = enabledDays.reduce((earliest, day) => {
    return day.start < earliest ? day.start : earliest;
  }, enabledDays[0].start);

  const workHoursEnd = enabledDays.reduce((latest, day) => {
    return day.end > latest ? day.end : latest;
  }, enabledDays[0].end);

  return { workDays, workHoursStart, workHoursEnd };
}

export function formatWeeklyScheduleSummary(
  weeklySchedule: ProfessionalWeeklySchedule,
): string {
  const groups: { label: string; start: string; end: string }[] = [];

  weeklySchedule.forEach((day, index) => {
    if (!day.enabled) return;

    const lastGroup = groups[groups.length - 1];
    const isConsecutive =
      lastGroup &&
      lastGroup.start === day.start &&
      lastGroup.end === day.end &&
      lastGroup.label.endsWith(WEEK_DAY_SHORT_LABELS[index - 1] || '\0');

    if (isConsecutive) {
      const firstLabel = lastGroup.label.split(' a ')[0];
      lastGroup.label = `${firstLabel} a ${WEEK_DAY_SHORT_LABELS[index]}`;
      return;
    }

    groups.push({
      label: WEEK_DAY_SHORT_LABELS[index],
      start: day.start,
      end: day.end,
    });
  });

  if (groups.length === 0) {
    return 'Sem dias de atendimento definidos';
  }

  return groups
    .map((group) => `${group.label} ${group.start}-${group.end}`)
    .join(', ');
}
