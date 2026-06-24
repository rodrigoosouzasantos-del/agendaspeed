/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type RemunerationType = 'commission_percent' | 'commission_fixed' | 'chair_rental' | 'no_commission' | 'mixed';

export type ProfessionalPermissionsClass = 'yes' | 'no' | 'only_available' | 'with_approval';

export interface ProfessionalPermissions {
  viewOwnCalendar: boolean;
  createAppts: boolean;
  rescheduleAppts: boolean;
  cancelAppts: boolean;
  blockCalendar: boolean;
  openSpots: boolean;
  viewFinancial: boolean;
  viewCommission: boolean;
  viewChairRental: boolean;
  manageOwnCalendar: ProfessionalPermissionsClass;
}

export interface Professional {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: string;
  displayOrder?: number;
  avatar: string;
  active: boolean;
  workDays: number[]; // 0 for Sunday, 1 Monday, etc.
  workHoursStart: string; // "09:00"
  workHoursEnd: string; // "19:00"
  lunchStart: string; // "12:00"
  lunchEnd: string; // "13:00"
  noLunchBreak?: boolean; // true quando o profissional não possui intervalo fixo de almoço
  defaultAppointmentDuration?: number; // tempo padrão da grade do profissional em minutos
  services: string[]; // Service IDs
  remType: RemunerationType;
  remValue: number; // Percentage or fixed value
  chairRentalValue: number; // Monthly chair rental if applicable
  chairRentalStatus: 'active' | 'inactive';
  permissions: ProfessionalPermissions;
}

export type AppointmentStatus = 'scheduled' | 'confirmed' | 'attending' | 'completed' | 'cancelled' | 'absent' | 'rescheduled';

export type PaymentType = 'dinheiro' | 'pix' | 'debito' | 'credito' | 'pendente' | 'cortesia';

export interface Appointment {
  id: string;
  dateTime: string; // "YYYY-MM-DDTHH:mm"
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  serviceId: string;
  professionalId: string;
  price: number;
  status: AppointmentStatus;
  paymentType: PaymentType;
  notes: string;
  commissionPaid: boolean;
  commissionValue: number;
  depositPaid: boolean;
}



export type ReceiptStatus = 'paid' | 'cancelled';

export type ReceiptItemType = 'appointment' | 'extra' | 'manual';

export interface ReceiptItem {
  id: string;
  receiptId: string;
  appointmentId?: string;
  serviceId: string;
  serviceName: string;
  professionalId: string;
  professionalName: string;
  price: number;
  commissionValue: number;
  itemType: ReceiptItemType;
}

export interface Receipt {
  id: string;
  clientId?: string;
  clientName: string;
  clientPhone: string;
  appointmentId?: string;
  items: ReceiptItem[];
  paymentType: PaymentType;
  status: ReceiptStatus;
  subtotal: number;
  discountValue: number;
  totalAmount: number;
  notes?: string;
  paidAt: string;
  createdAt: string;
}

export type CashExpenseStatus = 'paid' | 'cancelled';

export interface CashExpense {
  id: string;
  description: string;
  amount: number;
  paymentType: PaymentType;
  status: CashExpenseStatus;
  notes?: string;
  paidAt: string;
  createdAt: string;
}

export interface Service {
  id: string;
  name: string;
  category: string; // "Cabelo" | "Barba" | "Unhas" | etc.
  duration: number; // In minutes
  price: number;
  description: string;
  professionals: string[]; // Professional IDs
  specificCommission: number | null; // Null uses professional's default commission
  requireDeposit: boolean;
  depositValue: number | null; // Fixed or pct required to book
  active: boolean;
}

export interface Client {
  id: string;
  internalCode?: string;
  name: string;
  phone: string;
  phoneNormalized?: string;
  phoneHistory?: string[];
  email?: string;
  birthDate?: string; // "YYYY-MM-DD"
  preferredProfessionalId: string | null;
  notes: string;
  absences: number;
  cancellations: number;
  totalSpent: number;
}

export interface EstablishmentConfig {
  name: string;
  logo: string;
  coverImage: string;
  address: string;
  phone: string;
  instagram: string;
  workDays: number[]; // e.g., [1, 2, 3, 4, 5, 6]
  workHoursStart: string; // "08:00"
  workHoursEnd: string; // "20:00"
  minLeadTimeMinutes: number; // e.g. 60
  maxFutureDays: number; // e.g. 30
  cancellationPolicy: string;
  autoApprove: boolean;
  requireDepositGlobal: boolean;
  defaultMsgTemplate: string;
}
