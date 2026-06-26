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
  useMemo,
  useState
} from 'react';

import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock,
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

import {
  getAppointmentTime
} from '../owner.utils';

interface DashboardHomeViewProps {
  baseDateStr: string;
  appointments: Appointment[];
  professionals: Professional[];
  services: Service[];
  configWorkDays: number[];
  financialSummary: OwnerFinancialSummary;
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
  return status === 'scheduled' || status === 'rescheduled';
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
    return 'bg-emerald-50 text-emerald-700 border-emerald-100';
  }

  if (isPendingStatus(status)) {
    return 'bg-orange-50 text-orange-700 border-orange-100';
  }

  if (status === 'absent') {
    return 'bg-red-50 text-red-700 border-red-100';
  }

  if (status === 'cancelled') {
    return 'bg-neutral-100 text-neutral-500 border-neutral-200';
  }

  return 'bg-neutral-100 text-neutral-600 border-neutral-200';
}

function getAppointmentCardAccentClassName(status: AppointmentStatus): string {
  if (isConfirmedStatus(status)) {
    return 'border-l-4 border-l-emerald-500';
  }

  if (isPendingStatus(status)) {
    return 'border-l-4 border-l-orange-500';
  }

  if (status === 'absent') {
    return 'border-l-4 border-l-red-500';
  }

  if (status === 'cancelled') {
    return 'border-l-4 border-l-neutral-300';
  }

  return 'border-l-4 border-l-neutral-200';
}

function getAppointmentCardSurfaceClassName(status: AppointmentStatus): string {
  if (isConfirmedStatus(status)) {
    return 'border-emerald-200 bg-emerald-50/75';
  }

  if (isPendingStatus(status)) {
    return 'border-amber-200 bg-amber-50/85';
  }

  if (status === 'absent') {
    return 'border-red-200 bg-red-50/80';
  }

  if (status === 'cancelled') {
    return 'border-neutral-200 bg-neutral-100/90';
  }

  if (status === 'completed') {
    return 'border-sky-200 bg-sky-50/75';
  }

  return 'border-neutral-200 bg-white';
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

  if (status === 'completed') {
    return 'Atendimento finalizado';
  }

  return getAppointmentStatusLabel(status);
}

function getAppointmentFooterClassName(status: AppointmentStatus): string {
  if (isConfirmedStatus(status)) {
    return 'text-emerald-800';
  }

  if (isPendingStatus(status)) {
    return 'text-amber-800';
  }

  if (status === 'cancelled') {
    return 'text-neutral-600';
  }

  if (status === 'absent') {
    return 'text-red-800';
  }

  if (status === 'completed') {
    return 'text-sky-800';
  }

  return 'text-neutral-600';
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

function isCancelledSlotAlreadyOccupied(params: {
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

    return ![
      'cancelled',
      'absent'
    ].includes(item.status);
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

  if (appointment.status === 'cancelled') {
    return !isCancelledSlotAlreadyOccupied({
      appointment,
      appointments
    });
  }

  if (!hideExpired) {
    return true;
  }

  if (appointment.status === 'completed') {
    return false;
  }

  const currentDateStr = getCurrentDateStr();

  if (dateStr !== currentDateStr) {
    return true;
  }

  const currentMinutes = getCurrentTimeInMinutes();
  const appointmentMinutes = getAppointmentTimeInMinutes(appointment);
  const serviceDuration = getServiceDurationMinutes({
    appointment,
    services
  });

  return currentMinutes <= appointmentMinutes + serviceDuration + 30;
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

  const weekDay = parseLocalDate(dateStr).getDay();

  if (!professional.active || !professional.workDays.includes(weekDay)) {
    return 0;
  }

  const start = timeToMinutes(professional.workHoursStart);
  const end = timeToMinutes(professional.workHoursEnd);
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
  targetDateLabel: string;
}) {
  const {
    appointment,
    professionalName,
    targetDateLabel
  } = params;

  const phone = onlyDigits(appointment.clientPhone);
  const time = getAppointmentTime(appointment);

  const message = encodeURIComponent(
    `Olá ${appointment.clientName}, passando para confirmar seu horário ${targetDateLabel} às ${time} com ${professionalName}. Responda 1 para confirmar.`
  );

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

export default function DashboardHomeView({
  baseDateStr,
  appointments,
  professionals,
  services,
  configWorkDays,
  financialSummary,
  onChangeTab,
  onOpenTodayAgenda,
  onUpdateAppointmentStatus
}: DashboardHomeViewProps) {
  const [activeFilter, setActiveFilter] =
    useState<DashboardFilter>('all');

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
        services
      });
    });
  }, [
    todayAppointmentsSorted,
    baseDateStr,
    appointments,
    services
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
      numberClassName: 'text-neutral-950',
      iconClassName: 'text-indigo-600 bg-indigo-50'
    },
    {
      value: 'confirmed' as DashboardFilter,
      label: 'Confirmados',
      count: confirmedTodayCount,
      icon: CheckCircle2,
      numberClassName: 'text-emerald-600',
      iconClassName: 'text-emerald-600 bg-emerald-50'
    },
    {
      value: 'not_confirmed' as DashboardFilter,
      label: 'Não confirmados',
      count: notConfirmedTodayCount,
      icon: Clock,
      numberClassName: 'text-orange-600',
      iconClassName: 'text-orange-600 bg-orange-50'
    },
    {
      value: 'free' as DashboardFilter,
      label: 'Horários livres',
      count: freeSlotsTodayCount,
      icon: CalendarDays,
      numberClassName: 'text-neutral-950',
      iconClassName: 'text-slate-600 bg-slate-50'
    },
    {
      value: 'absent' as DashboardFilter,
      label: 'Faltas do dia',
      count: absencesTodayCount,
      icon: UserRoundX,
      numberClassName: 'text-red-600',
      iconClassName: 'text-red-600 bg-red-50'
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
            className="mt-4 rounded-xl bg-neutral-950 px-4 py-3 text-xs font-black text-white hover:bg-neutral-800 transition"
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
          const isInactive = ['cancelled', 'absent', 'completed'].includes(appointment.status);

          return (
            <div
              key={appointment.id}
              className={`rounded-2xl border px-4 py-4 shadow-sm transition ${getAppointmentCardSurfaceClassName(appointment.status)} ${getAppointmentCardAccentClassName(appointment.status)}`}
            >
              <div className="flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="font-mono text-lg font-black tracking-tight text-neutral-950">
                        {appointmentTime}
                      </span>

                      <span className="hidden sm:block h-5 w-px bg-neutral-300" />

                      <h4 className="text-base font-black uppercase leading-tight tracking-tight text-neutral-950">
                        CLIENTE: {appointment.clientName}
                      </h4>
                    </div>

                    <div className="space-y-1.5 pl-0 sm:pl-0">
                      <p className="text-[13px] font-extrabold leading-snug text-slate-800">
                        {service?.name || 'Serviço'}
                      </p>

                      <p className="text-[12px] font-bold uppercase tracking-wide text-slate-500">
                        Profissional: {professionalName}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold uppercase tracking-wide shrink-0">
                    <CalendarDays className="w-3.5 h-3.5" />
                    {targetDateLabel}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    disabled={isAlreadyConfirmed || isInactive}
                    onClick={() => handleAppointmentStatusChange(appointment.id, 'confirmed')}
                    className={`rounded-xl px-3 py-2.5 text-[11px] font-black uppercase tracking-tight transition ${
                      isAlreadyConfirmed || isInactive
                        ? 'bg-emerald-100 text-emerald-700 cursor-not-allowed'
                        : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
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
                        : 'bg-orange-600 text-white hover:bg-orange-700 shadow-sm'
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
                        : 'bg-neutral-800 text-white hover:bg-neutral-950 shadow-sm'
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
                        ? 'bg-red-200 text-red-800 cursor-not-allowed'
                        : 'bg-red-700 text-white hover:bg-red-800 shadow-sm'
                    }`}
                  >
                    Faltou
                  </button>
                </div>

                <div className={`border-t border-black/5 pt-2 text-[10px] font-black uppercase tracking-[0.16em] ${getAppointmentFooterClassName(appointment.status)}`}>
                  {getAppointmentFooterStatusLabel(appointment.status)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div id="view-painel" className="space-y-6 text-left animate-none">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-neutral-950">
            Painel Operacional
          </h2>

          <p className="text-sm text-slate-500 mt-1">
            
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowServicesAnalysis(true)}
          className="w-full sm:w-max bg-white border border-neutral-200 hover:border-orange-500 text-neutral-800 text-xs font-black px-4 py-3 rounded-xl shadow-xs transition flex items-center justify-center gap-2"
        >
          <BarChart3 className="w-4 h-4 text-orange-600" />
          Serviços mais procurados
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        {filterCards.map((card) => {
          const Icon = card.icon;
          const isActive = activeFilter === card.value;

          return (
            <button
              key={card.value}
              type="button"
              onClick={() => setActiveFilter(card.value)}
              className={`bg-white border rounded-2xl p-3.5 shadow-sm text-left transition hover:shadow-md ${
                isActive
                  ? 'border-orange-500 ring-2 ring-orange-100'
                  : 'border-neutral-200 hover:border-neutral-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`w-11 h-11 rounded-2xl flex items-center justify-center ${card.iconClassName}`}>
                  <Icon className="w-5 h-5" />
                </span>

                <span>
                  <span className="text-[13px] font-black text-slate-700 block leading-tight">
                    {card.label}
                  </span>

                  <span className={`text-xl font-black block mt-1 ${card.numberClassName}`}>
                    {card.count}
                  </span>
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-sm">
          <div className="bg-gradient-to-r from-emerald-700 to-emerald-500 text-white px-5 py-3.5 flex items-center justify-between gap-3">
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

          <div className="p-3.5 bg-slate-50/60">
            {renderAppointmentList(
              filteredTodayAppointments,
              'Não há agendamentos para hoje neste filtro.',
              'Hoje'
            )}
          </div>
        </section>

        <section className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-sm">
          <div className="bg-gradient-to-r from-orange-600 to-orange-500 text-white px-5 py-3.5 flex items-center justify-between gap-3">
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

          <div className="p-3.5 bg-slate-50/60">
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
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full border text-left shadow-2xl relative space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 border-b pb-3">
              <div>
                <h3 className="text-lg font-black text-neutral-950">
                  Serviços mais procurados
                </h3>

                <p className="text-xs text-neutral-500 mt-1">
                  Analise os serviços finalizados por período.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowServicesAnalysis(false)}
                className="text-zinc-400 hover:text-zinc-700"
              >
                <X className="w-5 h-5" />
              </button>
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
                    ? 'bg-orange-600 text-white border-orange-600'
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
                    ? 'bg-orange-600 text-white border-orange-600'
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
                  className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-xs font-bold outline-none focus:border-orange-500"
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
                  className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-xs font-bold outline-none focus:border-orange-500"
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
                          className="bg-neutral-900 h-full rounded-full"
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
