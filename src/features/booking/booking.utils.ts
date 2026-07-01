/**
 * Funções auxiliares do fluxo público de agendamento - AgendaZap.
 *
 * Este arquivo concentra regras de:
 * - categorias de serviços;
 * - filtro de serviços;
 * - profissionais disponíveis;
 * - geração de datas;
 * - geração de horários;
 * - verificação de conflitos;
 * - cálculo de comissão;
 * - mensagem de WhatsApp.
 */

import {
  Appointment,
  EstablishmentConfig,
  Professional,
  Service
} from '../../types';

import {
  BookingDateOption,
  BookingScheduleDay,
  BookingTimeSlot
} from './booking.types';

const PT_WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const PT_MONTHS = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez'
];

const DEFAULT_SLOT_INTERVAL_MINUTES = 30;
const DEFAULT_SERVICE_DURATION_MINUTES = 30;

const DEFAULT_TIME_SLOTS = [
  '08:00',
  '08:30',
  '09:00',
  '09:30',
  '10:00',
  '10:30',
  '11:00',
  '11:30',
  '12:00',
  '12:30',
  '13:00',
  '13:30',
  '14:00',
  '14:30',
  '15:00',
  '15:30',
  '16:00',
  '16:30',
  '17:00',
  '17:30',
  '18:00',
  '18:30'
];

function padDatePart(value: number): string {
  return String(value).padStart(2, '0');
}

export function getLocalDateStr(date = new Date()): string {
  const year = date.getFullYear();
  const month = padDatePart(date.getMonth() + 1);
  const day = padDatePart(date.getDate());

  return `${year}-${month}-${day}`;
}


function addDaysToDate(date: Date, days: number): Date {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function getRelativeDateStr(daysFromToday: number): string {
  return getLocalDateStr(addDaysToDate(new Date(), daysFromToday));
}

function getMinutesFromTime(time: string): number {
  const [hours, minutes] = String(time || '').split(':').map(Number);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return 0;
  }

  return (hours * 60) + minutes;
}

function getCurrentMinutes(): number {
  const now = new Date();

  return (now.getHours() * 60) + now.getMinutes();
}

function getTimeFromMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${padDatePart(hours)}:${padDatePart(minutes)}`;
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

function normalizeWorkDays(workDays: unknown): number[] {
  if (!Array.isArray(workDays)) {
    return [];
  }

  return workDays
    .map(Number)
    .filter((day) => Number.isInteger(day))
    .map((day) => {
      if (day === 7) {
        return 0;
      }

      return day;
    })
    .filter((day) => day >= 0 && day <= 6);
}

function getProfessionalWorkDays(professional: Professional | null): number[] {
  if (!professional) {
    return [];
  }

  return normalizeWorkDays(
    readRecordValue(professional, [
      'workDays',
      'work_days',
      'workingDays',
      'working_days'
    ])
  );
}

function getProfessionalStringValue(
  professional: Professional | null,
  keys: string[],
  fallback: string
): string {
  const value = readRecordValue(professional, keys);

  if (!value) {
    return fallback;
  }

  return String(value).slice(0, 5);
}

function getProfessionalWorkHoursStart(professional: Professional | null): string {
  return getProfessionalStringValue(
    professional,
    ['workHoursStart', 'work_hours_start', 'startTime', 'start_time'],
    '09:00'
  );
}

function getProfessionalWorkHoursEnd(professional: Professional | null): string {
  return getProfessionalStringValue(
    professional,
    ['workHoursEnd', 'work_hours_end', 'endTime', 'end_time'],
    '19:00'
  );
}

function getProfessionalLunchStart(professional: Professional | null): string {
  return getProfessionalStringValue(
    professional,
    ['lunchStart', 'lunch_start'],
    '12:00'
  );
}

function getProfessionalLunchEnd(professional: Professional | null): string {
  return getProfessionalStringValue(
    professional,
    ['lunchEnd', 'lunch_end'],
    '13:00'
  );
}

function getPositiveNumberFromRecord(
  source: unknown,
  keys: string[],
  fallback: number
): number {
  const value = Number(readRecordValue(source, keys));

  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function getProfessionalDefaultAppointmentDuration(
  professional: Professional | null
): number {
  return getPositiveNumberFromRecord(
    professional,
    [
      'defaultAppointmentDuration',
      'defaultAppointmentDurationMinutes',
      'default_appointment_duration',
      'default_appointment_duration_minutes',
      'appointmentDuration',
      'appointment_duration'
    ],
    DEFAULT_SLOT_INTERVAL_MINUTES
  );
}

function getServiceDurationMinutes(
  service: Service | null | undefined,
  professional: Professional | null
): number {
  const professionalFallback = getProfessionalDefaultAppointmentDuration(professional);

  return getPositiveNumberFromRecord(
    service,
    [
      'duration',
      'durationMinutes',
      'duration_minutes',
      'serviceDuration',
      'service_duration'
    ],
    professionalFallback || DEFAULT_SERVICE_DURATION_MINUTES
  );
}

function getServiceId(service: Service | null | undefined): string {
  const value = readRecordValue(service, ['id', 'service_id']);

  return value ? String(value) : '';
}

function getAppointmentServiceId(appointment: Appointment): string {
  const value = readRecordValue(appointment, ['serviceId', 'service_id']);

  return value ? String(value) : '';
}

function getAppointmentProfessionalId(appointment: Appointment): string {
  const value = readRecordValue(appointment, ['professionalId', 'professional_id']);

  return value ? String(value) : '';
}

function getAppointmentDateTime(appointment: Appointment): string {
  const value = readRecordValue(appointment, [
    'dateTime',
    'date_time',
    'starts_at_local',
    'startsAtLocal',
    'starts_at'
  ]);

  return value ? String(value).slice(0, 16) : '';
}

function getAppointmentStatus(appointment: Appointment): string {
  const value = readRecordValue(appointment, ['status']);

  return value ? String(value) : 'scheduled';
}

function findServiceById(params: {
  services: Service[];
  serviceId: string;
}): Service | null {
  const { services, serviceId } = params;

  if (!serviceId) {
    return null;
  }

  return services.find((service) => getServiceId(service) === serviceId) || null;
}

function getAppointmentDurationMinutes(params: {
  appointment: Appointment;
  services: Service[];
  selectedProfessional: Professional | null;
}): number {
  const { appointment, services, selectedProfessional } = params;
  const appointmentRecord = appointment as unknown as Record<string, unknown>;
  const explicitDuration = getPositiveNumberFromRecord(
    appointmentRecord,
    [
      'duration',
      'durationMinutes',
      'duration_minutes',
      'serviceDuration',
      'service_duration'
    ],
    0
  );

  if (explicitDuration > 0) {
    return explicitDuration;
  }

  const appointmentService = findServiceById({
    services,
    serviceId: getAppointmentServiceId(appointment)
  });

  return getServiceDurationMinutes(appointmentService, selectedProfessional);
}

function intervalsOverlap(params: {
  firstStart: number;
  firstEnd: number;
  secondStart: number;
  secondEnd: number;
}): boolean {
  const {
    firstStart,
    firstEnd,
    secondStart,
    secondEnd
  } = params;

  return firstStart < secondEnd && secondStart < firstEnd;
}

export function professionalHasNoLunchBreak(professional: Professional): boolean {
  const value = readRecordValue(professional, [
    'noLunchBreak',
    'hasNoLunchBreak',
    'withoutLunchBreak',
    'no_lunch_break',
    'has_no_lunch_break',
    'without_lunch_break'
  ]);

  return value === true;
}

export function isProfessionalWorkingOnDate(params: {
  professional: Professional;
  dateStr: string;
}): boolean {
  const { professional, dateStr } = params;

  if (!dateStr) {
    return false;
  }

  const dateObj = new Date(`${dateStr}T00:00:00`);
  const dayOfWeek = dateObj.getDay();
  const workDays = getProfessionalWorkDays(professional);

  return workDays.includes(dayOfWeek);
}

function getProfessionalBaseTimeSlots(professional: Professional | null): string[] {
  if (!professional) {
    return DEFAULT_TIME_SLOTS;
  }

  const startMinutes = getMinutesFromTime(getProfessionalWorkHoursStart(professional));
  const endMinutes = getMinutesFromTime(getProfessionalWorkHoursEnd(professional));
  const intervalMinutes = getProfessionalDefaultAppointmentDuration(professional);

  if (
    !Number.isFinite(startMinutes) ||
    !Number.isFinite(endMinutes) ||
    endMinutes <= startMinutes ||
    intervalMinutes <= 0
  ) {
    return [];
  }

  const slots: string[] = [];

  for (
    let slotMinutes = startMinutes;
    slotMinutes < endMinutes;
    slotMinutes += intervalMinutes
  ) {
    slots.push(getTimeFromMinutes(slotMinutes));
  }

  return slots;
}

export function isPastBookingDate(dateStr: string): boolean {
  const todayStr = getLocalDateStr();

  return dateStr < todayStr;
}

export function isPastBookingDateTime(params: {
  dateStr: string;
  time: string;
}): boolean {
  const { dateStr, time } = params;
  const todayStr = getLocalDateStr();

  if (dateStr < todayStr) {
    return true;
  }

  if (dateStr > todayStr) {
    return false;
  }

  return getMinutesFromTime(time) <= getCurrentMinutes();
}

export function getActiveServiceCategories(services: Service[]): string[] {
  const activeCategories = services
    .filter((service) => service.active)
    .map((service) => service.category);

  return ['Todos', ...Array.from(new Set(activeCategories))];
}

export function filterServicesByCategory(params: {
  services: Service[];
  activeCategory: string;
}): Service[] {
  const { services, activeCategory } = params;

  return services.filter((service) => {
    if (!service.active) {
      return false;
    }

    if (activeCategory === 'Todos') {
      return true;
    }

    return service.category === activeCategory;
  });
}

function getProfessionalDisplayOrder(professional: Professional): number {
  const displayOrder = Number(
    readRecordValue(professional, ['displayOrder', 'display_order'])
  );

  return Number.isFinite(displayOrder) && displayOrder > 0
    ? displayOrder
    : 999;
}

export function getAvailableProfessionalsForService(params: {
  professionals: Professional[];
  selectedService: Service | null;
}): Professional[] {
  const { professionals, selectedService } = params;
  const selectedServiceId = getServiceId(selectedService);

  return professionals
    .filter((professional) => {
      if (!professional.active) {
        return false;
      }

      if (!selectedServiceId) {
        return true;
      }

      const professionalServices = readRecordValue<string[]>(professional, ['services', 'servicesIds', 'services_ids', 'service_ids']) || [];

      return professionalServices.includes(selectedServiceId);
    })
    .sort((firstProfessional, secondProfessional) => {
      const firstOrder = getProfessionalDisplayOrder(firstProfessional);
      const secondOrder = getProfessionalDisplayOrder(secondProfessional);

      if (firstOrder !== secondOrder) {
        return firstOrder - secondOrder;
      }

      return firstProfessional.name.localeCompare(secondProfessional.name, 'pt-BR');
    });
}


export function isProfessionalScheduleDayOpen(params: {
  openDays?: BookingScheduleDay[];
  professional: Professional | null;
  dateStr: string;
}): boolean {
  const {
    openDays = [],
    professional,
    dateStr
  } = params;

  if (!professional || !dateStr) {
    return false;
  }

  return openDays.some((scheduleDay) => {
    return (
      scheduleDay.professionalId === professional.id &&
      scheduleDay.date === dateStr &&
      scheduleDay.status === 'open'
    );
  });
}

export function generateDateOptions(params: {
  config: EstablishmentConfig;
  selectedProfessional: Professional | null;
  selectedService?: Service | null;
  appointments?: Appointment[];
  services?: Service[];
  openDays?: BookingScheduleDay[];
  numberOfDays?: number;
}): BookingDateOption[] {
  const {
    config,
    selectedProfessional,
    selectedService = null,
    appointments = [],
    services = [],
    openDays = [],
    numberOfDays = 30
  } = params;

  const dateOptions: BookingDateOption[] = [];
  const safeNumberOfDays = Math.max(1, Math.min(Number(numberOfDays) || 30, 90));
  const salonWorkDays = normalizeWorkDays(config.workDays);

  for (let index = 0; index < safeNumberOfDays; index += 1) {
    const dateStr = getRelativeDateStr(index);

    if (isPastBookingDate(dateStr)) {
      continue;
    }

    const dateObj = new Date(`${dateStr}T00:00:00`);
    const dayOfWeek = dateObj.getDay();

    const isWorkingDay = selectedProfessional
      ? isProfessionalWorkingOnDate({
          professional: selectedProfessional,
          dateStr
        })
      : salonWorkDays.length === 0 || salonWorkDays.includes(dayOfWeek);

    if (!isWorkingDay) {
      const isOpenException = isProfessionalScheduleDayOpen({
        openDays,
        professional: selectedProfessional,
        dateStr
      });

      if (!isOpenException) {
        continue;
      }
    }

    if (
      selectedProfessional &&
      !isProfessionalScheduleDayOpen({
        openDays,
        professional: selectedProfessional,
        dateStr
      })
    ) {
      continue;
    }

    const availableTimes = selectedProfessional
      ? generateTimeSlots({
          appointments,
          selectedProfessional,
          selectedService,
          services,
          openDays,
          selectedDate: dateStr
        })
      : [];

    if (selectedProfessional && availableTimes.length === 0) {
      continue;
    }

    dateOptions.push({
      dateStr,
      dayOfWeekStr: PT_WEEK_DAYS[dayOfWeek],
      label: `${dateObj.getDate()} de ${PT_MONTHS[dateObj.getMonth()]}`
    });
  }

  return dateOptions;
}

export function hasAppointmentConflict(params: {
  appointments: Appointment[];
  professionalId: string;
  selectedDate: string;
  selectedTime: string;
  selectedService?: Service | null;
  selectedProfessional?: Professional | null;
  services?: Service[];
}): boolean {
  const {
    appointments,
    professionalId,
    selectedDate,
    selectedTime,
    selectedService = null,
    selectedProfessional = null,
    services = []
  } = params;

  const selectedStartMinutes = getMinutesFromTime(selectedTime);
  const selectedDurationMinutes = getServiceDurationMinutes(
    selectedService,
    selectedProfessional
  );
  const selectedEndMinutes = selectedStartMinutes + selectedDurationMinutes;

  return appointments.some((appointment) => {
    const appointmentStatus = getAppointmentStatus(appointment);

    if (
      appointmentStatus === 'cancelled' ||
      appointmentStatus === 'absent' ||
      appointmentStatus === 'rescheduled'
    ) {
      return false;
    }

    const appointmentDateTime = getAppointmentDateTime(appointment);

    if (!appointmentDateTime) {
      return false;
    }

    const appointmentDate = appointmentDateTime.split('T')[0];
    const appointmentTime = appointmentDateTime.split('T')[1]?.slice(0, 5) || '';

    if (
      getAppointmentProfessionalId(appointment) !== professionalId ||
      appointmentDate !== selectedDate ||
      !appointmentTime
    ) {
      return false;
    }

    const appointmentStartMinutes = getMinutesFromTime(appointmentTime);
    const appointmentDurationMinutes = getAppointmentDurationMinutes({
      appointment,
      services,
      selectedProfessional
    });
    const appointmentEndMinutes = appointmentStartMinutes + appointmentDurationMinutes;

    return intervalsOverlap({
      firstStart: selectedStartMinutes,
      firstEnd: selectedEndMinutes,
      secondStart: appointmentStartMinutes,
      secondEnd: appointmentEndMinutes
    });
  });
}

export function isTimeInsideProfessionalWorkingHours(params: {
  time: string;
  professional: Professional;
  selectedService?: Service | null;
}): boolean {
  const {
    time,
    professional,
    selectedService = null
  } = params;

  const startMinutes = getMinutesFromTime(time);
  const serviceDuration = getServiceDurationMinutes(selectedService, professional);
  const endMinutes = startMinutes + serviceDuration;
  const worksStart = getMinutesFromTime(getProfessionalWorkHoursStart(professional));
  const worksEnd = getMinutesFromTime(getProfessionalWorkHoursEnd(professional));

  return startMinutes >= worksStart && endMinutes <= worksEnd;
}

export function isTimeInsideLunchInterval(params: {
  time: string;
  professional: Professional;
  selectedService?: Service | null;
}): boolean {
  const {
    time,
    professional,
    selectedService = null
  } = params;

  if (professionalHasNoLunchBreak(professional)) {
    return false;
  }

  const lunchStart = getProfessionalLunchStart(professional);
  const lunchEnd = getProfessionalLunchEnd(professional);

  if (!lunchStart || !lunchEnd || lunchStart === lunchEnd) {
    return false;
  }

  const startMinutes = getMinutesFromTime(time);
  const serviceDuration = getServiceDurationMinutes(selectedService, professional);
  const endMinutes = startMinutes + serviceDuration;
  const lunchStartMinutes = getMinutesFromTime(lunchStart);
  const lunchEndMinutes = getMinutesFromTime(lunchEnd);

  return intervalsOverlap({
    firstStart: startMinutes,
    firstEnd: endMinutes,
    secondStart: lunchStartMinutes,
    secondEnd: lunchEndMinutes
  });
}

export function generateTimeSlots(params: {
  appointments: Appointment[];
  selectedProfessional: Professional | null;
  selectedDate: string;
  selectedService?: Service | null;
  services?: Service[];
  openDays?: BookingScheduleDay[];
}): string[] {
  const {
    appointments,
    selectedProfessional,
    selectedDate,
    selectedService = null,
    services = [],
    openDays = []
  } = params;

  if (
    selectedProfessional &&
    !isProfessionalWorkingOnDate({
      professional: selectedProfessional,
      dateStr: selectedDate
    }) &&
    !isProfessionalScheduleDayOpen({
      openDays,
      professional: selectedProfessional,
      dateStr: selectedDate
    })
  ) {
    return [];
  }

  if (
    selectedProfessional &&
    !isProfessionalScheduleDayOpen({
      openDays,
      professional: selectedProfessional,
      dateStr: selectedDate
    })
  ) {
    return [];
  }

  return getProfessionalBaseTimeSlots(selectedProfessional).filter((time) => {
    if (!selectedDate) {
      return false;
    }

    if (
      isPastBookingDateTime({
        dateStr: selectedDate,
        time
      })
    ) {
      return false;
    }

    if (!selectedProfessional) {
      return true;
    }

    if (
      !isTimeInsideProfessionalWorkingHours({
        time,
        professional: selectedProfessional,
        selectedService
      })
    ) {
      return false;
    }

    if (
      isTimeInsideLunchInterval({
        time,
        professional: selectedProfessional,
        selectedService
      })
    ) {
      return false;
    }

    const hasConflict = hasAppointmentConflict({
      appointments,
      professionalId: selectedProfessional.id,
      selectedDate,
      selectedTime: time,
      selectedService,
      selectedProfessional,
      services
    });

    return !hasConflict;
  });
}

export function generateTimeSlotObjects(params: {
  appointments: Appointment[];
  selectedProfessional: Professional | null;
  selectedDate: string;
  selectedService?: Service | null;
  services?: Service[];
  openDays?: BookingScheduleDay[];
}): BookingTimeSlot[] {
  const availableTimes = generateTimeSlots(params);

  return availableTimes.map((time) => ({
    time,
    available: true
  }));
}

export function calculateBookingCommission(params: {
  selectedService: Service;
  selectedProfessional: Professional;
}): number {
  const { selectedService, selectedProfessional } = params;

  if (selectedProfessional.remType === 'commission_fixed') {
    return selectedProfessional.remValue;
  }

  if (selectedProfessional.remType === 'commission_percent') {
    return (selectedService.price * selectedProfessional.remValue) / 100;
  }

  return 0;
}

export function buildBookingWhatsAppUrl(params: {
  config: EstablishmentConfig;
  selectedService: Service | null;
  selectedProfessional: Professional | null;
  selectedDate: string;
  selectedTime: string;
  clientName: string;
}): string {
  const {
    config,
    selectedService,
    selectedProfessional,
    selectedDate,
    selectedTime,
    clientName
  } = params;

  const phone = String(config.phone || '').replace(/\D/g, '');

  if (!phone) {
    return '';
  }

  const serviceName = selectedService?.name || 'Serviço não informado';
  const professionalName = selectedProfessional?.name || 'Profissional não informado';

  const message = `Olá! Sou ${clientName || 'cliente'} e acabei de agendar pelo AgendaZap.%0A%0A` +
    `Serviço: ${serviceName}%0A` +
    `Profissional: ${professionalName}%0A` +
    `Data: ${selectedDate}%0A` +
    `Horário: ${selectedTime}%0A` +
    `Endereço: ${config.address || 'Endereço não informado'}`;

  return `https://wa.me/55${phone}?text=${message}`;
}
