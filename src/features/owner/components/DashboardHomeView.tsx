/**
 * Tela inicial do Painel do Dono - AgendaZap.
 *
 * Responsável por exibir uma visão operacional rápida:
 * - indicadores do dia como filtros;
 * - atendimentos de hoje;
 * - atendimentos do próximo dia útil;
 * - cobrança rápida de confirmação pelo WhatsApp;
 * - análise de serviços mais procurados por período.
 */

import React, {
  useEffect,
  useMemo,
  useState
} from 'react';

import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock,
  MessageCircle,
  Printer,
  UserRoundX,
  Users,
  X
} from 'lucide-react';

import {
  Appointment,
  AppointmentStatus,
  Professional,
  Service
} from '../../../types';

import {
  OwnerFinancialSummary,
  OwnerTab
} from '../owner.types';

import { getProfessionalScheduleForDateStr } from '../../../lib/professionalSchedule';

import {
  getAppointmentTime
} from '../owner.utils';

import {
  extractClientPublicToken,
  getAgendaBlessPublicOrigin
} from '../owner.data';

import {
  supabase
} from '../../../lib/supabase';

interface DashboardHomeViewProps {
  baseDateStr: string;
  appointments: Appointment[];
  professionals: Professional[];
  services: Service[];
  configWorkDays: number[];
  financialSummary: OwnerFinancialSummary;
  subscriptionStatus?: string;
  subscriptionDaysUntilDue?: number;
  subscriptionIsDueSoon?: boolean;
  subscriptionIsOverdue?: boolean;
  onChangeTab: (tab: OwnerTab) => void;
  onOpenTodayAgenda: () => void;
  onUpdateAppointmentStatus?: (appointmentId: string, status: AppointmentStatus) => void;
}

type DashboardFilter =
  | 'all'
  | 'confirmed'
  | 'not_confirmed'
  | 'free'
  | 'absent';

interface DashboardServiceAnalysisPeriod {
  type: 'today' | 'last7' | 'custom';
  startDate: string;
  endDate: string;
}

function padDatePart(value: number): string {
  return String(value).padStart(2, '0');
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

function formatDateBr(dateStr: string): string {
  if (!dateStr || !dateStr.includes('-')) {
    return dateStr;
  }

  return dateStr.split('-').reverse().join('/');
}

function getShortDateLabel(dateStr: string): string {
  const date = parseLocalDate(dateStr);

  return `${padDatePart(date.getDate())}/${padDatePart(date.getMonth() + 1)}`;
}

function getWeekDayLabel(dateStr: string): string {
  const labels = [
    'Domingo',
    'Segunda-feira',
    'Terça-feira',
    'Quarta-feira',
    'Quinta-feira',
    'Sexta-feira',
    'Sábado'
  ];

  return labels[parseLocalDate(dateStr).getDay()];
}

function getAppointmentDate(appointment: Appointment): string {
  return appointment.dateTime.split('T')[0];
}

function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

function isConfirmedStatus(status: AppointmentStatus): boolean {
  return [
    'confirmed',
    'attending',
    'completed'
  ].includes(status);
}

function isPendingStatus(status: AppointmentStatus): boolean {
  return status === 'scheduled';
}

function isHistoricalAppointmentStatus(status: AppointmentStatus): boolean {
  return [
    'cancelled',
    'absent',
    'rescheduled'
  ].includes(status);
}

function isBlockingAppointmentStatus(status: AppointmentStatus): boolean {
  return [
    'scheduled',
    'confirmed',
    'attending',
    'completed'
  ].includes(status);
}

function getAppointmentStatusLabel(status: AppointmentStatus): string {
  if (status === 'scheduled') {
    return 'Não confirmado';
  }

  if (status === 'confirmed') {
    return 'Confirmado';
  }

  if (status === 'attending') {
    return 'Em atendimento';
  }

  if (status === 'completed') {
    return 'Finalizado';
  }

  if (status === 'cancelled') {
    return 'Desmarcou';
  }

  if (status === 'absent') {
    return 'Faltou';
  }

  if (status === 'rescheduled') {
    return 'Remarcado';
  }

  return status;
}

function getStatusBadgeClassName(status: AppointmentStatus): string {
  if (isConfirmedStatus(status)) {
    return 'bg-[#0f4c5c]/10 text-[#0f4c5c] border-[#0f4c5c]/15';
  }

  if (isPendingStatus(status)) {
    return 'bg-slate-100 text-slate-700 border-slate-200';
  }

  if (status === 'absent') {
    return 'bg-slate-100 text-slate-700 border-slate-200';
  }

  if (status === 'cancelled') {
    return 'bg-neutral-100 text-neutral-500 border-neutral-200';
  }

  return 'bg-neutral-100 text-neutral-600 border-neutral-200';
}

function getAppointmentCardAccentClassName(status: AppointmentStatus): string {
  if (isConfirmedStatus(status)) {
    return 'border-l-4 border-l-[#0f4c5c]';
  }

  if (isPendingStatus(status)) {
    return 'border-l-4 border-l-slate-300';
  }

  if (status === 'absent') {
    return 'border-l-4 border-l-slate-300';
  }

  if (status === 'cancelled') {
    return 'border-l-4 border-l-neutral-300';
  }

  return 'border-l-4 border-l-neutral-200';
}

function getAppointmentCardSurfaceClassName(status: AppointmentStatus): string {
  if (status === 'cancelled' || status === 'rescheduled') {
    return 'border-slate-200 bg-white';
  }

  return 'border-slate-200 bg-white';
}

function getAppointmentFooterStatusLabel(status: AppointmentStatus): string {
  if (isConfirmedStatus(status)) {
    return 'Cliente confirmou presença';
  }

  if (isPendingStatus(status)) {
    return 'Aguardando confirmação';
  }

  if (status === 'cancelled') {
    return 'Cancelado';
  }

  if (status === 'absent') {
    return 'Faltou';
  }

  if (status === 'rescheduled') {
    return 'Remarcado';
  }

  if (status === 'completed') {
    return 'Atendimento finalizado';
  }

  return getAppointmentStatusLabel(status);
}

function getAppointmentFooterClassName(status: AppointmentStatus): string {
  if (isConfirmedStatus(status)) {
    return 'border border-emerald-200 bg-emerald-100 text-emerald-800';
  }

  if (isPendingStatus(status)) {
    return 'border border-amber-200 bg-amber-100 text-amber-800';
  }

  if (status === 'cancelled' || status === 'absent') {
    return 'border border-red-200 bg-red-100 text-red-800';
  }

  if (status === 'rescheduled') {
    return 'border border-orange-200 bg-orange-100 text-orange-800';
  }

  if (status === 'completed') {
    return 'border border-emerald-200 bg-emerald-100 text-emerald-800';
  }

  return 'border border-slate-200 bg-slate-100 text-slate-700';
}

function getNextBusinessDate(params: {
  baseDateStr: string;
  workDays: number[];
}): string {
  const {
    baseDateStr,
    workDays
  } = params;

  for (let index = 1; index <= 14; index += 1) {
    const candidateDate = addDays(baseDateStr, index);
    const candidateWeekDay = parseLocalDate(candidateDate).getDay();

    if (workDays.includes(candidateWeekDay)) {
      return candidateDate;
    }
  }

  return addDays(baseDateStr, 1);
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);

  return (hours * 60) + minutes;
}

function getCurrentDateStr(): string {
  return new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/Sao_Paulo'
  });
}

function getCurrentTimeInMinutes(): number {
  const parts = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(new Date());

  const hour = Number(parts.find((part) => part.type === 'hour')?.value || 0);
  const minute = Number(parts.find((part) => part.type === 'minute')?.value || 0);

  return (hour * 60) + minute;
}

function getAppointmentTimeInMinutes(appointment: Appointment): number {
  return timeToMinutes(getAppointmentTime(appointment));
}

function getServiceDurationMinutes(params: {
  appointment: Appointment;
  services: Service[];
}): number {
  const {
    appointment,
    services
  } = params;

  const service = services.find((item) => {
    return item.id === appointment.serviceId;
  });

  return service?.duration || 30;
}

function isHistoricalSlotAlreadyOccupied(params: {
  appointment: Appointment;
  appointments: Appointment[];
}): boolean {
  const {
    appointment,
    appointments
  } = params;

  const appointmentDate = getAppointmentDate(appointment);
  const appointmentTime = getAppointmentTime(appointment);

  return appointments.some((item) => {
    if (item.id === appointment.id) {
      return false;
    }

    if (item.professionalId !== appointment.professionalId) {
      return false;
    }

    if (getAppointmentDate(item) !== appointmentDate) {
      return false;
    }

    if (getAppointmentTime(item) !== appointmentTime) {
      return false;
    }

    return isBlockingAppointmentStatus(item.status);
  });
}

function getHistoricalAppointmentsForSlot(params: {
  appointment: Appointment;
  appointments: Appointment[];
}): Appointment[] {
  const {
    appointment,
    appointments
  } = params;

  const appointmentDate = getAppointmentDate(appointment);
  const appointmentTime = getAppointmentTime(appointment);

  return appointments
    .filter((item) => {
      if (item.id === appointment.id) {
        return false;
      }

      return (
        item.professionalId === appointment.professionalId &&
        getAppointmentDate(item) === appointmentDate &&
        getAppointmentTime(item) === appointmentTime &&
        isHistoricalAppointmentStatus(item.status)
      );
    })
    .sort((first, second) => {
      return first.dateTime.localeCompare(second.dateTime);
    });
}

function isOperationalAppointmentVisible(params: {
  appointment: Appointment;
  dateStr: string;
  appointments: Appointment[];
  services: Service[];
  hideExpired?: boolean;
}): boolean {
  const {
    appointment,
    dateStr,
    appointments,
    services,
    hideExpired = false
  } = params;

  if (hideExpired) {
    const currentDateStr = getCurrentDateStr();

    if (dateStr === currentDateStr) {
      const currentMinutes = getCurrentTimeInMinutes();
      const appointmentMinutes = getAppointmentTimeInMinutes(appointment);

      if (currentMinutes > appointmentMinutes + 20) {
        return false;
      }
    }
  }

  if (isHistoricalAppointmentStatus(appointment.status)) {
    return !isHistoricalSlotAlreadyOccupied({
      appointment,
      appointments
    });
  }

  return true;
}

function countProfessionalSlotsForDate(params: {
  professional: Professional;
  dateStr: string;
  appointments: Appointment[];
  onlyFutureSlots?: boolean;
}): number {
  const {
    professional,
    dateStr,
    appointments,
    onlyFutureSlots = false
  } = params;

  const daySchedule = getProfessionalScheduleForDateStr(professional, dateStr);

  if (!professional.active || !daySchedule.enabled) {
    return 0;
  }

  const start = timeToMinutes(daySchedule.start);
  const end = timeToMinutes(daySchedule.end);
  const lunchStart = timeToMinutes(professional.lunchStart);
  const lunchEnd = timeToMinutes(professional.lunchEnd);

  const currentDateStr = getCurrentDateStr();
  const currentMinutes = getCurrentTimeInMinutes();

  let totalSlots = 0;

  for (let minute = start; minute < end; minute += 30) {
    const isLunch = minute >= lunchStart && minute < lunchEnd;
    const isPastSlot =
      onlyFutureSlots &&
      dateStr === currentDateStr &&
      minute < currentMinutes;

    if (!isLunch && !isPastSlot) {
      totalSlots += 1;
    }
  }

  const busyAppointments = appointments.filter((appointment) => {
    const appointmentDate = getAppointmentDate(appointment);

    if (appointmentDate !== dateStr) {
      return false;
    }

    if (appointment.professionalId !== professional.id) {
      return false;
    }

    return ![
      'cancelled',
      'absent',
      'rescheduled'
    ].includes(appointment.status);
  });

  return Math.max(0, totalSlots - busyAppointments.length);
}

function buildWhatsAppConfirmationUrl(params: {
  appointment: Appointment;
  professionalName: string;
  serviceName: string;
  targetDateLabel: string;
  appointmentLink: string;
}) {
  const {
    appointment,
    professionalName,
    serviceName,
    targetDateLabel,
    appointmentLink
  } = params;

  const phone = onlyDigits(appointment.clientPhone);
  const time = getAppointmentTime(appointment);

  const message = encodeURIComponent([
    `Olá, ${appointment.clientName}! 😊`,
    '',
    `Estamos passando para lembrar do seu horário ${targetDateLabel} às ${time}.`,
    `Serviço: ${serviceName}`,
    `Profissional: ${professionalName}`,
    '',
    'Para confirmar presença, remarcar ou cancelar, acesse o link abaixo:',
    appointmentLink,
    '',
      ].join('\n'));

  return `https://api.whatsapp.com/send?phone=55${phone}&text=${message}`;
}

function getPeriodDates(params: {
  baseDateStr: string;
  period: DashboardServiceAnalysisPeriod;
}) {
  const {
    baseDateStr,
    period
  } = params;

  if (period.type === 'today') {
    return {
      startDate: baseDateStr,
      endDate: baseDateStr
    };
  }

  if (period.type === 'last7') {
    return {
      startDate: addDays(baseDateStr, -6),
      endDate: baseDateStr
    };
  }

  return {
    startDate: period.startDate,
    endDate: period.endDate
  };
}

function filterAppointmentsByDashboardFilter(params: {
  appointments: Appointment[];
  activeFilter: DashboardFilter;
}): Appointment[] {
  const {
    appointments,
    activeFilter
  } = params;

  if (activeFilter === 'all' || activeFilter === 'free') {
    return appointments;
  }

  if (activeFilter === 'confirmed') {
    return appointments.filter((appointment) => {
      return isConfirmedStatus(appointment.status);
    });
  }

  if (activeFilter === 'not_confirmed') {
    return appointments.filter((appointment) => {
      return isPendingStatus(appointment.status);
    });
  }

  if (activeFilter === 'absent') {
    return appointments.filter((appointment) => {
      return appointment.status === 'absent';
    });
  }

  return appointments;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function printServicesAnalysisReport(params: {
  rows: { service: Service; count: number }[];
  startDate: string;
  endDate: string;
}) {
  const { rows, startDate, endDate } = params;
  const printWindow = window.open('', '_blank', 'width=1000,height=800');

  if (!printWindow) {
    alert('Não foi possível abrir a impressão. Verifique o bloqueador de pop-ups.');
    return;
  }

  const rowsHtml = rows.map((row, index) => {
    return `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(row.service.name)}</td>
        <td>${escapeHtml(row.service.category || 'Sem categoria')}</td>
        <td class="right">${row.count}</td>
      </tr>
    `;
  }).join('');

  printWindow.document.open();
  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>Serviços mais procurados</title>
        <meta charset="utf-8" />
        <style>
          @page { size: A4; margin: 16mm; }
          * { box-sizing: border-box; }
          body { font-family: Arial, sans-serif; color: #111827; margin: 0; padding-top: 8mm; }
          h1 { margin: 0; text-align: center; font-size: 20px; text-transform: uppercase; }
          p { margin: 6px 0 18px; text-align: center; color: #64748b; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th { background: #0f4c5c; color: white; padding: 9px 8px; text-align: left; text-transform: uppercase; font-size: 10px; }
          td { border-bottom: 1px solid #e2e8f0; padding: 9px 8px; }
          .right { text-align: right; font-weight: 700; }
        </style>
      </head>
      <body>
        <h1>Serviços mais procurados</h1>
        <p>Período: ${formatDateBr(startDate)} até ${formatDateBr(endDate)} · Emitido em ${new Date().toLocaleString('pt-BR')}</p>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Serviço</th>
              <th>Categoria</th>
              <th class="right">Finalizados</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="4" style="text-align:center;color:#64748b;padding:24px;">Nenhum serviço finalizado no período selecionado.</td></tr>'}
          </tbody>
        </table>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();

  window.setTimeout(() => {
    printWindow.print();
  }, 350);
}

export default function DashboardHomeView({
  baseDateStr,
  appointments,
  professionals,
  services,
  configWorkDays,
  financialSummary,
  subscriptionStatus = '',
  subscriptionDaysUntilDue = 0,
  subscriptionIsDueSoon = false,
  subscriptionIsOverdue = false,
  onChangeTab,
  onOpenTodayAgenda,
  onUpdateAppointmentStatus
}: DashboardHomeViewProps) {
  const [activeFilter, setActiveFilter] =
    useState<DashboardFilter>('all');
  const [timeRefreshVersion, setTimeRefreshVersion] = useState(0);
  const [resendingAppointmentId, setResendingAppointmentId] =
    useState<string | null>(null);

  useEffect(() => {
    const refreshIntervalId = window.setInterval(() => {
      setTimeRefreshVersion((currentVersion) => currentVersion + 1);
    }, 60000);

    return () => {
      window.clearInterval(refreshIntervalId);
    };
  }, []);

  const [showServicesAnalysis, setShowServicesAnalysis] = useState(false);
  const [servicesAnalysisPeriod, setServicesAnalysisPeriod] =
    useState<DashboardServiceAnalysisPeriod>({
      type: 'today',
      startDate: baseDateStr,
      endDate: baseDateStr
    });

  const nextBusinessDate = useMemo(() => {
    return getNextBusinessDate({
      baseDateStr,
      workDays: configWorkDays
    });
  }, [
    baseDateStr,
    configWorkDays
  ]);

  const todayAppointmentsSorted = useMemo(() => {
    return appointments
      .filter((appointment) => getAppointmentDate(appointment) === baseDateStr)
      .sort((first, second) => {
        return getAppointmentTime(first).localeCompare(getAppointmentTime(second));
      });
  }, [
    appointments,
    baseDateStr
  ]);

  const nextBusinessAppointmentsSorted = useMemo(() => {
    return appointments
      .filter((appointment) => getAppointmentDate(appointment) === nextBusinessDate)
      .sort((first, second) => {
        return getAppointmentTime(first).localeCompare(getAppointmentTime(second));
      });
  }, [
    appointments,
    nextBusinessDate
  ]);

  const operationalTodayAppointments = useMemo(() => {
    return todayAppointmentsSorted.filter((appointment) => {
      return isOperationalAppointmentVisible({
        appointment,
        dateStr: baseDateStr,
        appointments,
        services,
        hideExpired: true
      });
    });
  }, [
    todayAppointmentsSorted,
    baseDateStr,
    appointments,
    services,
    timeRefreshVersion
  ]);

  const operationalNextBusinessAppointments = useMemo(() => {
    return nextBusinessAppointmentsSorted.filter((appointment) => {
      return isOperationalAppointmentVisible({
        appointment,
        dateStr: nextBusinessDate,
        appointments,
        services
      });
    });
  }, [
    nextBusinessAppointmentsSorted,
    nextBusinessDate,
    appointments,
    services
  ]);

  const confirmedTodayCount = operationalTodayAppointments.filter((appointment) => {
    return isConfirmedStatus(appointment.status);
  }).length;

  const notConfirmedTodayCount = operationalTodayAppointments.filter((appointment) => {
    return isPendingStatus(appointment.status);
  }).length;

  const absencesTodayCount = operationalTodayAppointments.filter((appointment) => {
    return appointment.status === 'absent';
  }).length;

  const freeSlotsTodayCount = professionals.reduce((total, professional) => {
    return total + countProfessionalSlotsForDate({
      professional,
      dateStr: baseDateStr,
      appointments,
      onlyFutureSlots: true
    });
  }, 0);

  const filteredTodayAppointments = useMemo(() => {
    return filterAppointmentsByDashboardFilter({
      appointments: operationalTodayAppointments,
      activeFilter
    });
  }, [
    operationalTodayAppointments,
    activeFilter
  ]);

  const filteredNextBusinessAppointments = useMemo(() => {
    return filterAppointmentsByDashboardFilter({
      appointments: operationalNextBusinessAppointments,
      activeFilter
    });
  }, [
    operationalNextBusinessAppointments,
    activeFilter
  ]);

  const periodDates = useMemo(() => {
    return getPeriodDates({
      baseDateStr,
      period: servicesAnalysisPeriod
    });
  }, [
    baseDateStr,
    servicesAnalysisPeriod
  ]);

  const serviceAnalysisRows = useMemo(() => {
    const completedAppointments = appointments.filter((appointment) => {
      const appointmentDate = getAppointmentDate(appointment);

      return (
        appointment.status === 'completed' &&
        appointmentDate >= periodDates.startDate &&
        appointmentDate <= periodDates.endDate
      );
    });

    const rows = services.map((service) => {
      const count = completedAppointments.filter((appointment) => {
        return appointment.serviceId === service.id;
      }).length;

      return {
        service,
        count
      };
    });

    return rows
      .filter((row) => row.count > 0)
      .sort((first, second) => {
        if (second.count !== first.count) {
          return second.count - first.count;
        }

        return first.service.name.localeCompare(second.service.name);
      });
  }, [
    appointments,
    services,
    periodDates
  ]);

  const maxServiceCount = Math.max(
    1,
    ...serviceAnalysisRows.map((row) => row.count)
  );

  const filterCards = [
    {
      value: 'all' as DashboardFilter,
      label: 'Clientes do dia',
      count: operationalTodayAppointments.length,
      icon: Users,
      numberClassName: 'text-[#0f4c5c]',
      iconClassName: 'text-[#0f4c5c] bg-[#0f4c5c]/10'
    },
    {
      value: 'confirmed' as DashboardFilter,
      label: 'Confirmados',
      count: confirmedTodayCount,
      icon: CheckCircle2,
      numberClassName: 'text-[#0f4c5c]',
      iconClassName: 'text-[#0f4c5c] bg-[#0f4c5c]/10'
    },
    {
      value: 'not_confirmed' as DashboardFilter,
      label: 'Não confirmados',
      count: notConfirmedTodayCount,
      icon: Clock,
      numberClassName: 'text-[#0f4c5c]',
      iconClassName: 'text-[#0f4c5c] bg-[#0f4c5c]/10'
    },
    {
      value: 'free' as DashboardFilter,
      label: 'Horários livres',
      count: freeSlotsTodayCount,
      icon: CalendarDays,
      numberClassName: 'text-[#0f4c5c]',
      iconClassName: 'text-[#0f4c5c] bg-[#0f4c5c]/10'
    },
    {
      value: 'absent' as DashboardFilter,
      label: 'Faltas do dia',
      count: absencesTodayCount,
      icon: UserRoundX,
      numberClassName: 'text-[#0f4c5c]',
      iconClassName: 'text-[#0f4c5c] bg-[#0f4c5c]/10'
    }
  ];

  const handleOpenAgenda = () => {
    onOpenTodayAgenda();
    onChangeTab('agenda');
  };


  const handleAppointmentStatusChange = (
    appointmentId: string,
    status: AppointmentStatus
  ) => {
    if (!onUpdateAppointmentStatus) {
      handleOpenAgenda();
      return;
    }

    onUpdateAppointmentStatus(appointmentId, status);
  };

  const handleResendConfirmation = async (params: {
    appointment: Appointment;
    professionalName: string;
    serviceName: string;
    targetDateLabel: string;
  }) => {
    const {
      appointment,
      professionalName,
      serviceName,
      targetDateLabel
    } = params;

    if (resendingAppointmentId) {
      return;
    }

    const whatsappWindow = window.open('', '_blank');

    if (whatsappWindow) {
      whatsappWindow.opener = null;
    }

    setResendingAppointmentId(appointment.id);

    try {
      const tokenResult = await supabase.rpc(
        'get_my_client_public_access_token_by_appointment',
        {
          p_appointment_id: appointment.id
        }
      );

      if (tokenResult.error) {
        throw tokenResult.error;
      }

      const clientPublicToken = extractClientPublicToken(tokenResult.data);

      if (!clientPublicToken) {
        throw new Error('Token público do cliente não encontrado.');
      }

      const appointmentLink =
        `${getAgendaBlessPublicOrigin()}/meus-agendamentos/${encodeURIComponent(clientPublicToken)}`;

      const whatsappUrl = buildWhatsAppConfirmationUrl({
        appointment,
        professionalName,
        serviceName,
        targetDateLabel,
        appointmentLink
      });

      if (whatsappWindow) {
        whatsappWindow.location.href = whatsappUrl;
      } else {
        window.location.href = whatsappUrl;
      }
    } catch (error) {
      whatsappWindow?.close();
      console.error('Erro ao reenviar confirmação:', error);
      window.alert(
        'Não foi possível gerar o link de confirmação. Tente novamente.'
      );
    } finally {
      setResendingAppointmentId(null);
    }
  };

  const renderHistoricalAppointments = (historyItems: Appointment[] = []) => {
    if (historyItems.length === 0) {
      return null;
    }

    return (
      <div className="mt-3 rounded-xl border border-dashed border-neutral-300 bg-neutral-50/80 px-3 py-2 opacity-80">
        <p className="font-mono text-[10px] font-black uppercase tracking-[0.16em] text-neutral-500">
          Histórico do horário
        </p>

        <div className="mt-1 space-y-1">
          {historyItems.map((historyAppointment) => {
            const historyService = services.find((item) => {
              return item.id === historyAppointment.serviceId;
            });
            const statusLabel = getAppointmentFooterStatusLabel(historyAppointment.status);

            return (
              <p
                key={historyAppointment.id}
                className="text-xs font-semibold text-neutral-500 line-through decoration-neutral-300"
              >
                {historyAppointment.clientName} — {statusLabel.toLowerCase()}
                {historyService?.name ? ` · ${historyService.name}` : ''}
              </p>
            );
          })}
        </div>
      </div>
    );
  };

  const renderAppointmentList = (
    list: Appointment[],
    emptyMessage: string,
    targetDateLabel: string
  ) => {
    if (activeFilter === 'free') {
      return (
        <div className="bg-white border border-dashed rounded-2xl p-6 text-center">
          <CalendarDays className="w-8 h-8 text-slate-400 mx-auto" />

          <p className="text-sm font-black text-neutral-800 mt-3">
            Horários livres restantes do dia aparecem na Agenda Geral.
          </p>

          <p className="text-xs text-neutral-400 mt-1">
            Abra a Agenda Geral para visualizar as brechas por profissional e fazer agendamento manual.
          </p>

          <button
            type="button"
            onClick={handleOpenAgenda}
            className="mt-4 rounded-xl bg-[#0f4c5c] px-4 py-3 text-xs font-black text-white hover:bg-[#123945] transition"
          >
            Ver horários livres
          </button>
        </div>
      );
    }

    if (list.length === 0) {
      return (
        <p className="text-xs text-neutral-400 py-8 text-center bg-white border rounded-2xl">
          {emptyMessage}
        </p>
      );
    }

    return (
      <div className="space-y-3">
        {list.map((appointment) => {
          const service = services.find((item) => item.id === appointment.serviceId);
          const professional = professionals.find((item) => item.id === appointment.professionalId);
          const professionalName = professional?.name || 'Profissional';
          const appointmentTime = getAppointmentTime(appointment);
          const isAlreadyConfirmed = isConfirmedStatus(appointment.status);
          const isHistoricalOnly = isHistoricalAppointmentStatus(appointment.status);
          const isInactive = isHistoricalOnly || appointment.status === 'completed';
          const historicalAppointments = isHistoricalOnly
            ? []
            : getHistoricalAppointmentsForSlot({
              appointment,
              appointments
            });

          return (
            <div
              key={appointment.id}
              className={`rounded-2xl border px-3 py-3 shadow-sm transition hover:border-slate-300 ${getAppointmentCardSurfaceClassName(appointment.status)} ${getAppointmentCardAccentClassName(appointment.status)}`}
            >
              <div className="flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="text-lg font-black tracking-tight text-neutral-950">
                        {appointmentTime}
                      </span>

                      <span className="hidden sm:block h-5 w-px bg-neutral-300" />

                      <h4 className="text-sm font-normal uppercase leading-tight tracking-tight text-neutral-950">
                        CLIENTE: {appointment.clientName}
                      </h4>
                    </div>

                    <div className="space-y-1.5 pl-0 sm:pl-0">
                      <p className="text-xs font-extrabold leading-snug text-slate-800">
                        {service?.name || 'Serviço'}
                      </p>

                      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                        Profissional: {professionalName}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold uppercase tracking-wide shrink-0">
                    <CalendarDays className="w-3.5 h-3.5" />
                    {targetDateLabel}
                  </div>
                </div>

                {isHistoricalOnly ? (
                  <div className="rounded-xl border border-dashed border-neutral-300 bg-white/70 px-3 py-2 text-[11px] font-black uppercase tracking-tight text-neutral-500">
                    Registro de histórico, sem ações no horário.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      disabled={isAlreadyConfirmed || isInactive}
                      onClick={() => handleAppointmentStatusChange(appointment.id, 'confirmed')}
                      className={`rounded-xl px-3 py-2.5 text-[11px] font-black uppercase tracking-tight transition ${
                        isAlreadyConfirmed || isInactive
                          ? 'bg-[#0f4c5c]/10 text-[#0f4c5c] cursor-not-allowed'
                          : 'bg-[#0f4c5c] text-white hover:bg-[#123945] shadow-sm'
                      }`}
                    >
                      {isAlreadyConfirmed ? 'Confirmado' : 'Confirmar'}
                    </button>

                    <button
                      type="button"
                      disabled={isInactive}
                      onClick={handleOpenAgenda}
                      className={`rounded-xl px-3 py-2.5 text-[11px] font-black uppercase tracking-tight transition ${
                        isInactive
                          ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                          : 'bg-[#0f4c5c] text-white hover:bg-[#123945] shadow-sm'
                      }`}
                    >
                      Reagendar
                    </button>

                    <button
                      type="button"
                      disabled={appointment.status === 'cancelled'}
                      onClick={() => handleAppointmentStatusChange(appointment.id, 'cancelled')}
                      className={`rounded-xl px-3 py-2.5 text-[11px] font-black uppercase tracking-tight transition ${
                        appointment.status === 'cancelled'
                          ? 'bg-neutral-300 text-neutral-600 cursor-not-allowed'
                          : 'bg-slate-700 text-white hover:bg-slate-800 shadow-sm'
                      }`}
                    >
                      Cancelou
                    </button>

                    <button
                      type="button"
                      disabled={appointment.status === 'absent'}
                      onClick={() => handleAppointmentStatusChange(appointment.id, 'absent')}
                      className={`rounded-xl px-3 py-2.5 text-[11px] font-black uppercase tracking-tight transition ${
                        appointment.status === 'absent'
                          ? 'bg-slate-200 text-slate-600 cursor-not-allowed'
                          : 'bg-slate-600 text-white hover:bg-slate-700 shadow-sm'
                      }`}
                    >
                      Faltou
                    </button>
                  </div>
                )}

                {renderHistoricalAppointments(historicalAppointments)}

                <div className="border-t border-black/5 pt-2">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${getAppointmentFooterClassName(appointment.status)}`}>
                      {getAppointmentFooterStatusLabel(appointment.status)}
                    </span>

                    {isPendingStatus(appointment.status) && (
                      <button
                        type="button"
                        onClick={() => {
                          void handleResendConfirmation({
                            appointment,
                            professionalName,
                            serviceName: service?.name || 'Serviço',
                            targetDateLabel: targetDateLabel.toLowerCase()
                          });
                        }}
                        disabled={resendingAppointmentId !== null}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#0f4c5c]/20 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-tight text-[#0f4c5c] shadow-sm transition hover:border-[#0f4c5c]/40 hover:bg-[#0f4c5c]/5 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        {resendingAppointmentId === appointment.id
                          ? 'Gerando link...'
                          : 'Reenviar confirmação'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div id="view-painel" className="space-y-3 text-left animate-none">

      {(subscriptionIsOverdue || subscriptionIsDueSoon) && (
        <button
          type="button"
          onClick={() => onChangeTab('mensalidade')}
          className={`w-full rounded-2xl border px-4 py-3 text-left shadow-sm transition hover:shadow-md ${
            subscriptionIsOverdue
              ? 'border-red-200 bg-red-50 text-red-900'
              : 'border-amber-200 bg-amber-50 text-amber-900'
          }`}
        >
          <div className="flex items-start gap-3">
            <span
              className={`mt-1 h-3 w-3 shrink-0 rounded-full ${
                subscriptionIsOverdue ? 'bg-red-500' : 'bg-amber-400'
              }`}
            />
            <div>
              <p className="text-sm font-black">
                {subscriptionIsOverdue
                  ? 'Sua mensalidade está em atraso'
                  : subscriptionStatus === 'trial'
                    ? `Seu período de teste termina em ${Math.max(0, subscriptionDaysUntilDue)} dia${Math.max(0, subscriptionDaysUntilDue) === 1 ? '' : 's'}`
                    : `Sua mensalidade vence em ${Math.max(0, subscriptionDaysUntilDue)} dia${Math.max(0, subscriptionDaysUntilDue) === 1 ? '' : 's'}`}
              </p>
              <p className="mt-1 text-xs font-semibold opacity-80">
                Acesse Mensalidade para consultar o valor e as formas de pagamento.
              </p>
            </div>
          </div>
        </button>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="h-1.5 bg-[#0f4c5c]" />
        <div className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#0f4c5c]">
              AgendaBless
            </p>
            <h2 className="text-lg font-normal tracking-tight text-neutral-950">
              Painel Operacional
            </h2>
          </div>

          <button
            type="button"
            onClick={() => setShowServicesAnalysis(true)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm transition hover:border-[#0f4c5c]/40 hover:bg-slate-50 sm:w-max flex items-center justify-center gap-2"
          >
            <BarChart3 className="w-4 h-4 text-[#0f4c5c]" />
            Serviços mais procurados
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="bg-[#0f4c5c] text-white px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5" />

              <h3 className="text-sm font-black uppercase tracking-wide">
                Atendimentos de hoje
              </h3>
            </div>

            <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-black">
              {filteredTodayAppointments.length}
            </span>
          </div>

          <div className="p-3 bg-[#f8fafc]">
            {renderAppointmentList(
              filteredTodayAppointments,
              'Não há agendamentos para hoje neste filtro.',
              'Hoje'
            )}
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="bg-[#1d6b78] text-white px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5" />

              <div>
                <h3 className="text-sm font-black uppercase tracking-wide">
                  Atendimentos de amanhã
                </h3>

                <p className="text-[11px] text-white/80 font-semibold normal-case tracking-normal">
                  {getWeekDayLabel(nextBusinessDate)} • {getShortDateLabel(nextBusinessDate)}
                </p>
              </div>
            </div>

            <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-black">
              {filteredNextBusinessAppointments.length}
            </span>
          </div>

          <div className="p-3 bg-[#f8fafc]">
            {renderAppointmentList(
              filteredNextBusinessAppointments,
              'Não há agendamentos para o próximo dia útil neste filtro.',
              'Amanhã'
            )}
          </div>
        </section>
      </div>

      {showServicesAnalysis && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full border text-left shadow-2xl relative space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 border-b pb-3">
              <div>
                <h3 className="text-lg font-black text-neutral-950">
                  Serviços mais procurados
                </h3>

                <p className="text-xs text-neutral-500 mt-1">
                  Analise os serviços finalizados por período.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => printServicesAnalysisReport({
                    rows: serviceAnalysisRows,
                    startDate: periodDates.startDate,
                    endDate: periodDates.endDate
                  })}
                  className="rounded-xl bg-[#0f4c5c] px-3 py-2 text-xs font-black text-white transition hover:bg-[#123945] flex items-center gap-1.5"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Imprimir
                </button>

                <button
                  type="button"
                  onClick={() => setShowServicesAnalysis(false)}
                  className="text-zinc-400 hover:text-zinc-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setServicesAnalysisPeriod({
                  type: 'today',
                  startDate: baseDateStr,
                  endDate: baseDateStr
                })}
                className={`px-4 py-2.5 rounded-xl text-xs font-black border transition ${
                  servicesAnalysisPeriod.type === 'today'
                    ? 'bg-[#0f4c5c] text-white border-[#0f4c5c]'
                    : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
                }`}
              >
                Hoje
              </button>

              <button
                type="button"
                onClick={() => setServicesAnalysisPeriod({
                  type: 'last7',
                  startDate: addDays(baseDateStr, -6),
                  endDate: baseDateStr
                })}
                className={`px-4 py-2.5 rounded-xl text-xs font-black border transition ${
                  servicesAnalysisPeriod.type === 'last7'
                    ? 'bg-[#0f4c5c] text-white border-[#0f4c5c]'
                    : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
                }`}
              >
                Últimos 7 dias
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-neutral-50 border rounded-2xl p-3">
              <label className="space-y-1">
                <span className="text-[10px] font-black text-neutral-500 uppercase tracking-wider">
                  Data inicial
                </span>

                <input
                  type="date"
                  value={servicesAnalysisPeriod.startDate}
                  onChange={(event) => setServicesAnalysisPeriod((current) => ({
                    ...current,
                    type: 'custom',
                    startDate: event.target.value
                  }))}
                  className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-xs font-bold outline-none focus:border-[#0f4c5c]"
                />
              </label>

              <label className="space-y-1">
                <span className="text-[10px] font-black text-neutral-500 uppercase tracking-wider">
                  Data final
                </span>

                <input
                  type="date"
                  value={servicesAnalysisPeriod.endDate}
                  onChange={(event) => setServicesAnalysisPeriod((current) => ({
                    ...current,
                    type: 'custom',
                    endDate: event.target.value
                  }))}
                  className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-xs font-bold outline-none focus:border-[#0f4c5c]"
                />
              </label>
            </div>

            <div className="bg-white border rounded-2xl p-4 space-y-3.5">
              {serviceAnalysisRows.length === 0 ? (
                <p className="text-xs text-neutral-400 py-6 text-center">
                  Nenhum serviço finalizado no período selecionado.
                </p>
              ) : (
                serviceAnalysisRows.map((row) => {
                  const width = Math.max(5, (row.count / maxServiceCount) * 100);

                  return (
                    <div key={row.service.id} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-3 text-xs font-medium">
                        <span className="font-bold text-neutral-900">
                          {row.service.name}
                        </span>

                        <span className="text-neutral-500 font-bold shrink-0">
                          {row.count} finalizados
                        </span>
                      </div>

                      <div className="w-full bg-neutral-150 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-[#0f4c5c] h-full rounded-full"
                          style={{ width: `${width}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
