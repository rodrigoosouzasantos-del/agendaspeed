/**
 * Página pública de acompanhamento do cliente - AgendaSpeed.
 *
 * Responsável por:
 * - abrir o link enviado pelo WhatsApp após o agendamento;
 * - listar somente agendamentos futuros do cliente;
 * - permitir confirmar presença, remarcar ou cancelar;
 * - remarcar somente com horários reais disponíveis do mesmo profissional;
 * - registrar alertas para o estabelecimento/profissional quando houver remarcação ou cancelamento.
 */

import React, {
  useEffect,
  useMemo,
  useState
} from 'react';

import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCcw,
  UserCheck,
  XCircle
} from 'lucide-react';

import { LocalState } from '../../data';
import { Appointment } from '../../types';
import { supabase } from '../../lib/supabase';

type ClientActionType = 'confirm' | 'reschedule' | 'cancel';

type ClientAppointmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'attending'
  | 'completed'
  | 'cancelled'
  | 'absent'
  | 'rescheduled';

interface ClientAppointmentRow {
  id: string;
  tenantName: string;
  serviceName: string;
  professionalName: string;
  professionalId: string;
  serviceId: string;
  serviceDurationMinutes: number;
  startsAtLocal: string;
  status: ClientAppointmentStatus;
  cancelLeadTimeMinutes: number;
  rescheduleLeadTimeMinutes: number;
  confirmLeadTimeMinutes: number;
}

interface RescheduleOptionRow {
  date: string;
  dayLabel: string;
  dateLabel: string;
  time: string;
  startsAtLocal: string;
  professionalId: string;
  serviceDurationMinutes: number;
}

interface AgendaBlockedInterval {
  id: string;
  professionalId: string;
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
}

interface ClientAppointmentsPageProps {
  token: string;
  state: LocalState;
}

interface FeedbackModalState {
  tone: 'orange' | 'red' | 'green';
  title: string;
  description: string;
}

interface RescheduleDraft {
  appointment: ClientAppointmentRow;
  selectedDate: string;
  selectedStartsAtLocal: string;
  options: RescheduleOptionRow[];
  blockedIntervals: AgendaBlockedInterval[];
  loading: boolean;
  error: string;
}

const CLIENT_APPOINTMENTS_CACHE_PREFIX = 'agendaspeed:client-appointments:';
const CLIENT_APPOINTMENTS_LOAD_TIMEOUT_MS = 12000;
const RESCHEDULE_LOAD_TIMEOUT_MS = 15000;

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutMs);

    promise
      .then((value) => {
        window.clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        window.clearTimeout(timer);
        reject(error);
      });
  });
}

function getCachedClientAppointments(token: string): ClientAppointmentRow[] {
  if (!token) return [];

  try {
    const rawCachedValue = window.sessionStorage.getItem(`${CLIENT_APPOINTMENTS_CACHE_PREFIX}${token}`);
    if (!rawCachedValue) return [];

    const parsedValue = JSON.parse(rawCachedValue) as ClientAppointmentRow[];
    if (!Array.isArray(parsedValue)) return [];

    return parsedValue
      .map((item) => normalizeRemoteAppointment(item as unknown as Record<string, unknown>))
      .filter((appointment) => {
        return (
          appointment.id &&
          isFutureAppointment(appointment.startsAtLocal) &&
          appointment.status !== 'cancelled' &&
          appointment.status !== 'completed' &&
          appointment.status !== 'absent'
        );
      });
  } catch {
    return [];
  }
}

function setCachedClientAppointments(token: string, rows: ClientAppointmentRow[]): void {
  if (!token) return;

  try {
    window.sessionStorage.setItem(
      `${CLIENT_APPOINTMENTS_CACHE_PREFIX}${token}`,
      JSON.stringify(rows)
    );
  } catch {
    // Cache é apenas otimização. Se falhar, a tela continua funcionando normalmente.
  }
}

function padDatePart(value: number): string {
  return String(value).padStart(2, '0');
}

function getLocalDateTimeValue(date = new Date()): string {
  return [
    date.getFullYear(),
    padDatePart(date.getMonth() + 1),
    padDatePart(date.getDate())
  ].join('-') + `T${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}`;
}

function formatDateBr(dateStr: string): string {
  if (!dateStr || !dateStr.includes('-')) {
    return dateStr;
  }

  return dateStr.split('-').reverse().join('/');
}

function formatDateTimeBr(dateTime: string): string {
  if (!dateTime || !dateTime.includes('T')) {
    return dateTime;
  }

  const [date, time] = dateTime.split('T');

  return `${formatDateBr(date)} às ${String(time || '').slice(0, 5)}`;
}

function getDateInputValue(dateTime: string): string {
  return String(dateTime || '').split('T')[0] || '';
}

function getTimeInputValue(dateTime: string): string {
  return String(dateTime || '').split('T')[1]?.slice(0, 5) || '';
}

function isFutureAppointment(dateTime: string): boolean {
  return String(dateTime || '').slice(0, 16) >= getLocalDateTimeValue();
}

function getMinutesUntil(dateTime: string): number {
  const targetDate = new Date(dateTime);
  const now = new Date();

  if (Number.isNaN(targetDate.getTime())) {
    return 0;
  }

  return Math.floor((targetDate.getTime() - now.getTime()) / 60000);
}

function readRecordValue<T = unknown>(
  source: unknown,
  keys: string[]
): T | undefined {
  const record = source as Record<string, unknown>;

  for (const key of keys) {
    if (record && record[key] !== undefined && record[key] !== null) {
      return record[key] as T;
    }
  }

  return undefined;
}

function normalizeText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function buildCompactSlugCandidate(value: string): string {
  return normalizeText(value).replace(/[^a-z0-9]/g, '');
}

function getTenantSlugCandidates(params: {
  appointment?: ClientAppointmentRow;
  state: LocalState;
}): string[] {
  const candidates = new Set<string>();
  const addCandidate = (value: unknown) => {
    if (typeof value !== 'string') return;

    const compact = buildCompactSlugCandidate(value);
    if (compact) {
      candidates.add(compact);
    }

    const pathLike = value.split('/').filter(Boolean).pop() || '';
    const compactPath = buildCompactSlugCandidate(pathLike);
    if (compactPath) {
      candidates.add(compactPath);
    }
  };

  addCandidate(params.appointment?.tenantName);
  addCandidate(params.state.config.name);

  try {
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    pathParts.forEach((part) => {
      if (!['meus-agendamentos', 'meu-agendamento'].includes(part)) {
        addCandidate(part);
      }
    });
  } catch {
    // Mantém a página funcionando mesmo se o browser bloquear algum recurso.
  }

  return Array.from(candidates);
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = String(time || '00:00').slice(0, 5).split(':').map(Number);

  return (Number(hours) || 0) * 60 + (Number(minutes) || 0);
}

function normalizeAgendaBlockedInterval(rawBlock: Record<string, unknown>): AgendaBlockedInterval {
  return {
    id: String(readRecordValue(rawBlock, ['id']) || ''),
    professionalId: String(readRecordValue(rawBlock, ['professional_id', 'professionalId']) || ''),
    date: String(readRecordValue(rawBlock, ['date', 'block_date', 'blockDate']) || '').slice(0, 10),
    startTime: String(readRecordValue(rawBlock, ['start_time', 'startTime']) || '').slice(0, 5),
    endTime: String(readRecordValue(rawBlock, ['end_time', 'endTime']) || '').slice(0, 5),
    reason: String(readRecordValue(rawBlock, ['reason', 'notes']) || 'Bloqueado')
  };
}

function mergeBlockedIntervals(
  currentMap: Map<string, AgendaBlockedInterval>,
  rows: unknown
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

function getOptionSlotRange(option: RescheduleOptionRow): {
  date: string;
  startMinute: number;
  endMinute: number;
} {
  const date = option.date || getDateInputValue(option.startsAtLocal);
  const time = option.time || getTimeInputValue(option.startsAtLocal);
  const startMinute = timeToMinutes(time);
  const duration = Math.max(15, Number(option.serviceDurationMinutes) || 30);

  return {
    date,
    startMinute,
    endMinute: startMinute + duration
  };
}

function optionOverlapsBlockedInterval(params: {
  option: RescheduleOptionRow;
  appointment: ClientAppointmentRow;
  blockedIntervals: AgendaBlockedInterval[];
}): AgendaBlockedInterval | null {
  const { option, appointment, blockedIntervals } = params;
  const professionalId = option.professionalId || appointment.professionalId;

  if (!professionalId) {
    return null;
  }

  const optionRange = getOptionSlotRange(option);

  return blockedIntervals.find((blockedInterval) => {
    if (
      blockedInterval.professionalId !== professionalId ||
      blockedInterval.date !== optionRange.date
    ) {
      return false;
    }

    const blockedStart = timeToMinutes(blockedInterval.startTime);
    const blockedEnd = timeToMinutes(blockedInterval.endTime);

    return blockedStart < optionRange.endMinute && blockedEnd > optionRange.startMinute;
  }) || null;
}

async function loadPublicBlockedIntervals(params: {
  appointment: ClientAppointmentRow;
  state: LocalState;
}): Promise<AgendaBlockedInterval[]> {
  const intervalsMap = new Map<string, AgendaBlockedInterval>();
  const slugCandidates = getTenantSlugCandidates(params);

  const results = await Promise.allSettled(
    slugCandidates.map((slugCandidate) => {
      return supabase.rpc('get_public_professional_schedule_blocks', {
        p_slug: slugCandidate
      });
    })
  );

  results.forEach((result) => {
    if (result.status !== 'fulfilled' || result.value.error) {
      return;
    }

    mergeBlockedIntervals(intervalsMap, result.value.data);
  });

  return Array.from(intervalsMap.values());
}


function normalizeStatus(value: unknown): ClientAppointmentStatus {
  const status = String(value || 'scheduled');

  if (
    status === 'scheduled' ||
    status === 'confirmed' ||
    status === 'attending' ||
    status === 'completed' ||
    status === 'cancelled' ||
    status === 'absent' ||
    status === 'rescheduled'
  ) {
    return status;
  }

  return 'scheduled';
}

function normalizeRemoteAppointment(row: Record<string, unknown>): ClientAppointmentRow {
  const startsAtLocal = String(
    readRecordValue(row, [
      'starts_at_local',
      'startsAtLocal',
      'date_time',
      'dateTime',
      'starts_at'
    ]) || ''
  ).slice(0, 16);

  return {
    id: String(readRecordValue(row, ['appointment_id', 'id']) || ''),
    tenantName: String(readRecordValue(row, ['tenant_name', 'company_name', 'establishment_name']) || 'Estabelecimento'),
    serviceName: String(readRecordValue(row, ['service_name', 'serviceName']) || 'Serviço'),
    professionalName: String(readRecordValue(row, ['professional_name', 'professionalName']) || 'Profissional'),
    professionalId: String(readRecordValue(row, ['professional_id', 'professionalId']) || ''),
    serviceId: String(readRecordValue(row, ['service_id', 'serviceId']) || ''),
    serviceDurationMinutes: Number(readRecordValue(row, [
      'service_duration_minutes',
      'service_duration',
      'duration_minutes',
      'duration',
      'serviceDurationMinutes'
    ]) || 30),
    startsAtLocal,
    status: normalizeStatus(readRecordValue(row, ['status'])),
    cancelLeadTimeMinutes: Number(readRecordValue(row, ['cancel_lead_time_minutes', 'booking_min_cancel_lead_time_minutes']) ?? 0),
    rescheduleLeadTimeMinutes: Number(readRecordValue(row, ['reschedule_lead_time_minutes', 'booking_min_reschedule_lead_time_minutes']) ?? 0),
    confirmLeadTimeMinutes: Number(readRecordValue(row, ['confirm_lead_time_minutes', 'booking_min_confirm_lead_time_minutes']) ?? 0)
  };
}

function normalizeRescheduleOption(row: Record<string, unknown>): RescheduleOptionRow {
  const startsAtLocal = String(
    readRecordValue(row, ['starts_at_local', 'startsAtLocal']) || ''
  ).slice(0, 16);

  return {
    date: String(readRecordValue(row, ['date', 'date_str']) || getDateInputValue(startsAtLocal)),
    dayLabel: String(readRecordValue(row, ['day_label', 'dayLabel']) || ''),
    dateLabel: String(readRecordValue(row, ['date_label', 'dateLabel']) || ''),
    time: String(readRecordValue(row, ['time', 'time_label']) || getTimeInputValue(startsAtLocal)),
    startsAtLocal,
    professionalId: String(readRecordValue(row, ['professional_id', 'professionalId']) || ''),
    serviceDurationMinutes: Number(readRecordValue(row, [
      'service_duration_minutes',
      'service_duration',
      'duration_minutes',
      'duration',
      'serviceDurationMinutes'
    ]) || 30)
  };
}

function buildLocalAppointmentRows(params: {
  token: string;
  state: LocalState;
}): ClientAppointmentRow[] {
  const { token, state } = params;

  return state.appointments
    .filter((appointment) => appointment.id === token)
    .map((appointment: Appointment) => {
      const service = state.services.find((item) => item.id === appointment.serviceId);
      const professional = state.professionals.find((item) => item.id === appointment.professionalId);

      return {
        id: appointment.id,
        tenantName: state.config.name || 'Estabelecimento',
        serviceName: service?.name || 'Serviço',
        professionalName: professional?.name || 'Profissional',
        professionalId: professional?.id || appointment.professionalId || '',
        serviceId: service?.id || appointment.serviceId || '',
        serviceDurationMinutes: Number(service?.duration) || 30,
        startsAtLocal: appointment.dateTime,
        status: appointment.status,
        cancelLeadTimeMinutes: 0,
        rescheduleLeadTimeMinutes: 0,
        confirmLeadTimeMinutes: 0
      };
    });
}

function getActionLeadTimeMinutes(
  appointment: ClientAppointmentRow,
  action: ClientActionType
): number {
  if (action === 'cancel') {
    return appointment.cancelLeadTimeMinutes;
  }

  if (action === 'reschedule') {
    return appointment.rescheduleLeadTimeMinutes;
  }

  return appointment.confirmLeadTimeMinutes;
}

function getActionOutsideDeadlineMessage(
  appointment: ClientAppointmentRow,
  action: ClientActionType
): string {
  const leadTime = getActionLeadTimeMinutes(appointment, action);

  if (!leadTime || leadTime <= 0) {
    return '';
  }

  const minutesUntil = getMinutesUntil(appointment.startsAtLocal);

  if (minutesUntil >= leadTime) {
    return '';
  }

  return 'Este horário está fora do prazo permitido pelo estabelecimento. Mesmo assim, sua solicitação será registrada para análise.';
}

function getStatusLabel(status: ClientAppointmentStatus): string {
  if (status === 'confirmed') {
    return 'Confirmado';
  }

  if (status === 'cancelled') {
    return 'Cancelado';
  }

  if (status === 'rescheduled') {
    return 'Remarcado';
  }

  return 'Aguardando confirmação';
}

export default function ClientAppointmentsPage({
  token,
  state
}: ClientAppointmentsPageProps) {
  const cachedAppointments = useMemo(() => getCachedClientAppointments(token), [token]);
  const [appointments, setAppointments] = useState<ClientAppointmentRow[]>(cachedAppointments);
  const [loading, setLoading] = useState(cachedAppointments.length === 0);
  const [loadError, setLoadError] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState('');
  const [feedbackModal, setFeedbackModal] = useState<FeedbackModalState | null>(null);
  const [rescheduleDraft, setRescheduleDraft] = useState<RescheduleDraft | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadClientAppointments() {
      if (!token) {
        setAppointments([]);
        setLoadError('Link de acompanhamento inválido.');
        setLoading(false);
        return;
      }

      const cachedRows = getCachedClientAppointments(token);

      if (cachedRows.length > 0) {
        setAppointments(cachedRows);
        setLoadError('');
        setLoading(false);
      } else {
        setLoading(true);
        setLoadError('');
      }

      try {
        const { data, error } = await withTimeout(
          supabase.rpc('get_client_future_appointments_by_token', {
            p_token: token
          }),
          CLIENT_APPOINTMENTS_LOAD_TIMEOUT_MS,
          'Tempo esgotado ao carregar os agendamentos.'
        );

        if (!isMounted) return;

        if (!error) {
          const rows = (Array.isArray(data) ? data : [])
            .map((item) => normalizeRemoteAppointment(item as Record<string, unknown>))
            .filter((appointment) => {
              return (
                appointment.id &&
                isFutureAppointment(appointment.startsAtLocal) &&
                appointment.status !== 'cancelled' &&
                appointment.status !== 'completed' &&
                appointment.status !== 'absent'
              );
            });

          setCachedClientAppointments(token, rows);
          setAppointments(rows);
          setLoadError(rows.length === 0 ? 'Nenhum agendamento futuro foi encontrado para este link.' : '');
          setLoading(false);
          return;
        }
      } catch (error) {
        if (!isMounted) return;

        if (cachedRows.length > 0) {
          setLoading(false);
          return;
        }
      }

      const localRows = buildLocalAppointmentRows({
        token,
        state
      }).filter((appointment) => {
        return (
          isFutureAppointment(appointment.startsAtLocal) &&
          appointment.status !== 'cancelled' &&
          appointment.status !== 'completed' &&
          appointment.status !== 'absent'
        );
      });

      setAppointments(localRows);

      if (localRows.length === 0) {
        setLoadError('Não foi possível carregar seus agendamentos agora. Tente novamente em alguns instantes.');
      }

      setLoading(false);
    }

    loadClientAppointments();

    return () => {
      isMounted = false;
    };
  }, [
    token,
    state
  ]);

  const tenantName = useMemo(() => {
    return appointments[0]?.tenantName || state.config.name || 'Estabelecimento';
  }, [
    appointments,
    state.config.name
  ]);

  const visibleAppointments = appointments.filter((appointment) => {
    return (
      isFutureAppointment(appointment.startsAtLocal) &&
      appointment.status !== 'cancelled' &&
      appointment.status !== 'completed' &&
      appointment.status !== 'absent'
    );
  });

  const groupedRescheduleOptions = useMemo(() => {
    const groups = new Map<string, RescheduleOptionRow[]>();

    for (const option of rescheduleDraft?.options || []) {
      if (!groups.has(option.date)) {
        groups.set(option.date, []);
      }

      groups.get(option.date)?.push(option);
    }

    return Array.from(groups.entries());
  }, [rescheduleDraft?.options]);

  const selectedRescheduleDateOptions = useMemo(() => {
    if (!rescheduleDraft?.selectedDate) {
      return [];
    }

    const selectedGroup = groupedRescheduleOptions.find(([date]) => {
      return date === rescheduleDraft.selectedDate;
    });

    return selectedGroup?.[1] || [];
  }, [
    groupedRescheduleOptions,
    rescheduleDraft?.selectedDate
  ]);

  const loadRescheduleOptions = async (appointment: ClientAppointmentRow) => {
    setRescheduleDraft({
      appointment,
      selectedDate: '',
      selectedStartsAtLocal: '',
      options: [],
      blockedIntervals: [],
      loading: true,
      error: ''
    });

    let data: unknown[] | null = null;
    let blockedIntervals: AgendaBlockedInterval[] = [];

    try {
      const [rescheduleResult, blockedIntervalsResult] = await Promise.all([
        withTimeout(
          supabase.rpc('get_client_reschedule_options_by_token', {
            p_token: token,
            p_appointment_id: appointment.id,
            p_days: 30
          }),
          RESCHEDULE_LOAD_TIMEOUT_MS,
          'Tempo esgotado ao buscar horários livres.'
        ),
        withTimeout(
          loadPublicBlockedIntervals({
            appointment,
            state
          }),
          RESCHEDULE_LOAD_TIMEOUT_MS,
          'Tempo esgotado ao buscar bloqueios da agenda.'
        )
      ]);

      if (rescheduleResult.error) {
        throw new Error(rescheduleResult.error.message);
      }

      data = Array.isArray(rescheduleResult.data) ? rescheduleResult.data : [];
      blockedIntervals = blockedIntervalsResult;
    } catch {
      setRescheduleDraft({
        appointment,
        selectedDate: '',
        selectedStartsAtLocal: '',
        options: [],
        blockedIntervals: [],
        loading: false,
        error: 'Não foi possível carregar os horários disponíveis deste profissional. Tente novamente em alguns instantes.'
      });
      return;
    }

    const options = (Array.isArray(data) ? data : [])
      .map((item) => normalizeRescheduleOption(item as Record<string, unknown>))
      .map((option) => ({
        ...option,
        professionalId: option.professionalId || appointment.professionalId,
        serviceDurationMinutes:
          Number(option.serviceDurationMinutes) ||
          Number(appointment.serviceDurationMinutes) ||
          30
      }))
      .filter((option) => option.startsAtLocal && option.startsAtLocal !== appointment.startsAtLocal)
      .filter((option) => {
        return !optionOverlapsBlockedInterval({
          option,
          appointment,
          blockedIntervals
        });
      });

    setRescheduleDraft({
      appointment,
      selectedDate: '',
      selectedStartsAtLocal: '',
      options,
      blockedIntervals,
      loading: false,
      error: options.length === 0 ? 'Este profissional não possui horários livres nos próximos dias.' : ''
    });
  };

  const registerClientAction = async (params: {
    appointment: ClientAppointmentRow;
    action: ClientActionType;
    newDateTime?: string;
  }) => {
    const {
      appointment,
      action,
      newDateTime
    } = params;

    setActionLoadingId(`${appointment.id}-${action}`);

    const outsideDeadlineMessage = getActionOutsideDeadlineMessage(appointment, action);

    const { data, error } = await supabase.rpc('register_client_appointment_action', {
      p_token: token,
      p_appointment_id: appointment.id,
      p_action: action,
      p_new_starts_at_local: newDateTime || null
    });

    if (error) {
      setFeedbackModal({
        tone: 'red',
        title: 'Não foi possível registrar',
        description: error.message || 'Tente novamente em alguns instantes.'
      });
      setActionLoadingId('');
      return;
    }

    const result = Array.isArray(data) ? data[0] as Record<string, unknown> | undefined : undefined;

    if (result && result.success === false) {
      setFeedbackModal({
        tone: 'red',
        title: 'Não foi possível registrar',
        description: String(result.message || 'Tente novamente em alguns instantes.')
      });
      setActionLoadingId('');
      return;
    }

    if (action === 'confirm') {
      setAppointments((currentAppointments) => {
        return currentAppointments.map((item) => {
          if (item.id !== appointment.id) return item;

          return {
            ...item,
            status: 'confirmed'
          };
        });
      });

      if (outsideDeadlineMessage) {
        setFeedbackModal({
          tone: 'red',
          title: 'Atenção ao prazo',
          description: outsideDeadlineMessage
        });
      }

      setActionLoadingId('');
      return;
    }

    if (action === 'cancel') {
      setAppointments((currentAppointments) => {
        return currentAppointments.map((item) => {
          if (item.id !== appointment.id) return item;

          return {
            ...item,
            status: 'cancelled'
          };
        });
      });

      setFeedbackModal({
        tone: 'red',
        title: 'Atendimento cancelado',
        description: outsideDeadlineMessage
          ? `${outsideDeadlineMessage} O estabelecimento e o profissional serão avisados automaticamente.`
          : 'Seu cancelamento foi registrado. O estabelecimento e o profissional serão avisados automaticamente.'
      });

      setActionLoadingId('');
      return;
    }

    if (action === 'reschedule' && newDateTime) {
      const oldDateTime = appointment.startsAtLocal;

      setAppointments((currentAppointments) => {
        return currentAppointments.map((item) => {
          if (item.id !== appointment.id) return item;

          return {
            ...item,
            startsAtLocal: newDateTime,
            status: 'scheduled'
          };
        });
      });

      setFeedbackModal({
        tone: 'orange',
        title: 'Horário remarcado',
        description: outsideDeadlineMessage
          ? `${outsideDeadlineMessage} Data antiga: ${formatDateTimeBr(oldDateTime)}. Nova data: ${formatDateTimeBr(newDateTime)}.`
          : `Data antiga: ${formatDateTimeBr(oldDateTime)}. Nova data: ${formatDateTimeBr(newDateTime)}.`
      });

      setRescheduleDraft(null);
      setActionLoadingId('');
    }
  };

  const handleConfirmAppointment = (appointment: ClientAppointmentRow) => {
    registerClientAction({
      appointment,
      action: 'confirm'
    });
  };

  const handleCancelAppointment = (appointment: ClientAppointmentRow) => {
    registerClientAction({
      appointment,
      action: 'cancel'
    });
  };

  const handleOpenReschedule = (appointment: ClientAppointmentRow) => {
    loadRescheduleOptions(appointment);
  };

  const handleConfirmReschedule = () => {
    if (!rescheduleDraft?.selectedStartsAtLocal) {
      setFeedbackModal({
        tone: 'red',
        title: 'Escolha um novo horário',
        description: 'Selecione uma data e um horário disponível da agenda do profissional.'
      });
      return;
    }

    const selectedOption = rescheduleDraft.options.find((option) => {
      return option.startsAtLocal === rescheduleDraft.selectedStartsAtLocal;
    });

    if (!selectedOption) {
      setFeedbackModal({
        tone: 'red',
        title: 'Horário indisponível',
        description: 'Este horário não está mais disponível. Feche a remarcação e escolha outro horário.'
      });
      return;
    }

    const blockedInterval = optionOverlapsBlockedInterval({
      option: selectedOption,
      appointment: rescheduleDraft.appointment,
      blockedIntervals: rescheduleDraft.blockedIntervals
    });

    if (blockedInterval) {
      setFeedbackModal({
        tone: 'red',
        title: 'Horário bloqueado',
        description: `Este horário está bloqueado na agenda do profissional. Motivo: ${blockedInterval.reason || 'Bloqueado'}.`
      });
      return;
    }

    registerClientAction({
      appointment: rescheduleDraft.appointment,
      action: 'reschedule',
      newDateTime: rescheduleDraft.selectedStartsAtLocal
    });
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-slate-950">
        <div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-[0_24px_80px_rgba(15,23,42,0.10)]">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm">
            <Loader2 className="h-7 w-7 animate-spin text-blue-300" />
          </div>

          <div className="mx-auto mb-4 inline-flex rounded-full border border-blue-100 bg-blue-50 px-4 py-1.5 font-mono text-[10px] font-extrabold uppercase tracking-[0.22em] text-blue-800">
            AgendaSpeed
          </div>

          <h1 className="text-2xl font-extrabold tracking-[-0.04em] text-slate-950">
            Abrindo seu agendamento
          </h1>

          <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">
            Estamos carregando seus horários com segurança.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] px-3 py-3 text-slate-950 sm:py-6">
      <section className="mx-auto max-w-md space-y-3">
        <header className="rounded-3xl border border-white/80 bg-white/95 px-4 py-4 shadow-[0_14px_34px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="inline-flex rounded-full border border-blue-100 bg-white px-3 py-1 font-mono text-[9px] font-extrabold uppercase tracking-[0.24em] text-slate-950 shadow-sm">
            Agenda<span className="text-blue-700">Speed</span>
          </div>

          <h1 className="mt-3 text-2xl font-extrabold leading-none tracking-[-0.05em] text-slate-950">
            Meus agendamentos
          </h1>

          <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700">
              <CalendarDays className="h-4 w-4" />
            </span>

            <div className="min-w-0">
              <p className="font-mono text-[9px] font-extrabold uppercase tracking-[0.22em] text-slate-400">
                Estabelecimento
              </p>

              <p className="mt-0.5 truncate font-mono text-sm font-extrabold uppercase tracking-[0.18em] text-slate-800">
                {tenantName}
              </p>
            </div>
          </div>
        </header>

        {loadError && visibleAppointments.length === 0 && (
          <div className="rounded-[2rem] border border-red-200 bg-white p-6 text-center shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-700 text-white">
              <AlertTriangle className="h-6 w-6 text-yellow-300" />
            </div>

            <h2 className="text-xl font-extrabold tracking-[-0.03em] text-slate-950">
              Nenhum horário futuro encontrado
            </h2>

            <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">
              {loadError}
            </p>
          </div>
        )}

        {visibleAppointments.map((appointment) => (
          <article
            key={appointment.id}
            className="overflow-hidden rounded-3xl border border-white/80 bg-white shadow-[0_14px_34px_rgba(15,23,42,0.08)]"
          >
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 font-mono text-[9px] font-extrabold uppercase tracking-[0.18em] shadow-sm ${
                    appointment.status === 'confirmed'
                      ? 'border-green-100 bg-green-50 text-green-800'
                      : 'border-blue-100 bg-blue-50 text-blue-800'
                  }`}
                >
                  {getStatusLabel(appointment.status)}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-[44px_1fr] gap-3 items-start">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700">
                  <UserCheck className="h-5 w-5" />
                </div>

                <div className="min-w-0">
                  <p className="font-mono text-[9px] font-extrabold uppercase tracking-[0.22em] text-slate-400">
                    Serviço
                  </p>

                  <h2 className="mt-1 text-lg font-extrabold leading-tight tracking-[-0.04em] text-slate-950">
                    {appointment.serviceName}
                  </h2>

                  <div className="mt-2 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2">
                    <p className="font-mono text-[9px] font-extrabold uppercase tracking-[0.2em] text-slate-400">
                      Profissional
                    </p>

                    <p className="mt-0.5 font-mono text-sm font-extrabold uppercase tracking-[0.16em] text-slate-800">
                      {appointment.professionalName}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3">
                  <div className="flex items-center gap-1.5 font-mono text-[9px] font-extrabold uppercase tracking-[0.18em] text-blue-800">
                    <CalendarDays className="h-3.5 w-3.5" />
                    Data
                  </div>

                  <p className="mt-1 font-mono text-base font-extrabold tracking-[-0.04em] text-slate-950">
                    {formatDateBr(getDateInputValue(appointment.startsAtLocal))}
                  </p>
                </div>

                <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3">
                  <div className="flex items-center gap-1.5 font-mono text-[9px] font-extrabold uppercase tracking-[0.18em] text-blue-800">
                    <Clock className="h-3.5 w-3.5" />
                    Horário
                  </div>

                  <p className="mt-1 font-mono text-base font-extrabold tracking-[-0.04em] text-slate-950">
                    {getTimeInputValue(appointment.startsAtLocal)}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2 border-t border-slate-100 bg-slate-50/70 p-3">
              <button
                type="button"
                onClick={() => handleConfirmAppointment(appointment)}
                disabled={
                  appointment.status === 'confirmed' ||
                  actionLoadingId === `${appointment.id}-confirm`
                }
                className="flex w-full items-center justify-center gap-2.5 rounded-2xl border border-green-900 bg-green-700 px-4 py-3 font-mono text-xs font-extrabold uppercase tracking-[0.06em] text-white shadow-[0_10px_20px_rgba(21,128,61,0.20)] transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <CheckCircle2 className="h-4 w-4" />
                {appointment.status === 'confirmed' ? 'Presença confirmada' : 'Confirmar presença'}
              </button>

              <button
                type="button"
                onClick={() => handleOpenReschedule(appointment)}
                disabled={actionLoadingId === `${appointment.id}-reschedule`}
                className="flex w-full items-center justify-center gap-2.5 rounded-2xl border border-blue-950 bg-slate-950 px-4 py-3 font-mono text-xs font-extrabold uppercase tracking-[0.06em] text-white shadow-[0_10px_20px_rgba(15,23,42,0.18)] transition hover:bg-blue-950 disabled:opacity-60"
              >
                <RefreshCcw className="h-4 w-4 text-blue-300" />
                Remarcar horário
              </button>

              <button
                type="button"
                onClick={() => handleCancelAppointment(appointment)}
                disabled={actionLoadingId === `${appointment.id}-cancel`}
                className="flex w-full items-center justify-center gap-2.5 rounded-2xl border border-red-950 bg-red-700 px-4 py-3 font-mono text-xs font-extrabold uppercase tracking-[0.06em] text-white shadow-[0_10px_20px_rgba(185,28,28,0.18)] transition hover:bg-red-800 disabled:opacity-60"
              >
                <XCircle className="h-4 w-4" />
                Cancelar
              </button>
            </div>
          </article>
        ))}
      </section>

      {rescheduleDraft && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-4 pb-4 sm:items-center sm:pb-0">
          <div className="max-h-[86vh] w-full max-w-md overflow-y-auto rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_24px_80px_rgba(15,23,42,0.24)]">
            <h2 className="text-base font-extrabold tracking-[-0.03em] text-slate-950">
              Remarcar horário
            </h2>

            <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500">
              Escolha primeiro o dia e depois um horário livre na agenda de {rescheduleDraft.appointment.professionalName}.
            </p>

            <div className="mt-3 rounded-2xl border border-blue-100 bg-blue-50 p-3 font-mono text-xs font-extrabold uppercase tracking-[0.12em] text-blue-900">
              Horário atual: {formatDateTimeBr(rescheduleDraft.appointment.startsAtLocal)}
            </div>

            {rescheduleDraft.loading && (
              <div className="mt-5 rounded-2xl border border-neutral-200 bg-neutral-50 p-5 text-center">
                <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-blue-700" />
                <p className="text-sm font-bold text-neutral-600">
                  Buscando horários livres...
                </p>
              </div>
            )}

            {!rescheduleDraft.loading && rescheduleDraft.error && (
              <div className="mt-5 rounded-2xl border border-red-700 bg-red-700 p-4 text-sm font-extrabold text-white">
                {rescheduleDraft.error}
              </div>
            )}

            {!rescheduleDraft.loading && !rescheduleDraft.error && (
              <div className="mt-4 space-y-4">
                <div>
                  <h3 className="font-mono text-xs font-extrabold uppercase tracking-[0.18em] text-slate-500">
                    1. Escolha o dia
                  </h3>

                  <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                    {groupedRescheduleOptions.map(([date, options]) => {
                      const firstOption = options[0];
                      const isSelectedDate = rescheduleDraft.selectedDate === date;

                      return (
                        <button
                          key={date}
                          type="button"
                          onClick={() => {
                            setRescheduleDraft((currentDraft) => {
                              if (!currentDraft) return currentDraft;

                              return {
                                ...currentDraft,
                                selectedDate: date,
                                selectedStartsAtLocal: ''
                              };
                            });
                          }}
                          className={`min-w-[116px] rounded-2xl border px-3 py-2 text-left transition ${
                            isSelectedDate
                              ? 'border-blue-950 bg-slate-950 text-white shadow-sm'
                              : 'border-slate-200 bg-white text-slate-900 hover:border-blue-300 hover:bg-blue-50'
                          }`}
                        >
                          <span className={`block text-[10px] font-extrabold uppercase tracking-[0.12em] ${
                            isSelectedDate ? 'text-white/80' : 'text-slate-400'
                          }`}>
                            {firstOption?.dayLabel || 'Dia'}
                          </span>

                          <span className="mt-1 block text-sm font-extrabold">
                            {firstOption?.dateLabel || formatDateBr(date)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h3 className="font-mono text-xs font-extrabold uppercase tracking-[0.18em] text-slate-500">
                    2. Escolha o horário
                  </h3>

                  {!rescheduleDraft.selectedDate ? (
                    <div className="mt-3 rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-5 text-center">
                      <p className="text-sm font-bold text-neutral-500">
                        Selecione primeiro um dia disponível.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {selectedRescheduleDateOptions.map((option) => {
                        const isSelected = rescheduleDraft.selectedStartsAtLocal === option.startsAtLocal;

                        return (
                          <button
                            key={option.startsAtLocal}
                            type="button"
                            onClick={() => {
                              setRescheduleDraft((currentDraft) => {
                                if (!currentDraft) return currentDraft;

                                return {
                                  ...currentDraft,
                                  selectedStartsAtLocal: option.startsAtLocal
                                };
                              });
                            }}
                            className={`rounded-2xl border px-3 py-2.5 font-mono text-xs font-extrabold transition ${
                              isSelected
                                ? 'border-blue-950 bg-slate-950 text-white shadow-sm'
                                : 'border-slate-200 bg-white text-slate-900 hover:border-blue-300 hover:bg-blue-50'
                            }`}
                          >
                            {option.time}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {rescheduleDraft.selectedStartsAtLocal && (
                  <div className="rounded-2xl border border-blue-100 bg-blue-50 p-3">
                    <p className="font-mono text-xs font-extrabold uppercase tracking-[0.14em] text-blue-800">
                      Novo horário selecionado
                    </p>

                    <p className="mt-1 text-sm font-extrabold text-neutral-950">
                      {formatDateTimeBr(rescheduleDraft.selectedStartsAtLocal)}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRescheduleDraft(null)}
                className="rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-extrabold text-slate-700 hover:bg-slate-50"
              >
                Voltar
              </button>

              <button
                type="button"
                onClick={handleConfirmReschedule}
                disabled={!rescheduleDraft.selectedStartsAtLocal || actionLoadingId === `${rescheduleDraft.appointment.id}-reschedule`}
                className="rounded-2xl border border-blue-950 bg-slate-950 px-4 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-blue-950 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Confirmar remarcação
              </button>
            </div>
          </div>
        </div>
      )}

      {feedbackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div
            className={`w-full max-w-md rounded-[2rem] border bg-white p-6 shadow-2xl ${
              feedbackModal.tone === 'red'
                ? 'border-red-950'
                : feedbackModal.tone === 'orange'
                  ? 'border-orange-600'
                  : 'border-green-800'
            }`}
          >
            <div
              className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${
                feedbackModal.tone === 'red'
                  ? 'bg-red-700 text-white'
                  : feedbackModal.tone === 'orange'
                    ? 'bg-orange-600 text-white'
                    : 'bg-green-700 text-white'
              }`}
            >
              {feedbackModal.tone === 'red' ? (
                <AlertTriangle className="h-6 w-6 text-yellow-300" />
              ) : feedbackModal.tone === 'orange' ? (
                <RefreshCcw className="h-6 w-6" />
              ) : (
                <CheckCircle2 className="h-6 w-6" />
              )}
            </div>

            <h2 className="text-base font-extrabold tracking-[-0.03em] text-slate-950">
              {feedbackModal.title}
            </h2>

            <p className="mt-2 text-sm font-medium leading-relaxed text-neutral-600">
              {feedbackModal.description}
            </p>

            <button
              type="button"
              onClick={() => setFeedbackModal(null)}
              className={`mt-5 w-full rounded-2xl px-4 py-3 text-sm font-extrabold shadow-sm ${
                feedbackModal.tone === 'red'
                  ? 'bg-red-700 text-white hover:bg-red-800'
                  : feedbackModal.tone === 'orange'
                    ? 'bg-orange-600 text-white hover:bg-orange-700'
                    : 'bg-green-700 text-white hover:bg-green-800'
              }`}
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
