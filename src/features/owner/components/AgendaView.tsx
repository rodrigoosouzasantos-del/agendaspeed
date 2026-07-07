/**
 * Tela de Agenda Geral do Painel do Dono - AgendaZap.
 *
 * Fluxo guiado aprovado:
 * - Agendar por Data;
 * - Agendar por Serviço;
 * - Agendar por Profissional;
 * - Agenda por Profissional.
 *
 * A tela conduz o atendente por etapas limpas, sem abrir novas áreas abaixo
 * misturando informações. Cada clique avança uma fase do agendamento.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";

import {
  ArrowLeft,
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  Info,
  Lock,
  Phone,
  Briefcase,
  Search,
  UserRound,
  UsersRound,
} from "lucide-react";

import {
  Appointment,
  Client,
  EstablishmentConfig,
  PaymentType,
  Professional,
  Service,
} from "../../../types";

import { formatCurrency, formatDateBr } from "../owner.utils";
import { supabase } from "../../../lib/supabase";

interface AgendaCreateAppointmentPayload {
  clientName: string;
  clientPhone: string;
  serviceId: string;
  professionalId: string;
  date: string;
  time: string;
  notes: string;
  paymentType: PaymentType;
}

interface AgendaCreateAppointmentResult {
  appointmentId?: string;
  clientActionLink?: string;
}

interface AgendaViewProps {
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

type AgendaStartMode =
  | "date"
  | "service"
  | "professional"
  | "professionalAgenda";

type AgendaStep =
  | "start"
  | "selectDate"
  | "selectService"
  | "selectProfessional"
  | "selectDateTime"
  | "clientData"
  | "professionalAgenda"
  | "success";

type OutsideScaleConfirmRequest = "singleOpen" | "bulkOpen" | null;


interface AgendaBlockedInterval {
  id: string;
  professionalId: string;
  date: string;
  startTime: string;
  endTime: string;
  reason?: string;
}

interface AgendaScheduleDay {
  id: string;
  professionalId: string;
  date: string;
  status: 'open' | 'closed';
  isOutOfRegularSchedule?: boolean;
}

interface AvailableSlot {
  professional: Professional;
  service: Service;
  date: string;
  time: string;
}

const LOOKAHEAD_DAYS = 7;

function padDatePart(value: number): string {
  return String(value).padStart(2, "0");
}

function formatLocalDateStr(date: Date): string {
  const year = date.getFullYear();
  const month = padDatePart(date.getMonth() + 1);
  const day = padDatePart(date.getDate());

  return `${year}-${month}-${day}`;
}

function parseLocalDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00`);
}

function addDays(dateStr: string, days: number): string {
  const date = parseLocalDate(dateStr);
  date.setDate(date.getDate() + days);

  return formatLocalDateStr(date);
}

function getTodayStr(): string {
  return formatLocalDateStr(new Date());
}

function getCurrentTimeInMinutes(): number {
  const now = new Date();

  return now.getHours() * 60 + now.getMinutes();
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);

  return hours * 60 + minutes;
}

function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return `${padDatePart(hours)}:${padDatePart(remainingMinutes)}`;
}

function getWeekDayShortLabel(dateStr: string): string {
  const labels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return labels[parseLocalDate(dateStr).getDay()] || "";
}

function getAppointmentDate(appointment: Appointment): string {
  return appointment.dateTime.split("T")[0] || "";
}

function getAppointmentTime(appointment: Appointment): string {
  return appointment.dateTime.split("T")[1]?.slice(0, 5) || "";
}

function normalizeText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function normalizePhone(value: string): string {
  return value.replace(/\D/g, "").slice(0, 11);
}

function formatPhoneInput(value: string): string {
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

function formatDuration(minutes: number): string {
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

function professionalCanDoService(params: {
  professional: Professional;
  service: Service;
}): boolean {
  const { professional, service } = params;

  return (
    professional.services.includes(service.id) ||
    service.professionals.includes(professional.id)
  );
}

function appointmentBlocksSlot(params: {
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


function normalizeAgendaBlockedInterval(rawBlock: Record<string, unknown>): AgendaBlockedInterval {
  return {
    id: String(rawBlock.id || ""),
    professionalId: String(rawBlock.professionalId || rawBlock.professional_id || ""),
    date: String(rawBlock.date || rawBlock.block_date || "").slice(0, 10),
    startTime: String(rawBlock.startTime || rawBlock.start_time || "").slice(0, 5),
    endTime: String(rawBlock.endTime || rawBlock.end_time || "").slice(0, 5),
    reason: String(rawBlock.reason || rawBlock.notes || "Bloqueado"),
  };
}

function buildCompactSlugCandidate(value: string): string {
  return normalizeText(value).replace(/[^a-z0-9]/g, "");
}

function collectOwnerTenantSlugCandidates(config: EstablishmentConfig): string[] {
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

function mergeBlockedIntervals(
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


function normalizeAgendaScheduleDay(rawDay: Record<string, unknown>): AgendaScheduleDay {
  const status = String(rawDay.status || 'closed') === 'open' ? 'open' : 'closed';

  return {
    id: String(rawDay.id || ''),
    professionalId: String(rawDay.professionalId || rawDay.professional_id || ''),
    date: String(rawDay.date || rawDay.day_date || '').slice(0, 10),
    status,
    isOutOfRegularSchedule: Boolean(rawDay.isOutOfRegularSchedule || rawDay.is_out_of_regular_schedule),
  };
}

function mergeScheduleDays(
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

function isScheduleDayOpen(params: {
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

function isDateOutsideProfessionalRegularSchedule(params: {
  professional: Professional;
  date: string;
}): boolean {
  const { professional, date } = params;

  return !professional.workDays.includes(parseLocalDate(date).getDay());
}

function slotOverlapsBlockedInterval(params: {
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

interface SlotAvailabilityResult {
  available: boolean;
  reason?: string;
}

function checkProfessionalSlotAvailability(params: {
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

  if (!professional.workDays.includes(weekDay) && !scheduleDayOpen) {
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

  const workStart = timeToMinutes(professional.workHoursStart);
  const workEnd = timeToMinutes(professional.workHoursEnd);
  const professionalRecord = professional as Professional & {
    noLunchBreak?: boolean;
  };
  const hasLunchBreak = !professionalRecord.noLunchBreak;
  const lunchStart = timeToMinutes(professional.lunchStart);
  const lunchEnd = timeToMinutes(professional.lunchEnd);

  if (slotStart < workStart || slotEnd > workEnd) {
    return {
      available: false,
      reason: `Este serviço termina às ${minutesToTime(slotEnd)}, fora do expediente do profissional (${professional.workHoursStart} às ${professional.workHoursEnd}).`,
    };
  }

  const overlapsLunch = hasLunchBreak && slotStart < lunchEnd && slotEnd > lunchStart;

  if (overlapsLunch) {
    return {
      available: false,
      reason: `Este serviço invade o intervalo de almoço do profissional (${professional.lunchStart} às ${professional.lunchEnd}).`,
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

function isProfessionalAvailableForSlot(params: {
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


function generateSlotsForSelection(params: {
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
  const start = timeToMinutes(professional.workHoursStart);
  const end = timeToMinutes(professional.workHoursEnd);

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

function getAvailabilityBadge(count: number): {
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

export default function AgendaView({
  appointments,
  professionals,
  services,
  config,
  clients = [],
  quickOpenProfessionalAgendaId,
  quickOpenProfessionalAgendaKey,
  onCreateAppointment,
  onUpdateAppointmentStatus,
  onOpenRescheduleAppointment,
}: AgendaViewProps) {
  const [mode, setMode] = useState<AgendaStartMode | null>(null);
  const [currentStep, setCurrentStep] = useState<AgendaStep>("start");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedProfessionalId, setSelectedProfessionalId] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientNotes, setClientNotes] = useState("");
  const [whatsAppConfirmUrl, setWhatsAppConfirmUrl] = useState("");
  const [serviceSearch, setServiceSearch] = useState("");
  const [professionalSearch, setProfessionalSearch] = useState("");
  const viewTopRef = useRef<HTMLDivElement | null>(null);
  const [blockedIntervals, setBlockedIntervals] = useState<AgendaBlockedInterval[]>([]);
  const [outsideScaleConfirmRequest, setOutsideScaleConfirmRequest] =
    useState<OutsideScaleConfirmRequest>(null);
  const [openDays, setOpenDays] = useState<AgendaScheduleDay[]>([]);
  const [scheduleDayActionLoading, setScheduleDayActionLoading] = useState(false);
  const [showPastProfessionalAgendaSlots, setShowPastProfessionalAgendaSlots] =
    useState(false);

  const todayStr = getTodayStr();


  useEffect(() => {
    let isMounted = true;

    async function loadBlockedIntervals() {
      const intervalsMap = new Map<string, AgendaBlockedInterval>();

      const myBlocksResult = await supabase.rpc("get_my_professional_schedule_blocks", {
        p_professional_id: null,
      });

      if (myBlocksResult.error) {
        console.error(
          "Erro ao carregar bloqueios da agenda pelo painel do dono:",
          myBlocksResult.error.message,
        );
      } else {
        mergeBlockedIntervals(intervalsMap, myBlocksResult.data);
      }

      const tenantSlugCandidates = collectOwnerTenantSlugCandidates(config);

      for (const slugCandidate of tenantSlugCandidates) {
        const publicBlocksResult = await supabase.rpc(
          "get_public_professional_schedule_blocks",
          {
            p_slug: slugCandidate,
          },
        );

        if (publicBlocksResult.error) {
          console.warn(
            `Não foi possível carregar bloqueios públicos para o slug ${slugCandidate}:`,
            publicBlocksResult.error.message,
          );
          continue;
        }

        mergeBlockedIntervals(intervalsMap, publicBlocksResult.data);
      }

      if (intervalsMap.size === 0) {
        const directBlocksResult = await supabase
          .from("professional_schedule_blocks")
          .select("id, professional_id, block_date, start_time, end_time, reason");

        if (directBlocksResult.error) {
          console.warn(
            "Não foi possível carregar bloqueios diretamente da tabela professional_schedule_blocks:",
            directBlocksResult.error.message,
          );
        } else {
          mergeBlockedIntervals(intervalsMap, directBlocksResult.data);
        }
      }

      const scheduleDaysMap = new Map<string, AgendaScheduleDay>();

      const myScheduleDaysResult = await supabase.rpc("get_my_professional_schedule_days", {
        p_professional_id: null,
      });

      if (myScheduleDaysResult.error) {
        console.error(
          "Erro ao carregar dias abertos da agenda pelo painel do dono:",
          myScheduleDaysResult.error.message,
        );
      } else {
        mergeScheduleDays(scheduleDaysMap, myScheduleDaysResult.data);
      }

      for (const slugCandidate of tenantSlugCandidates) {
        const publicScheduleDaysResult = await supabase.rpc(
          "get_public_professional_schedule_days",
          {
            p_slug: slugCandidate,
          },
        );

        if (publicScheduleDaysResult.error) {
          console.warn(
            `Não foi possível carregar dias abertos públicos para o slug ${slugCandidate}:`,
            publicScheduleDaysResult.error.message,
          );
          continue;
        }

        mergeScheduleDays(scheduleDaysMap, publicScheduleDaysResult.data);
      }

      if (!isMounted) return;

      setBlockedIntervals(Array.from(intervalsMap.values()));
      setOpenDays(Array.from(scheduleDaysMap.values()));
    }

    loadBlockedIntervals();

    return () => {
      isMounted = false;
    };
  }, [config]);

  useEffect(() => {
    if (!quickOpenProfessionalAgendaId) {
      return;
    }

    setMode("professionalAgenda");
    setCurrentStep("professionalAgenda");
    setSelectedProfessionalId(quickOpenProfessionalAgendaId);
    setSelectedServiceId("");
    setSelectedTime("");
    setSelectedDate(todayStr);
    setServiceSearch("");
    setProfessionalSearch("");
  }, [quickOpenProfessionalAgendaId, quickOpenProfessionalAgendaKey, todayStr]);

  useEffect(() => {
    if (currentStep !== "start") {
      viewTopRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [currentStep]);

  useEffect(() => {
    setShowPastProfessionalAgendaSlots(false);
  }, [selectedProfessionalId, selectedDate]);

  const dateOptions = useMemo(() => {
    return Array.from({ length: LOOKAHEAD_DAYS }, (_, index) => {
      return addDays(todayStr, index);
    });
  }, [todayStr]);

  const activeServices = useMemo(() => {
    const normalizedSearch = normalizeText(serviceSearch);

    return services
      .filter((service) => service.active)
      .filter((service) => {
        if (!normalizedSearch) {
          return true;
        }

        return (
          normalizeText(service.name).includes(normalizedSearch) ||
          normalizeText(service.category).includes(normalizedSearch) ||
          normalizeText(service.description || "").includes(normalizedSearch)
        );
      })
      .sort((first, second) => first.name.localeCompare(second.name, "pt-BR"));
  }, [services, serviceSearch]);

  const activeProfessionals = useMemo(() => {
    const normalizedSearch = normalizeText(professionalSearch);

    return professionals
      .filter((professional) => professional.active)
      .filter((professional) => {
        if (!normalizedSearch) {
          return true;
        }

        return (
          normalizeText(professional.name).includes(normalizedSearch) ||
          normalizeText(professional.role).includes(normalizedSearch)
        );
      })
      .sort((first, second) => {
        const firstOrder = Number(first.displayOrder) || 999;
        const secondOrder = Number(second.displayOrder) || 999;

        if (firstOrder !== secondOrder) {
          return firstOrder - secondOrder;
        }

        return first.name.localeCompare(second.name, "pt-BR");
      });
  }, [professionals, professionalSearch]);

  const selectedService =
    services.find((service) => {
      return service.id === selectedServiceId;
    }) || null;

  const selectedProfessional =
    professionals.find((professional) => {
      return professional.id === selectedProfessionalId;
    }) || null;

  const servicesForSelectedProfessional = useMemo(() => {
    if (!selectedProfessional) {
      return activeServices;
    }

    return activeServices.filter((service) => {
      return professionalCanDoService({
        professional: selectedProfessional,
        service,
      });
    });
  }, [activeServices, selectedProfessional]);

  const professionalsForSelectedService = useMemo(() => {
    if (!selectedService) {
      return activeProfessionals;
    }

    return activeProfessionals.filter((professional) => {
      return professionalCanDoService({
        professional,
        service: selectedService,
      });
    });
  }, [activeProfessionals, selectedService]);

  const availableSlots = useMemo(() => {
    if (!selectedService || !selectedProfessional || !selectedDate) {
      return [];
    }

    return generateSlotsForSelection({
      professional: selectedProfessional,
      service: selectedService,
      date: selectedDate,
      services,
      appointments,
      blockedIntervals,
      openDays,
    });
  }, [
    appointments,
    blockedIntervals,
    openDays,
    selectedDate,
    selectedProfessional,
    selectedService,
    services,
  ]);

  const canGoClientData = Boolean(
    selectedService && selectedProfessional && selectedDate && selectedTime,
  );

  const canSubmit = Boolean(
    canGoClientData &&
    clientName.trim() &&
    normalizePhone(clientPhone).length >= 10,
  );

  const resetFlow = () => {
    setMode(null);
    setCurrentStep("start");
    setSelectedDate("");
    setSelectedServiceId("");
    setSelectedProfessionalId("");
    setSelectedTime("");
    setClientName("");
    setClientPhone("");
    setClientNotes("");
    setWhatsAppConfirmUrl("");
    setServiceSearch("");
    setProfessionalSearch("");
  };

  const openProfessionalAgendaManager = (professionalId: string) => {
    resetFlow();
    setMode("professionalAgenda");
    setSelectedProfessionalId(professionalId);
    setSelectedServiceId("");
    setSelectedTime("");
    setSelectedDate(todayStr);
    setCurrentStep("professionalAgenda");
  };

  const startMode = (nextMode: AgendaStartMode) => {
    resetFlow();
    setMode(nextMode);

    if (nextMode === "date") {
      setCurrentStep("selectDate");
      return;
    }

    if (nextMode === "service") {
      setCurrentStep("selectService");
      return;
    }

    if (nextMode === "professionalAgenda") {
      setSelectedDate(todayStr);
      setCurrentStep("selectProfessional");
      return;
    }

    setCurrentStep("selectProfessional");
  };

  const goBack = () => {
    if (currentStep === "start") {
      return;
    }

    if (currentStep === "success") {
      resetFlow();
      return;
    }

    if (currentStep === "selectDate") {
      resetFlow();
      return;
    }

    if (currentStep === "selectService") {
      if (mode === "date") {
        setSelectedServiceId("");
        setCurrentStep("selectProfessional");
        return;
      }

      if (mode === "professional") {
        setSelectedServiceId("");
        setCurrentStep("selectProfessional");
        return;
      }

      resetFlow();
      return;
    }

    if (currentStep === "selectProfessional") {
      if (mode === "date") {
        setSelectedProfessionalId("");
        setCurrentStep("selectDate");
        return;
      }

      if (mode === "service") {
        setSelectedProfessionalId("");
        setCurrentStep("selectService");
        return;
      }

      resetFlow();
      return;
    }

    if (currentStep === "professionalAgenda") {
      setSelectedProfessionalId("");
      setCurrentStep("selectProfessional");
      return;
    }

    if (currentStep === "selectDateTime") {
      setSelectedTime("");

      if (mode === "date") {
        setCurrentStep("selectService");
        return;
      }

      if (mode === "service") {
        setCurrentStep("selectProfessional");
        return;
      }

      setCurrentStep("selectService");
      return;
    }

    if (currentStep === "clientData") {
      setCurrentStep("selectDateTime");
    }
  };

  const handleSelectDateFirst = (date: string) => {
    setSelectedDate(date);
    setSelectedProfessionalId("");
    setSelectedServiceId("");
    setSelectedTime("");
    setCurrentStep("selectProfessional");
  };

  const handleSelectService = (service: Service) => {
    setSelectedServiceId(service.id);

    if (mode === "professionalAgenda" && selectedProfessionalId && selectedDate && selectedTime) {
      const selectedProfessionalForAgenda = professionals.find((professional) => {
        return professional.id === selectedProfessionalId;
      });

      if (!selectedProfessionalForAgenda) {
        alert("Profissional não encontrado. Atualize a agenda e tente novamente.");
        setSelectedServiceId("");
        return;
      }

      const serviceSlotAvailability = checkProfessionalSlotAvailability({
        professional: selectedProfessionalForAgenda,
        service,
        date: selectedDate,
        time: selectedTime,
        services,
        appointments,
        blockedIntervals,
        openDays,
      });

      if (!serviceSlotAvailability.available) {
        alert(serviceSlotAvailability.reason || "Este serviço não cabe neste horário. Escolha outro horário ou outro serviço.");
        setSelectedServiceId("");
        return;
      }

      setCurrentStep("clientData");
      return;
    }

    setSelectedTime("");

    if (mode === "service") {
      setSelectedProfessionalId("");
      setSelectedDate("");
      setCurrentStep("selectProfessional");
      return;
    }

    if (mode === "date") {
      setCurrentStep("selectDateTime");
      return;
    }

    if (mode === "professionalAgenda") {
      setCurrentStep("selectDateTime");
      return;
    }

    setSelectedDate("");
    setCurrentStep("selectDateTime");
  };

  const handleSelectProfessional = (professional: Professional) => {
    setSelectedProfessionalId(professional.id);
    setSelectedTime("");

    if (mode === "date") {
      setSelectedServiceId("");
      setCurrentStep("selectService");
      return;
    }

    if (mode === "professionalAgenda") {
      setSelectedServiceId("");
      setSelectedTime("");
      setSelectedDate(selectedDate || todayStr);
      setCurrentStep("professionalAgenda");
      return;
    }

    if (mode === "professional") {
      setSelectedServiceId("");
      setSelectedDate("");
      setCurrentStep("selectService");
      return;
    }

    setSelectedDate("");
    setCurrentStep("selectDateTime");
  };

  const handleSelectDateTimeDate = (date: string) => {
    setSelectedDate(date);
    setSelectedTime("");
  };

  const findClientByPhone = (phone: string) => {
    const normalizedPhone = normalizePhone(phone);

    if (normalizedPhone.length < 10) {
      return null;
    }

    return (
      clients.find((client) => {
        const mainPhone = normalizePhone(client.phone || "");
        const normalizedStoredPhone = normalizePhone(
          client.phoneNormalized || "",
        );
        const historyPhones = client.phoneHistory || [];

        return (
          mainPhone === normalizedPhone ||
          normalizedStoredPhone === normalizedPhone ||
          historyPhones.some(
            (historyPhone) => normalizePhone(historyPhone) === normalizedPhone,
          )
        );
      }) || null
    );
  };

  const handleClientPhoneChange = (value: string) => {
    const formattedPhone = formatPhoneInput(value);
    const matchedClient = findClientByPhone(formattedPhone);

    setClientPhone(formattedPhone);

    if (matchedClient) {
      setClientName(matchedClient.name);

      if (!clientNotes.trim() && matchedClient.notes) {
        setClientNotes(matchedClient.notes);
      }
    }
  };

  const buildClientConfirmationWhatsAppUrl = (clientActionLink: string) => {
    if (
      !selectedService ||
      !selectedProfessional ||
      !selectedDate ||
      !selectedTime ||
      !clientPhone
    ) {
      return "";
    }

    const phone = normalizePhone(clientPhone);
    const message = [
      `Olá, ${clientName.trim() || "tudo bem"}! Seu horário foi agendado com sucesso.`,
      "",
      `Serviço: ${selectedService.name}`,
      `Profissional: ${selectedProfessional.name}`,
      `Data: ${formatDateBr(selectedDate)}`,
      `Horário: ${selectedTime}`,
      "",
      "Para confirmar, cancelar ou remarcar, acesse:",
      clientActionLink,
    ].join("\n");

    return `https://api.whatsapp.com/send?phone=55${phone}&text=${encodeURIComponent(message)}`;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!canSubmit || !selectedProfessional || !selectedService) {
      return;
    }

    const slotAvailability = checkProfessionalSlotAvailability({
      professional: selectedProfessional,
      service: selectedService,
      date: selectedDate,
      time: selectedTime,
      services,
      appointments,
      blockedIntervals,
      openDays,
    });

    if (!slotAvailability.available) {
      alert(slotAvailability.reason || "Este horário não está mais disponível. Atualize a agenda e escolha outro horário.");
      return;
    }

    const createdAppointment = await onCreateAppointment({
      clientName: clientName.trim(),
      clientPhone,
      serviceId: selectedServiceId,
      professionalId: selectedProfessionalId,
      date: selectedDate,
      time: selectedTime,
      notes: clientNotes,
      paymentType: "pendente",
    });

    if (!createdAppointment?.appointmentId) {
      return;
    }

    const clientActionLink = createdAppointment.clientActionLink || "";

    if (!clientActionLink) {
      alert(
        "Agendamento criado, mas não foi possível gerar o link do cliente. Atualize a página e tente reenviar a confirmação pelo painel.",
      );
      setWhatsAppConfirmUrl("");
      setCurrentStep("success");
      return;
    }

    const confirmationUrl = buildClientConfirmationWhatsAppUrl(clientActionLink);
    setWhatsAppConfirmUrl(confirmationUrl);

    if (confirmationUrl) {
      window.open(confirmationUrl, "_blank", "noopener,noreferrer");
    }

    setCurrentStep("success");
  };

  const getSlotsForProfessionalAcrossPeriod = (
    professional: Professional,
  ): number => {
    const targetServices = selectedService
      ? [selectedService]
      : activeServices.filter((service) => {
          return professionalCanDoService({ professional, service });
        });

    return dateOptions.reduce((total, dateOption) => {
      return (
        total +
        targetServices.reduce((serviceTotal, service) => {
          return (
            serviceTotal +
            generateSlotsForSelection({
              professional,
              service,
              date: selectedDate || dateOption,
              services,
              appointments,
              blockedIntervals,
              openDays,
            }).length
          );
        }, 0)
      );
    }, 0);
  };

  const getSlotsForProfessionalOnSelectedDate = (
    professional: Professional,
  ): number => {
    if (!selectedDate) {
      return 0;
    }

    const targetServices = selectedService
      ? [selectedService]
      : activeServices.filter((service) => {
          return professionalCanDoService({ professional, service });
        });

    return targetServices.reduce((total, service) => {
      return (
        total +
        generateSlotsForSelection({
          professional,
          service,
          date: selectedDate,
          services,
          appointments,
          blockedIntervals,
          openDays,
        }).length
      );
    }, 0);
  };

  const getSlotsForDate = (date: string): number => {
    const targetProfessionals = selectedProfessional
      ? [selectedProfessional]
      : professionalsForSelectedService;

    if (!selectedService) {
      return targetProfessionals.reduce((professionalTotal, professional) => {
        const professionalServices = activeServices.filter((service) => {
          return professionalCanDoService({ professional, service });
        });

        return (
          professionalTotal +
          professionalServices.reduce((serviceTotal, service) => {
            return (
              serviceTotal +
              generateSlotsForSelection({
                professional,
                service,
                date,
                services,
                appointments,
                blockedIntervals,
                openDays,
              }).length
            );
          }, 0)
        );
      }, 0);
    }

    return targetProfessionals.reduce((total, professional) => {
      return (
        total +
        generateSlotsForSelection({
          professional,
          service: selectedService,
          date,
          services,
          appointments,
          blockedIntervals,
          openDays,
        }).length
      );
    }, 0);
  };

  const renderProfessionalManagerCards = () => {
    return (
      <div className="space-y-4">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="h-1.5 bg-[#0f4c5c]" />
          <div className="px-4 py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#0f4c5c]">
                AGENDASPEED
              </p>
              <h3 className="text-lg font-black tracking-tight text-neutral-950 mt-1">
                Gerenciador de agenda dos profissionais
              </h3>
              <p className="text-xs text-slate-500 font-semibold mt-1">
                Clique no profissional para abrir a agenda individual e controlar horários, aberturas, bloqueios, agendamentos e confirmações.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-500 flex items-center gap-2">
              <Info className="w-4 h-4 text-slate-400" />
              Dias passados não aparecem.
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {activeProfessionals.map((professional) => {
            return (
              <button
                key={professional.id}
                type="button"
                onClick={() => openProfessionalAgendaManager(professional.id)}
                className="group overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition hover:border-[#0f4c5c]/35 hover:shadow-md"
              >
                <div className="h-1.5 bg-[#0f4c5c]" />
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
                      {professional.avatar ? (
                        <img
                          src={professional.avatar}
                          alt={professional.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span className="text-lg font-black text-slate-700">
                          {professional.name.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#0f4c5c]">
                        Profissional
                      </p>
                      <h4 className="mt-1 text-base font-black text-neutral-950 truncate">
                        {professional.name}
                      </h4>
                      <p className="mt-1 text-xs font-semibold text-slate-500 line-clamp-2 min-h-[32px]">
                        {professional.role || 'Especialidade não informada'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <span className="inline-flex items-center rounded-full border border-[#0f4c5c]/15 bg-[#0f4c5c]/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#0f4c5c]">
                      Abrir agenda
                    </span>

                    <ChevronRight className="w-5 h-5 text-slate-400 transition group-hover:text-[#0f4c5c]" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderDateSelection = () => {
    return (
      <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b">
          <h3 className="text-base font-black text-neutral-950">
            Escolha o dia da agenda
          </h3>

          <p className="text-xs text-neutral-500 font-semibold mt-1">
            Use quando o cliente perguntou por um dia específico. Dias passados
            não aparecem.
          </p>
        </div>

        <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          {dateOptions.map((dateOption) => {
            const freeSlots = getSlotsForDate(dateOption);
            const isSelected = selectedDate === dateOption;

            return (
              <button
                key={dateOption}
                type="button"
                onClick={() => handleSelectDateFirst(dateOption)}
                className={`rounded-2xl border p-3 text-center transition ${
                  isSelected
                    ? "bg-[#0f4c5c]/5 border-[#0f4c5c] ring-2 ring-[#0f4c5c]/10"
                    : freeSlots === 0
                      ? "bg-red-50/40 border-red-100 hover:border-red-200"
                      : "bg-white border-neutral-200 hover:border-[#0f4c5c]/40 hover:shadow-md"
                }`}
              >
                <span className="text-[10px] font-black uppercase text-neutral-400 block">
                  {dateOption === todayStr
                    ? "Hoje"
                    : getWeekDayShortLabel(dateOption)}
                </span>

                <strong className="text-base font-black text-neutral-950 block mt-1">
                  {formatDateBr(dateOption).slice(0, 5)}
                </strong>

                <span
                  className={`text-[10px] font-black rounded-lg px-2 py-1 inline-block mt-3 ${
                    freeSlots === 0
                      ? "bg-red-100 text-red-700"
                      : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {freeSlots === 0 ? "Esgotado" : `${freeSlots} livres`}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderServiceSelection = () => {
    const serviceList = selectedProfessional
      ? servicesForSelectedProfessional.filter((service) => {
          const normalizedSearch = normalizeText(serviceSearch);

          if (!normalizedSearch) {
            return true;
          }

          return (
            normalizeText(service.name).includes(normalizedSearch) ||
            normalizeText(service.category).includes(normalizedSearch)
          );
        })
      : activeServices;

    return (
      <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-black text-neutral-950">
              Escolha o serviço
            </h3>

            <p className="text-xs text-neutral-500 font-semibold mt-1">
              {selectedProfessional
                ? `Mostrando serviços realizados por ${selectedProfessional.name}.`
                : "Escolha o serviço solicitado pelo cliente."}
            </p>
          </div>

          <div className="relative w-full lg:w-72">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={serviceSearch}
              onChange={(event) => setServiceSearch(event.target.value)}
              placeholder="Buscar serviço..."
              className="w-full bg-neutral-50 border rounded-xl pl-9 pr-3 py-2.5 text-xs font-semibold outline-none focus:border-[#0f4c5c]"
            />
          </div>
        </div>

        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {serviceList.map((service) => {
            const serviceProfessional = selectedProfessional;
            const count =
              serviceProfessional && selectedDate
                ? generateSlotsForSelection({
                    professional: serviceProfessional,
                    service,
                    date: selectedDate,
                    services,
                    appointments,
                    blockedIntervals,
                    openDays,
                  }).length
                : serviceProfessional
                  ? dateOptions.reduce((total, dateOption) => {
                      return (
                        total +
                        generateSlotsForSelection({
                          professional: serviceProfessional,
                          service,
                          date: dateOption,
                          services,
                          appointments,
                          blockedIntervals,
                          openDays,
                        }).length
                      );
                    }, 0)
                  : professionalsForSelectedService.reduce(
                      (total, professional) => {
                        if (
                          !professionalCanDoService({ professional, service })
                        ) {
                          return total;
                        }

                        return (
                          total +
                          dateOptions.reduce((dateTotal, dateOption) => {
                            return (
                              dateTotal +
                              generateSlotsForSelection({
                                professional,
                                service,
                                date: selectedDate || dateOption,
                                services,
                                appointments,
                                blockedIntervals,
                                openDays,
                              }).length
                            );
                          }, 0)
                        );
                      },
                      0,
                    );

            const availability = getAvailabilityBadge(count);
            const isSoldOut = count === 0;

            return (
              <button
                key={service.id}
                type="button"
                onClick={() => {
                  if (!isSoldOut) {
                    handleSelectService(service);
                  }
                }}
                disabled={isSoldOut}
                className={`rounded-2xl border p-3 text-left transition ${
                  selectedServiceId === service.id
                    ? "bg-[#0f4c5c]/5 border-[#0f4c5c] ring-2 ring-[#0f4c5c]/10"
                    : isSoldOut
                      ? "bg-red-50/40 border-red-100 opacity-80 cursor-not-allowed"
                      : "bg-white border-neutral-200 hover:border-[#0f4c5c]/40 hover:shadow-md"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="w-10 h-10 rounded-2xl bg-[#0f4c5c]/5 text-[#0f4c5c] flex items-center justify-center shrink-0">
                      <Briefcase className="w-5 h-5" />
                    </span>

                    <span className="min-w-0">
                      <strong className="text-sm font-black text-neutral-950 block truncate">
                        {service.name}
                      </strong>

                      <span className="text-[10px] font-black text-neutral-400 uppercase tracking-wider block mt-1">
                        {service.category}
                      </span>

                      <span className="flex items-center gap-2 text-xs text-neutral-500 font-semibold mt-2">
                        <Clock className="w-3.5 h-3.5" />
                        {formatDuration(service.duration)}
                      </span>
                    </span>
                  </div>

                  <span className="text-right shrink-0">
                    <strong className="text-sm font-black text-neutral-950 block">
                      {formatCurrency(service.price)}
                    </strong>

                    {service.requireDeposit && (
                      <span className="text-[10px] font-black text-[#0f4c5c] block mt-1">
                        Sinal {formatCurrency(service.depositValue || 0)}
                      </span>
                    )}
                  </span>
                </div>

                <span
                  className={`inline-block mt-4 px-2 py-1 rounded-lg border text-[10px] font-black ${availability.className}`}
                >
                  {availability.label}
                </span>
              </button>
            );
          })}

          {serviceList.length === 0 && (
            <div className="md:col-span-2 bg-neutral-50 border border-dashed rounded-2xl p-10 text-center">
              <p className="text-sm font-black text-neutral-800">
                Nenhum serviço encontrado.
              </p>

              <p className="text-xs text-neutral-400 mt-1">
                Revise a busca ou o cadastro de serviços ativos.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderProfessionalSelection = () => {
    const professionalList = selectedService
      ? professionalsForSelectedService
      : activeProfessionals;

    return (
      <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-black text-neutral-950">
              Escolha o profissional
            </h3>

            <p className="text-xs text-neutral-500 font-semibold mt-1">
              {mode === "professionalAgenda"
                ? "Escolha o profissional para abrir a agenda individual."
                : selectedDate
                  ? `Mostrando disponibilidade para ${formatDateBr(selectedDate)}.`
                  : selectedService
                    ? `Apenas profissionais que realizam ${selectedService.name}.`
                    : `Consulte disponibilidade nos próximos ${LOOKAHEAD_DAYS} dias.`}
            </p>
          </div>

          <div className="relative w-full lg:w-72">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={professionalSearch}
              onChange={(event) => setProfessionalSearch(event.target.value)}
              placeholder="Buscar profissional..."
              className="w-full bg-neutral-50 border rounded-xl pl-9 pr-3 py-2.5 text-xs font-semibold outline-none focus:border-[#0f4c5c]"
            />
          </div>
        </div>

        <div className="p-4 space-y-3">
          {professionalList.map((professional) => {
            const availabilityCount = selectedDate
              ? getSlotsForProfessionalOnSelectedDate(professional)
              : getSlotsForProfessionalAcrossPeriod(professional);

            const availability = getAvailabilityBadge(availabilityCount);
            const isSoldOut =
              mode !== "professionalAgenda" && availabilityCount === 0;

            return (
              <button
                key={professional.id}
                type="button"
                onClick={() => {
                  if (!isSoldOut) {
                    handleSelectProfessional(professional);
                  }
                }}
                disabled={isSoldOut}
                className={`w-full rounded-2xl border p-3 text-left transition ${
                  selectedProfessionalId === professional.id
                    ? "bg-[#0f4c5c]/5 border-[#0f4c5c] ring-2 ring-[#0f4c5c]/10"
                    : isSoldOut
                      ? "bg-red-50/40 border-red-100 opacity-80 cursor-not-allowed"
                      : "bg-white border-neutral-200 hover:border-[#0f4c5c]/40 hover:shadow-md"
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-10 h-10 rounded-full bg-neutral-100 border flex items-center justify-center text-xs font-black text-neutral-700 shrink-0 overflow-hidden">
                      {professional.avatar ? (
                        <img
                          src={professional.avatar}
                          alt={professional.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        professional.name.slice(0, 2).toUpperCase()
                      )}
                    </span>

                    <span className="min-w-0">
                      <strong className="text-sm font-black text-neutral-950 block truncate">
                        {professional.name}
                      </strong>

                      <span className="text-xs text-neutral-500 font-semibold block mt-1">
                        {professional.role}
                      </span>
                    </span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`px-3 py-1 rounded-full border text-[10px] font-black ${mode === "professionalAgenda" ? "bg-neutral-50 text-neutral-700 border-neutral-200" : availability.className}`}
                    >
                      {mode === "professionalAgenda"
                        ? "Abrir agenda"
                        : availability.label}
                    </span>

                    {isSoldOut ? (
                      <Lock className="w-4 h-4 text-red-500" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-neutral-400" />
                    )}
                  </div>
                </div>
              </button>
            );
          })}

          {professionalList.length === 0 && (
            <div className="bg-neutral-50 border border-dashed rounded-2xl p-10 text-center">
              <p className="text-sm font-black text-neutral-800">
                Nenhum profissional encontrado.
              </p>

              <p className="text-xs text-neutral-400 mt-1">
                Revise a busca ou o cadastro dos colaboradores ativos.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderDateTimeSelection = () => {
    return (
      <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-black text-neutral-950">
              Escolha data e horário
            </h3>

            <p className="text-xs text-neutral-500 font-semibold mt-1">
              Horários ocupados, almoço e horários passados são ocultados
              automaticamente.
            </p>
          </div>

          <div className="bg-neutral-50 border rounded-2xl p-3 text-xs min-w-[260px]">
            <span className="font-black text-neutral-950 block">
              Resumo selecionado
            </span>

            <span className="text-neutral-500 font-semibold block mt-1">
              {selectedService?.name || "Serviço não selecionado"}
            </span>

            <span className="text-neutral-500 font-semibold block">
              {selectedProfessional?.name || "Profissional não selecionado"}
            </span>
          </div>
        </div>

        <div className="p-4 space-y-5">
          <div>
            <span className="text-xs font-black text-neutral-500 uppercase tracking-widest font-mono">
              Data do atendimento
            </span>

            <div className="flex gap-2 overflow-x-auto mt-3 pb-1">
              {dateOptions.map((dateOption) => {
                const slotsForDate =
                  selectedService && selectedProfessional
                    ? generateSlotsForSelection({
                        professional: selectedProfessional,
                        service: selectedService,
                        date: dateOption,
                        services,
                        appointments,
                        blockedIntervals,
                        openDays,
                      }).length
                    : 0;
                const isSelected = selectedDate === dateOption;

                return (
                  <button
                    key={dateOption}
                    type="button"
                    onClick={() => handleSelectDateTimeDate(dateOption)}
                    disabled={slotsForDate === 0}
                    className={`min-w-[96px] rounded-2xl border px-3 py-2.5 text-center transition ${
                      isSelected
                        ? "bg-[#0f4c5c]/5 border-[#0f4c5c] ring-2 ring-[#0f4c5c]/10"
                        : slotsForDate === 0
                          ? "bg-red-50/40 border-red-100 opacity-80 cursor-not-allowed"
                          : "bg-white border-neutral-200 hover:border-[#0f4c5c]/40"
                    }`}
                  >
                    <span className="text-[10px] font-black uppercase text-neutral-400 block">
                      {dateOption === todayStr
                        ? "Hoje"
                        : getWeekDayShortLabel(dateOption)}
                    </span>

                    <strong className="text-sm font-black text-neutral-950 block mt-1">
                      {formatDateBr(dateOption).slice(0, 5)}
                    </strong>

                    <span
                      className={`text-[10px] font-black rounded-lg px-2 py-1 inline-block mt-2 ${
                        slotsForDate === 0
                          ? "bg-red-100 text-red-700"
                          : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {slotsForDate === 0
                        ? "Esgotado"
                        : `${slotsForDate} disp.`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t pt-5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-black text-neutral-500 uppercase tracking-widest font-mono">
                Horários disponíveis
              </span>

              <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-2 py-1">
                {availableSlots.length} horários
              </span>
            </div>

            {availableSlots.length === 0 ? (
              <div className="bg-neutral-50 border border-dashed rounded-2xl p-8 text-center mt-3">
                <p className="text-sm font-black text-neutral-800">
                  Horário esgotado para esta seleção.
                </p>

                <p className="text-xs text-neutral-400 mt-1">
                  Volte uma etapa e tente outro profissional, serviço ou data.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mt-3">
                {availableSlots.map((slot) => {
                  const isSelected = selectedTime === slot.time;

                  return (
                    <button
                      key={`${slot.professional.id}-${slot.service.id}-${slot.date}-${slot.time}`}
                      type="button"
                      onClick={() => setSelectedTime(slot.time)}
                      className={`rounded-xl border px-3 py-2.5 text-left transition ${
                        isSelected
                          ? "bg-[#0f4c5c]/5 border-[#0f4c5c] ring-2 ring-[#0f4c5c]/10"
                          : "bg-white border-neutral-200 hover:border-[#0f4c5c]/40"
                      }`}
                    >
                      <strong className="text-sm font-black text-neutral-950 block">
                        {slot.time}
                      </strong>

                      <span className="text-[10px] text-neutral-500 font-bold block mt-1 truncate">
                        Disponível
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-t pt-4 flex justify-end">
            <button
              type="button"
              disabled={!canGoClientData}
              onClick={() => setCurrentStep("clientData")}
              className={`w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-black transition flex items-center justify-center gap-2 ${
                canGoClientData
                  ? "bg-[#0f4c5c] hover:bg-[#123945] text-white shadow-sm"
                  : "bg-neutral-200 text-neutral-400 cursor-not-allowed"
              }`}
            >
              Avançar
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderProfessionalAgenda = () => {
    if (!selectedProfessional) {
      return (
        <div className="rounded-2xl border border-dashed bg-neutral-50 p-8 text-center">
          <p className="text-sm font-extrabold text-neutral-800">
            Profissional não selecionado.
          </p>
        </div>
      );
    }

    const selectedDateSafe = selectedDate || todayStr;
    const selectedScheduleDayOpen = isScheduleDayOpen({
      openDays,
      professional: selectedProfessional,
      date: selectedDateSafe,
    });
    const selectedDateOutsideRegularSchedule = isDateOutsideProfessionalRegularSchedule({
      professional: selectedProfessional,
      date: selectedDateSafe,
    });

    const updateLocalScheduleDay = (scheduleDay: AgendaScheduleDay) => {
      setOpenDays((currentDays) => {
        const nextMap = new Map<string, AgendaScheduleDay>();

        currentDays.forEach((currentDay) => {
          const key = currentDay.id || `${currentDay.professionalId}-${currentDay.date}`;
          nextMap.set(key, currentDay);
        });

        const nextKey = scheduleDay.id || `${scheduleDay.professionalId}-${scheduleDay.date}`;
        nextMap.set(nextKey, scheduleDay);

        return Array.from(nextMap.values());
      });
    };

    const submitScheduleDayUpdate = async (status: "open" | "closed") => {
      if (scheduleDayActionLoading) {
        return;
      }

      const isOpeningOutsideRegularSchedule =
        status === "open" && selectedDateOutsideRegularSchedule;

      setScheduleDayActionLoading(true);

      if (!isValidUuid(selectedProfessional.id)) {
        updateLocalScheduleDay({
          id: `local-${selectedProfessional.id}-${selectedDateSafe}`,
          professionalId: selectedProfessional.id,
          date: selectedDateSafe,
          status,
          isOutOfRegularSchedule: isOpeningOutsideRegularSchedule,
        });

        setScheduleDayActionLoading(false);
        return;
      }

      const { data, error } = await supabase.rpc("upsert_my_professional_schedule_day", {
        p_professional_id: selectedProfessional.id,
        p_date: selectedDateSafe,
        p_status: status,
        p_is_out_of_regular_schedule: isOpeningOutsideRegularSchedule,
      });

      setScheduleDayActionLoading(false);

      if (error) {
        alert(error.message || "Não foi possível atualizar a abertura da agenda.");
        return;
      }

      const firstRow = Array.isArray(data) ? data[0] : data;

      updateLocalScheduleDay(
        normalizeAgendaScheduleDay({
          ...(firstRow || {}),
          professional_id: selectedProfessional.id,
          date: selectedDateSafe,
          status,
          is_out_of_regular_schedule: isOpeningOutsideRegularSchedule,
        } as Record<string, unknown>),
      );
    };

    const handleUpdateScheduleDay = async (status: "open" | "closed") => {
      const isOpeningOutsideRegularSchedule =
        status === "open" && selectedDateOutsideRegularSchedule;

      if (isOpeningOutsideRegularSchedule) {
        setOutsideScaleConfirmRequest("singleOpen");
        return;
      }

      await submitScheduleDayUpdate(status);
    };

    const submitOpenVisibleScheduleDays = async () => {
      if (scheduleDayActionLoading) {
        return;
      }

      setScheduleDayActionLoading(true);

      if (!isValidUuid(selectedProfessional.id)) {
        dateOptions.forEach((dateOption) => {
          const isOutsideRegularSchedule = isDateOutsideProfessionalRegularSchedule({
            professional: selectedProfessional,
            date: dateOption,
          });

          updateLocalScheduleDay({
            id: `local-${selectedProfessional.id}-${dateOption}`,
            professionalId: selectedProfessional.id,
            date: dateOption,
            status: "open",
            isOutOfRegularSchedule: isOutsideRegularSchedule,
          });
        });

        setScheduleDayActionLoading(false);
        return;
      }

      const results: AgendaScheduleDay[] = [];

      for (const dateOption of dateOptions) {
        const isOutsideRegularSchedule = isDateOutsideProfessionalRegularSchedule({
          professional: selectedProfessional,
          date: dateOption,
        });

        const { data, error } = await supabase.rpc("upsert_my_professional_schedule_day", {
          p_professional_id: selectedProfessional.id,
          p_date: dateOption,
          p_status: "open",
          p_is_out_of_regular_schedule: isOutsideRegularSchedule,
        });

        if (error) {
          setScheduleDayActionLoading(false);
          alert(error.message || "Não foi possível abrir os dias selecionados.");
          return;
        }

        const firstRow = Array.isArray(data) ? data[0] : data;

        results.push(
          normalizeAgendaScheduleDay({
            ...(firstRow || {}),
            professional_id: selectedProfessional.id,
            date: dateOption,
            status: "open",
            is_out_of_regular_schedule: isOutsideRegularSchedule,
          } as Record<string, unknown>),
        );
      }

      setScheduleDayActionLoading(false);

      results.forEach((scheduleDay) => {
        updateLocalScheduleDay(scheduleDay);
      });
    };

    const handleOpenVisibleScheduleDays = async () => {
      if (scheduleDayActionLoading) {
        return;
      }

      const outsideRegularDates = dateOptions.filter((dateOption) =>
        isDateOutsideProfessionalRegularSchedule({
          professional: selectedProfessional,
          date: dateOption,
        }),
      );

      if (outsideRegularDates.length > 0) {
        setOutsideScaleConfirmRequest("bulkOpen");
        return;
      }

      await submitOpenVisibleScheduleDays();
    };

    const handleConfirmOutsideScale = async () => {
      const action = outsideScaleConfirmRequest;
      setOutsideScaleConfirmRequest(null);

      if (action === "singleOpen") {
        await submitScheduleDayUpdate("open");
        return;
      }

      if (action === "bulkOpen") {
        await submitOpenVisibleScheduleDays();
      }
    };

    const professionalRecord = selectedProfessional as Professional & {
      noLunchBreak?: boolean;
      defaultAppointmentDuration?: number;
    };
    const slotStepMinutes = Math.max(
      15,
      Number(professionalRecord.defaultAppointmentDuration) || 30,
    );
    const workStart = timeToMinutes(selectedProfessional.workHoursStart);
    const workEnd = timeToMinutes(selectedProfessional.workHoursEnd);
    const lunchStart = timeToMinutes(selectedProfessional.lunchStart);
    const lunchEnd = timeToMinutes(selectedProfessional.lunchEnd);
    const hasLunchBreak = !professionalRecord.noLunchBreak;

    const professionalAppointments = appointments
      .filter((appointment) => {
        return (
          appointment.professionalId === selectedProfessionalId &&
          getAppointmentDate(appointment) === selectedDateSafe
        );
      })
      .sort((first, second) =>
        getAppointmentTime(first).localeCompare(getAppointmentTime(second)),
      );

    const nonBlockingAppointmentStatuses = ["cancelled", "absent", "rescheduled"];

    const blockingAppointments = professionalAppointments.filter(
      (appointment) => !nonBlockingAppointmentStatuses.includes(appointment.status),
    );

    const historicalAppointments = professionalAppointments.filter((appointment) => {
      return nonBlockingAppointmentStatuses.includes(appointment.status);
    });

    const getHistoricalAppointmentsForStartMinute = (startMinute: number) => {
      return historicalAppointments.filter((appointment) => {
        return timeToMinutes(getAppointmentTime(appointment)) === startMinute;
      });
    };

    const getAppointmentService = (appointment: Appointment) => {
      return services.find((item) => item.id === appointment.serviceId);
    };

    const getAppointmentEndMinute = (appointment: Appointment) => {
      const appointmentService = getAppointmentService(appointment);
      return getAppointmentStartMinute(appointment) + (appointmentService?.duration || slotStepMinutes);
    };

    const getAppointmentStartMinute = (appointment: Appointment) => {
      return timeToMinutes(getAppointmentTime(appointment));
    };

    const getAppointmentCardClassName = (status: Appointment["status"]) => {
      if (status === "confirmed") {
        return "border-emerald-200 bg-emerald-50/80 shadow-emerald-950/5";
      }

      if (status === "cancelled") {
        return "border-neutral-300 bg-neutral-100/90 shadow-neutral-950/5 opacity-90";
      }

      if (status === "absent") {
        return "border-red-200 bg-red-50/85 shadow-red-950/5";
      }

      if (status === "completed") {
        return "border-sky-200 bg-sky-50/80 shadow-sky-950/5";
      }

      return "border-amber-200 bg-amber-50/85 shadow-amber-950/5";
    };

    const getAppointmentFooterLabel = (status: Appointment["status"]) => {
      if (status === "confirmed") return "CLIENTE CONFIRMOU PRESENÇA";
      if (status === "cancelled") return "ATENDIMENTO CANCELADO";
      if (status === "absent") return "CLIENTE FALTOU";
      if (status === "rescheduled") return "ATENDIMENTO REMARCADO";
      if (status === "completed") return "ATENDIMENTO FINALIZADO";
      return "AGUARDANDO CONFIRMAÇÃO";
    };

    const getAppointmentFooterClassName = (status: Appointment["status"]) => {
      if (status === "confirmed") return "text-emerald-800";
      if (status === "cancelled") return "text-neutral-600";
      if (status === "absent") return "text-red-800";
      if (status === "rescheduled") return "text-orange-800";
      if (status === "completed") return "text-sky-800";
      return "text-amber-800";
    };

    const handleStatusAction = (
      appointmentId: string,
      status: Appointment["status"],
    ) => {
      if (onUpdateAppointmentStatus) {
        onUpdateAppointmentStatus(appointmentId, status);
      }
    };

    const isTodayPastSlot = (slotStart: number) => {
      return selectedDateSafe === todayStr && slotStart <= getCurrentTimeInMinutes();
    };

    const daySlots = [] as Array<{
      key: string;
      start: number;
      end: number;
      type: "appointment" | "occupied" | "lunch" | "free" | "past" | "blocked";
      appointment?: Appointment;
      blockedInterval?: AgendaBlockedInterval;
      occupyingAppointment?: Appointment;
      historicalAppointments?: Appointment[];
    }>;

    for (let minute = workStart; minute < workEnd; minute += slotStepMinutes) {
      const slotEnd = Math.min(minute + slotStepMinutes, workEnd);
      const appointmentStartingHere = blockingAppointments.find(
        (appointment) => getAppointmentStartMinute(appointment) === minute,
      );
      const slotHistoricalAppointments = getHistoricalAppointmentsForStartMinute(minute);
      const blockingAppointmentStartingHere = blockingAppointments.find(
        (appointment) => getAppointmentStartMinute(appointment) === minute,
      );
      const occupyingAppointment = blockingAppointments.find((appointment) => {
        const appointmentStart = getAppointmentStartMinute(appointment);
        const appointmentEnd = getAppointmentEndMinute(appointment);

        return appointmentStart < slotEnd && appointmentEnd > minute;
      });
      const overlapsLunch = hasLunchBreak && minute < lunchEnd && slotEnd > lunchStart;
      const blockedInterval = slotOverlapsBlockedInterval({
        blockedIntervals,
        professionalId: selectedProfessional.id,
        date: selectedDateSafe,
        slotStart: minute,
        slotEnd
      });

      if (appointmentStartingHere) {
        daySlots.push({
          key: `appointment-${appointmentStartingHere.id}`,
          start: minute,
          end: getAppointmentEndMinute(appointmentStartingHere),
          type: "appointment",
          appointment: appointmentStartingHere,
          historicalAppointments: slotHistoricalAppointments,
        });
        continue;
      }

      if (occupyingAppointment && !blockingAppointmentStartingHere) {
        daySlots.push({
          key: `occupied-${occupyingAppointment.id}-${minute}`,
          start: minute,
          end: slotEnd,
          type: "occupied",
          occupyingAppointment,
        });
        continue;
      }

      if (!selectedScheduleDayOpen) {
        daySlots.push({
          key: `closed-${selectedProfessional.id}-${selectedDateSafe}-${minute}`,
          start: minute,
          end: slotEnd,
          type: "blocked",
          blockedInterval: {
            id: `closed-${selectedProfessional.id}-${selectedDateSafe}`,
            professionalId: selectedProfessional.id,
            date: selectedDateSafe,
            startTime: minutesToTime(minute),
            endTime: minutesToTime(slotEnd),
            reason: "Agenda fechada. Abra este dia para permitir agendamentos.",
          },
          historicalAppointments: slotHistoricalAppointments,
        });
        continue;
      }

      if (blockedInterval) {
        daySlots.push({
          key: `blocked-${blockedInterval.id}-${minute}`,
          start: minute,
          end: slotEnd,
          type: "blocked",
          blockedInterval,
          historicalAppointments: slotHistoricalAppointments,
        });
        continue;
      }

      if (overlapsLunch) {
        daySlots.push({
          key: `lunch-${minute}`,
          start: minute,
          end: slotEnd,
          type: "lunch",
          historicalAppointments: slotHistoricalAppointments,
        });
        continue;
      }

      if (isTodayPastSlot(minute)) {
        daySlots.push({
          key: `past-${minute}`,
          start: minute,
          end: slotEnd,
          type: "past",
          historicalAppointments: slotHistoricalAppointments,
        });
        continue;
      }

      daySlots.push({
        key: `free-${minute}`,
        start: minute,
        end: slotEnd,
        type: "free",
        historicalAppointments: slotHistoricalAppointments,
      });
    }

    const confirmedCount = professionalAppointments.filter(
      (appointment) => appointment.status === "confirmed",
    ).length;
    const pendingCount = professionalAppointments.filter(
      (appointment) => appointment.status === "scheduled",
    ).length;
    const absentCount = professionalAppointments.filter(
      (appointment) => appointment.status === "absent",
    ).length;
    const freeCount = daySlots.filter((slot) => slot.type === "free").length;
    const blockedCount = daySlots.filter(
      (slot) => slot.type === "lunch" || slot.type === "past" || slot.type === "blocked",
    ).length;

    const currentDayMinute = getCurrentTimeInMinutes();
    const shouldSeparatePastSlot = (slot: (typeof daySlots)[number]) => {
      if (selectedDateSafe !== todayStr) {
        return false;
      }

      return slot.end <= currentDayMinute;
    };
    const pastDaySlots = daySlots.filter(shouldSeparatePastSlot);
    const currentAndFutureDaySlots = daySlots.filter((slot) => {
      return !shouldSeparatePastSlot(slot);
    });
    const slotsToRender = showPastProfessionalAgendaSlots
      ? daySlots
      : currentAndFutureDaySlots;

    const handleCreateAppointmentFromFreeSlot = (startMinute: number) => {
      setSelectedProfessionalId(selectedProfessional.id);
      setSelectedDate(selectedDateSafe);
      setSelectedTime(minutesToTime(startMinute));
      setSelectedServiceId("");
      setClientName("");
      setClientPhone("");
      setClientNotes("");
      setCurrentStep("selectService");
    };

    const renderHistoricalAppointments = (historyItems: Appointment[] = []) => {
      if (historyItems.length === 0) {
        return null;
      }

      return (
        <div className="mt-3 rounded-xl border border-dashed border-neutral-300 bg-neutral-50/80 px-3 py-2 opacity-75">
          <p className="font-mono text-[10px] font-extrabold uppercase tracking-[0.16em] text-neutral-500">
            Histórico do horário
          </p>

          <div className="mt-1 space-y-1">
            {historyItems.map((historyAppointment) => {
              const historyService = getAppointmentService(historyAppointment);
              const statusLabel = getAppointmentFooterLabel(historyAppointment.status);

              return (
                <p
                  key={historyAppointment.id}
                  className="text-xs font-semibold text-neutral-500 line-through decoration-neutral-300"
                >
                  {historyAppointment.clientName} — {statusLabel.toLowerCase()}
                  {historyService?.name ? ` · ${historyService.name}` : ""}
                </p>
              );
            })}
          </div>
        </div>
      );
    };

    const renderAppointmentSlot = (
      appointment: Appointment,
      historyItems: Appointment[] = [],
    ) => {
      const service = getAppointmentService(appointment);
      const disabledActions = !onUpdateAppointmentStatus;

      return (
        <div
          key={appointment.id}
          className={`rounded-2xl border p-4 shadow-sm transition ${getAppointmentCardClassName(appointment.status)}`}
        >
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[96px_1fr_auto] xl:items-center">
            <div className="flex items-center gap-3 xl:block">
              <span className="block rounded-2xl bg-white/80 px-4 py-3 text-center font-mono text-2xl font-extrabold leading-none tracking-[-0.04em] text-neutral-950 shadow-sm ring-1 ring-black/5">
                {getAppointmentTime(appointment)}
              </span>
            </div>

            <div className="min-w-0">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-neutral-500">
                Cliente: <span className="text-neutral-950">{appointment.clientName}</span>
              </p>

              <h4 className="mt-2 break-words text-lg font-extrabold leading-tight tracking-[-0.03em] text-neutral-950">
                {service?.name || "Serviço não localizado"}
              </h4>

              <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-neutral-500">
                Profissional: {selectedProfessional.name}
              </p>

              {appointment.clientPhone && (
                <p className="mt-1 text-xs font-semibold text-neutral-500">
                  WhatsApp: {appointment.clientPhone}
                </p>
              )}

              {appointment.notes && (
                <p className="mt-2 rounded-xl bg-white/65 px-3 py-2 text-xs font-medium leading-relaxed text-neutral-600 ring-1 ring-black/5">
                  {appointment.notes}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:min-w-[460px]">
              <button
                type="button"
                disabled={disabledActions || appointment.status === "confirmed"}
                onClick={() => handleStatusAction(appointment.id, "confirmed")}
                className={`rounded-xl px-3 py-2.5 text-xs font-extrabold transition ${
                  disabledActions || appointment.status === "confirmed"
                    ? "cursor-not-allowed bg-emerald-100 text-emerald-700"
                    : "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700"
                }`}
              >
                Confirmar
              </button>

              <button
                type="button"
                disabled={!onOpenRescheduleAppointment}
                onClick={() => onOpenRescheduleAppointment?.(appointment)}
                className={`rounded-xl px-3 py-2.5 text-xs font-extrabold transition ${
                  onOpenRescheduleAppointment
                    ? "bg-orange-600 text-white shadow-sm hover:bg-orange-700"
                    : "cursor-not-allowed bg-orange-100 text-orange-400"
                }`}
              >
                Reagendar
              </button>

              <button
                type="button"
                disabled={disabledActions || appointment.status === "cancelled"}
                onClick={() => handleStatusAction(appointment.id, "cancelled")}
                className={`rounded-xl px-3 py-2.5 text-xs font-extrabold transition ${
                  disabledActions || appointment.status === "cancelled"
                    ? "cursor-not-allowed bg-neutral-200 text-neutral-500"
                    : "bg-neutral-800 text-white shadow-sm hover:bg-neutral-900"
                }`}
              >
                Cancelou
              </button>

              <button
                type="button"
                disabled={disabledActions || appointment.status === "absent"}
                onClick={() => handleStatusAction(appointment.id, "absent")}
                className={`rounded-xl px-3 py-2.5 text-xs font-extrabold transition ${
                  disabledActions || appointment.status === "absent"
                    ? "cursor-not-allowed bg-red-100 text-red-700"
                    : "bg-red-700 text-white shadow-sm hover:bg-red-800"
                }`}
              >
                Faltou
              </button>
            </div>
          </div>

          {renderHistoricalAppointments(historyItems)}

          <div
            className={`mt-3 border-t border-black/5 pt-3 font-mono text-[10px] font-extrabold uppercase tracking-[0.18em] ${getAppointmentFooterClassName(appointment.status)}`}
          >
            {getAppointmentFooterLabel(appointment.status)}
          </div>
        </div>
      );
    };

    return (
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <div className="border-b p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-base font-extrabold tracking-tight text-neutral-950">
                Agenda de {selectedProfessional.name}
              </h3>

              <p className="mt-1 text-xs font-medium text-neutral-500">
                Visualize horários livres, horários marcados e ações rápidas do dia.
              </p>

              <p className={`mt-2 inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${
                selectedScheduleDayOpen
                  ? "border-emerald-200 bg-emerald-100 text-emerald-800"
                  : "border-red-200 bg-red-100 text-red-800"
              }`}>
                {selectedScheduleDayOpen ? "Agenda aberta" : "Agenda fechada"}
                {selectedScheduleDayOpen && selectedDateOutsideRegularSchedule ? " · fora da escala" : ""}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={scheduleDayActionLoading || selectedScheduleDayOpen}
                onClick={() => handleUpdateScheduleDay("open")}
                className={`rounded-xl px-3 py-2 font-mono text-[10px] font-extrabold uppercase tracking-[0.12em] transition ${
                  selectedScheduleDayOpen
                    ? "cursor-not-allowed border border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "bg-emerald-700 text-white shadow-sm hover:bg-emerald-800"
                }`}
              >
                Abrir dia
              </button>

              <button
                type="button"
                disabled={scheduleDayActionLoading || !selectedScheduleDayOpen}
                onClick={() => handleUpdateScheduleDay("closed")}
                className={`rounded-xl px-3 py-2 font-mono text-[10px] font-extrabold uppercase tracking-[0.12em] transition ${
                  !selectedScheduleDayOpen
                    ? "cursor-not-allowed border border-neutral-200 bg-neutral-100 text-neutral-400"
                    : "bg-neutral-900 text-white shadow-sm hover:bg-black"
                }`}
              >
                Fechar dia
              </button>

              <button
                type="button"
                disabled={scheduleDayActionLoading}
                onClick={handleOpenVisibleScheduleDays}
                className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 font-mono text-[10px] font-extrabold uppercase tracking-[0.12em] text-blue-900 transition hover:border-blue-300 hover:bg-blue-100"
              >
                Abrir dias visíveis
              </button>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {dateOptions.map((dateOption) => {
                const isSelected = selectedDateSafe === dateOption;

                return (
                  <button
                    key={dateOption}
                    type="button"
                    onClick={() => setSelectedDate(dateOption)}
                    className={`min-w-[78px] rounded-xl border px-3 py-2 text-center transition ${
                      isSelected
                        ? "border-[#0f4c5c] bg-orange-600 text-white shadow-sm"
                        : "border-neutral-200 bg-white text-neutral-600 hover:border-[#0f4c5c]/40"
                    }`}
                  >
                    <span className="block text-[10px] font-extrabold uppercase tracking-wider">
                      {dateOption === todayStr ? "Hoje" : getWeekDayShortLabel(dateOption)}
                    </span>

                    <strong className="mt-0.5 block text-xs font-extrabold">
                      {formatDateBr(dateOption).slice(0, 5)}
                    </strong>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-2 p-3">
          {pastDaySlots.length > 0 && (
            <button
              type="button"
              onClick={() => setShowPastProfessionalAgendaSlots((current) => !current)}
              className="w-full rounded-xl border border-[#0f4c5c]/20 bg-white px-4 py-2.5 text-xs font-black uppercase tracking-[0.12em] text-[#0f4c5c] transition hover:border-[#0f4c5c]/40 hover:bg-[#0f4c5c]/5"
            >
              {showPastProfessionalAgendaSlots
                ? "Ocultar horários anteriores"
                : `+ Ver horários anteriores (${pastDaySlots.length})`}
            </button>
          )}

          {showPastProfessionalAgendaSlots && pastDaySlots.length > 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                Horários anteriores do dia
              </p>
            </div>
          )}

          {slotsToRender.map((slot) => {
            if (slot.type === "appointment" && slot.appointment) {
              return renderAppointmentSlot(slot.appointment, slot.historicalAppointments || []);
            }

            if (slot.type === "occupied" && slot.occupyingAppointment) {
              const service = getAppointmentService(slot.occupyingAppointment);
              return (
                <div key={slot.key} className="grid grid-cols-[90px_1fr] gap-4 rounded-2xl border border-neutral-200 bg-neutral-100 p-3 opacity-80">
                  <div className="font-mono">
                    <strong className="block text-lg text-neutral-500">{minutesToTime(slot.start)}</strong>
                    <span className="text-[11px] text-neutral-400">até {minutesToTime(slot.end)}</span>
                  </div>
                  <div>
                    <strong className="text-sm font-extrabold text-neutral-600">Ocupado pelo atendimento anterior</strong>
                    <p className="mt-1 text-xs font-medium text-neutral-500">
                      {service?.name || "Atendimento"} ocupa este bloco de horário.
                    </p>
                  </div>
                </div>
              );
            }


            if (slot.type === "blocked") {
              return (
                <div key={slot.key} className="grid grid-cols-[90px_1fr] gap-4 rounded-2xl border border-neutral-300 bg-neutral-100 p-3">
                  <div className="font-mono">
                    <strong className="block text-lg text-neutral-700">{minutesToTime(slot.start)}</strong>
                    <span className="text-[11px] text-neutral-500">até {minutesToTime(slot.end)}</span>
                  </div>
                  <div>
                    <strong className="text-sm font-extrabold text-neutral-800">Bloqueado</strong>
                    <p className="mt-1 text-xs font-medium text-neutral-600">
                      {slot.blockedInterval?.reason || "Horário bloqueado na agenda do profissional."}
                    </p>
                    {renderHistoricalAppointments(slot.historicalAppointments || [])}
                  </div>
                </div>
              );
            }

            if (slot.type === "lunch") {
              return (
                <div key={slot.key} className="grid grid-cols-[90px_1fr] gap-4 rounded-2xl border border-orange-100 bg-[#0f4c5c]/5/70 p-3">
                  <div className="font-mono">
                    <strong className="block text-lg text-[#0f4c5c]">{minutesToTime(slot.start)}</strong>
                    <span className="text-[11px] text-orange-500">até {minutesToTime(slot.end)}</span>
                  </div>
                  <div>
                    <strong className="text-sm font-extrabold text-orange-800">Intervalo de almoço</strong>
                    <p className="mt-1 text-xs font-medium text-[#0f4c5c]">Horário bloqueado pelo intervalo cadastrado.</p>
                  </div>
                </div>
              );
            }

            if (slot.type === "past") {
              return (
                <div key={slot.key} className="grid grid-cols-[90px_1fr] gap-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-3 opacity-60">
                  <div className="font-mono">
                    <strong className="block text-lg text-neutral-500">{minutesToTime(slot.start)}</strong>
                    <span className="text-[11px] text-neutral-400">até {minutesToTime(slot.end)}</span>
                  </div>
                  <div>
                    <strong className="text-sm font-extrabold text-neutral-600">Horário passado</strong>
                    <p className="mt-1 text-xs font-medium text-neutral-500">Este horário não pode mais receber agendamento.</p>
                    {renderHistoricalAppointments(slot.historicalAppointments || [])}
                  </div>
                </div>
              );
            }

            return (
              <div key={slot.key} className="grid grid-cols-1 gap-3 rounded-2xl border border-neutral-200 bg-white p-3 sm:grid-cols-[90px_1fr_auto] sm:items-center">
                <div className="font-mono">
                  <strong className="block text-lg text-neutral-950">{minutesToTime(slot.start)}</strong>
                  <span className="text-[11px] text-neutral-400">até {minutesToTime(slot.end)}</span>
                </div>

                <div>
                  <strong className="text-sm font-extrabold text-neutral-800">Livre</strong>
                  <p className="mt-1 text-xs font-medium text-neutral-500">Horário disponível para agendamento.</p>
                  {renderHistoricalAppointments(slot.historicalAppointments || [])}
                </div>

                <div className="flex flex-wrap gap-2 sm:justify-end">
                  <button
                    type="button"
                    onClick={() => handleCreateAppointmentFromFreeSlot(slot.start)}
                    className="rounded-xl bg-orange-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-sm transition hover:bg-orange-700"
                  >
                    + Agendar
                  </button>

                  <button
                    type="button"
                    className="rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-xs font-extrabold text-neutral-700 transition hover:bg-neutral-50"
                    title="Bloqueio manual de horário será ligado à regra definitiva de agenda aberta/fechada."
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Lock className="h-3.5 w-3.5" /> Bloquear
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {outsideScaleConfirmRequest && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-sm rounded-3xl border border-[#0f4c5c]/15 bg-white p-5 text-center shadow-2xl">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0f4c5c]/5 text-[#0f4c5c]">
                <AlertTriangle className="h-8 w-8" />
              </div>

              <h4 className="mt-4 text-lg font-extrabold text-neutral-950">
                Abrir agenda fora da escala?
              </h4>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleConfirmOutsideScale}
                  className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-emerald-700"
                >
                  Sim
                </button>

                <button
                  type="button"
                  onClick={() => setOutsideScaleConfirmRequest(null)}
                  className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-red-700"
                >
                  Não
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderClientData = () => {
    const matchedClient = findClientByPhone(clientPhone);

    return (
      <form
        onSubmit={handleSubmit}
        className="bg-white border rounded-2xl shadow-sm overflow-hidden max-w-5xl mx-auto"
      >
        <div className="p-4 border-b">
          <h3 className="text-base font-black text-neutral-950">
            Dados do cliente
          </h3>

          <p className="text-xs text-neutral-500 font-semibold mt-1">
            Informe primeiro o WhatsApp. Se o cliente já existir, o nome será
            preenchido automaticamente.
          </p>
        </div>

        <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-3">
            <div>
              <label className="text-xs font-black text-neutral-500 uppercase tracking-widest font-mono block mb-1.5">
                WhatsApp
              </label>

              <div className="relative">
                <Phone className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={clientPhone}
                  onChange={(event) =>
                    handleClientPhoneChange(event.target.value)
                  }
                  placeholder="(14) 99999-9999"
                  className="w-full bg-neutral-50 border rounded-xl pl-9 pr-3 py-2 text-sm font-semibold outline-none focus:border-[#0f4c5c]"
                  autoFocus
                />
              </div>

              {matchedClient && (
                <p className="mt-1.5 text-[11px] font-bold text-emerald-700">
                  Cliente encontrado na base: {matchedClient.name}
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-black text-neutral-500 uppercase tracking-widest font-mono block mb-1.5">
                Nome do cliente
              </label>

              <input
                value={clientName}
                onChange={(event) => setClientName(event.target.value)}
                placeholder="Ex.: Maria Silva"
                className="w-full bg-neutral-50 border rounded-xl px-3 py-2 text-sm font-semibold outline-none focus:border-[#0f4c5c]"
              />
            </div>

            <div>
              <label className="text-xs font-black text-neutral-500 uppercase tracking-widest font-mono block mb-1.5">
                Observações
              </label>

              <textarea
                value={clientNotes}
                onChange={(event) => setClientNotes(event.target.value)}
                placeholder="Ex.: Cliente prefere atendimento rápido."
                className="w-full bg-neutral-50 border rounded-xl px-3 py-2 text-sm font-semibold outline-none focus:border-[#0f4c5c] min-h-[62px] resize-none"
              />
            </div>
          </div>

          <div className="bg-neutral-50 border rounded-2xl p-3 h-fit">
            <span className="text-xs font-black text-neutral-500 uppercase tracking-widest font-mono block">
              Resumo
            </span>

            <div className="mt-3 space-y-2.5 text-sm">
              <div>
                <span className="text-[10px] font-black text-neutral-400 uppercase block">
                  Serviço
                </span>
                <strong className="text-neutral-950">
                  {selectedService?.name}
                </strong>
              </div>

              <div>
                <span className="text-[10px] font-black text-neutral-400 uppercase block">
                  Profissional
                </span>
                <strong className="text-neutral-950">
                  {selectedProfessional?.name}
                </strong>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] font-black text-neutral-400 uppercase block">
                    Data
                  </span>
                  <strong className="text-neutral-950">
                    {formatDateBr(selectedDate)}
                  </strong>
                </div>

                <div>
                  <span className="text-[10px] font-black text-neutral-400 uppercase block">
                    Hora
                  </span>
                  <strong className="text-neutral-950">{selectedTime}</strong>
                </div>
              </div>

              <div className="border-t pt-2.5">
                <span className="text-[10px] font-black text-neutral-400 uppercase block">
                  Valor do serviço
                </span>
                <strong className="text-lg text-neutral-950">
                  {formatCurrency(selectedService?.price || 0)}
                </strong>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t bg-neutral-50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-neutral-500 font-semibold flex items-center gap-2">
            <Info className="w-4 h-4" />A cobrança fica para o caixa. Aqui
            salvamos somente o agendamento.
          </p>

          <button
            type="submit"
            disabled={!canSubmit}
            className={`w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-black transition ${
              canSubmit
                ? "bg-[#0f4c5c] hover:bg-[#123945] text-white shadow-sm"
                : "bg-neutral-200 text-neutral-400 cursor-not-allowed"
            }`}
          >
            Confirmar agendamento
          </button>
        </div>
      </form>
    );
  };

  const renderSuccess = () => {
    return (
      <div className="bg-white border rounded-2xl shadow-sm p-8 text-center max-w-2xl mx-auto">
        <span className="w-14 h-14 bg-emerald-50 text-emerald-700 rounded-full mx-auto flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8" />
        </span>

        <h3 className="text-2xl font-black text-neutral-950 mt-4">
          Agendamento criado com sucesso
        </h3>

        <p className="text-sm text-neutral-500 font-semibold mt-2">
          O atendimento foi incluído na agenda geral de {config.name}.
        </p>

        <div className="mt-5 flex flex-col sm:flex-row justify-center gap-2">
          {whatsAppConfirmUrl && (
            <a
              href={whatsAppConfirmUrl}
              target="_blank"
              rel="noreferrer"
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-xs font-black transition inline-flex items-center justify-center gap-2"
            >
              <Phone className="w-4 h-4" />
              Enviar confirmação no WhatsApp
            </a>
          )}

          <button
            type="button"
            onClick={resetFlow}
            className="bg-[#0f4c5c] hover:bg-[#123945] text-white px-5 py-2.5 rounded-xl text-xs font-black transition"
          >
            Fazer novo agendamento
          </button>
        </div>
      </div>
    );
  };

  const renderCurrentStep = () => {
    if (currentStep === "selectDate") {
      return renderDateSelection();
    }

    if (currentStep === "selectService") {
      return renderServiceSelection();
    }

    if (currentStep === "selectProfessional") {
      return renderProfessionalSelection();
    }

    if (currentStep === "selectDateTime") {
      return renderDateTimeSelection();
    }

    if (currentStep === "clientData") {
      return renderClientData();
    }

    if (currentStep === "professionalAgenda") {
      return renderProfessionalAgenda();
    }

    if (currentStep === "success") {
      return renderSuccess();
    }

    return null;
  };

  return (
    <div
      id="view-agenda"
      ref={viewTopRef}
      className="space-y-4 text-left animate-none"
    >
      {currentStep === "start" ? (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight text-neutral-950">
              Agenda Geral do Salão
            </h2>

            <p className="text-xs text-neutral-500 mt-1 font-semibold">
              Gerencie a agenda dos profissionais de forma rápida, visual e objetiva.
            </p>
          </div>

          {renderProfessionalManagerCards()}
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3 bg-white border rounded-2xl px-3 py-2 shadow-sm">
          <button
            type="button"
            onClick={goBack}
            className="bg-[#0f4c5c] hover:bg-[#123945] border border-[#0f4c5c] text-white px-3 py-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
        </div>
      )}

      {renderCurrentStep()}
    </div>
  );
}
