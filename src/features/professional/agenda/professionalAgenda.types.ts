import {
  Appointment,
  AppointmentStatus,
  Professional,
  Service
} from '../../../types';

export type ProfessionalAgendaSlotStatus =
  | 'free'
  | 'booked'
  | 'occupied'
  | 'blocked'
  | 'closed'
  | 'lunch';

export type ProfessionalAgendaDayStatus =
  | 'open'
  | 'closed'
  | 'partial'
  | 'full';

export type ProfessionalAgendaDayOverrideStatus =
  | 'open'
  | 'closed';

export type ProfessionalAgendaAdjustmentType =
  | 'blocked'
  | 'extra';

export interface ProfessionalAgendaDayOverride {
  id: string;
  professionalId: string;
  date: string;
  status: ProfessionalAgendaDayOverrideStatus;
}

export interface ProfessionalAgendaBlockedInterval {
  id: string;
  professionalId: string;
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
}

export interface ProfessionalAgendaExtraTime {
  id: string;
  professionalId: string;
  date: string;
  time: string;
}

export interface ProfessionalAgendaTimeSlot {
  id: string;
  time: string;
  endTime: string;
  status: ProfessionalAgendaSlotStatus;
  label: string;
  appointment?: Appointment;
  service?: Service;
  occupiedByAppointmentId?: string;
  blockReason?: string;
}

export interface ProfessionalAgendaCalendarDay {
  dateStr: string;
  dayNumber: number;
  weekDayLabel: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  status: ProfessionalAgendaDayStatus;
  totalAppointments: number;
  freeSlots: number;
}

export interface ProfessionalAgendaSummary {
  confirmed: number;
  notConfirmed: number;
  attending: number;
  absent: number;
  free: number;
  blocked: number;
}

export interface ProfessionalCalendarAgendaViewProps {
  professional: Professional;
  services: Service[];
  appointments: Appointment[];
  selectedDate: string;
  onChangeSelectedDate: (date: string) => void;
  onOpenManualAppointmentAtDateTime?: (
    date: string,
    time: string
  ) => void;
  onModifyAppointment: (
    appointmentId: string,
    updates: Partial<Appointment>
  ) => void;
  professionalAccessToken?: string;
}

export interface ProfessionalAgendaMonthCalendarProps {
  currentMonthDate: Date;
  selectedDate: string;
  calendarDays: ProfessionalAgendaCalendarDay[];
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onSelectDate: (date: string) => void;
}

export interface ProfessionalAgendaDayViewProps {
  professional: Professional;
  selectedDate: string;
  summary: ProfessionalAgendaSummary;
  timeSlots: ProfessionalAgendaTimeSlot[];
  onOpenDay: () => void;
  onCloseDay: () => void;
  onBlockInterval: () => void;
  onAddExtraTime: () => void;
  onOpenManualAppointmentAtDateTime?: (
    date: string,
    time: string
  ) => void;
  onModifyAppointment: (
    appointmentId: string,
    updates: Partial<Appointment>
  ) => void;
  professionalAccessToken?: string;
}

export interface ProfessionalAgendaSlotRowProps {
  slot: ProfessionalAgendaTimeSlot;
  professional: Professional;
  selectedDate: string;
  onBlockTime: (time: string) => void;
  onReleaseTime: (time: string) => void;
  onAddManualAppointmentAtTime: (time: string) => void;
  onModifyAppointment: (
    appointmentId: string,
    updates: Partial<Appointment>
  ) => void;
  professionalAccessToken?: string;
}

export interface ProfessionalAgendaBlockIntervalForm {
  startTime: string;
  endTime: string;
  reason: string;
}

export interface ProfessionalAgendaExtraTimeForm {
  time: string;
}

export interface ProfessionalAgendaGeneratedSlotInput {
  professional: Professional;
  services: Service[];
  appointments: Appointment[];
  selectedDate: string;
  dayOverrides?: ProfessionalAgendaDayOverride[];
  blockedIntervals?: ProfessionalAgendaBlockedInterval[];
  extraTimes?: ProfessionalAgendaExtraTime[];
  slotMinutes?: number;
}

export interface ProfessionalAgendaCalendarInput {
  currentMonthDate: Date;
  selectedDate: string;
  professional: Professional;
  services: Service[];
  appointments: Appointment[];
  dayOverrides?: ProfessionalAgendaDayOverride[];
  blockedIntervals?: ProfessionalAgendaBlockedInterval[];
  extraTimes?: ProfessionalAgendaExtraTime[];
}

export interface ProfessionalAgendaStatusOption {
  value: AppointmentStatus;
  label: string;
}