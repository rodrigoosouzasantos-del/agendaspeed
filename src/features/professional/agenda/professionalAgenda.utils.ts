import {
  Appointment,
  AppointmentStatus,
  Professional,
  Service
} from '../../../types';

import {
  ProfessionalAgendaBlockedInterval,
  ProfessionalAgendaCalendarDay,
  ProfessionalAgendaCalendarInput,
  ProfessionalAgendaDayOverride,
  ProfessionalAgendaGeneratedSlotInput,
  ProfessionalAgendaSlotStatus,
  ProfessionalAgendaStatusOption,
  ProfessionalAgendaSummary,
  ProfessionalAgendaTimeSlot
} from './professionalAgenda.types';

const WEEK_DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export const PROFESSIONAL_AGENDA_STATUS_OPTIONS: ProfessionalAgendaStatusOption[] = [
  {
    value: 'confirmed',
    label: 'Confirmado'
  },
  {
    value: 'scheduled',
    label: 'Não confirmado'
  },
  {
    value: 'attending',
    label: 'Em atendimento'
  },
  {
    value: 'absent',
    label: 'Faltou'
  },
  {
    value: 'cancelled',
    label: 'Cancelado'
  },
  {
    value: 'rescheduled',
    label: 'Remarcado'
  }
];

export function formatLocalDateStr(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function getTodayDateStr(): string {
  return formatLocalDateStr(new Date());
}

export function formatDateBr(dateStr: string): string {
  if (!dateStr || !dateStr.includes('-')) {
    return dateStr;
  }

  return dateStr.split('-').reverse().join('/');
}

export function getAppointmentDate(appointment: Appointment): string {
  return appointment.dateTime.split('T')[0] || '';
}

export function getAppointmentTime(appointment: Appointment): string {
  return appointment.dateTime.split('T')[1] || '';
}

export function timeToMinutes(time: string): number {
  const [hour, minute] = time.split(':').map(Number);

  return hour * 60 + minute;
}

export function minutesToTime(minutes: number): string {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;

  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function addMinutesToTime(time: string, minutesToAdd: number): string {
  return minutesToTime(timeToMinutes(time) + minutesToAdd);
}

function getProfessionalDefaultSlotMinutes(professional: Professional): number {
  const professionalRecord = professional as Professional & {
    defaultAppointmentDuration?: number;
  };

  const defaultDuration = Number(professionalRecord.defaultAppointmentDuration) || 30;

  return Math.max(15, defaultDuration);
}

function professionalHasLunchBreak(professional: Professional): boolean {
  const professionalRecord = professional as Professional & {
    noLunchBreak?: boolean;
  };

  return !professionalRecord.noLunchBreak;
}

export function getStatusLabel(status: AppointmentStatus): string {
  const labels: Record<AppointmentStatus, string> = {
    scheduled: 'Não confirmado',
    confirmed: 'Confirmado',
    attending: 'Em atendimento',
    completed: 'Finalizado',
    cancelled: 'Cancelado',
    absent: 'Faltou',
    rescheduled: 'Remarcado'
  };

  return labels[status] || status;
}

export function getSlotStatusClassName(status: ProfessionalAgendaSlotStatus): string {
  if (status === 'free') {
    return 'bg-white border-neutral-200 text-neutral-800';
  }

  if (status === 'booked') {
    return 'bg-green-50 border-green-200 text-green-900';
  }

  if (status === 'occupied') {
    return 'bg-neutral-100 border-neutral-200 text-neutral-500';
  }

  if (status === 'blocked') {
    return 'bg-neutral-200 border-neutral-300 text-neutral-700';
  }

  if (status === 'closed') {
    return 'bg-neutral-100 border-neutral-200 text-neutral-400';
  }

  if (status === 'lunch') {
    return 'bg-orange-50 border-orange-200 text-orange-800';
  }

  return 'bg-white border-neutral-200 text-neutral-800';
}

export function getAppointmentStatusClassName(status: AppointmentStatus): string {
  if (status === 'confirmed') {
    return 'bg-green-100 text-green-800 border-green-200';
  }

  if (status === 'scheduled') {
    return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  }

  if (status === 'absent') {
    return 'bg-red-100 text-red-800 border-red-200';
  }

  if (status === 'attending') {
    return 'bg-orange-100 text-orange-800 border-orange-200';
  }

  if (status === 'cancelled' || status === 'rescheduled') {
    return 'bg-neutral-100 text-neutral-600 border-neutral-200';
  }

  if (status === 'completed') {
    return 'bg-green-50 text-green-700 border-green-100';
  }

  return 'bg-neutral-100 text-neutral-600 border-neutral-200';
}

export function getAppointmentsForProfessionalDate(params: {
  appointments: Appointment[];
  professionalId: string;
  selectedDate: string;
}): Appointment[] {
  const {
    appointments,
    professionalId,
    selectedDate
  } = params;

  return appointments
    .filter((appointment) => {
      return (
        appointment.professionalId === professionalId &&
        getAppointmentDate(appointment) === selectedDate
      );
    })
    .sort((firstAppointment, secondAppointment) => {
      return firstAppointment.dateTime.localeCompare(secondAppointment.dateTime);
    });
}

export function getHistoricalAppointmentsForTime(params: {
  appointments: Appointment[];
  time: string;
}): Appointment[] {
  const {
    appointments,
    time
  } = params;

  return appointments
    .filter((appointment) => {
      return (
        getAppointmentTime(appointment) === time &&
        isHistoricalAppointmentStatus(appointment.status)
      );
    })
    .sort((firstAppointment, secondAppointment) => {
      return firstAppointment.dateTime.localeCompare(secondAppointment.dateTime);
    });
}

export function findServiceByAppointment(params: {
  appointment: Appointment;
  services: Service[];
}): Service | undefined {
  const {
    appointment,
    services
  } = params;

  return services.find((service) => {
    return service.id === appointment.serviceId;
  });
}

export function isHistoricalAppointmentStatus(status: AppointmentStatus): boolean {
  return (
    status === 'cancelled' ||
    status === 'absent' ||
    status === 'rescheduled'
  );
}

export function isBlockingAppointmentStatus(status: AppointmentStatus): boolean {
  return (
    status === 'scheduled' ||
    status === 'confirmed' ||
    status === 'attending' ||
    status === 'completed'
  );
}

export function findDayOverride(params: {
  dayOverrides?: ProfessionalAgendaDayOverride[];
  professionalId: string;
  selectedDate: string;
}): ProfessionalAgendaDayOverride | undefined {
  const {
    dayOverrides = [],
    professionalId,
    selectedDate
  } = params;

  return dayOverrides.find((dayOverride) => {
    return (
      dayOverride.professionalId === professionalId &&
      dayOverride.date === selectedDate
    );
  });
}

export function getBlockedIntervalsForDate(params: {
  blockedIntervals?: ProfessionalAgendaBlockedInterval[];
  professionalId: string;
  selectedDate: string;
}): ProfessionalAgendaBlockedInterval[] {
  const {
    blockedIntervals = [],
    professionalId,
    selectedDate
  } = params;

  return blockedIntervals.filter((blockedInterval) => {
    return (
      blockedInterval.professionalId === professionalId &&
      blockedInterval.date === selectedDate
    );
  });
}

export function isTimeInsideBlockedInterval(params: {
  time: string;
  blockedInterval: ProfessionalAgendaBlockedInterval;
}): boolean {
  const {
    time,
    blockedInterval
  } = params;

  const timeMinutes = timeToMinutes(time);
  const startMinutes = timeToMinutes(blockedInterval.startTime);
  const endMinutes = timeToMinutes(blockedInterval.endTime);

  return timeMinutes >= startMinutes && timeMinutes < endMinutes;
}

export function findBlockedIntervalForTime(params: {
  time: string;
  blockedIntervals: ProfessionalAgendaBlockedInterval[];
}): ProfessionalAgendaBlockedInterval | undefined {
  const {
    time,
    blockedIntervals
  } = params;

  return blockedIntervals.find((blockedInterval) => {
    return isTimeInsideBlockedInterval({
      time,
      blockedInterval
    });
  });
}

export function generateBaseTimes(params: {
  professional: Professional;
  selectedDate: string;
  dayOverrides?: ProfessionalAgendaDayOverride[];
  slotMinutes?: number;
}): string[] {
  const {
    professional,
    selectedDate,
    dayOverrides = [],
    slotMinutes = 30
  } = params;

  const dayOverride = findDayOverride({
    dayOverrides,
    professionalId: professional.id,
    selectedDate
  });

  if (dayOverride?.status !== 'open') {
    return [];
  }


  const startMinutes = timeToMinutes(professional.workHoursStart);
  const endMinutes = timeToMinutes(professional.workHoursEnd);

  const times: string[] = [];

  for (let current = startMinutes; current < endMinutes; current += slotMinutes) {
    times.push(minutesToTime(current));
  }

  return times;
}

export function isInsideLunch(params: {
  time: string;
  professional: Professional;
}): boolean {
  const {
    time,
    professional
  } = params;

  if (!professionalHasLunchBreak(professional)) {
    return false;
  }

  const timeMinutes = timeToMinutes(time);
  const lunchStart = timeToMinutes(professional.lunchStart);
  const lunchEnd = timeToMinutes(professional.lunchEnd);

  return timeMinutes >= lunchStart && timeMinutes < lunchEnd;
}

export function getAppointmentOccupiedTimes(params: {
  appointment: Appointment;
  service: Service | undefined;
  slotMinutes?: number;
}): string[] {
  const {
    appointment,
    service,
    slotMinutes = 30
  } = params;

  if (!isBlockingAppointmentStatus(appointment.status)) {
    return [];
  }

  const startTime = getAppointmentTime(appointment);
  const duration = service?.duration || slotMinutes;
  const slotsNeeded = Math.max(1, Math.ceil(duration / slotMinutes));

  const occupiedTimes: string[] = [];

  for (let index = 0; index < slotsNeeded; index += 1) {
    occupiedTimes.push(addMinutesToTime(startTime, index * slotMinutes));
  }

  return occupiedTimes;
}

export function getExtraTimesForDate(params: {
  professionalId: string;
  selectedDate: string;
  extraTimes?: ProfessionalAgendaGeneratedSlotInput['extraTimes'];
}): string[] {
  const {
    professionalId,
    selectedDate,
    extraTimes = []
  } = params;

  return extraTimes
    .filter((extraTime) => {
      return (
        extraTime.professionalId === professionalId &&
        extraTime.date === selectedDate
      );
    })
    .map((extraTime) => extraTime.time);
}

export function sortTimes(times: string[]): string[] {
  return Array.from(new Set(times)).sort((firstTime, secondTime) => {
    return timeToMinutes(firstTime) - timeToMinutes(secondTime);
  });
}

export function buildInitialSlots(params: {
  professional: Professional;
  selectedDate: string;
  baseTimes: string[];
  appointmentTimes: string[];
  historicalTimes?: string[];
  extraTimes: string[];
  blockedIntervals: ProfessionalAgendaBlockedInterval[];
  slotMinutes?: number;
}): ProfessionalAgendaTimeSlot[] {
  const {
    professional,
    selectedDate,
    baseTimes,
    appointmentTimes,
    historicalTimes = [],
    extraTimes,
    blockedIntervals,
    slotMinutes = 30
  } = params;

  const allTimes = sortTimes([
    ...baseTimes,
    ...appointmentTimes,
    ...historicalTimes,
    ...extraTimes
  ]);

  return allTimes.map((time) => {
    const blockedInterval = findBlockedIntervalForTime({
      time,
      blockedIntervals
    });

    if (blockedInterval) {
      return {
        id: `${selectedDate}-${professional.id}-${time}`,
        time,
        endTime: addMinutesToTime(time, slotMinutes),
        status: 'blocked',
        label: 'Bloqueado',
        blockReason: blockedInterval.reason || 'Horário bloqueado.'
      };
    }

    const isLunch = isInsideLunch({
      time,
      professional
    });

    return {
      id: `${selectedDate}-${professional.id}-${time}`,
      time,
      endTime: addMinutesToTime(time, slotMinutes),
      status: isLunch ? 'lunch' : 'free',
      label: isLunch ? 'Almoço' : 'Livre'
    };
  });
}

export function generateProfessionalAgendaSlots({
  professional,
  services,
  appointments,
  selectedDate,
  dayOverrides = [],
  blockedIntervals = [],
  extraTimes = [],
  slotMinutes
}: ProfessionalAgendaGeneratedSlotInput): ProfessionalAgendaTimeSlot[] {
  const resolvedSlotMinutes = slotMinutes || getProfessionalDefaultSlotMinutes(professional);
  const dayAppointments = getAppointmentsForProfessionalDate({
    appointments,
    professionalId: professional.id,
    selectedDate
  });

  const blockingAppointments = dayAppointments.filter((appointment) => {
    return isBlockingAppointmentStatus(appointment.status);
  });

  const historicalAppointments = dayAppointments.filter((appointment) => {
    return isHistoricalAppointmentStatus(appointment.status);
  });

  const appointmentTimes = blockingAppointments.flatMap((appointment) => {
    const service = findServiceByAppointment({
      appointment,
      services
    });

    return getAppointmentOccupiedTimes({
      appointment,
      service,
      slotMinutes: resolvedSlotMinutes
    });
  });

  const historicalTimes = historicalAppointments.map((appointment) => {
    return getAppointmentTime(appointment);
  });

  const baseTimes = generateBaseTimes({
    professional,
    selectedDate,
    dayOverrides,
    slotMinutes: resolvedSlotMinutes
  });

  const dayBlockedIntervals = getBlockedIntervalsForDate({
    blockedIntervals,
    professionalId: professional.id,
    selectedDate
  });

  const dayOverride = findDayOverride({
    dayOverrides,
    professionalId: professional.id,
    selectedDate
  });
  const isScheduleDayOpen = dayOverride?.status === 'open';

  const dayExtraTimes = isScheduleDayOpen
    ? getExtraTimesForDate({
        professionalId: professional.id,
        selectedDate,
        extraTimes
      })
    : [];

  const slots = buildInitialSlots({
    professional,
    selectedDate,
    baseTimes,
    appointmentTimes,
    historicalTimes,
    extraTimes: dayExtraTimes,
    blockedIntervals: dayBlockedIntervals,
    slotMinutes: resolvedSlotMinutes
  });

  blockingAppointments.forEach((appointment) => {
    const service = findServiceByAppointment({
      appointment,
      services
    });

    const occupiedTimes = getAppointmentOccupiedTimes({
      appointment,
      service,
      slotMinutes: resolvedSlotMinutes
    });

    occupiedTimes.forEach((time, index) => {
      const slotIndex = slots.findIndex((slot) => {
        return slot.time === time;
      });

      if (slotIndex < 0) {
        return;
      }

      if (index === 0) {
        slots[slotIndex] = {
          ...slots[slotIndex],
          status: 'booked',
          label: getStatusLabel(appointment.status),
          appointment,
          service
        };

        return;
      }

      slots[slotIndex] = {
        ...slots[slotIndex],
        status: 'occupied',
        label: 'Ocupado pelo atendimento anterior',
        occupiedByAppointmentId: appointment.id,
        appointment,
        service
      };
    });
  });

  historicalAppointments.forEach((appointment) => {
    const appointmentTime = getAppointmentTime(appointment);
    const slotIndex = slots.findIndex((slot) => {
      return slot.time === appointmentTime;
    });

    if (slotIndex < 0) {
      return;
    }

    const slotHistoricalAppointments = slots[slotIndex].historicalAppointments || [];

    slots[slotIndex] = {
      ...slots[slotIndex],
      historicalAppointments: [
        ...slotHistoricalAppointments,
        appointment
      ]
    };
  });

  return slots;
}

export function calculateAgendaSummary(
  slots: ProfessionalAgendaTimeSlot[]
): ProfessionalAgendaSummary {
  return slots.reduce<ProfessionalAgendaSummary>(
    (summary, slot) => {
      if (slot.status === 'free') {
        summary.free += 1;
      }

      if (slot.status === 'blocked') {
        summary.blocked += 1;
      }

      if (slot.appointment?.status === 'confirmed' && slot.status === 'booked') {
        summary.confirmed += 1;
      }

      if (slot.appointment?.status === 'scheduled' && slot.status === 'booked') {
        summary.notConfirmed += 1;
      }

      if (slot.appointment?.status === 'attending' && slot.status === 'booked') {
        summary.attending += 1;
      }

      if (slot.appointment?.status === 'absent' && slot.status === 'booked') {
        summary.absent += 1;
      }

      summary.absent += (slot.historicalAppointments || []).filter((appointment) => {
        return appointment.status === 'absent';
      }).length;

      return summary;
    },
    {
      confirmed: 0,
      notConfirmed: 0,
      attending: 0,
      absent: 0,
      free: 0,
      blocked: 0
    }
  );
}

export function buildProfessionalAgendaCalendarDays({
  currentMonthDate,
  professional,
  services,
  appointments,
  dayOverrides = [],
  blockedIntervals = [],
  extraTimes = []
}: ProfessionalAgendaCalendarInput): ProfessionalAgendaCalendarDay[] {
  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const calendarStart = new Date(firstDayOfMonth);
  calendarStart.setDate(firstDayOfMonth.getDate() - firstDayOfMonth.getDay());

  const today = getTodayDateStr();
  const days: ProfessionalAgendaCalendarDay[] = [];

  for (let index = 0; index < 42; index += 1) {
    const date = new Date(calendarStart);
    date.setDate(calendarStart.getDate() + index);

    const dateStr = formatLocalDateStr(date);
    const isCurrentMonth = date.getMonth() === month;

    const slots = generateProfessionalAgendaSlots({
      professional,
      services,
      appointments,
      selectedDate: dateStr,
      dayOverrides,
      blockedIntervals,
      extraTimes
    });

    const freeSlots = slots.filter((slot) => slot.status === 'free').length;
    const totalAppointments = slots.filter((slot) => slot.status === 'booked').length;

    let status: ProfessionalAgendaCalendarDay['status'] = 'closed';

    if (freeSlots > 0 && totalAppointments > 0) {
      status = 'partial';
    } else if (freeSlots > 0) {
      status = 'open';
    } else if (totalAppointments > 0) {
      status = 'full';
    }

    days.push({
      dateStr,
      dayNumber: date.getDate(),
      weekDayLabel: WEEK_DAY_LABELS[date.getDay()],
      isCurrentMonth,
      isToday: dateStr === today,
      status,
      totalAppointments,
      freeSlots
    });
  }

  return days;
}

export function buildConfirmWhatsAppUrl(params: {
  clientPhone: string;
  clientName: string;
  professionalName: string;
  serviceName: string;
  dateStr: string;
  time: string;
}): string {
  const {
    clientPhone,
    clientName,
    professionalName,
    serviceName,
    dateStr,
    time
  } = params;

  const firstName = professionalName.split(' ')[0];

  const message = `Olá ${clientName}! Aqui é ${firstName}. Passando para confirmar seu horário em ${formatDateBr(dateStr)} às ${time} para ${serviceName}. Podemos confirmar?`;

  return `https://api.whatsapp.com/send?phone=55${clientPhone}&text=${encodeURIComponent(message)}`;
}