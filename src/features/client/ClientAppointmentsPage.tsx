/**
 * Página pública de acompanhamento do cliente - AgendaSpeed.
 *
 * Responsável por:
 * - abrir o link enviado pelo WhatsApp após o agendamento;
 * - listar somente agendamentos futuros do cliente;
 * - permitir confirmar presença, remarcar ou cancelar;
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
  Scissors,
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
  startsAtLocal: string;
  status: ClientAppointmentStatus;
  cancelLeadTimeMinutes: number;
  rescheduleLeadTimeMinutes: number;
  confirmLeadTimeMinutes: number;
}

interface ClientAppointmentsPageProps {
  token: string;
  state: LocalState;
}

interface FeedbackModalState {
  tone: 'yellow' | 'red' | 'green';
  title: string;
  description: string;
}

interface RescheduleDraft {
  appointment: ClientAppointmentRow;
  date: string;
  time: string;
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
    startsAtLocal,
    status: normalizeStatus(readRecordValue(row, ['status'])),
    cancelLeadTimeMinutes: Number(readRecordValue(row, ['cancel_lead_time_minutes', 'booking_min_cancel_lead_time_minutes']) ?? 0),
    rescheduleLeadTimeMinutes: Number(readRecordValue(row, ['reschedule_lead_time_minutes', 'booking_min_reschedule_lead_time_minutes']) ?? 0),
    confirmLeadTimeMinutes: Number(readRecordValue(row, ['confirm_lead_time_minutes', 'booking_min_confirm_lead_time_minutes']) ?? 0)
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

export default function ClientAppointmentsPage({
  token,
  state
}: ClientAppointmentsPageProps) {
  const [appointments, setAppointments] = useState<ClientAppointmentRow[]>([]);
  const [loading, setLoading] = useState(true);
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

      setLoading(true);
      setLoadError('');

      const { data, error } = await supabase.rpc('get_client_future_appointments_by_token', {
        p_token: token
      });

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

        setAppointments(rows);
        setLoading(false);
        return;
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
        setLoadError('Nenhum agendamento futuro foi encontrado para este link.');
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

    const { error } = await supabase.rpc('register_client_appointment_action', {
      p_token: token,
      p_appointment_id: appointment.id,
      p_action: action,
      p_new_starts_at_local: newDateTime || null
    });

    if (error) {
      console.warn('Ação registrada apenas na interface. Falta configurar RPC register_client_appointment_action:', error.message);
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
          ? `${outsideDeadlineMessage} O estabelecimento e o profissional serão avisados.`
          : 'Seu cancelamento foi registrado. O estabelecimento e o profissional serão avisados.'
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
            status: 'rescheduled'
          };
        });
      });

      setFeedbackModal({
        tone: 'yellow',
        title: 'Remarcação registrada',
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
    setRescheduleDraft({
      appointment,
      date: getDateInputValue(appointment.startsAtLocal),
      time: getTimeInputValue(appointment.startsAtLocal)
    });
  };

  const handleConfirmReschedule = () => {
    if (!rescheduleDraft?.date || !rescheduleDraft.time) {
      setFeedbackModal({
        tone: 'red',
        title: 'Data e horário obrigatórios',
        description: 'Informe a nova data e o novo horário para registrar a remarcação.'
      });
      return;
    }

    const newDateTime = `${rescheduleDraft.date}T${rescheduleDraft.time}`;

    registerClientAction({
      appointment: rescheduleDraft.appointment,
      action: 'reschedule',
      newDateTime
    });
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
        <div className="w-full max-w-md rounded-3xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
          <Loader2 className="mx-auto mb-4 h-9 w-9 animate-spin text-orange-500" />

          <h1 className="text-xl font-extrabold text-neutral-950">
            Carregando seus horários...
          </h1>

          <p className="mt-2 text-sm font-medium text-neutral-500">
            Aguarde alguns segundos.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-5 text-neutral-900 sm:py-8">
      <section className="mx-auto max-w-2xl space-y-4">
        <div className="rounded-[2rem] border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="inline-flex rounded-full bg-orange-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-orange-700 ring-1 ring-orange-100">
            AgendaSpeed
          </div>

          <h1 className="mt-3 text-2xl font-extrabold tracking-[-0.03em] text-neutral-950">
            Meus agendamentos
          </h1>

          <p className="mt-2 text-sm font-medium leading-relaxed text-neutral-500">
            {tenantName}
          </p>
        </div>

        {loadError && visibleAppointments.length === 0 && (
          <div className="rounded-[2rem] border border-red-200 bg-white p-6 text-center shadow-sm">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <AlertTriangle className="h-6 w-6" />
            </div>

            <h2 className="text-lg font-extrabold text-neutral-950">
              Nenhum horário futuro encontrado
            </h2>

            <p className="mt-2 text-sm font-medium leading-relaxed text-neutral-500">
              {loadError}
            </p>
          </div>
        )}

        {visibleAppointments.map((appointment) => (
          <article
            key={appointment.id}
            className="rounded-[2rem] border border-neutral-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-700 ring-1 ring-emerald-100">
                  Horário futuro
                </span>

                <h2 className="mt-3 text-lg font-extrabold leading-tight tracking-[-0.03em] text-neutral-950">
                  {appointment.serviceName}
                </h2>

                <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-neutral-500">
                  <UserCheck className="h-4 w-4 text-orange-600" />
                  {appointment.professionalName}
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-2xl border border-orange-100 bg-orange-50 p-3">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-orange-700">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Data
                </div>

                <p className="mt-1 text-sm font-extrabold text-neutral-950">
                  {formatDateBr(getDateInputValue(appointment.startsAtLocal))}
                </p>
              </div>

              <div className="rounded-2xl border border-orange-100 bg-orange-50 p-3">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-orange-700">
                  <Clock className="h-3.5 w-3.5" />
                  Horário
                </div>

                <p className="mt-1 text-sm font-extrabold text-neutral-950">
                  {getTimeInputValue(appointment.startsAtLocal)}
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => handleConfirmAppointment(appointment)}
                disabled={actionLoadingId === `${appointment.id}-confirm`}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-extrabold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60"
              >
                <CheckCircle2 className="h-4 w-4" />
                Confirmar presença
              </button>

              <button
                type="button"
                onClick={() => handleOpenReschedule(appointment)}
                disabled={actionLoadingId === `${appointment.id}-reschedule`}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-xs font-extrabold text-yellow-800 transition hover:bg-yellow-100 disabled:opacity-60"
              >
                <RefreshCcw className="h-4 w-4" />
                Remarcar
              </button>

              <button
                type="button"
                onClick={() => handleCancelAppointment(appointment)}
                disabled={actionLoadingId === `${appointment.id}-cancel`}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-extrabold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
              >
                <XCircle className="h-4 w-4" />
                Cancelar
              </button>
            </div>
          </article>
        ))}
      </section>

      {rescheduleDraft && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 px-4 pb-4 sm:items-center sm:pb-0">
          <div className="w-full max-w-md rounded-[2rem] border border-neutral-200 bg-white p-5 shadow-2xl">
            <h2 className="text-lg font-extrabold text-neutral-950">
              Remarcar horário
            </h2>

            <p className="mt-1 text-sm font-medium leading-relaxed text-neutral-500">
              Data atual: {formatDateTimeBr(rescheduleDraft.appointment.startsAtLocal)}
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-500">
                  Nova data
                </span>

                <input
                  type="date"
                  value={rescheduleDraft.date}
                  onChange={(event) => {
                    setRescheduleDraft((currentDraft) => {
                      if (!currentDraft) return currentDraft;

                      return {
                        ...currentDraft,
                        date: event.target.value
                      };
                    });
                  }}
                  className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-3 py-3 text-sm font-bold text-neutral-900 outline-none focus:border-orange-500"
                />
              </label>

              <label className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-500">
                  Novo horário
                </span>

                <input
                  type="time"
                  value={rescheduleDraft.time}
                  onChange={(event) => {
                    setRescheduleDraft((currentDraft) => {
                      if (!currentDraft) return currentDraft;

                      return {
                        ...currentDraft,
                        time: event.target.value
                      };
                    });
                  }}
                  className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-3 py-3 text-sm font-bold text-neutral-900 outline-none focus:border-orange-500"
                />
              </label>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRescheduleDraft(null)}
                className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-xs font-extrabold text-neutral-700 hover:bg-neutral-50"
              >
                Voltar
              </button>

              <button
                type="button"
                onClick={handleConfirmReschedule}
                className="rounded-2xl bg-yellow-500 px-4 py-3 text-xs font-extrabold text-white hover:bg-yellow-600"
              >
                Registrar remarcação
              </button>
            </div>
          </div>
        </div>
      )}

      {feedbackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4">
          <div
            className={`w-full max-w-md rounded-[2rem] border bg-white p-6 shadow-2xl ${
              feedbackModal.tone === 'red'
                ? 'border-red-200'
                : feedbackModal.tone === 'yellow'
                  ? 'border-yellow-200'
                  : 'border-emerald-200'
            }`}
          >
            <div
              className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${
                feedbackModal.tone === 'red'
                  ? 'bg-red-50 text-red-600'
                  : feedbackModal.tone === 'yellow'
                    ? 'bg-yellow-50 text-yellow-700'
                    : 'bg-emerald-50 text-emerald-600'
              }`}
            >
              {feedbackModal.tone === 'red' ? (
                <AlertTriangle className="h-6 w-6 text-yellow-500" />
              ) : feedbackModal.tone === 'yellow' ? (
                <RefreshCcw className="h-6 w-6" />
              ) : (
                <CheckCircle2 className="h-6 w-6" />
              )}
            </div>

            <h2 className="text-lg font-extrabold text-neutral-950">
              {feedbackModal.title}
            </h2>

            <p className="mt-2 text-sm font-medium leading-relaxed text-neutral-600">
              {feedbackModal.description}
            </p>

            <button
              type="button"
              onClick={() => setFeedbackModal(null)}
              className={`mt-5 w-full rounded-2xl px-4 py-3 text-sm font-extrabold text-white ${
                feedbackModal.tone === 'red'
                  ? 'bg-red-600 hover:bg-red-700'
                  : feedbackModal.tone === 'yellow'
                    ? 'bg-yellow-500 hover:bg-yellow-600'
                    : 'bg-emerald-600 hover:bg-emerald-700'
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
