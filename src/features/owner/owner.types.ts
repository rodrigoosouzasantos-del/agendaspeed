/**
 * Tipos internos do módulo do Painel do Dono - AgendaZap.
 *
 * Este arquivo centraliza os tipos usados apenas na área administrativa
 * do proprietário, evitando que o OwnerDashboard.tsx concentre tudo.
 */

import { LocalState } from '../../data';
import {
  Appointment,
  AppointmentStatus,
  Client,
  EstablishmentConfig,
  PaymentType,
  Professional,
  ProfessionalPermissionsClass,
  RemunerationType,
  Service,
  Receipt
} from '../../types';

export interface OwnerDashboardProps {
  state: LocalState;
  onUpdateState: (newState: LocalState) => void;
  onNavigateToClient: () => void;
  onLogOut: () => void;
}

export type OwnerTab =
  | 'painel'
  | 'agenda'
  | 'profissionais'
  | 'servicos'
  | 'clientes'
  | 'recebimentos'
  | 'financeiro'
  | 'configuracoes';

export type CalendarView = 'today' | 'week' | 'all';

export type FilterValue = string;

export interface OwnerDashboardState {
  config: EstablishmentConfig;
  professionals: Professional[];
  services: Service[];
  clients: Client[];
  appointments: Appointment[];
  receipts?: Receipt[];
}

export interface OwnerFinancialSummary {
  completedAppointments: Appointment[];
  todayAppointments: Appointment[];
  completedToday: Appointment[];
  totalReceivedToday: number;
  totalReceivedMonth: number;
  totalCommissionsMonth: number;
  activeProfessionalsCount: number;
  clientAbsencesCount: number;
}

export interface AppointmentFormState {
  clientName: string;
  clientPhone: string;
  serviceId: string;
  professionalId: string;
  date: string;
  time: string;
  notes: string;
  paymentType: PaymentType;
}

export interface ProfessionalFormState {
  name: string;
  phone: string;
  email: string;
  role: string;
  avatar: string;
  active: boolean;
  workDays: number[];
  workHoursStart: string;
  workHoursEnd: string;
  lunchStart: string;
  lunchEnd: string;
  servicesIds: string[];
  remunerationType: RemunerationType;
  remunerationValue: number;
  chairRentalValue: number;
}

export interface ServiceFormState {
  name: string;
  category: string;
  categoryOrder: number;
  displayOrder: number;
  duration: number;
  price: number;
  description: string;
  active: boolean;
  requireDeposit: boolean;
  depositValue: number;
}

export interface CompanyConfigFormState {
  name: string;
  address: string;
  phone: string;
  instagram: string;
  autoApprove: boolean;
  defaultMsgTemplate: string;
}

export interface AppointmentStatusOption {
  value: AppointmentStatus;
  label: string;
}

export interface CalendarViewOption {
  value: CalendarView;
  label: string;
}

export interface OwnerTabOption {
  value: OwnerTab;
  label: string;
}

export interface PermissionModalState {
  professional: Professional | null;
}

export interface ProfessionalPermissionUpdatePayload {
  professionalId: string;
  flag: keyof Professional['permissions'];
}

export interface ProfessionalPermissionClassUpdatePayload {
  professionalId: string;
  value: ProfessionalPermissionsClass;
}

export interface OwnerModuleHandlers {
  setActiveTab: (tab: OwnerTab) => void;
  setCalendarView: (view: CalendarView) => void;
}

export interface AppointmentStatusChangePayload {
  appointmentId: string;
  destinationStatus: AppointmentStatus;
}

export interface ServiceCategoryOrderOption {
  name: string;
  order: number;
}
