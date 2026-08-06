import {
  Appointment,
  Client,
  EstablishmentConfig,
  PaymentType,
  Professional,
  Service
} from '../../../types';

import {
  getProfessionalScheduleForDateStr,
  isProfessionalWorkingOnWeekDay
} from '../../../lib/professionalSchedule';

export interface AgendaCreateAppointmentPayload {
  clientName: string;
  clientPhone: string;
  serviceId: string;
  professionalId: string;
  date: string;
  time: string;
  notes: string;
  paymentType: PaymentType;
  allowOvertime?: boolean;
  allowLunchOverlap?: boolean;
}

export interface AgendaCreateAppointmentResult {
  appointmentId?: string;
  clientActionLink?: string;
}

export interface AgendaViewProps {
  appointments: Appointment[];
  professionals: Professional[];
  services: Service[];
  config: EstablishmentConfig;
  clients?: Client[];
  quickOpenProfessionalAgendaId?: string;
  quickOpenProfessionalAgendaKey?: number;
  onCreateAppointment: (
    payload: AgendaCreateAppointmentPayload,
  ) => Promise<AgendaCreateAppointmentResult | void> | AgendaCreateAppointmentResult | void;
  onUpdateAppointmentStatus?: (
    appointmentId: string,
    status: Appointment["status"],
  ) => void;
  onOpenRescheduleAppointment?: (appointment: Appointment) => void;
}

export type AgendaStartMode =
  | "date"
  | "service"
  | "professional"
  | "professionalAgenda";

export type AgendaStep =
  | "start"
  | "selectDate"
  | "selectService"
  | "selectProfessional"
  | "selectDateTime"
  | "clientData"
  | "professionalAgenda"
  | "success";

export type OutsideScaleConfirmRequest = "singleOpen" | null;


export interface AgendaBlockedInterval {
  id: string;
  professionalId: string;
  date: string;
  startTime: string;
  endTime: string;
  reason?: string;
}

export interface AgendaScheduleDay {
  id: string;
  professionalId: string;
  date: string;
  status: 'open' | 'closed';
  isOutOfRegularSchedule?: boolean;
}

export interface AvailableSlot {
  professional: Professional;
  service: Service;
  date: string;
  time: string;
}

export const DEFAULT_LOOKAHEAD_DAYS = 7;

export function padDatePart(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatLocalDateStr(date: Date): string {
  const year = date.getFullYear();
  const month = padDatePart(date.getMonth() + 1);
  const day = padDatePart(date.getDate());

  return `${year}-${month}-${day}`;
}

export function parseLocalDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00`);
}

export function addDays(dateStr: string, days: number): string {
  const date = parseLocalDate(dateStr);
  date.setDate(date.getDate() + days);

  return formatLocalDateStr(date);
}

export function getTodayStr(): string {
  return formatLocalDateStr(new Date());
}

export function getCurrentTimeInMinutes(): number {
  const now = new Date();

  return now.getHours() * 60 + now.getMinutes();
}

export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);

  return hours * 60 + minutes;
}

export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return `${padDatePart(hours)}:${padDatePart(remainingMinutes)}`;
}

export function getWeekDayShortLabel(dateStr: string): string {
  const labels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return labels[parseLocalDate(dateStr).getDay()] || "";
}

export function getAppointmentDate(appointment: Appointment): string {
  return appointment.dateTime.split("T")[0] || "";
}

export function getAppointmentTime(appointment: Appointment): string {
  return appointment.dateTime.split("T")[1]?.slice(0, 5) || "";
}

export function normalizeText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function normalizePhone(value: string): string {
  return value.replace(/\D/g, "").slice(0, 11);
}

export function formatPhoneInput(value: string): string {
  const digits = normalizePhone(value);

  if (digits.length <= 2) {
    return digits;
  }

  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }

  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes}min`;
}

export function professionalCanDoService(params: {
  professional: Professional;
  service: Service;
}): boolean {
  const { professional, service } = params;

  return (
    professional.services.includes(service.id) ||
    service.professionals.includes(professional.id)
  );
}

export function appointmentBlocksSlot(params: {
  appointment: Appointment;
  professionalId: string;
  date: string;
  slotStart: number;
  slotEnd: number;
  services: Service[];
}): boolean {
  const { appointment, professionalId, date, slotStart, slotEnd, services } =
    params;

  if (appointment.professionalId !== professionalId) {
    return false;
  }

  if (getAppointmentDate(appointment) !== date) {
    return false;
  }

  if (["cancelled", "absent", "rescheduled"].includes(appointment.status)) {
    return false;
  }

  const appointmentStart = timeToMinutes(getAppointmentTime(appointment));
  const appointmentService = services.find((service) => {
    return service.id === appointment.serviceId;
  });
  const appointmentEnd =
    appointmentStart + (appointmentService?.duration || 30);

  return slotStart < appointmentEnd && slotEnd > appointmentStart;
}


export function normalizeAgendaBlockedInterval(rawBlock: Record<string, unknown>): AgendaBlockedInterval {
  return {
    id: String(rawBlock.id || ""),
    professionalId: String(rawBlock.professionalId || rawBlock.professional_id || ""),
    date: String(rawBlock.date || rawBlock.block_date || "").slice(0, 10),
    startTime: String(rawBlock.startTime || rawBlock.start_time || "").slice(0, 5),
    endTime: String(rawBlock.endTime || rawBlock.end_time || "").slice(0, 5),
    reason: String(rawBlock.reason || rawBlock.notes || "Bloqueado"),
  };
}

export function buildCompactSlugCandidate(value: string): string {
  return normalizeText(value).replace(/[^a-z0-9]/g, "");
}

export function collectOwnerTenantSlugCandidates(config: EstablishmentConfig): string[] {
  const candidates = new Set<string>();
  const addCandidate = (value: unknown) => {
    if (typeof value !== "string") return;

    const compact = buildCompactSlugCandidate(value);
    if (compact) {
      candidates.add(compact);
    }

    const pathLike = value.split("/").filter(Boolean).pop() || "";
    const compactPath = buildCompactSlugCandidate(pathLike);
    if (compactPath) {
      candidates.add(compactPath);
    }
  };

  addCandidate(config.name);

  try {
    const currentPathSlug = window.location.pathname
      .split("/")
      .filter(Boolean)
      .find((part) => !["owner", "admin", "dashboard"].includes(part));

    addCandidate(currentPathSlug);

    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key) continue;

      const loweredKey = key.toLowerCase();
      if (!loweredKey.includes("slug") && !loweredKey.includes("tenant")) {
        continue;
      }

      addCandidate(window.localStorage.getItem(key) || "");
    }
  } catch {
    // Mantém a agenda funcionando mesmo se o navegador bloquear o localStorage.
  }

  return Array.from(candidates);
}

export function mergeBlockedIntervals(
  currentMap: Map<string, AgendaBlockedInterval>,
  rows: unknown,
): void {
  if (!Array.isArray(rows)) return;

  rows.forEach((row) => {
    const blockedInterval = normalizeAgendaBlockedInterval(row as Record<string, unknown>);
    if (
      !blockedInterval.professionalId ||
      !blockedInterval.date ||
      !blockedInterval.startTime ||
      !blockedInterval.endTime
    ) {
      return;
    }

    const key =
      blockedInterval.id ||
      `${blockedInterval.professionalId}-${blockedInterval.date}-${blockedInterval.startTime}-${blockedInterval.endTime}`;

    currentMap.set(key, blockedInterval);
  });
}


export function normalizeAgendaScheduleDay(rawDay: Record<string, unknown>): AgendaScheduleDay {
  const status = String(rawDay.status || 'closed') === 'open' ? 'open' : 'closed';

  return {
    id: String(rawDay.id || ''),
    professionalId: String(rawDay.professionalId || rawDay.professional_id || ''),
    date: String(rawDay.date || rawDay.day_date || '').slice(0, 10),
    status,
    isOutOfRegularSchedule: Boolean(rawDay.isOutOfRegularSchedule || rawDay.is_out_of_regular_schedule),
  };
}

export function mergeScheduleDays(
  currentMap: Map<string, AgendaScheduleDay>,
  rows: unknown,
): void {
  if (!Array.isArray(rows)) return;

  rows.forEach((row) => {
    const scheduleDay = normalizeAgendaScheduleDay(row as Record<string, unknown>);

    if (!scheduleDay.professionalId || !scheduleDay.date) {
      return;
    }

    const key = scheduleDay.id || `${scheduleDay.professionalId}-${scheduleDay.date}`;
    currentMap.set(key, scheduleDay);
  });
}

export function isScheduleDayOpen(params: {
  openDays: AgendaScheduleDay[];
  professional: Professional | null;
  date: string;
}): boolean {
  const {
    openDays,
    professional,
    date
  } = params;

  if (!professional || !date) {
    return false;
  }

  return openDays.some((scheduleDay) => {
    return (
      scheduleDay.professionalId === professional.id &&
      scheduleDay.date === date &&
      scheduleDay.status === 'open'
    );
  });
}

export function isDateOutsideProfessionalRegularSchedule(params: {
  professional: Professional;
  date: string;
}): boolean {
  const { professional, date } = params;

  return !isProfessionalWorkingOnWeekDay(professional, parseLocalDate(date).getDay());
}

export function slotOverlapsBlockedInterval(params: {
  blockedIntervals: AgendaBlockedInterval[];
  professionalId: string;
  date: string;
  slotStart: number;
  slotEnd: number;
}): AgendaBlockedInterval | null {
  const { blockedIntervals, professionalId, date, slotStart, slotEnd } = params;

  return blockedIntervals.find((blockedInterval) => {
    if (
      blockedInterval.professionalId !== professionalId ||
      blockedInterval.date !== date ||
      !blockedInterval.startTime ||
      !blockedInterval.endTime
    ) {
      return false;
    }

    const blockedStart = timeToMinutes(blockedInterval.startTime);
    const blockedEnd = timeToMinutes(blockedInterval.endTime);

    return blockedStart < slotEnd && blockedEnd > slotStart;
  }) || null;
}

export type SlotAvailabilityExceptionType =
  | 'overtime'
  | 'lunch_overlap';

export interface SlotAvailabilityResult {
  available: boolean;
  reason?: string;
  exceptionType?: SlotAvailabilityExceptionType;
  slotStart?: number;
  slotEnd?: number;
}

export function checkProfessionalSlotAvailability(params: {
  professional: Professional;
  service: Service;
  date: string;
  time: string;
  services: Service[];
  appointments: Appointment[];
  blockedIntervals?: AgendaBlockedInterval[];
  openDays?: AgendaScheduleDay[];
}): SlotAvailabilityResult {
  const {
    professional,
    service,
    date,
    time,
    services,
    appointments,
    blockedIntervals = [],
    openDays = [],
  } = params;

  const weekDay = parseLocalDate(date).getDay();

  if (!professional.active) {
    return {
      available: false,
      reason: "Este profissional está inativo no cadastro.",
    };
  }

  const scheduleDayOpen = isScheduleDayOpen({
    openDays,
    professional,
    date,
  });

  if (!scheduleDayOpen) {
    return {
      available: false,
      reason: "A agenda deste profissional está fechada para esta data. Abra o dia antes de agendar.",
    };
  }

  const daySchedule = getProfessionalScheduleForDateStr(professional, date);

  if (!daySchedule.enabled && !scheduleDayOpen) {
    return {
      available: false,
      reason: "Este profissional não possui escala regular nesta data.",
    };
  }

  if (!professionalCanDoService({ professional, service })) {
    return {
      available: false,
      reason: "Este serviço não está vinculado ao profissional selecionado.",
    };
  }

  const slotStart = timeToMinutes(time);
  const slotEnd = slotStart + service.duration;

  const workStart = timeToMinutes(daySchedule.start);
  const workEnd = timeToMinutes(daySchedule.end);
  const hasLunchBreak = daySchedule.hasLunchBreak;
  const lunchStart = timeToMinutes(professional.lunchStart);
  const lunchEnd = timeToMinutes(professional.lunchEnd);

  if (slotStart < workStart || slotEnd > workEnd) {
    return {
      available: false,
      exceptionType: 'overtime',
      slotStart,
      slotEnd,
      reason: `Este serviço termina às ${minutesToTime(slotEnd)}, fora do expediente do profissional neste dia (${daySchedule.start} às ${daySchedule.end}).`,
    };
  }

  const overlapsLunch = hasLunchBreak && slotStart < lunchEnd && slotEnd > lunchStart;

  if (overlapsLunch) {
    return {
      available: false,
      exceptionType: 'lunch_overlap',
      slotStart,
      slotEnd,
      reason: `Este serviço termina às ${minutesToTime(slotEnd)} e ultrapassa o intervalo de almoço do profissional (${professional.lunchStart} às ${professional.lunchEnd}).`,
    };
  }

  const isPastToday =
    date === getTodayStr() && slotStart <= getCurrentTimeInMinutes();

  if (isPastToday) {
    return {
      available: false,
      reason: "Este horário já passou e não pode receber novo agendamento.",
    };
  }

  const blockedInterval = slotOverlapsBlockedInterval({
    blockedIntervals,
    professionalId: professional.id,
    date,
    slotStart,
    slotEnd,
  });

  if (blockedInterval) {
    return {
      available: false,
      reason: `Este horário está bloqueado na agenda do profissional. Motivo: ${blockedInterval.reason || "Bloqueado"}.`,
    };
  }

  const conflictingAppointment = appointments.find((appointment) => {
    return appointmentBlocksSlot({
      appointment,
      professionalId: professional.id,
      date,
      slotStart,
      slotEnd,
      services,
    });
  });

  if (conflictingAppointment) {
    const conflictingService = services.find((item) => {
      return item.id === conflictingAppointment.serviceId;
    });
    const conflictingStart = getAppointmentTime(conflictingAppointment);
    const conflictingDuration = conflictingService?.duration || 30;
    const conflictingEnd = minutesToTime(timeToMinutes(conflictingStart) + conflictingDuration);

    return {
      available: false,
      reason: `Este horário conflita com o atendimento de ${conflictingAppointment.clientName} às ${conflictingStart}, das ${conflictingStart} às ${conflictingEnd}.`,
    };
  }

  return {
    available: true,
  };
}

export function isProfessionalAvailableForSlot(params: {
  professional: Professional;
  service: Service;
  date: string;
  time: string;
  services: Service[];
  appointments: Appointment[];
  blockedIntervals?: AgendaBlockedInterval[];
  openDays?: AgendaScheduleDay[];
}): boolean {
  return checkProfessionalSlotAvailability(params).available;
}


export function generateSlotsForSelection(params: {
  professional: Professional;
  service: Service;
  date: string;
  services: Service[];
  appointments: Appointment[];
  blockedIntervals?: AgendaBlockedInterval[];
  openDays?: AgendaScheduleDay[];
}): AvailableSlot[] {
  const { professional, service, date, services, appointments, blockedIntervals = [], openDays = [] } = params;

  const slots: AvailableSlot[] = [];
  const daySchedule = getProfessionalScheduleForDateStr(professional, date);
  const start = timeToMinutes(daySchedule.start);
  const end = timeToMinutes(daySchedule.end);

  for (let minute = start; minute < end; minute += 30) {
    const time = minutesToTime(minute);
    const isAvailable = isProfessionalAvailableForSlot({
      professional,
      service,
      date,
      services,
      appointments,
      blockedIntervals,
      openDays,
      time,
    });

    if (isAvailable) {
      slots.push({
        professional,
        service,
        date,
        time,
      });
    }
  }

  return slots;
}

export function getAvailabilityBadge(count: number): {
  label: string;
  className: string;
} {
  if (count === 0) {
    return {
      label: "Horário esgotado",
      className: "bg-red-50 text-red-700 border-red-100",
    };
  }

  if (count <= 3) {
    return {
      label: `${count} horários livres`,
      className: "bg-[#0f4c5c]/5 text-[#0f4c5c] border-orange-100",
    };
  }

  return {
    label: `${count} horários livres`,
    className: "bg-emerald-50 text-emerald-700 border-emerald-100",
  };
}
