/**
 * Painel do Dono - AgendaZap.
 *
 * Este arquivo coordena o módulo administrativo do proprietário.
 * Ele não deve concentrar telas grandes nem modais.
 *
 * Responsabilidades:
 * - controlar estado ativo das abas;
 * - controlar filtros;
 * - controlar abertura/fechamento de modais;
 * - executar handlers de CRUD local;
 * - chamar views e modais separados.
 */

import React, { useEffect, useRef, useState } from "react";

import {
  Appointment,
  AppointmentStatus,
  EstablishmentConfig,
  PaymentType,
  Professional,
  ProfessionalPermissionsClass,
  RemunerationType,
  Service,
  Client,
  Receipt,
  ReceiptItem,
  CashExpense,
} from "../../types";

import { CalendarView, OwnerDashboardProps, OwnerTab } from "./owner.types";

import {
  calculateCommissionValue,
  calculateOwnerFinancialSummary,
  filterAppointments,
  filterClients,
  updateClientsAfterAppointmentStatusChange,
  upsertClientFromAppointment,
} from "./owner.utils";

import OwnerHeader from "./components/OwnerHeader";
import OwnerSidebar from "./components/OwnerSidebar";
import DashboardHomeView from "./components/DashboardHomeView";
import AgendaView from "./components/AgendaView";
import ProfessionalsView from "./components/ProfessionalsView";
import ServicesView, { ServiceActionResult } from "./components/ServicesView";
import ClientsView from "./components/ClientsView";
import FinanceView from "./components/FinanceView";
import ReceiptsView, {
  ReceiptDraftItem,
  ReceiptPayload,
} from "./components/ReceiptsView";
import SettingsView from "./components/SettingsView";
import { supabase } from "../../lib/supabase";
import { prepareImageForStorage } from "../../lib/imageUpload";

import AppointmentModal from "./modals/AppointmentModal";
import ProfessionalModal from "./modals/ProfessionalModal";
import ServiceModal from "./modals/ServiceModal";
import PermissionsModal from "./modals/PermissionsModal";

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function normalizeClientPhone(value: string): string {
  const digits = onlyDigits(value);

  if (digits.startsWith("55") && digits.length > 11) {
    return digits.slice(2);
  }

  return digits;
}

function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

type TenantSettingsResponse = {
  tenant_id: string;
  name: string;
  address: string;
  phone: string;
  whatsapp: string;
  instagram: string;
  logo_url: string;
  cover_url: string;
  default_msg_template: string;
  booking_min_lead_time_minutes: number;
  booking_min_cancel_lead_time_minutes: number;
  booking_min_reschedule_lead_time_minutes: number;
  booking_allow_client_confirmation: boolean;
  booking_allow_client_cancellation: boolean;
  booking_allow_client_reschedule: boolean;
  booking_slot_interval_minutes: number;
  booking_max_future_days: number;
  booking_work_hours_start: string;
  booking_work_hours_end: string;
  booking_lunch_start: string;
  booking_lunch_end: string;
};

interface SettingsViewMediaFiles {
  logoFile: File | null;
  coverFile: File | null;
}

async function legacyDataUrlToPreparedImage(params: {
  dataUrl: string;
  maxWidth: number;
  maxHeight: number;
  maxOutputBytes: number;
  outputFileName: string;
}): Promise<File> {
  const {
    dataUrl,
    maxWidth,
    maxHeight,
    maxOutputBytes,
    outputFileName,
  } = params;

  const response = await fetch(dataUrl);

  if (!response.ok) {
    throw new Error('Não foi possível ler a imagem antiga salva em Base64.');
  }

  const blob = await response.blob();
  const sourceFile = new File(
    [blob],
    outputFileName,
    { type: blob.type || 'image/jpeg' },
  );

  return prepareImageForStorage(sourceFile, {
    maxWidth,
    maxHeight,
    maxOutputBytes,
    outputFileName,
  });
}

async function uploadTenantPublicImage(params: {
  bucket: 'tenant-logos' | 'tenant-covers' | 'professional-avatars';
  path: string;
  file: File;
}): Promise<string> {
  const { bucket, path, file } = params;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      contentType: 'image/webp',
      upsert: true,
    });

  if (uploadError) {
    throw new Error(uploadError.message || 'Não foi possível enviar a imagem.');
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);

  if (!data.publicUrl) {
    throw new Error('A imagem foi enviada, mas a URL pública não foi gerada.');
  }

  return `${data.publicUrl}?v=${Date.now()}`;
}

function mapTenantSettingsToConfig(
  currentConfig: EstablishmentConfig,
  settings: TenantSettingsResponse,
): EstablishmentConfig {
  return {
    ...currentConfig,
    name: settings.name || currentConfig.name,
    address: settings.address || currentConfig.address,
    phone: settings.phone || settings.whatsapp || currentConfig.phone,
    instagram: settings.instagram || currentConfig.instagram,
    logo: settings.logo_url || currentConfig.logo,
    coverImage: settings.cover_url || currentConfig.coverImage,
    defaultMsgTemplate:
      settings.default_msg_template || currentConfig.defaultMsgTemplate,
    minLeadTimeMinutes: Number(
      settings.booking_min_lead_time_minutes ??
        currentConfig.minLeadTimeMinutes ??
        0,
    ),
    maxFutureDays: Number(
      settings.booking_max_future_days ?? currentConfig.maxFutureDays ?? 14,
    ),
    workHoursStart:
      settings.booking_work_hours_start ||
      currentConfig.workHoursStart ||
      "08:00",
    workHoursEnd:
      settings.booking_work_hours_end || currentConfig.workHoursEnd || "19:00",
  };
}

type SupabaseProfessionalResponse = {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: string;
  display_order: number;
  avatar: string;
  active: boolean;
  work_days: number[];
  work_hours_start: string;
  work_hours_end: string;
  lunch_start: string;
  lunch_end: string;
  no_lunch_break?: boolean;
  has_no_lunch_break?: boolean;
  without_lunch_break?: boolean;
  noLunchBreak?: boolean;
  default_appointment_duration?: number;
  default_appointment_duration_minutes?: number;
  defaultAppointmentDuration?: number;
  defaultAppointmentDurationMinutes?: number;
  services: string[];
  rem_type: RemunerationType | string;
  rem_value: number;
  chair_rental_value: number;
  chair_rental_status: "active" | "inactive" | string;
  permissions: Professional["permissions"] | null;
};

const defaultProfessionalPermissions: Professional["permissions"] = {
  viewOwnCalendar: true,
  createAppts: true,
  rescheduleAppts: true,
  cancelAppts: true,
  blockCalendar: false,
  openSpots: true,
  viewFinancial: true,
  viewCommission: true,
  viewChairRental: false,
  manageOwnCalendar: "yes",
};

function normalizeProfessionalPermissions(
  permissions: Professional["permissions"] | null | undefined,
): Professional["permissions"] {
  return {
    ...defaultProfessionalPermissions,
    ...(permissions || {}),
    viewChairRental: false,
  };
}

function normalizeProfessionalTime(
  value: string | null | undefined,
  fallback: string,
): string {
  if (!value) return fallback;

  return String(value).slice(0, 5);
}

function mapSupabaseProfessionalToAppProfessional(
  professional: SupabaseProfessionalResponse,
): Professional {
  const normalizedRemType =
    professional.rem_type === "commission_fixed"
      ? "commission_fixed"
      : "commission_percent";

  return {
    id: professional.id,
    name: professional.name || "",
    phone: professional.phone || "",
    email: professional.email || "",
    role: professional.role || "",
    displayOrder: Number(professional.display_order) || 999,
    avatar: professional.avatar || "",
    active: professional.active !== false,
    workDays: Array.isArray(professional.work_days)
      ? professional.work_days
      : [1, 2, 3, 4, 5, 6],
    workHoursStart: normalizeProfessionalTime(
      professional.work_hours_start,
      "09:00",
    ),
    workHoursEnd: normalizeProfessionalTime(
      professional.work_hours_end,
      "19:00",
    ),
    lunchStart: normalizeProfessionalTime(professional.lunch_start, "12:00"),
    lunchEnd: normalizeProfessionalTime(professional.lunch_end, "13:00"),
    noLunchBreak: Boolean(
      professional.no_lunch_break ||
      professional.has_no_lunch_break ||
      professional.without_lunch_break ||
      professional.noLunchBreak,
    ),
    defaultAppointmentDuration:
      Number(
        professional.default_appointment_duration ??
          professional.default_appointment_duration_minutes ??
          professional.defaultAppointmentDuration ??
          professional.defaultAppointmentDurationMinutes ??
          30,
      ) || 30,
    services: Array.isArray(professional.services) ? professional.services : [],
    remType: normalizedRemType as RemunerationType,
    remValue: Number(professional.rem_value) || 0,
    chairRentalValue: Number(professional.chair_rental_value) || 0,
    chairRentalStatus:
      professional.chair_rental_status === "active" ? "active" : "inactive",
    permissions: normalizeProfessionalPermissions(professional.permissions),
  };
}

function buildProfessionalPayload(professional: Professional) {
  return {
    id:
      professional.id && !professional.id.startsWith("prof-")
        ? professional.id
        : null,
    name: professional.name,
    phone: professional.phone,
    email: professional.email || "",
    role: professional.role,
    display_order:
      Number(
        (professional as unknown as Record<string, unknown>).displayOrder,
      ) || 999,
    avatar: professional.avatar || "",
    active: professional.active,
    work_days: professional.workDays,
    work_hours_start: professional.workHoursStart,
    work_hours_end: professional.workHoursEnd,
    lunch_start: professional.lunchStart,
    lunch_end: professional.lunchEnd,
    no_lunch_break: Boolean(professional.noLunchBreak),
    default_appointment_duration:
      Number(professional.defaultAppointmentDuration) || 30,
    services: professional.services,
    rem_type:
      professional.remType === "commission_fixed"
        ? "commission_fixed"
        : "commission_percent",
    rem_value: Number(professional.remValue) || 0,
    chair_rental_value: Number(professional.chairRentalValue) || 0,
    chair_rental_status: professional.chairRentalStatus || "inactive",
    permissions: normalizeProfessionalPermissions(professional.permissions),
  };
}

type SupabaseServiceResponse = {
  id: string;
  name: string;
  category: string;
  category_order: number;
  display_order: number;
  duration: number;
  price: number;
  description: string;
  active: boolean;
  require_deposit: boolean;
  deposit_value: number | null;
};

type SupabaseServiceCategoryResponse = {
  id: string;
  name: string;
  sort_order: number;
  active: boolean;
};

function mapSupabaseServiceToAppService(
  service: SupabaseServiceResponse,
): Service {
  return {
    id: service.id,
    name: service.name || "",
    category: normalizeServiceCategoryName(service.category || "CABELO"),
    categoryOrder: Number(service.category_order) || 999,
    displayOrder: Number(service.display_order) || 999,
    duration: Number(service.duration) || 30,
    price: Number(service.price) || 0,
    description: service.description || "",
    professionals: [],
    specificCommission: null,
    requireDeposit: service.require_deposit === true,
    depositValue: service.require_deposit
      ? Number(service.deposit_value) || 0
      : null,
    active: service.active !== false,
  } as Service;
}

function buildServicePayload(service: Service) {
  return {
    id: service.id && !service.id.startsWith("serv-") ? service.id : null,
    name: service.name,
    category: normalizeServiceCategoryName(service.category),
    category_order: getServiceCategoryOrder(service),
    display_order: getServiceDisplayOrder(service),
    duration: Number(service.duration) || 30,
    price: Number(service.price) || 0,
    description: service.description || "",
    active: service.active !== false,
    require_deposit: service.requireDeposit === true,
    deposit_value: service.requireDeposit
      ? Number(service.depositValue) || 0
      : 0,
  };
}

type SupabaseAppointmentResponse = {
  id: string;
  date_time: string;
  client_name: string;
  client_phone: string;
  client_email: string | null;
  service_id: string;
  professional_id: string;
  price: number;
  status: AppointmentStatus | string;
  payment_type: PaymentType | string | null;
  notes: string | null;
  commission_paid: boolean;
  commission_value: number;
  deposit_paid: boolean;
};

function mapSupabaseAppointmentToAppAppointment(
  appointment: SupabaseAppointmentResponse,
): Appointment {
  const normalizedStatus = [
    "scheduled",
    "confirmed",
    "attending",
    "completed",
    "cancelled",
    "absent",
    "rescheduled",
  ].includes(String(appointment.status))
    ? (appointment.status as AppointmentStatus)
    : "scheduled";

  const normalizedPaymentType = [
    "dinheiro",
    "pix",
    "debito",
    "credito",
    "pendente",
    "cortesia",
  ].includes(String(appointment.payment_type))
    ? (appointment.payment_type as PaymentType)
    : "pendente";

  return {
    id: appointment.id,
    dateTime: appointment.date_time,
    clientName: appointment.client_name || "",
    clientPhone: appointment.client_phone || "",
    clientEmail: appointment.client_email || undefined,
    serviceId: appointment.service_id,
    professionalId: appointment.professional_id,
    price: Number(appointment.price) || 0,
    status: normalizedStatus,
    paymentType: normalizedPaymentType,
    notes: appointment.notes || "",
    commissionPaid: appointment.commission_paid === true,
    commissionValue: Number(appointment.commission_value) || 0,
    depositPaid: appointment.deposit_paid === true,
  };
}

const SUPABASE_CLIENTS_SELECT =
  "id,name,phone,email,birth_date,notes,total_spent,client_cancel_count,client_reschedule_count,created_at,updated_at";

type SupabaseClientResponse = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  birth_date: string | null;
  notes: string | null;
  total_spent: number;
  client_cancel_count: number;
  client_reschedule_count: number;
  created_at: string;
  updated_at: string;
};

function mapSupabaseClientToAppClient(client: SupabaseClientResponse): Client {
  const normalizedPhone = normalizeClientPhone(client.phone || "");

  return {
    id: client.id,
    internalCode: `CLI-${String(client.id || normalizedPhone).replace(/\D/g, "").slice(-6).padStart(6, "0")}`,
    name: client.name || "",
    phone: client.phone || "",
    phoneNormalized: normalizedPhone,
    phoneHistory: [],
    email: client.email || undefined,
    birthDate: client.birth_date || undefined,
    preferredProfessionalId: null,
    notes: client.notes || "",
    absences: 0,
    cancellations: Number(client.client_cancel_count) || 0,
    totalSpent: Number(client.total_spent) || 0,
  };
}

const SUPABASE_RECEIPTS_SELECT =
  "id,tenant_id,client_id,appointment_id,client_name,client_phone,payment_type,status,subtotal,discount_value,total_amount,notes,paid_at,created_at,updated_at";

const SUPABASE_RECEIPT_ITEMS_SELECT =
  "id,tenant_id,receipt_id,appointment_id,service_id,service_name,professional_id,professional_name,price,commission_value,item_type,created_at";

const SUPABASE_CASH_EXPENSES_SELECT =
  "id,tenant_id,description,amount,payment_type,expense_date,notes,created_at,updated_at";

type SupabaseReceiptResponse = {
  id: string;
  tenant_id: string;
  client_id: string | null;
  appointment_id: string | null;
  client_name: string;
  client_phone: string;
  payment_type: PaymentType | string;
  status: Receipt["status"] | string;
  subtotal: number;
  discount_value: number;
  total_amount: number;
  notes: string | null;
  paid_at: string;
  created_at: string;
  updated_at: string;
};

type SupabaseReceiptItemResponse = {
  id: string;
  tenant_id: string;
  receipt_id: string;
  appointment_id: string | null;
  service_id: string | null;
  service_name: string;
  professional_id: string | null;
  professional_name: string;
  price: number;
  commission_value: number;
  item_type: ReceiptItem["itemType"] | string;
  created_at: string;
};

type SupabaseCashExpenseResponse = {
  id: string;
  tenant_id: string;
  description: string;
  amount: number;
  payment_type: PaymentType | string;
  expense_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

function isUuid(value: string | null | undefined): boolean {
  return Boolean(
    value &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value,
      ),
  );
}

function toNullableUuid(value: string | null | undefined): string | null {
  return isUuid(value) ? String(value) : null;
}

function normalizeReceiptPaymentType(value: unknown): PaymentType {
  return ["dinheiro", "pix", "debito", "credito", "pendente", "cortesia"].includes(
    String(value),
  )
    ? (value as PaymentType)
    : "dinheiro";
}

function normalizeReceiptStatus(value: unknown): Receipt["status"] {
  return String(value) === "cancelled" ? "cancelled" : "paid";
}

function normalizeReceiptItemType(value: unknown): ReceiptItem["itemType"] {
  return ["appointment", "extra", "manual"].includes(String(value))
    ? (value as ReceiptItem["itemType"])
    : "appointment";
}

function mapSupabaseReceiptItemToAppReceiptItem(
  item: SupabaseReceiptItemResponse,
): ReceiptItem {
  return {
    id: item.id,
    receiptId: item.receipt_id,
    appointmentId: item.appointment_id || undefined,
    serviceId: item.service_id || "",
    serviceName: item.service_name || "Serviço personalizado",
    professionalId: item.professional_id || "",
    professionalName: item.professional_name || "Profissional",
    price: Number(item.price) || 0,
    commissionValue: Number(item.commission_value) || 0,
    itemType: normalizeReceiptItemType(item.item_type),
  };
}

function mapSupabaseReceiptToAppReceipt(params: {
  receipt: SupabaseReceiptResponse;
  items: SupabaseReceiptItemResponse[];
}): Receipt {
  const { receipt, items } = params;

  return {
    id: receipt.id,
    clientId: receipt.client_id || undefined,
    clientName: receipt.client_name || "",
    clientPhone: receipt.client_phone || "",
    appointmentId: receipt.appointment_id || undefined,
    items: items.map(mapSupabaseReceiptItemToAppReceiptItem),
    paymentType: normalizeReceiptPaymentType(receipt.payment_type),
    status: normalizeReceiptStatus(receipt.status),
    subtotal: Number(receipt.subtotal) || 0,
    discountValue: Number(receipt.discount_value) || 0,
    totalAmount: Number(receipt.total_amount) || 0,
    notes: receipt.notes || "",
    paidAt: String(receipt.paid_at || receipt.created_at || "").slice(0, 16),
    createdAt: String(receipt.created_at || receipt.paid_at || "").slice(0, 16),
  };
}

function mapSupabaseCashExpenseToAppCashExpense(
  expense: SupabaseCashExpenseResponse,
): CashExpense {
  const expenseDate = String(expense.expense_date || "").slice(0, 10);
  const createdAt = String(expense.created_at || "").slice(0, 16);

  return {
    id: expense.id,
    description: expense.description || "Despesa manual",
    amount: Number(expense.amount) || 0,
    paymentType: normalizeReceiptPaymentType(expense.payment_type),
    status: "paid",
    notes: expense.notes || "",
    paidAt: expenseDate ? `${expenseDate}T00:00` : createdAt,
    createdAt,
  };
}

function buildReceiptInsertPayload(params: {
  tenantId: string;
  payload: ReceiptPayload;
  subtotal: number;
  discountValue: number;
  totalAmount: number;
}) {
  const { tenantId, payload, subtotal, discountValue, totalAmount } = params;

  return {
    tenant_id: tenantId,
    client_id: toNullableUuid(payload.clientId),
    appointment_id: toNullableUuid(payload.appointmentId),
    client_name: payload.clientName,
    client_phone: payload.clientPhone,
    payment_type: payload.paymentType,
    status: "paid",
    subtotal,
    discount_value: discountValue,
    total_amount: totalAmount,
    notes: payload.notes || null,
  };
}

function buildReceiptItemInsertPayload(params: {
  tenantId: string;
  receiptItem: ReceiptItem;
}) {
  const { tenantId, receiptItem } = params;

  return {
    tenant_id: tenantId,
    receipt_id: receiptItem.receiptId,
    appointment_id: toNullableUuid(receiptItem.appointmentId),
    service_id: toNullableUuid(receiptItem.serviceId),
    service_name: receiptItem.serviceName || "Serviço personalizado",
    professional_id: toNullableUuid(receiptItem.professionalId),
    professional_name: receiptItem.professionalName || "Profissional",
    price: Number(receiptItem.price) || 0,
    commission_value: Number(receiptItem.commissionValue) || 0,
    item_type: normalizeReceiptItemType(receiptItem.itemType),
  };
}

function buildOwnerAppointmentPayload(
  appointment: Omit<Appointment, "id"> & { id?: string | null },
) {
  const [date, time] = appointment.dateTime.split("T");

  return {
    id:
      appointment.id && !appointment.id.startsWith("owner-appt-")
        ? appointment.id
        : null,
    service_id: appointment.serviceId,
    professional_id: appointment.professionalId,
    starts_at_local: `${date}T${time}`,
    client_name: appointment.clientName,
    client_phone: appointment.clientPhone,
    client_email: appointment.clientEmail || null,
    payment_type: appointment.paymentType || "pendente",
    notes: appointment.notes || "Agendamento criado pela Agenda Geral.",
  };
}

function buildReceiptFinancialAppointments(receipts: Receipt[]): Appointment[] {
  return receipts
    .filter((receipt) => receipt.status === "paid")
    .flatMap((receipt) => {
      return receipt.items.map((item) => ({
        id: `${receipt.id}-${item.id}`,
        dateTime: receipt.paidAt.slice(0, 16),
        clientName: receipt.clientName,
        clientPhone: receipt.clientPhone,
        serviceId: item.serviceId,
        professionalId: item.professionalId,
        price: item.price,
        status: "completed" as AppointmentStatus,
        paymentType: receipt.paymentType,
        notes: receipt.notes || "Recebimento confirmado no caixa.",
        commissionPaid: false,
        commissionValue: item.commissionValue,
        depositPaid: false,
      }));
    });
}

function calculateReceiptTotals(receipts: Receipt[], baseDateStr: string) {
  const paidReceipts = receipts.filter((receipt) => receipt.status === "paid");

  const todayReceipts = paidReceipts.filter((receipt) => {
    return receipt.paidAt.slice(0, 10) === baseDateStr;
  });

  return {
    totalReceivedToday: todayReceipts.reduce(
      (sum, receipt) => sum + receipt.totalAmount,
      0,
    ),
    totalReceivedMonth: paidReceipts.reduce(
      (sum, receipt) => sum + receipt.totalAmount,
      0,
    ),
    totalCommissionsMonth: paidReceipts.reduce((sum, receipt) => {
      return (
        sum +
        receipt.items.reduce(
          (itemSum, item) => itemSum + item.commissionValue,
          0,
        )
      );
    }, 0),
  };
}

function buildReceiptItems(params: {
  draftItems: ReceiptDraftItem[];
  receiptId: string;
  services: Service[];
  professionals: Professional[];
}): ReceiptItem[] {
  const { draftItems, receiptId, services, professionals } = params;

  return draftItems.map((draftItem) => {
    const service = services.find((item) => item.id === draftItem.serviceId);
    const professional = professionals.find(
      (item) => item.id === draftItem.professionalId,
    );

    const commissionValue =
      service && professional
        ? calculateCommissionValue({
            service: {
              ...service,
              price: draftItem.price,
            },
            professional,
          })
        : 0;

    return {
      id: `${receiptId}-${draftItem.id}`,
      receiptId,
      appointmentId: draftItem.appointmentId,
      serviceId: draftItem.serviceId,
      serviceName: service?.name || "Serviço personalizado",
      professionalId: draftItem.professionalId,
      professionalName: professional?.name || "Profissional",
      price: Number(draftItem.price) || 0,
      commissionValue,
      itemType: draftItem.itemType,
    };
  });
}

function normalizeServiceCategoryName(value: string): string {
  return value.trim().replace(/\s+/g, " ").toUpperCase();
}

function getInitialServiceCategories(services: Service[]): string[] {
  const categories = services
    .map((service) => normalizeServiceCategoryName(service.category))
    .filter(Boolean);

  const uniqueCategories = Array.from(new Set(categories));

  if (uniqueCategories.length > 0) {
    return uniqueCategories;
  }

  return [];
}

function getServiceDisplayOrder(service: Service): number {
  const serviceRecord = service as unknown as Record<string, unknown>;
  const displayOrder = Number(serviceRecord.displayOrder);

  return Number.isFinite(displayOrder) && displayOrder > 0 ? displayOrder : 999;
}

function getServiceCategoryOrder(service: Service): number {
  const serviceRecord = service as unknown as Record<string, unknown>;
  const categoryOrder = Number(serviceRecord.categoryOrder);

  return Number.isFinite(categoryOrder) && categoryOrder > 0
    ? categoryOrder
    : 999;
}

function buildInitialServiceCategoryOrders(
  categories: string[],
  services: Service[],
): Record<string, number> {
  return categories.reduce<Record<string, number>>(
    (accumulator, category, index) => {
      const normalizedCategory = normalizeServiceCategoryName(category);

      const firstServiceInCategory = services.find((service) => {
        return (
          normalizeServiceCategoryName(service.category) === normalizedCategory
        );
      });

      const firstServiceCategoryOrder = firstServiceInCategory
        ? getServiceCategoryOrder(firstServiceInCategory)
        : index + 1;

      accumulator[normalizedCategory] =
        firstServiceCategoryOrder === 999
          ? index + 1
          : firstServiceCategoryOrder;

      return accumulator;
    },
    {},
  );
}

function sortServicesForDisplay(params: {
  services: Service[];
  categoryOrders: Record<string, number>;
}): Service[] {
  const { services, categoryOrders } = params;

  return [...services].sort((firstService, secondService) => {
    const firstCategory = normalizeServiceCategoryName(firstService.category);
    const secondCategory = normalizeServiceCategoryName(secondService.category);

    const firstCategoryOrder =
      categoryOrders[firstCategory] ?? getServiceCategoryOrder(firstService);
    const secondCategoryOrder =
      categoryOrders[secondCategory] ?? getServiceCategoryOrder(secondService);

    if (firstCategoryOrder !== secondCategoryOrder) {
      return firstCategoryOrder - secondCategoryOrder;
    }

    const firstServiceOrder = getServiceDisplayOrder(firstService);
    const secondServiceOrder = getServiceDisplayOrder(secondService);

    if (firstServiceOrder !== secondServiceOrder) {
      return firstServiceOrder - secondServiceOrder;
    }

    return firstService.name.localeCompare(secondService.name, "pt-BR");
  });
}

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

function getAgendaSpeedPublicOrigin(): string {
  if (typeof window === "undefined") {
    return "https://agendaspeed.com.br";
  }

  const origin = window.location.origin.replace("https://www.", "https://");

  if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
    return "https://agendaspeed.com.br";
  }

  return origin;
}

function extractClientPublicToken(data: unknown): string {
  const firstRow = Array.isArray(data) ? data[0] : data;

  if (typeof firstRow === "string") {
    return firstRow;
  }

  if (firstRow && typeof firstRow === "object") {
    const record = firstRow as Record<string, unknown>;
    return String(
      record.public_access_token ||
        record.client_public_access_token ||
        record.access_token ||
        record.token ||
        "",
    );
  }

  return "";
}

export default function OwnerDashboard({
  state,
  onUpdateState,
  onNavigateToClient,
  onLogOut,
}: OwnerDashboardProps) {
  const { config } = state;

  // Serviços exibidos no painel vêm exclusivamente do Supabase.
  // Evita que dados antigos do estado global/localStorage sejam usados como fallback.
  const [liveServices, setLiveServices] = useState<Service[]>([]);
  const services = liveServices;

  // Profissionais exibidos no painel vêm exclusivamente do Supabase.
  // O estado do App não é usado como fallback para evitar dados fictícios em produção.
  const [liveProfessionals, setLiveProfessionals] = useState<Professional[]>([]);
  const professionals = liveProfessionals;

  // A agenda do painel do dono não deve iniciar a partir do mock/localStorage do App.
  // Em produção, a fonte oficial dos agendamentos é sempre o Supabase via RPC.
  // O estado abaixo começa vazio e é preenchido somente pelo carregamento real.
  const [liveAppointments, setLiveAppointments] = useState<Appointment[]>([]);
  const appointments = liveAppointments;

  // Em produção, a carteira de clientes também precisa vir do Supabase.
  // state.clients fica apenas como legado/fallback de memória enquanto os módulos restantes são migrados.
  const [liveClients, setLiveClients] = useState<Client[]>([]);
  const clients = liveClients;

  const [activeTab, setActiveTab] = useState<OwnerTab>("painel");
  const activeTabRef = useRef<OwnerTab>("painel");

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);
  // Recebimentos e despesas também deixam de iniciar pelo mock/localStorage.
  // A fonte oficial do caixa em produção passa a ser receipts, receipt_items e cash_expenses no Supabase.
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [cashExpenses, setCashExpenses] = useState<CashExpense[]>([]);

  const [clientSearch, setClientSearch] = useState("");
  const [professionalFilter, setProfessionalFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [calendarView, setCalendarView] = useState<CalendarView>("today");
  const [quickOpenProfessionalAgendaId, setQuickOpenProfessionalAgendaId] =
    useState<string>("");
  const [quickOpenProfessionalAgendaKey, setQuickOpenProfessionalAgendaKey] =
    useState(0);

  const [showApptModal, setShowApptModal] = useState(false);
  const [showProfModal, setShowProfModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showPermissionModal, setShowPermissionModal] =
    useState<Professional | null>(null);

  const [editingProf, setEditingProf] = useState<Professional | null>(null);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [professionalPendingHardDelete, setProfessionalPendingHardDelete] =
    useState<Professional | null>(null);
  const [isDeletingProfessional, setIsDeletingProfessional] = useState(false);

  const [newApptClientName, setNewApptClientName] = useState("");
  const [newApptClientPhone, setNewApptClientPhone] = useState("");
  const [newApptServiceId, setNewApptServiceId] = useState("");
  const [newApptProfId, setNewApptProfId] = useState("");
  const [newApptDate, setNewApptDate] = useState("");
  const [newApptTime, setNewApptTime] = useState("");
  const [newApptNotes, setNewApptNotes] = useState("");
  const [newApptPayment, setNewApptPayment] = useState<PaymentType>("pix");

  const [profName, setProfName] = useState("");
  const [profPhone, setProfPhone] = useState("");
  const [profEmail, setProfEmail] = useState("");
  const [profRole, setProfRole] = useState("");
  const [profAvatar, setProfAvatar] = useState("");
  const [profActive, setProfActive] = useState(true);
  const [profDisplayOrder, setProfDisplayOrder] = useState(1);
  const [profWorkDays, setProfWorkDays] = useState<number[]>([
    1, 2, 3, 4, 5, 6,
  ]);
  const [profHoursStart, setProfHoursStart] = useState("09:00");
  const [profHoursEnd, setProfHoursEnd] = useState("19:00");
  const [profLunchStart, setProfLunchStart] = useState("12:00");
  const [profLunchEnd, setProfLunchEnd] = useState("13:00");
  const [profNoLunchBreak, setProfNoLunchBreak] = useState(false);
  const [profDefaultAppointmentDuration, setProfDefaultAppointmentDuration] =
    useState(30);
  const [profServicesIds, setProfServicesIds] = useState<string[]>([]);
  const [profRemType, setProfRemType] =
    useState<RemunerationType>("commission_percent");
  const [profRemValue, setProfRemValue] = useState(40);
  const [profChairRental, setProfChairRental] = useState(0);

  const [serviceCategories, setServiceCategories] = useState<string[]>(() => {
    return getInitialServiceCategories(services);
  });
  const [serviceCategoryOrders, setServiceCategoryOrders] = useState<
    Record<string, number>
  >(() => {
    const initialCategories = getInitialServiceCategories(services);

    return buildInitialServiceCategoryOrders(initialCategories, services);
  });
  const [serviceCategoryStatuses, setServiceCategoryStatuses] = useState<
    Record<string, boolean>
  >(() => {
    return getInitialServiceCategories(services).reduce<Record<string, boolean>>(
      (accumulator, category) => {
        accumulator[normalizeServiceCategoryName(category)] = true;
        return accumulator;
      },
      {},
    );
  });

  const [servName, setServName] = useState("");
  const [servCategory, setServCategory] = useState(() => {
    return getInitialServiceCategories(services)[0] || "CABELO";
  });
  const [servDuration, setServDuration] = useState(30);
  const [servDisplayOrder, setServDisplayOrder] = useState(1);
  const [servPrice, setServPrice] = useState(50);
  const [servDescription, setServDescription] = useState("");
  const [servActive, setServActive] = useState(true);
  const [servRequireDeposit, setServRequireDeposit] = useState(false);
  const [servDepositValue, setServDepositValue] = useState<number>(10);

  const [configName, setConfigName] = useState(config.name);
  const [configAddress, setConfigAddress] = useState(config.address);
  const [configPhone, setConfigPhone] = useState(config.phone);
  const [configInstagram, setConfigInstagram] = useState(config.instagram);
  const [configLogo, setConfigLogo] = useState(config.logo);
  const [configCoverImage, setConfigCoverImage] = useState(config.coverImage);
  const [configAutoApprove] = useState(config.autoApprove);
  const [configDefaultTemplate, setConfigDefaultTemplate] = useState(
    config.defaultMsgTemplate,
  );
  const [bookingMinLeadTimeMinutes, setBookingMinLeadTimeMinutes] = useState(
    config.minLeadTimeMinutes || 0,
  );
  const [bookingMinCancelLeadTimeMinutes, setBookingMinCancelLeadTimeMinutes] =
    useState(120);
  const [
    bookingMinRescheduleLeadTimeMinutes,
    setBookingMinRescheduleLeadTimeMinutes,
  ] = useState(120);
  const [bookingAllowClientConfirmation, setBookingAllowClientConfirmation] =
    useState(true);
  const [bookingAllowClientCancellation, setBookingAllowClientCancellation] =
    useState(true);
  const [bookingAllowClientReschedule, setBookingAllowClientReschedule] =
    useState(true);
  const [bookingSlotIntervalMinutes, setBookingSlotIntervalMinutes] =
    useState(30);
  const [bookingMaxFutureDays, setBookingMaxFutureDays] = useState(
    config.maxFutureDays || 14,
  );
  const [bookingWorkHoursStart, setBookingWorkHoursStart] = useState(
    config.workHoursStart || "08:00",
  );
  const [bookingWorkHoursEnd, setBookingWorkHoursEnd] = useState(
    config.workHoursEnd || "19:00",
  );
  const [bookingLunchStart, setBookingLunchStart] = useState("12:00");
  const [bookingLunchEnd, setBookingLunchEnd] = useState("13:00");

  const [tenantId, setTenantId] = useState("");
  const [isSavingTenantSettings, setIsSavingTenantSettings] = useState(false);
  const [settingsSaveSuccessVersion, setSettingsSaveSuccessVersion] = useState(0);
  const [settingsSaveMessage, setSettingsSaveMessage] = useState("");
  const [isLoadingProfessionals, setIsLoadingProfessionals] = useState(false);
  const [isSavingProfessional, setIsSavingProfessional] = useState(false);
  const [isLoadingServices, setIsLoadingServices] = useState(false);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(true);
  const [appointmentsLoadError, setAppointmentsLoadError] = useState("");
  const [isLoadingClients, setIsLoadingClients] = useState(true);
  const [clientsLoadError, setClientsLoadError] = useState("");
  const [isLoadingFinancialRecords, setIsLoadingFinancialRecords] =
    useState(true);
  const [financialRecordsLoadError, setFinancialRecordsLoadError] =
    useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadTenantSettings() {
      const { data, error } = await supabase.rpc("get_my_tenant_settings");

      if (!isMounted) return;

      if (error) {
        console.error(
          "Erro ao carregar configurações da empresa:",
          error.message,
        );
        return;
      }

      const firstSettings = (
        Array.isArray(data) ? data[0] : null
      ) as TenantSettingsResponse | null;

      if (!firstSettings) return;

      setTenantId(firstSettings.tenant_id || "");

      const nextConfig = mapTenantSettingsToConfig(config, firstSettings);

      setConfigName(nextConfig.name);
      setConfigAddress(nextConfig.address);
      setConfigPhone(nextConfig.phone);
      setConfigInstagram(nextConfig.instagram);
      setConfigLogo(nextConfig.logo);
      setConfigCoverImage(nextConfig.coverImage);
      setConfigDefaultTemplate(nextConfig.defaultMsgTemplate);
      setBookingMinLeadTimeMinutes(nextConfig.minLeadTimeMinutes || 0);
      setBookingMinCancelLeadTimeMinutes(
        Number(firstSettings.booking_min_cancel_lead_time_minutes ?? 120),
      );
      setBookingMinRescheduleLeadTimeMinutes(
        Number(firstSettings.booking_min_reschedule_lead_time_minutes ?? 120),
      );
      setBookingAllowClientConfirmation(
        Boolean(firstSettings.booking_allow_client_confirmation ?? true),
      );
      setBookingAllowClientCancellation(
        Boolean(firstSettings.booking_allow_client_cancellation ?? true),
      );
      setBookingAllowClientReschedule(
        Boolean(firstSettings.booking_allow_client_reschedule ?? true),
      );
      setBookingSlotIntervalMinutes(
        Number(firstSettings.booking_slot_interval_minutes ?? 30),
      );
      setBookingMaxFutureDays(nextConfig.maxFutureDays || 14);
      setBookingWorkHoursStart(nextConfig.workHoursStart || "08:00");
      setBookingWorkHoursEnd(nextConfig.workHoursEnd || "19:00");
      setBookingLunchStart(firstSettings.booking_lunch_start || "12:00");
      setBookingLunchEnd(firstSettings.booking_lunch_end || "13:00");

      onUpdateState({
        ...state,
        config: nextConfig,
      });
    }

    loadTenantSettings();

    return () => {
      isMounted = false;
    };
    // Carrega apenas na abertura do painel para não sobrescrever edição local em andamento.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadProfessionalsFromSupabase() {
      setIsLoadingProfessionals(true);

      const { data, error } = await supabase.rpc("get_my_professionals");

      if (!isMounted) return;

      if (error) {
        console.error("Erro ao carregar profissionais:", error.message);
        setIsLoadingProfessionals(false);
        return;
      }

      const rows = (
        Array.isArray(data) ? data : []
      ) as SupabaseProfessionalResponse[];
      const nextProfessionals = rows.map(
        mapSupabaseProfessionalToAppProfessional,
      );

      setLiveProfessionals(nextProfessionals);

      onUpdateState({
        ...state,
        professionals: nextProfessionals,
      });

      setIsLoadingProfessionals(false);
    }

    loadProfessionalsFromSupabase();

    return () => {
      isMounted = false;
    };
    // Carrega profissionais reais ao abrir o painel. Serviços e agendas serão ligados em etapas seguintes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadServicesFromSupabase() {
      setIsLoadingServices(true);

      const [servicesResult, categoriesResult] = await Promise.all([
        supabase.rpc("get_my_services"),
        supabase.rpc("get_my_service_categories"),
      ]);

      if (!isMounted) return;

      if (servicesResult.error) {
        console.error(
          "Erro ao carregar serviços:",
          servicesResult.error.message,
        );
        setIsLoadingServices(false);
        return;
      }

      if (categoriesResult.error) {
        console.error(
          "Erro ao carregar categorias:",
          categoriesResult.error.message,
        );
      }

      const serviceRows = (
        Array.isArray(servicesResult.data) ? servicesResult.data : []
      ) as SupabaseServiceResponse[];
      const nextServices = serviceRows.map(mapSupabaseServiceToAppService);

      const categoryRows = (
        Array.isArray(categoriesResult.data) ? categoriesResult.data : []
      ) as SupabaseServiceCategoryResponse[];

      const nextCategories =
        categoryRows.length > 0
          ? categoryRows.map((category) =>
              normalizeServiceCategoryName(category.name),
            )
          : getInitialServiceCategories(nextServices);

      const nextCategoryOrders =
        categoryRows.length > 0
          ? categoryRows.reduce<Record<string, number>>(
              (accumulator, category, index) => {
                const normalizedCategory = normalizeServiceCategoryName(
                  category.name,
                );
                accumulator[normalizedCategory] =
                  Number(category.sort_order) || index + 1;
                return accumulator;
              },
              {},
            )
          : buildInitialServiceCategoryOrders(nextCategories, nextServices);

      const nextCategoryStatuses =
        categoryRows.length > 0
          ? categoryRows.reduce<Record<string, boolean>>(
              (accumulator, category) => {
                const normalizedCategory = normalizeServiceCategoryName(
                  category.name,
                );
                accumulator[normalizedCategory] = category.active !== false;
                return accumulator;
              },
              {},
            )
          : nextCategories.reduce<Record<string, boolean>>(
              (accumulator, category) => {
                accumulator[normalizeServiceCategoryName(category)] = true;
                return accumulator;
              },
              {},
            );

      setLiveServices(nextServices);
      setServiceCategories(nextCategories);
      setServiceCategoryOrders(nextCategoryOrders);
      setServiceCategoryStatuses(nextCategoryStatuses);

      if (
        !nextCategories.includes(normalizeServiceCategoryName(servCategory))
      ) {
        setServCategory(nextCategories[0] || "CABELO");
      }

      onUpdateState({
        ...state,
        services: nextServices,
      });

      setIsLoadingServices(false);
    }

    loadServicesFromSupabase();

    return () => {
      isMounted = false;
    };
    // Carrega serviços e categorias reais ao abrir o painel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let isMounted = true;
    let refreshTimeoutId: number | null = null;
    let safetyPollingIntervalId: number | null = null;
    let requestInFlight = false;
    let requestQueued = false;

    async function loadAppointmentsFromSupabase(showLoading = true) {
      if (requestInFlight) {
        requestQueued = true;
        return;
      }

      requestInFlight = true;

      if (showLoading) {
        setIsLoadingAppointments(true);
      }

      setAppointmentsLoadError("");

      const { data, error } = await supabase.rpc("get_my_appointments");

      if (isMounted) {
        if (error) {
          console.error("Erro ao carregar agendamentos:", error.message);
          setAppointmentsLoadError(
            error.message ||
              "Não foi possível carregar a agenda real do Supabase.",
          );
          setIsLoadingAppointments(false);
        } else {
          const rows = (
            Array.isArray(data) ? data : []
          ) as SupabaseAppointmentResponse[];
          const nextAppointments = rows.map(
            mapSupabaseAppointmentToAppAppointment,
          );

          setLiveAppointments(nextAppointments);
          setIsLoadingAppointments(false);
        }
      }

      requestInFlight = false;

      if (isMounted && requestQueued) {
        requestQueued = false;
        void loadAppointmentsFromSupabase(false);
      }
    }

    function scheduleAppointmentsRefresh() {
      if (!isMounted) return;

      if (refreshTimeoutId !== null) {
        window.clearTimeout(refreshTimeoutId);
      }

      refreshTimeoutId = window.setTimeout(() => {
        refreshTimeoutId = null;
        void loadAppointmentsFromSupabase(false);
      }, 400);
    }

    void loadAppointmentsFromSupabase(true);

    safetyPollingIntervalId = window.setInterval(() => {
      const isOperationalTab =
        activeTabRef.current === "painel" || activeTabRef.current === "agenda";

      if (document.visibilityState === "visible" && isOperationalTab) {
        void loadAppointmentsFromSupabase(false);
      }
    }, 180000);

    const appointmentsChannel = supabase
      .channel("owner-appointments-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appointments",
        },
        scheduleAppointmentsRefresh,
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          console.error(
            "Não foi possível ativar a atualização em tempo real da agenda.",
          );
        }
      });

    return () => {
      isMounted = false;

      if (refreshTimeoutId !== null) {
        window.clearTimeout(refreshTimeoutId);
      }

      if (safetyPollingIntervalId !== null) {
        window.clearInterval(safetyPollingIntervalId);
      }

      void supabase.removeChannel(appointmentsChannel);
    };
    // Carrega uma vez, sincroniza via Realtime e mantém polling leve de segurança.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadClientsFromSupabase = async (showLoading = true): Promise<Client[]> => {
    if (showLoading) {
      setIsLoadingClients(true);
    }

    setClientsLoadError("");

    const { data, error } = await supabase
      .from("clients")
      .select(SUPABASE_CLIENTS_SELECT)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Erro ao carregar clientes:", error.message);
      setClientsLoadError(error.message || "Erro ao carregar clientes.");
      setIsLoadingClients(false);
      return [];
    }

    const rows = (Array.isArray(data) ? data : []) as SupabaseClientResponse[];
    const nextClients = rows.map(mapSupabaseClientToAppClient);

    setLiveClients(nextClients);
    setIsLoadingClients(false);

    return nextClients;
  };

  useEffect(() => {
    let isMounted = true;

    async function loadInitialClients() {
      const loadedClients = await loadClientsFromSupabase(true);

      if (!isMounted) return;

      onUpdateState({
        ...state,
        clients: loadedClients,
      });
    }

    loadInitialClients();

    return () => {
      isMounted = false;
    };
    // Carrega clientes reais ao abrir o painel. A tabela clients é a fonte oficial.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadFinancialRecordsFromSupabase = async (
    showLoading = true,
  ): Promise<{
    receipts: Receipt[];
    cashExpenses: CashExpense[];
  }> => {
    if (!tenantId) {
      return {
        receipts: [],
        cashExpenses: [],
      };
    }

    if (showLoading) {
      setIsLoadingFinancialRecords(true);
    }

    setFinancialRecordsLoadError("");

    const receiptsResult = await supabase
      .from("receipts")
      .select(SUPABASE_RECEIPTS_SELECT)
      .eq("tenant_id", tenantId)
      .order("paid_at", { ascending: false });

    if (receiptsResult.error) {
      console.error(
        "Erro ao carregar recebimentos:",
        receiptsResult.error.message,
      );
      setFinancialRecordsLoadError(
        receiptsResult.error.message || "Erro ao carregar recebimentos.",
      );
      setIsLoadingFinancialRecords(false);
      return {
        receipts: [],
        cashExpenses,
      };
    }

    const receiptRows = (Array.isArray(receiptsResult.data)
      ? receiptsResult.data
      : []) as SupabaseReceiptResponse[];
    const receiptIds = receiptRows.map((receipt) => receipt.id).filter(Boolean);

    let receiptItemRows: SupabaseReceiptItemResponse[] = [];

    if (receiptIds.length > 0) {
      const receiptItemsResult = await supabase
        .from("receipt_items")
        .select(SUPABASE_RECEIPT_ITEMS_SELECT)
        .eq("tenant_id", tenantId)
        .in("receipt_id", receiptIds);

      if (receiptItemsResult.error) {
        console.error(
          "Erro ao carregar itens dos recebimentos:",
          receiptItemsResult.error.message,
        );
        setFinancialRecordsLoadError(
          receiptItemsResult.error.message ||
            "Erro ao carregar itens dos recebimentos.",
        );
        setIsLoadingFinancialRecords(false);
        return {
          receipts,
          cashExpenses,
        };
      }

      receiptItemRows = (Array.isArray(receiptItemsResult.data)
        ? receiptItemsResult.data
        : []) as SupabaseReceiptItemResponse[];
    }

    const expensesResult = await supabase
      .from("cash_expenses")
      .select(SUPABASE_CASH_EXPENSES_SELECT)
      .eq("tenant_id", tenantId)
      .order("expense_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (expensesResult.error) {
      console.error("Erro ao carregar despesas:", expensesResult.error.message);
      setFinancialRecordsLoadError(
        expensesResult.error.message || "Erro ao carregar despesas.",
      );
      setIsLoadingFinancialRecords(false);
      return {
        receipts,
        cashExpenses,
      };
    }

    const receiptItemsByReceiptId = receiptItemRows.reduce<
      Record<string, SupabaseReceiptItemResponse[]>
    >((accumulator, receiptItem) => {
      if (!accumulator[receiptItem.receipt_id]) {
        accumulator[receiptItem.receipt_id] = [];
      }

      accumulator[receiptItem.receipt_id].push(receiptItem);
      return accumulator;
    }, {});

    const nextReceipts = receiptRows.map((receipt) => {
      return mapSupabaseReceiptToAppReceipt({
        receipt,
        items: receiptItemsByReceiptId[receipt.id] || [],
      });
    });

    const expenseRows = (Array.isArray(expensesResult.data)
      ? expensesResult.data
      : []) as SupabaseCashExpenseResponse[];
    const nextCashExpenses = expenseRows.map(mapSupabaseCashExpenseToAppCashExpense);

    setReceipts(nextReceipts);
    setCashExpenses(nextCashExpenses);
    setIsLoadingFinancialRecords(false);

    return {
      receipts: nextReceipts,
      cashExpenses: nextCashExpenses,
    };
  };

  useEffect(() => {
    let isMounted = true;

    async function loadInitialFinancialRecords() {
      if (!tenantId) return;

      const loadedRecords = await loadFinancialRecordsFromSupabase(true);

      if (!isMounted) return;

      onUpdateState({
        ...state,
        receipts: loadedRecords.receipts,
        cashExpenses: loadedRecords.cashExpenses,
      } as unknown as typeof state);
    }

    loadInitialFinancialRecords();

    return () => {
      isMounted = false;
    };
    // Carrega caixa real quando o tenant é identificado. Supabase é a fonte oficial.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  const baseDateStr = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Sao_Paulo",
  });

  const baseFinancialSummary = calculateOwnerFinancialSummary({
    appointments,
    professionals,
    baseDateStr,
  });

  const receiptFinancialAppointments =
    buildReceiptFinancialAppointments(receipts);
  const receiptTotals = calculateReceiptTotals(receipts, baseDateStr);
  const hasPaidReceipts = receipts.some((receipt) => receipt.status === "paid");

  const financialSummary = hasPaidReceipts
    ? {
        ...baseFinancialSummary,
        completedAppointments: receiptFinancialAppointments,
        completedToday: receiptFinancialAppointments.filter((appointment) => {
          return appointment.dateTime.slice(0, 10) === baseDateStr;
        }),
        totalReceivedToday: receiptTotals.totalReceivedToday,
        totalReceivedMonth: receiptTotals.totalReceivedMonth,
        totalCommissionsMonth: receiptTotals.totalCommissionsMonth,
      }
    : baseFinancialSummary;

  const filteredAppointments = filterAppointments({
    appointments,
    baseDateStr,
    professionalFilter,
    statusFilter,
    calendarView,
  });

  const filteredClients = filterClients({
    clients,
    search: clientSearch,
  });

  const clearQuickProfessionalAgenda = () => {
    setQuickOpenProfessionalAgendaId("");
    setQuickOpenProfessionalAgendaKey((currentKey) => currentKey + 1);
  };

  const handleChangeOwnerTab = (nextTab: OwnerTab) => {
    if (nextTab === "agenda") {
      clearQuickProfessionalAgenda();
    }

    setActiveTab(nextTab);
  };

  const openTodayAgenda = () => {
    clearQuickProfessionalAgenda();
    setActiveTab("agenda");
    setCalendarView("today");
  };

  const resetAppointmentForm = () => {
    setNewApptClientName("");
    setNewApptClientPhone("");
    setNewApptServiceId("");
    setNewApptProfId("");
    setNewApptDate("");
    setNewApptTime("");
    setNewApptNotes("");
    setNewApptPayment("pix");
  };

  const resetProfessionalForm = () => {
    setProfName("");
    setProfPhone("");
    setProfEmail("");
    setProfRole("");
    setProfAvatar("");
    setProfActive(true);
    setProfDisplayOrder(1);
    setProfWorkDays([1, 2, 3, 4, 5, 6]);
    setProfHoursStart("09:00");
    setProfHoursEnd("19:00");
    setProfLunchStart("12:00");
    setProfLunchEnd("13:00");
    setProfNoLunchBreak(false);
    setProfDefaultAppointmentDuration(30);
    setProfServicesIds([]);
    setProfRemType("commission_percent");
    setProfRemValue(40);
    setProfChairRental(0);
  };

  const resetServiceForm = () => {
    setServName("");
    setServCategory(serviceCategories[0] || "CABELO");
    setServDuration(30);
    setServDisplayOrder(1);
    setServPrice(50);
    setServDescription("");
    setServActive(true);
    setServRequireDeposit(false);
    setServDepositValue(10);
  };

  const handleModifyStatus = async (
    appointmentId: string,
    destinationStatus: AppointmentStatus,
  ) => {
    const previousAppointments = appointments;

    const optimisticAppointments = appointments.map((appointment) => {
      if (appointment.id !== appointmentId) {
        return appointment;
      }

      return {
        ...appointment,
        status: destinationStatus,
      };
    });

    const updatedClients = updateClientsAfterAppointmentStatusChange({
      clients,
      appointments,
      appointmentId,
      destinationStatus,
    });

    setLiveAppointments(optimisticAppointments);

    onUpdateState({
      ...state,
      appointments: optimisticAppointments,
      clients: updatedClients,
    });

    const { data, error } = await supabase.rpc("update_my_appointment_status", {
      p_appointment_id: appointmentId,
      p_status: destinationStatus,
    });

    if (error) {
      alert(
        error.message || "Não foi possível atualizar o status do agendamento.",
      );
      setLiveAppointments(previousAppointments);

      onUpdateState({
        ...state,
        appointments: previousAppointments,
        clients,
      });
      return;
    }

    const savedRow = (
      Array.isArray(data) ? data[0] : null
    ) as SupabaseAppointmentResponse | null;

    if (!savedRow) return;

    const savedAppointment = mapSupabaseAppointmentToAppAppointment(savedRow);

    const syncedAppointments = optimisticAppointments.map((appointment) => {
      if (appointment.id !== savedAppointment.id) return appointment;
      return savedAppointment;
    });

    setLiveAppointments(syncedAppointments);

    onUpdateState({
      ...state,
      appointments: syncedAppointments,
      clients: updatedClients,
    });

    void loadClientsFromSupabase(false);
  };

  const handleAddManualAppt = async (event: React.FormEvent) => {
    event.preventDefault();

    if (
      !newApptClientName ||
      !newApptClientPhone ||
      !newApptServiceId ||
      !newApptProfId ||
      !newApptDate ||
      !newApptTime
    ) {
      alert("Por favor, defina todos os campos obrigatórios do atendimento.");
      return;
    }

    const selectedService = services.find(
      (service) => service.id === newApptServiceId,
    );
    const selectedProfessional = professionals.find(
      (professional) => professional.id === newApptProfId,
    );

    if (!selectedService || !selectedProfessional) {
      alert("Serviço ou profissional não encontrado.");
      return;
    }

    const commissionValue = calculateCommissionValue({
      service: selectedService,
      professional: selectedProfessional,
    });

    const appointmentToSave: Omit<Appointment, "id"> = {
      dateTime: `${newApptDate}T${newApptTime}`,
      clientName: newApptClientName,
      clientPhone: newApptClientPhone,
      serviceId: newApptServiceId,
      professionalId: newApptProfId,
      price: selectedService.price,
      status: "confirmed",
      paymentType: newApptPayment,
      notes: newApptNotes || "Agendado manualmente pelo Administrador.",
      commissionPaid: false,
      commissionValue,
      depositPaid: false,
    };

    const { data, error } = await supabase.rpc("create_my_owner_appointment", {
      p_appointment: buildOwnerAppointmentPayload(appointmentToSave),
    });

    if (error) {
      alert(error.message || "Não foi possível criar o agendamento.");
      return;
    }

    const savedRow = (
      Array.isArray(data) ? data[0] : null
    ) as SupabaseAppointmentResponse | null;

    if (!savedRow) {
      alert("Não foi possível confirmar o agendamento criado.");
      return;
    }

    const newAppointment = mapSupabaseAppointmentToAppAppointment(savedRow);

    const updatedClients = upsertClientFromAppointment({
      clients,
      clientName: newApptClientName,
      clientPhone: newApptClientPhone,
      preferredProfessionalId: newApptProfId,
    });

    const nextAppointments = [newAppointment, ...appointments];

    setLiveAppointments(nextAppointments);

    onUpdateState({
      ...state,
      appointments: nextAppointments,
      clients: updatedClients,
    });

    void loadClientsFromSupabase(false);

    setShowApptModal(false);
    resetAppointmentForm();
  };

  const handleCreateAppointmentFromAgenda = async (
    payload: AgendaCreateAppointmentPayload,
  ): Promise<AgendaCreateAppointmentResult | void> => {
    const selectedService = services.find(
      (service) => service.id === payload.serviceId,
    );
    const selectedProfessional = professionals.find(
      (professional) => professional.id === payload.professionalId,
    );

    if (!selectedService || !selectedProfessional) {
      alert("Serviço ou profissional não encontrado.");
      return;
    }

    const commissionValue = calculateCommissionValue({
      service: selectedService,
      professional: selectedProfessional,
    });

    const appointmentToSave: Omit<Appointment, "id"> = {
      dateTime: `${payload.date}T${payload.time}`,
      clientName: payload.clientName,
      clientPhone: payload.clientPhone,
      serviceId: payload.serviceId,
      professionalId: payload.professionalId,
      price: selectedService.price,
      status: "confirmed",
      paymentType: payload.paymentType,
      notes: payload.notes || "Agendado pela Agenda Geral.",
      commissionPaid: false,
      commissionValue,
      depositPaid: false,
    };

    const { data, error } = await supabase.rpc("create_my_owner_appointment", {
      p_appointment: buildOwnerAppointmentPayload(appointmentToSave),
    });

    if (error) {
      alert(error.message || "Não foi possível criar o agendamento.");
      return;
    }

    const savedRow = (
      Array.isArray(data) ? data[0] : null
    ) as SupabaseAppointmentResponse | null;

    if (!savedRow) {
      alert("Não foi possível confirmar o agendamento criado.");
      return;
    }

    const newAppointment = mapSupabaseAppointmentToAppAppointment(savedRow);

    const updatedClients = upsertClientFromAppointment({
      clients,
      clientName: payload.clientName,
      clientPhone: payload.clientPhone,
      preferredProfessionalId: payload.professionalId,
    });

    const nextAppointments = [newAppointment, ...appointments];

    setLiveAppointments(nextAppointments);

    onUpdateState({
      ...state,
      appointments: nextAppointments,
      clients: updatedClients,
    });

    void loadClientsFromSupabase(false);

    const tokenResult = await supabase.rpc(
      "get_my_client_public_access_token_by_appointment",
      {
        p_appointment_id: newAppointment.id,
      },
    );

    if (tokenResult.error) {
      console.error(
        "Erro ao buscar token público do cliente:",
        tokenResult.error.message,
      );
    }

    const clientPublicToken = tokenResult.error
      ? ""
      : extractClientPublicToken(tokenResult.data);

    return {
      appointmentId: newAppointment.id,
      clientActionLink: clientPublicToken
        ? `${getAgendaSpeedPublicOrigin()}/meus-agendamentos/${clientPublicToken}`
        : "",
    };
  };

  const handleRescheduleAppointmentFromAgenda = async (
    appointmentId: string,
    date: string,
    time: string,
  ) => {
    const previousAppointments = appointments;

    const optimisticAppointments = appointments.map((appointment) => {
      if (appointment.id !== appointmentId) {
        return appointment;
      }

      return {
        ...appointment,
        dateTime: `${date}T${time}`,
        status: "confirmed" as AppointmentStatus,
        notes: appointment.notes
          ? `${appointment.notes} | Remarcado pela Agenda Geral.`
          : "Remarcado pela Agenda Geral.",
      };
    });

    setLiveAppointments(optimisticAppointments);

    onUpdateState({
      ...state,
      appointments: optimisticAppointments,
    });

    const { data, error } = await supabase.rpc("reschedule_my_appointment", {
      p_appointment_id: appointmentId,
      p_date: date,
      p_time: time,
    });

    if (error) {
      alert(error.message || "Não foi possível remarcar o agendamento.");
      setLiveAppointments(previousAppointments);

      onUpdateState({
        ...state,
        appointments: previousAppointments,
      });
      return;
    }

    const savedRow = (
      Array.isArray(data) ? data[0] : null
    ) as SupabaseAppointmentResponse | null;

    if (!savedRow) return;

    const savedAppointment = mapSupabaseAppointmentToAppAppointment(savedRow);

    const syncedAppointments = optimisticAppointments.map((appointment) => {
      if (appointment.id !== savedAppointment.id) return appointment;
      return savedAppointment;
    });

    setLiveAppointments(syncedAppointments);

    onUpdateState({
      ...state,
      appointments: syncedAppointments,
    });
  };

  const handleOpenCreateProfessional = () => {
    setEditingProf(null);
    resetProfessionalForm();
    setShowProfModal(true);
  };

  const handleEditProfTrigger = (professional: Professional) => {
    setEditingProf(professional);
    setProfName(professional.name);
    setProfPhone(professional.phone);
    setProfEmail(professional.email);
    setProfRole(professional.role);
    setProfAvatar(professional.avatar);
    setProfActive(professional.active);
    setProfDisplayOrder(
      Number(
        (professional as unknown as Record<string, unknown>).displayOrder,
      ) || 999,
    );
    setProfWorkDays(professional.workDays);
    setProfHoursStart(professional.workHoursStart);
    setProfHoursEnd(professional.workHoursEnd);
    setProfLunchStart(professional.lunchStart);
    setProfLunchEnd(professional.lunchEnd);
    setProfNoLunchBreak(Boolean(professional.noLunchBreak));
    setProfDefaultAppointmentDuration(
      Number(professional.defaultAppointmentDuration) || 30,
    );
    setProfServicesIds(professional.services);
    setProfRemType(
      professional.remType === "commission_fixed"
        ? "commission_fixed"
        : "commission_percent",
    );
    setProfRemValue(
      professional.remType === "commission_fixed"
        ? professional.remValue
        : professional.remValue || 40,
    );
    setProfChairRental(0);
    setShowProfModal(true);
  };

  const handleAddNewProf = async (
    event: React.FormEvent,
    media: {
      avatarFile: File | null;
      removeAvatar: boolean;
    },
  ) => {
    event.preventDefault();

    if (isSavingProfessional) return;

    if (!profName || !profPhone || !profRole) {
      alert("Favor inserir nome, WhatsApp e cargo do profissional.");
      return;
    }

    if (!tenantId) {
      alert("Não foi possível identificar a empresa para salvar a foto.");
      return;
    }

    setIsSavingProfessional(true);

    try {
      const existingAvatar = editingProf?.avatar || profAvatar.trim();
      const initialAvatar = media.removeAvatar ? "" : existingAvatar;

      const professionalToSave: Professional = {
        id: editingProf?.id || "",
        name: profName,
        phone: profPhone,
        email: profEmail || editingProf?.email || "",
        role: profRole,
        displayOrder: Number(profDisplayOrder) || 999,
        avatar: initialAvatar,
        active: editingProf ? profActive : true,
        workDays: profWorkDays,
        workHoursStart: profHoursStart,
        workHoursEnd: profHoursEnd,
        lunchStart: profLunchStart,
        lunchEnd: profLunchEnd,
        noLunchBreak: profNoLunchBreak,
        defaultAppointmentDuration:
          Number(profDefaultAppointmentDuration) || 30,
        services: profServicesIds,
        remType: (profRemType === "commission_fixed"
          ? "commission_fixed"
          : "commission_percent") as RemunerationType,
        remValue: Number(profRemValue) || 0,
        chairRentalValue: editingProf?.chairRentalValue || 0,
        chairRentalStatus: editingProf?.chairRentalStatus || "inactive",
        permissions: normalizeProfessionalPermissions(
          editingProf?.permissions || defaultProfessionalPermissions,
        ),
      };

      const firstSaveResult = await supabase.rpc("upsert_my_professional", {
        p_professional: buildProfessionalPayload(professionalToSave),
      });

      if (firstSaveResult.error) {
        throw new Error(
          firstSaveResult.error.message ||
            "Não foi possível salvar o profissional.",
        );
      }

      const firstSavedRow = (
        Array.isArray(firstSaveResult.data) ? firstSaveResult.data[0] : null
      ) as SupabaseProfessionalResponse | null;

      if (!firstSavedRow?.id) {
        throw new Error(
          "Profissional salvo, mas não foi possível recarregar o registro.",
        );
      }

      let finalSavedRow = firstSavedRow;
      let avatarFileToUpload = media.avatarFile;

      if (
        !avatarFileToUpload &&
        !media.removeAvatar &&
        existingAvatar.startsWith("data:image/")
      ) {
        avatarFileToUpload = await legacyDataUrlToPreparedImage({
          dataUrl: existingAvatar,
          maxWidth: 600,
          maxHeight: 600,
          maxOutputBytes: 200 * 1024,
          outputFileName: "avatar.webp",
        });
      }

      if (avatarFileToUpload) {
        const avatarUrl = await uploadTenantPublicImage({
          bucket: "professional-avatars",
          path: `${tenantId}/${firstSavedRow.id}.webp`,
          file: avatarFileToUpload,
        });

        const professionalWithAvatar: Professional = {
          ...mapSupabaseProfessionalToAppProfessional(firstSavedRow),
          avatar: avatarUrl,
        };

        const avatarSaveResult = await supabase.rpc("upsert_my_professional", {
          p_professional: buildProfessionalPayload(professionalWithAvatar),
        });

        if (avatarSaveResult.error) {
          throw new Error(
            avatarSaveResult.error.message ||
              "A foto foi enviada, mas não foi possível vinculá-la ao profissional.",
          );
        }

        const avatarSavedRow = (
          Array.isArray(avatarSaveResult.data)
            ? avatarSaveResult.data[0]
            : null
        ) as SupabaseProfessionalResponse | null;

        if (!avatarSavedRow?.id) {
          throw new Error(
            "A foto foi enviada, mas o cadastro atualizado não retornou.",
          );
        }

        finalSavedRow = avatarSavedRow;
      } else if (media.removeAvatar) {
        const { error: removeError } = await supabase.storage
          .from("professional-avatars")
          .remove([`${tenantId}/${firstSavedRow.id}.webp`]);

        if (removeError) {
          console.warn(
            "O cadastro ficou sem foto, mas o arquivo antigo não pôde ser removido:",
            removeError.message,
          );
        }
      }

      const savedProfessional =
        mapSupabaseProfessionalToAppProfessional(finalSavedRow);

      const nextProfessionals = editingProf
        ? professionals.map((professional) => {
            return professional.id === editingProf.id
              ? savedProfessional
              : professional;
          })
        : [savedProfessional, ...professionals];

      setLiveProfessionals(nextProfessionals);

      onUpdateState({
        ...state,
        professionals: nextProfessionals,
      });

      setShowProfModal(false);
      setEditingProf(null);
      resetProfessionalForm();
    } catch (error) {
      console.error("Erro ao salvar profissional:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar o profissional.",
      );
    } finally {
      setIsSavingProfessional(false);
    }
  };

  const handleDeleteProf = async (professionalId: string) => {
    if (!confirm("Tem certeza que deseja inativar este profissional?")) {
      return;
    }

    if (!isValidUuid(professionalId)) {
      const updatedProfessionals = professionals.filter((professional) => {
        return professional.id !== professionalId;
      });

      setLiveProfessionals(updatedProfessionals);

      onUpdateState({
        ...state,
        professionals: updatedProfessionals,
      });

      return;
    }

    const { data, error } = await supabase.rpc("deactivate_my_professional", {
      p_professional_id: professionalId,
    });

    if (error) {
      alert(error.message || "Não foi possível inativar o profissional.");
      return;
    }

    const savedRow = (
      Array.isArray(data) ? data[0] : null
    ) as SupabaseProfessionalResponse | null;
    const savedProfessional = savedRow?.id
      ? mapSupabaseProfessionalToAppProfessional(savedRow)
      : null;

    const updatedProfessionals = professionals.map((professional) => {
      if (professional.id !== professionalId) {
        return professional;
      }

      return (
        savedProfessional || {
          ...professional,
          active: false,
        }
      );
    });

    setLiveProfessionals(updatedProfessionals);

    onUpdateState({
      ...state,
      professionals: updatedProfessionals,
    });
  };

  const handleHardDeleteProf = (professionalId: string) => {
    const targetProfessional = professionals.find((professional) => {
      return professional.id === professionalId;
    });

    if (!targetProfessional) {
      alert("Profissional não encontrado.");
      return;
    }

    setProfessionalPendingHardDelete(targetProfessional);
  };

  const handleCancelHardDeleteProfessional = () => {
    if (isDeletingProfessional) return;

    setProfessionalPendingHardDelete(null);
  };

  const handleConfirmHardDeleteProfessional = async () => {
    const targetProfessional = professionalPendingHardDelete;

    if (!targetProfessional || isDeletingProfessional) {
      return;
    }

    setIsDeletingProfessional(true);

    try {
      if (!isValidUuid(targetProfessional.id)) {
        const updatedProfessionals = professionals.filter((professional) => {
          return professional.id !== targetProfessional.id;
        });

        setLiveProfessionals(updatedProfessionals);

        onUpdateState({
          ...state,
          professionals: updatedProfessionals,
        });

        setProfessionalPendingHardDelete(null);
        return;
      }

      const { error } = await supabase.rpc("delete_my_professional", {
        p_professional_id: targetProfessional.id,
      });

      if (error) {
        alert(
          error.message ||
            "Não foi possível excluir o profissional. Verifique se existem agendamentos vinculados a ele.",
        );
        return;
      }

      const updatedProfessionals = professionals.filter((professional) => {
        return professional.id !== targetProfessional.id;
      });

      setLiveProfessionals(updatedProfessionals);

      onUpdateState({
        ...state,
        professionals: updatedProfessionals,
      });

      setProfessionalPendingHardDelete(null);
    } finally {
      setIsDeletingProfessional(false);
    }
  };

  const handleOpenProfessionalAgenda = (professional: Professional) => {
    if (!professional.active) {
      alert("Este profissional está inativo e sem acesso à agenda.");
      return;
    }

    setQuickOpenProfessionalAgendaId(professional.id);
    setQuickOpenProfessionalAgendaKey((currentKey) => currentKey + 1);
    setActiveTab("agenda");
  };

  const handleGenerateProfessionalAccessLink = async (
    professional: Professional,
  ) => {
    if (!professional.id || !isValidUuid(professional.id)) {
      alert(
        "Este profissional ainda é um registro local/de teste. Salve ou recadastre o profissional no Supabase antes de gerar o link de acesso.",
      );
      return;
    }

    const { data, error } = await supabase.rpc(
      "generate_my_professional_access_token",
      {
        p_professional_id: professional.id,
      },
    );

    if (error) {
      alert(error.message || "Não foi possível gerar o link do profissional.");
      return;
    }

    const result = (Array.isArray(data) ? data[0] : null) as {
      professional_id?: string;
      professional_name?: string;
      token?: string;
      link_local?: string;
      link_futuro?: string;
      success?: boolean;
      message?: string;
    } | null;

    const productionOrigin = "https://agendaspeed.com.br";
    const professionalAccessLink = result?.token
      ? `${productionOrigin}/profissional-acesso/${result.token}`
      : String(result?.link_futuro || result?.link_local || "").replace(
          /^https?:\/\/localhost(?::\d+)?/i,
          productionOrigin,
        );

    if (!result?.success || !professionalAccessLink) {
      alert(
        result?.message || "Não foi possível gerar o link do profissional.",
      );
      return;
    }

    try {
      await navigator.clipboard.writeText(professionalAccessLink);
      alert(
        `Link do profissional copiado para a área de transferência:

${professionalAccessLink}`,
      );
    } catch {
      alert(`Link do profissional gerado:

${professionalAccessLink}`);
    }
  };

  const handleOpenCreateService = () => {
    setEditingService(null);
    resetServiceForm();
    setShowServiceModal(true);
  };

  const handleEditServiceTrigger = (service: Service) => {
    setEditingService(service);
    setServName(service.name);
    setServCategory(normalizeServiceCategoryName(service.category));
    setServDuration(service.duration);
    setServDisplayOrder(getServiceDisplayOrder(service));
    setServPrice(service.price);
    setServDescription(service.description);
    setServActive(service.active);
    setServRequireDeposit(service.requireDeposit);
    setServDepositValue(service.depositValue || 10);
    setShowServiceModal(true);
  };

  const handleAddNewService = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!servName || !servCategory || !servPrice || !servDuration) {
      alert("Favor preencher os dados do serviço.");
      return;
    }

    const normalizedCategory = normalizeServiceCategoryName(servCategory);
    const nextCategoryOrder =
      serviceCategoryOrders[normalizedCategory] ?? serviceCategories.length + 1;

    const serviceToSave = {
      id: editingService?.id || `serv-${Date.now()}`,
      name: servName,
      category: normalizedCategory,
      categoryOrder: nextCategoryOrder,
      displayOrder: Number(servDisplayOrder) || 999,
      duration: Number(servDuration) || 30,
      price: Number(servPrice) || 0,
      description: servDescription,
      professionals: editingService?.professionals || [],
      specificCommission: null,
      requireDeposit: servRequireDeposit,
      depositValue: servRequireDeposit ? Number(servDepositValue) || 0 : null,
      active: editingService ? servActive : true,
    } as Service;

    const { data, error } = await supabase.rpc("upsert_my_service", {
      p_service: buildServicePayload(serviceToSave),
    });

    if (error) {
      alert(error.message || "Não foi possível salvar o serviço.");
      return;
    }

    const savedRow = (
      Array.isArray(data) ? data[0] : null
    ) as SupabaseServiceResponse | null;

    if (!savedRow?.id) {
      alert("Serviço salvo, mas não foi possível recarregar o registro.");
      return;
    }

    const savedService = mapSupabaseServiceToAppService(savedRow);

    if (!serviceCategories.includes(normalizedCategory)) {
      setServiceCategories((currentCategories) => [
        ...currentCategories,
        normalizedCategory,
      ]);

      setServiceCategoryOrders((currentOrders) => ({
        ...currentOrders,
        [normalizedCategory]: nextCategoryOrder,
      }));
    }

    const nextServices = editingService
      ? services.map((service) => {
          return service.id === editingService.id ? savedService : service;
        })
      : [savedService, ...services];

    setLiveServices(nextServices);

    onUpdateState({
      ...state,
      services: nextServices,
    });

    setShowServiceModal(false);
    setEditingService(null);
    resetServiceForm();
  };

  const handleTogglePermission = async (
    professionalId: string,
    flag: keyof Professional["permissions"],
  ) => {
    const targetProfessional = professionals.find((professional) => {
      return professional.id === professionalId;
    });

    if (!targetProfessional) return;

    const updatedProfessional: Professional = {
      ...targetProfessional,
      permissions: {
        ...targetProfessional.permissions,
        [flag]: !targetProfessional.permissions[flag],
      },
    };

    const { data, error } = await supabase.rpc("upsert_my_professional", {
      p_professional: buildProfessionalPayload(updatedProfessional),
    });

    if (error) {
      alert(error.message || "Não foi possível salvar a permissão.");
      return;
    }

    const savedRow = (
      Array.isArray(data) ? data[0] : null
    ) as SupabaseProfessionalResponse | null;
    const savedProfessional = savedRow?.id
      ? mapSupabaseProfessionalToAppProfessional(savedRow)
      : updatedProfessional;

    const updatedProfessionals = professionals.map((professional) => {
      return professional.id === professionalId
        ? savedProfessional
        : professional;
    });

    setLiveProfessionals(updatedProfessionals);

    onUpdateState({
      ...state,
      professionals: updatedProfessionals,
    });

    setShowPermissionModal(savedProfessional);
  };

  const handlePermissionClassChange = async (
    professionalId: string,
    value: ProfessionalPermissionsClass,
  ) => {
    const targetProfessional = professionals.find((professional) => {
      return professional.id === professionalId;
    });

    if (!targetProfessional) return;

    const updatedProfessional: Professional = {
      ...targetProfessional,
      permissions: {
        ...targetProfessional.permissions,
        manageOwnCalendar: value,
      },
    };

    const { data, error } = await supabase.rpc("upsert_my_professional", {
      p_professional: buildProfessionalPayload(updatedProfessional),
    });

    if (error) {
      alert(error.message || "Não foi possível salvar a permissão.");
      return;
    }

    const savedRow = (
      Array.isArray(data) ? data[0] : null
    ) as SupabaseProfessionalResponse | null;
    const savedProfessional = savedRow?.id
      ? mapSupabaseProfessionalToAppProfessional(savedRow)
      : updatedProfessional;

    const updatedProfessionals = professionals.map((professional) => {
      return professional.id === professionalId
        ? savedProfessional
        : professional;
    });

    setLiveProfessionals(updatedProfessionals);

    onUpdateState({
      ...state,
      professionals: updatedProfessionals,
    });

    setShowPermissionModal(savedProfessional);
  };

  const handleApplySimplePermissions = async (
    professionalId: string,
    action: "manage_agenda" | "read_only" | "reports",
  ) => {
    const targetProfessional = professionals.find((professional) => {
      return professional.id === professionalId;
    });

    if (!targetProfessional) return;

    const currentCanViewReports =
      targetProfessional.permissions.viewFinancial ||
      targetProfessional.permissions.viewCommission;

    let nextPermissions: Professional["permissions"];

    if (action === "manage_agenda") {
      nextPermissions = {
        ...targetProfessional.permissions,
        viewOwnCalendar: true,
        createAppts: true,
        rescheduleAppts: true,
        cancelAppts: true,
        blockCalendar: true,
        openSpots: true,
        manageOwnCalendar: "yes" as ProfessionalPermissionsClass,
        viewChairRental: false,
      };
    } else if (action === "read_only") {
      nextPermissions = {
        ...targetProfessional.permissions,
        viewOwnCalendar: true,
        createAppts: false,
        rescheduleAppts: false,
        cancelAppts: false,
        blockCalendar: false,
        openSpots: false,
        manageOwnCalendar: "no" as ProfessionalPermissionsClass,
        viewChairRental: false,
      };
    } else {
      nextPermissions = {
        ...targetProfessional.permissions,
        viewFinancial: !currentCanViewReports,
        viewCommission: !currentCanViewReports,
        viewChairRental: false,
      };
    }

    const updatedProfessional: Professional = {
      ...targetProfessional,
      permissions: nextPermissions,
    };

    const { data, error } = await supabase.rpc("upsert_my_professional", {
      p_professional: buildProfessionalPayload(updatedProfessional),
    });

    if (error) {
      alert(error.message || "Não foi possível salvar as permissões.");
      return;
    }

    const savedRow = (
      Array.isArray(data) ? data[0] : null
    ) as SupabaseProfessionalResponse | null;
    const savedProfessional = savedRow?.id
      ? mapSupabaseProfessionalToAppProfessional(savedRow)
      : updatedProfessional;

    const updatedProfessionals = professionals.map((professional) => {
      return professional.id === professionalId
        ? savedProfessional
        : professional;
    });

    setLiveProfessionals(updatedProfessionals);

    onUpdateState({
      ...state,
      professionals: updatedProfessionals,
    });

    setShowPermissionModal(savedProfessional);
  };

  const handleAddServiceCategory = async (
    categoryName: string,
  ): Promise<ServiceActionResult> => {
    const normalizedCategory = normalizeServiceCategoryName(categoryName);

    if (!normalizedCategory) {
      return {
        success: false,
        title: "Nome obrigatório",
        message: "Informe o nome da categoria para continuar.",
      };
    }

    if (serviceCategories.includes(normalizedCategory)) {
      return {
        success: false,
        title: "Categoria já cadastrada",
        message: "Use outro nome ou edite a categoria existente.",
      };
    }

    const nextOrder = Object.keys(serviceCategoryOrders).length + 1;

    const { error } = await supabase.rpc("upsert_my_service_category", {
      p_name: normalizedCategory,
      p_sort_order: nextOrder,
    });

    if (error) {
      return {
        success: false,
        title: "Não foi possível cadastrar a categoria",
        message: error.message || "Tente novamente em alguns instantes.",
      };
    }

    setServiceCategories((currentCategories) => [
      ...currentCategories,
      normalizedCategory,
    ]);

    setServiceCategoryOrders((currentOrders) => ({
      ...currentOrders,
      [normalizedCategory]: nextOrder,
    }));

    setServiceCategoryStatuses((currentStatuses) => ({
      ...currentStatuses,
      [normalizedCategory]: true,
    }));

    setServCategory(normalizedCategory);

    return {
      success: true,
      title: "Categoria cadastrada",
      message: "A categoria já pode ser usada nos serviços e no carrossel da vitrine.",
    };
  };

  const handleRenameServiceCategory = async (
    currentName: string,
    newName: string,
  ): Promise<ServiceActionResult> => {
    const normalizedCurrentName = normalizeServiceCategoryName(currentName);
    const normalizedNewName = normalizeServiceCategoryName(newName);

    if (!normalizedNewName) {
      return {
        success: false,
        title: "Nome obrigatório",
        message: "Informe o novo nome da categoria.",
      };
    }

    const { data, error } = await supabase.rpc("rename_my_service_category", {
      p_current_name: normalizedCurrentName,
      p_new_name: normalizedNewName,
    });

    if (error) {
      return {
        success: false,
        title: "Não foi possível alterar o nome",
        message: error.message || "Tente novamente em alguns instantes.",
      };
    }

    const result = (Array.isArray(data) ? data[0] : null) as {
      success?: boolean;
      message?: string;
      old_name?: string;
      new_name?: string;
    } | null;

    if (!result?.success) {
      return {
        success: false,
        title: "Nome não alterado",
        message: result?.message || "Verifique o nome informado.",
      };
    }

    setServiceCategories((currentCategories) =>
      currentCategories.map((category) =>
        category === normalizedCurrentName ? normalizedNewName : category,
      ),
    );

    setServiceCategoryOrders((currentOrders) => {
      const nextOrders = { ...currentOrders };
      nextOrders[normalizedNewName] = nextOrders[normalizedCurrentName] ?? 999;
      delete nextOrders[normalizedCurrentName];
      return nextOrders;
    });

    setServiceCategoryStatuses((currentStatuses) => {
      const nextStatuses = { ...currentStatuses };
      nextStatuses[normalizedNewName] =
        nextStatuses[normalizedCurrentName] !== false;
      delete nextStatuses[normalizedCurrentName];
      return nextStatuses;
    });

    const nextServices = services.map((service) => {
      if (
        normalizeServiceCategoryName(service.category) !== normalizedCurrentName
      ) {
        return service;
      }

      return {
        ...service,
        category: normalizedNewName,
      };
    });

    setLiveServices(nextServices);

    onUpdateState({
      ...state,
      services: nextServices,
    });

    if (servCategory === normalizedCurrentName) {
      setServCategory(normalizedNewName);
    }

    return {
      success: true,
      title: "Nome da categoria alterado",
      message: "O novo nome já será usado nos serviços e no carrossel da vitrine.",
    };
  };

  const handleToggleServiceCategoryActive = async (
    categoryName: string,
  ): Promise<ServiceActionResult> => {
    const normalizedCategory = normalizeServiceCategoryName(categoryName);
    const nextActive = serviceCategoryStatuses[normalizedCategory] === false;

    const { data, error } = await supabase.rpc(
      "set_my_service_category_active",
      {
        p_name: normalizedCategory,
        p_active: nextActive,
      },
    );

    if (error) {
      return {
        success: false,
        title: "Não foi possível alterar a categoria",
        message: error.message || "Tente novamente em alguns instantes.",
      };
    }

    const result = (Array.isArray(data) ? data[0] : null) as {
      success?: boolean;
      message?: string;
      active?: boolean;
    } | null;

    if (!result?.success) {
      return {
        success: false,
        title: "Alteração não concluída",
        message: result?.message || "Tente novamente em alguns instantes.",
      };
    }

    setServiceCategoryStatuses((currentStatuses) => ({
      ...currentStatuses,
      [normalizedCategory]: nextActive,
    }));

    let nextServices = services;

    if (!nextActive) {
      nextServices = services.map((service) => {
        if (
          normalizeServiceCategoryName(service.category) !== normalizedCategory
        ) {
          return service;
        }

        return {
          ...service,
          active: false,
        };
      });

      setLiveServices(nextServices);

      onUpdateState({
        ...state,
        services: nextServices,
      });
    }

    return {
      success: true,
      title: nextActive ? "Categoria ativada" : "Categoria desativada",
      message: nextActive
        ? "A categoria voltou ao cadastro. Ative manualmente os serviços que deseja exibir."
        : "A categoria e todos os serviços vinculados foram retirados da vitrine.",
    };
  };

  const handleToggleServiceActive = async (
    service: Service,
  ): Promise<ServiceActionResult> => {
    const serviceToSave: Service = {
      ...service,
      active: !service.active,
    };

    const { data, error } = await supabase.rpc("upsert_my_service", {
      p_service: buildServicePayload(serviceToSave),
    });

    if (error) {
      return {
        success: false,
        title: "Não foi possível alterar o serviço",
        message: error.message || "Tente novamente em alguns instantes.",
      };
    }

    const savedRow = (
      Array.isArray(data) ? data[0] : null
    ) as SupabaseServiceResponse | null;

    if (!savedRow?.id) {
      return {
        success: false,
        title: "Alteração não confirmada",
        message: "O serviço foi processado, mas o cadastro atualizado não retornou.",
      };
    }

    const savedService = mapSupabaseServiceToAppService(savedRow);
    const nextServices = services.map((currentService) => {
      return currentService.id === savedService.id ? savedService : currentService;
    });

    setLiveServices(nextServices);
    onUpdateState({
      ...state,
      services: nextServices,
    });

    return {
      success: true,
      title: savedService.active ? "Serviço ativado" : "Serviço desativado",
      message: savedService.active
        ? "O serviço voltou a aparecer na vitrine para novos agendamentos."
        : "O serviço foi retirado da vitrine, mas o histórico foi preservado.",
    };
  };

  const handleDeleteService = async (
    service: Service,
  ): Promise<ServiceActionResult> => {
    const { data, error } = await supabase.rpc("delete_my_service", {
      p_service_id: service.id,
    });

    if (error) {
      return {
        success: false,
        title: "Não foi possível excluir o serviço",
        message: error.message || "Tente novamente em alguns instantes.",
      };
    }

    const result = (Array.isArray(data) ? data[0] : null) as {
      success?: boolean;
      message?: string;
      code?: string;
    } | null;

    if (!result?.success) {
      return {
        success: false,
        title:
          result?.code === "HAS_APPOINTMENTS"
            ? "Este serviço possui histórico"
            : "Não foi possível excluir o serviço",
        message:
          result?.message ||
          "Desative o serviço para removê-lo da vitrine sem perder informações antigas.",
      };
    }

    const nextServices = services.filter((currentService) => {
      return currentService.id !== service.id;
    });

    setLiveServices(nextServices);
    onUpdateState({
      ...state,
      services: nextServices,
    });

    return {
      success: true,
      title: "Serviço excluído",
      message: "O serviço foi removido definitivamente do cadastro.",
    };
  };

  const handleDeleteServiceCategory = async (
    categoryName: string,
  ): Promise<ServiceActionResult> => {
    const normalizedCategory = normalizeServiceCategoryName(categoryName);

    const { data, error } = await supabase.rpc("delete_my_service_category", {
      p_name: normalizedCategory,
    });

    if (error) {
      return {
        success: false,
        title: "Não foi possível excluir a categoria",
        message: error.message || "Tente novamente em alguns instantes.",
      };
    }

    const result = (Array.isArray(data) ? data[0] : null) as {
      success?: boolean;
      message?: string;
      code?: string;
    } | null;

    if (!result?.success) {
      return {
        success: false,
        title:
          result?.code === "HAS_SERVICES"
            ? "Esta categoria ainda possui serviços"
            : "Não foi possível excluir a categoria",
        message:
          result?.message ||
          "Mova ou exclua os serviços vinculados antes de remover a categoria.",
      };
    }

    setServiceCategories((currentCategories) => {
      const nextCategories = currentCategories.filter((category) => {
        return category !== normalizedCategory;
      });

      if (servCategory === normalizedCategory) {
        setServCategory(nextCategories[0] || "");
      }

      return nextCategories;
    });

    setServiceCategoryOrders((currentOrders) => {
      const nextOrders = { ...currentOrders };
      delete nextOrders[normalizedCategory];
      return nextOrders;
    });

    setServiceCategoryStatuses((currentStatuses) => {
      const nextStatuses = { ...currentStatuses };
      delete nextStatuses[normalizedCategory];
      return nextStatuses;
    });

    return {
      success: true,
      title: "Categoria excluída",
      message: "A categoria foi removida definitivamente do cadastro.",
    };
  };

  const handleChangeServiceCategoryOrder = async (
    categoryName: string,
    order: number,
  ): Promise<ServiceActionResult> => {
    const normalizedCategory = normalizeServiceCategoryName(categoryName);
    const normalizedOrder = Number.isFinite(order) && order > 0 ? order : 999;

    setServiceCategoryOrders((currentOrders) => ({
      ...currentOrders,
      [normalizedCategory]: normalizedOrder,
    }));

    const { error } = await supabase.rpc("upsert_my_service_category", {
      p_name: normalizedCategory,
      p_sort_order: normalizedOrder,
    });

    if (error) {
      return {
        success: false,
        title: "Não foi possível salvar a ordem",
        message: error.message || "Tente novamente em alguns instantes.",
      };
    }

    const updatedServices = services.map((service) => {
      if (
        normalizeServiceCategoryName(service.category) !== normalizedCategory
      ) {
        return service;
      }

      return {
        ...service,
        categoryOrder: normalizedOrder,
      };
    });

    setLiveServices(updatedServices);

    onUpdateState({
      ...state,
      services: updatedServices,
    });

    return {
      success: true,
      title: "Ordem atualizada",
      message: "A posição da categoria no carrossel foi salva.",
    };
  };

  const handleSaveCompanyConfig = async (
    event: React.FormEvent,
    mediaFiles: SettingsViewMediaFiles,
  ) => {
    event.preventDefault();

    if (isSavingTenantSettings) return;

    if (!tenantId) {
      alert('Não foi possível identificar a empresa para salvar as imagens.');
      return;
    }

    setSettingsSaveMessage("");
    setIsSavingTenantSettings(true);

    try {
      let nextLogoUrl = configLogo;
      let nextCoverUrl = configCoverImage;

      let logoFileToUpload = mediaFiles.logoFile;
      let coverFileToUpload = mediaFiles.coverFile;

      if (!logoFileToUpload && configLogo.startsWith('data:image/')) {
        logoFileToUpload = await legacyDataUrlToPreparedImage({
          dataUrl: configLogo,
          maxWidth: 500,
          maxHeight: 500,
          maxOutputBytes: 150 * 1024,
          outputFileName: 'logo.webp',
        });
      }

      if (!coverFileToUpload && configCoverImage.startsWith('data:image/')) {
        coverFileToUpload = await legacyDataUrlToPreparedImage({
          dataUrl: configCoverImage,
          maxWidth: 1600,
          maxHeight: 700,
          maxOutputBytes: 300 * 1024,
          outputFileName: 'cover.webp',
        });
      }

      if (logoFileToUpload) {
        nextLogoUrl = await uploadTenantPublicImage({
          bucket: 'tenant-logos',
          path: `${tenantId}/logo.webp`,
          file: logoFileToUpload,
        });
      }

      if (coverFileToUpload) {
        nextCoverUrl = await uploadTenantPublicImage({
          bucket: 'tenant-covers',
          path: `${tenantId}/cover.webp`,
          file: coverFileToUpload,
        });
      }

      const { data, error } = await supabase.rpc('update_my_tenant_settings', {
        p_name: configName,
        p_address: configAddress,
        p_phone: configPhone,
        p_instagram: configInstagram,
        p_logo_url: nextLogoUrl,
        p_cover_url: nextCoverUrl,
        p_default_msg_template: configDefaultTemplate,
        p_booking_min_lead_time_minutes: bookingMinLeadTimeMinutes,
        p_booking_min_cancel_lead_time_minutes: bookingMinCancelLeadTimeMinutes,
        p_booking_min_reschedule_lead_time_minutes:
          bookingMinRescheduleLeadTimeMinutes,
        p_booking_allow_client_confirmation: bookingAllowClientConfirmation,
        p_booking_allow_client_cancellation: bookingAllowClientCancellation,
        p_booking_allow_client_reschedule: bookingAllowClientReschedule,
        p_booking_slot_interval_minutes: bookingSlotIntervalMinutes,
        p_booking_max_future_days: bookingMaxFutureDays,
        p_booking_work_hours_start: bookingWorkHoursStart,
        p_booking_work_hours_end: bookingWorkHoursEnd,
        p_booking_lunch_start: bookingLunchStart,
        p_booking_lunch_end: bookingLunchEnd,
      });

      if (error) {
        throw new Error(error.message || 'Não foi possível salvar as configurações.');
      }

      const saveResult = Array.isArray(data) ? data[0] : null;

      if (saveResult && saveResult.success === false) {
        throw new Error(
          saveResult.message ||
            'Não foi possível salvar as configurações no Supabase.',
        );
      }

      const updatedConfig: EstablishmentConfig = {
        ...config,
        name: configName,
        address: configAddress,
        phone: configPhone,
        instagram: configInstagram,
        logo: nextLogoUrl,
        coverImage: nextCoverUrl,
        workHoursStart: bookingWorkHoursStart,
        workHoursEnd: bookingWorkHoursEnd,
        minLeadTimeMinutes: bookingMinLeadTimeMinutes,
        maxFutureDays: bookingMaxFutureDays,
        autoApprove: configAutoApprove,
        defaultMsgTemplate: configDefaultTemplate,
      };

      setConfigLogo(nextLogoUrl);
      setConfigCoverImage(nextCoverUrl);

      onUpdateState({
        ...state,
        config: updatedConfig,
      });

      setSettingsSaveMessage("Alterações salvas com sucesso.");
      setSettingsSaveSuccessVersion((currentVersion) => currentVersion + 1);
    } catch (error) {
      setSettingsSaveMessage("");
      console.error('Erro ao salvar configurações da empresa:', error);
      alert(
        error instanceof Error
          ? `Não foi possível salvar: ${error.message}`
          : 'Não foi possível salvar as configurações.',
      );
    } finally {
      setIsSavingTenantSettings(false);
    }
  };

  const handleAddManualClient = (clientData: {
    name: string;
    phone: string;
    birthDate?: string;
  }) => {
    const newPhoneNormalized = normalizeClientPhone(clientData.phone);

    const alreadyExists = clients.some((client) => {
      const clientPhoneNormalized =
        client.phoneNormalized || normalizeClientPhone(client.phone);

      return clientPhoneNormalized === newPhoneNormalized;
    });

    if (alreadyExists) {
      alert("Já existe um cliente cadastrado com este WhatsApp.");
      return;
    }

    if (!tenantId) {
      alert("Não foi possível identificar a empresa para cadastrar o cliente.");
      return;
    }

    const notes = "Cliente cadastrado manualmente pelo estabelecimento.";

    void (async () => {
      const { data, error } = await supabase
        .from("clients")
        .insert({
          tenant_id: tenantId,
          name: clientData.name,
          phone: clientData.phone,
          birth_date: clientData.birthDate || null,
          notes,
        })
        .select(SUPABASE_CLIENTS_SELECT)
        .limit(1);

      if (error) {
        alert(error.message || "Não foi possível cadastrar o cliente.");
        return;
      }

      const savedRow = (
        Array.isArray(data) ? data[0] : null
      ) as SupabaseClientResponse | null;

      if (!savedRow) {
        alert("Cliente salvo, mas não foi possível recarregar o registro.");
        void loadClientsFromSupabase(false);
        return;
      }

      const savedClient = mapSupabaseClientToAppClient(savedRow);
      const nextClients = [savedClient, ...clients];

      setLiveClients(nextClients);

      onUpdateState({
        ...state,
        clients: nextClients,
      });
    })();
  };

  const handleUpdateClient = (
    clientId: string,
    updates: {
      name: string;
      phone: string;
      birthDate?: string;
    },
  ): boolean => {
    const newPhoneNormalized = normalizeClientPhone(updates.phone);

    const alreadyExists = clients.some((client) => {
      const clientPhoneNormalized =
        client.phoneNormalized || normalizeClientPhone(client.phone);

      return (
        client.id !== clientId && clientPhoneNormalized === newPhoneNormalized
      );
    });

    if (alreadyExists) {
      alert("Já existe outro cliente cadastrado com este WhatsApp.");
      return false;
    }

    const previousClients = clients;

    const optimisticClients: Client[] = clients.map((client) => {
      if (client.id !== clientId) {
        return client;
      }

      const previousPhoneNormalized =
        client.phoneNormalized || normalizeClientPhone(client.phone);

      const phoneHistory =
        previousPhoneNormalized !== newPhoneNormalized
          ? Array.from(
              new Set(
                [
                  ...(client.phoneHistory || []),
                  previousPhoneNormalized,
                ].filter(Boolean),
              ),
            )
          : client.phoneHistory || [];

      return {
        ...client,
        name: updates.name,
        phone: updates.phone,
        phoneNormalized: newPhoneNormalized,
        phoneHistory,
        birthDate: updates.birthDate,
      };
    });

    setLiveClients(optimisticClients);

    onUpdateState({
      ...state,
      clients: optimisticClients,
    });

    void (async () => {
      const { data, error } = await supabase
        .from("clients")
        .update({
          name: updates.name,
          phone: updates.phone,
          birth_date: updates.birthDate || null,
        })
        .eq("id", clientId)
        .select(SUPABASE_CLIENTS_SELECT)
        .limit(1);

      if (error) {
        alert(error.message || "Não foi possível atualizar o cliente.");
        setLiveClients(previousClients);

        onUpdateState({
          ...state,
          clients: previousClients,
        });
        return;
      }

      const savedRow = (
        Array.isArray(data) ? data[0] : null
      ) as SupabaseClientResponse | null;

      if (!savedRow) {
        void loadClientsFromSupabase(false);
        return;
      }

      const savedClient = mapSupabaseClientToAppClient(savedRow);
      const syncedClients = optimisticClients.map((client) => {
        return client.id === savedClient.id ? savedClient : client;
      });

      setLiveClients(syncedClients);

      onUpdateState({
        ...state,
        clients: syncedClients,
      });
    })();

    return true;
  };

  const handleDeleteClient = async (clientId: string) => {
    const targetClient = clients.find((client) => client.id === clientId);

    if (!targetClient) {
      alert("Cliente não encontrado.");
      return;
    }

    const previousClients = clients;
    const nextClients = clients.filter((client) => client.id !== clientId);

    setLiveClients(nextClients);

    onUpdateState({
      ...state,
      clients: nextClients,
    });

    const { error } = await supabase
      .from("clients")
      .delete()
      .eq("id", clientId);

    if (error) {
      alert(error.message || "Não foi possível excluir o cliente.");
      setLiveClients(previousClients);

      onUpdateState({
        ...state,
        clients: previousClients,
      });
    }
  };

  const handleMarkAppointmentCompletedForReceipt = (appointmentId: string) => {
    const updatedAppointments = appointments.map((appointment) => {
      if (appointment.id !== appointmentId) {
        return appointment;
      }

      return {
        ...appointment,
        status: "completed" as AppointmentStatus,
      };
    });

    const updatedClients = updateClientsAfterAppointmentStatusChange({
      clients,
      appointments,
      appointmentId,
      destinationStatus: "completed",
    });

    setLiveAppointments(updatedAppointments);

    onUpdateState({
      ...state,
      appointments: updatedAppointments,
      clients: updatedClients,
      receipts,
      cashExpenses,
    } as unknown as typeof state);
  };

  const handleConfirmReceipt = async (payload: ReceiptPayload) => {
    if (!tenantId) {
      alert("Não foi possível identificar a empresa para salvar o recebimento.");
      return;
    }

    const draftReceiptItems = buildReceiptItems({
      draftItems: payload.items,
      receiptId: "pending-receipt",
      services,
      professionals,
    });

    const subtotal = draftReceiptItems.reduce((sum, item) => sum + item.price, 0);
    const discountValue = Math.max(
      0,
      Math.min(Number(payload.discountValue) || 0, subtotal),
    );
    const totalAmount = Math.max(0, subtotal - discountValue);

    const { data: receiptData, error: receiptError } = await supabase
      .from("receipts")
      .insert(
        buildReceiptInsertPayload({
          tenantId,
          payload,
          subtotal,
          discountValue,
          totalAmount,
        }),
      )
      .select(SUPABASE_RECEIPTS_SELECT)
      .limit(1);

    if (receiptError) {
      alert(receiptError.message || "Não foi possível salvar o recebimento.");
      return;
    }

    const savedReceiptRow = (Array.isArray(receiptData)
      ? receiptData[0]
      : null) as SupabaseReceiptResponse | null;

    if (!savedReceiptRow?.id) {
      alert("Recebimento salvo, mas não foi possível confirmar o registro.");
      void loadFinancialRecordsFromSupabase(false);
      return;
    }

    const receiptItems = buildReceiptItems({
      draftItems: payload.items,
      receiptId: savedReceiptRow.id,
      services,
      professionals,
    });

    const receiptItemsPayload = receiptItems.map((receiptItem) => {
      return buildReceiptItemInsertPayload({
        tenantId,
        receiptItem,
      });
    });

    let savedReceiptItemRows: SupabaseReceiptItemResponse[] = [];

    if (receiptItemsPayload.length > 0) {
      const { data: receiptItemsData, error: receiptItemsError } = await supabase
        .from("receipt_items")
        .insert(receiptItemsPayload)
        .select(SUPABASE_RECEIPT_ITEMS_SELECT);

      if (receiptItemsError) {
        await supabase.from("receipts").delete().eq("id", savedReceiptRow.id);
        alert(
          receiptItemsError.message ||
            "Não foi possível salvar os itens do recebimento.",
        );
        void loadFinancialRecordsFromSupabase(false);
        return;
      }

      savedReceiptItemRows = (Array.isArray(receiptItemsData)
        ? receiptItemsData
        : []) as SupabaseReceiptItemResponse[];
    }

    if (toNullableUuid(payload.appointmentId)) {
      const { error: appointmentStatusError } = await supabase.rpc(
        "update_my_appointment_status",
        {
          p_appointment_id: payload.appointmentId,
          p_status: "completed",
        },
      );

      if (appointmentStatusError) {
        console.error(
          "Recebimento salvo, mas o status do atendimento não foi atualizado:",
          appointmentStatusError.message,
        );
      }
    }

    const savedReceipt = mapSupabaseReceiptToAppReceipt({
      receipt: savedReceiptRow,
      items: savedReceiptItemRows,
    });
    const updatedReceipts = [savedReceipt, ...receipts];

    const updatedAppointments = appointments.map((appointment) => {
      if (appointment.id !== payload.appointmentId) {
        return appointment;
      }

      return {
        ...appointment,
        status: "completed" as AppointmentStatus,
        paymentType: payload.paymentType,
        price:
          receiptItems.find((item) => item.appointmentId === appointment.id)
            ?.price || appointment.price,
      };
    });

    setReceipts(updatedReceipts);
    setLiveAppointments(updatedAppointments);
    void loadClientsFromSupabase(false);

    onUpdateState({
      ...state,
      appointments: updatedAppointments,
      receipts: updatedReceipts,
      cashExpenses,
    } as unknown as typeof state);
  };

  const handleConfirmCashExpense = async (payload: {
    description: string;
    amount: number;
    paymentType: PaymentType;
    notes?: string;
  }) => {
    if (!tenantId) {
      alert("Não foi possível identificar a empresa para salvar a despesa.");
      return;
    }

    const today = new Date().toLocaleDateString("en-CA", {
      timeZone: "America/Sao_Paulo",
    });

    const { data, error } = await supabase
      .from("cash_expenses")
      .insert({
        tenant_id: tenantId,
        description: payload.description,
        amount: Number(payload.amount) || 0,
        payment_type: payload.paymentType,
        expense_date: today,
        notes: payload.notes || null,
      })
      .select(SUPABASE_CASH_EXPENSES_SELECT)
      .limit(1);

    if (error) {
      alert(error.message || "Não foi possível salvar a despesa.");
      return;
    }

    const savedRow = (Array.isArray(data)
      ? data[0]
      : null) as SupabaseCashExpenseResponse | null;

    if (!savedRow) {
      alert("Despesa salva, mas não foi possível recarregar o registro.");
      void loadFinancialRecordsFromSupabase(false);
      return;
    }

    const savedExpense = mapSupabaseCashExpenseToAppCashExpense(savedRow);
    const updatedExpenses = [savedExpense, ...cashExpenses];

    setCashExpenses(updatedExpenses);

    onUpdateState({
      ...state,
      appointments,
      clients,
      receipts,
      cashExpenses: updatedExpenses,
    } as unknown as typeof state);
  };

  const sortedServices = sortServicesForDisplay({
    services,
    categoryOrders: serviceCategoryOrders,
  });

  return (
    <div
      id="owner-dashboard"
      className="min-h-screen bg-neutral-50 flex flex-col font-sans text-neutral-900"
    >
      <OwnerHeader
        logoUrl={configLogo}
        companyName={configName}
        onNavigateToClient={onNavigateToClient}
        onLogOut={onLogOut}
      />

      <div className="flex-1 flex flex-col lg:flex-row max-w-7xl w-full mx-auto">
        <OwnerSidebar
          activeTab={activeTab}
          onChangeTab={handleChangeOwnerTab}
          onOpenTodayAgenda={openTodayAgenda}
        />

        <main
          id="admin-workspace-pane"
          className="flex-1 p-4 sm:p-6 space-y-6 overflow-hidden"
        >
          {appointmentsLoadError && (
            <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-bold text-red-800">
              Não foi possível carregar a agenda real do Supabase: {appointmentsLoadError}
            </div>
          )}

          {isLoadingAppointments && (
            <div className="rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3 text-xs font-bold text-orange-800">
              Carregando agenda real do Supabase...
            </div>
          )}
          {activeTab === "painel" && (
            <DashboardHomeView
              baseDateStr={baseDateStr}
              appointments={appointments}
              professionals={professionals}
              services={services}
              configWorkDays={config.workDays}
              financialSummary={financialSummary}
              onChangeTab={setActiveTab}
              onOpenTodayAgenda={openTodayAgenda}
              onUpdateAppointmentStatus={handleModifyStatus}
            />
          )}

          {activeTab === "agenda" && (
            <AgendaView
              appointments={appointments}
              professionals={professionals}
              services={services}
              config={config}
              clients={clients}
              quickOpenProfessionalAgendaId={quickOpenProfessionalAgendaId}
              quickOpenProfessionalAgendaKey={quickOpenProfessionalAgendaKey}
              onCreateAppointment={handleCreateAppointmentFromAgenda}
              onUpdateAppointmentStatus={handleModifyStatus}
            />
          )}

          {activeTab === "profissionais" && isLoadingProfessionals && (
            <div className="rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3 text-xs font-bold text-orange-800">
              Carregando profissionais reais do Supabase...
            </div>
          )}

          {activeTab === "profissionais" && (
            <ProfessionalsView
              professionals={professionals}
              onOpenCreateProfessional={handleOpenCreateProfessional}
              onEditProfessional={handleEditProfTrigger}
              onDeleteProfessional={handleDeleteProf}
              onHardDeleteProfessional={handleHardDeleteProf}
              onOpenPermissions={setShowPermissionModal}
              onGenerateProfessionalLink={handleGenerateProfessionalAccessLink}
              onOpenProfessionalAgenda={handleOpenProfessionalAgenda}
            />
          )}

          {activeTab === "servicos" && isLoadingServices && (
            <div className="rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3 text-xs font-bold text-orange-800">
              Carregando serviços reais do Supabase...
            </div>
          )}

          {activeTab === "servicos" && (
            <ServicesView
              services={sortedServices}
              categories={serviceCategories}
              categoryOrders={serviceCategoryOrders}
              categoryStatuses={serviceCategoryStatuses}
              onOpenCreateService={handleOpenCreateService}
              onEditService={handleEditServiceTrigger}
              onAddCategory={handleAddServiceCategory}
              onRenameCategory={handleRenameServiceCategory}
              onToggleCategoryActive={handleToggleServiceCategoryActive}
              onToggleServiceActive={handleToggleServiceActive}
              onDeleteService={handleDeleteService}
              onDeleteCategory={handleDeleteServiceCategory}
              onChangeCategoryOrder={handleChangeServiceCategoryOrder}
            />
          )}

          {activeTab === "clientes" && clientsLoadError && (
            <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-bold text-red-800">
              Não foi possível carregar clientes reais do Supabase: {clientsLoadError}
            </div>
          )}

          {activeTab === "clientes" && isLoadingClients && (
            <div className="rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3 text-xs font-bold text-orange-800">
              Carregando clientes reais do Supabase...
            </div>
          )}

          {activeTab === "clientes" && (
            <ClientsView
              clients={filteredClients}
              appointments={appointments}
              services={services}
              professionals={professionals}
              clientSearch={clientSearch}
              onChangeClientSearch={setClientSearch}
              onAddClient={handleAddManualClient}
              onUpdateClient={handleUpdateClient}
              onDeleteClient={handleDeleteClient}
            />
          )}

          {activeTab === "recebimentos" && financialRecordsLoadError && (
            <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-bold text-red-800">
              Não foi possível carregar o caixa real do Supabase: {financialRecordsLoadError}
            </div>
          )}

          {activeTab === "recebimentos" && isLoadingFinancialRecords && (
            <div className="rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3 text-xs font-bold text-orange-800">
              Carregando recebimentos e despesas reais do Supabase...
            </div>
          )}

          {activeTab === "recebimentos" && (
            <ReceiptsView
              clients={clients}
              appointments={appointments}
              services={services}
              professionals={professionals}
              receipts={receipts}
              cashExpenses={cashExpenses}
              companyName={configName}
              companyAddress={configAddress}
              companyPhone={configPhone}
              companyInstagram={configInstagram}
              onMarkAppointmentCompleted={
                handleMarkAppointmentCompletedForReceipt
              }
              onConfirmReceipt={handleConfirmReceipt}
              onConfirmExpense={handleConfirmCashExpense}
            />
          )}

          {activeTab === "financeiro" && (
            <FinanceView
              professionals={professionals}
              services={services}
              completedAppointments={financialSummary.completedAppointments}
              cashExpenses={cashExpenses}
              companyName={configName}
              companyAddress={configAddress}
              companyPhone={configPhone}
            />
          )}

          {activeTab === "configuracoes" && (
            <SettingsView
              configName={configName}
              configAddress={configAddress}
              configPhone={configPhone}
              configInstagram={configInstagram}
              configLogo={configLogo}
              configCoverImage={configCoverImage}
              configDefaultTemplate={configDefaultTemplate}
              bookingMinLeadTimeMinutes={bookingMinLeadTimeMinutes}
              bookingMinCancelLeadTimeMinutes={bookingMinCancelLeadTimeMinutes}
              bookingMinRescheduleLeadTimeMinutes={
                bookingMinRescheduleLeadTimeMinutes
              }
              bookingAllowClientConfirmation={bookingAllowClientConfirmation}
              bookingAllowClientCancellation={bookingAllowClientCancellation}
              bookingAllowClientReschedule={bookingAllowClientReschedule}
              bookingSlotIntervalMinutes={bookingSlotIntervalMinutes}
              bookingMaxFutureDays={bookingMaxFutureDays}
              bookingWorkHoursStart={bookingWorkHoursStart}
              bookingWorkHoursEnd={bookingWorkHoursEnd}
              bookingLunchStart={bookingLunchStart}
              bookingLunchEnd={bookingLunchEnd}
              onChangeConfigName={setConfigName}
              onChangeConfigAddress={setConfigAddress}
              onChangeConfigPhone={setConfigPhone}
              onChangeConfigInstagram={setConfigInstagram}
              onChangeConfigLogo={setConfigLogo}
              onChangeConfigCoverImage={setConfigCoverImage}
              onChangeConfigDefaultTemplate={setConfigDefaultTemplate}
              onChangeBookingMinLeadTimeMinutes={setBookingMinLeadTimeMinutes}
              onChangeBookingMinCancelLeadTimeMinutes={
                setBookingMinCancelLeadTimeMinutes
              }
              onChangeBookingMinRescheduleLeadTimeMinutes={
                setBookingMinRescheduleLeadTimeMinutes
              }
              onChangeBookingAllowClientConfirmation={
                setBookingAllowClientConfirmation
              }
              onChangeBookingAllowClientCancellation={
                setBookingAllowClientCancellation
              }
              onChangeBookingAllowClientReschedule={
                setBookingAllowClientReschedule
              }
              onChangeBookingSlotIntervalMinutes={setBookingSlotIntervalMinutes}
              onChangeBookingMaxFutureDays={setBookingMaxFutureDays}
              onChangeBookingWorkHoursStart={setBookingWorkHoursStart}
              onChangeBookingWorkHoursEnd={setBookingWorkHoursEnd}
              onChangeBookingLunchStart={setBookingLunchStart}
              onChangeBookingLunchEnd={setBookingLunchEnd}
              isSaving={isSavingTenantSettings}
              saveSuccessVersion={settingsSaveSuccessVersion}
              saveSuccessMessage={settingsSaveMessage}
              onSubmit={handleSaveCompanyConfig}
            />
          )}
        </main>
      </div>

      {professionalPendingHardDelete && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-3xl border border-neutral-200 bg-white p-5 shadow-2xl">
            <h2 className="text-lg font-black text-[#1A3038]">
              Excluir profissional?
            </h2>

            <p className="mt-2 text-sm leading-relaxed text-neutral-600">
              Deseja excluir definitivamente{" "}
              <strong className="text-neutral-900">
                {professionalPendingHardDelete.name}
              </strong>
              ? A exclusão pode ser bloqueada caso existam agendamentos vinculados.
            </p>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleCancelHardDeleteProfessional}
                disabled={isDeletingProfessional}
                className="rounded-2xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-black text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Não
              </button>

              <button
                type="button"
                onClick={handleConfirmHardDeleteProfessional}
                disabled={isDeletingProfessional}
                className="rounded-2xl bg-red-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDeletingProfessional ? "Excluindo..." : "Sim, excluir"}
              </button>
            </div>
          </div>
        </div>
      )}

      <AppointmentModal
        isOpen={showApptModal}
        services={services}
        professionals={professionals}
        clientName={newApptClientName}
        clientPhone={newApptClientPhone}
        serviceId={newApptServiceId}
        professionalId={newApptProfId}
        date={newApptDate}
        time={newApptTime}
        notes={newApptNotes}
        paymentType={newApptPayment}
        onChangeClientName={setNewApptClientName}
        onChangeClientPhone={setNewApptClientPhone}
        onChangeServiceId={setNewApptServiceId}
        onChangeProfessionalId={setNewApptProfId}
        onChangeDate={setNewApptDate}
        onChangeTime={setNewApptTime}
        onChangeNotes={setNewApptNotes}
        onChangePaymentType={setNewApptPayment}
        onClose={() => setShowApptModal(false)}
        onSubmit={handleAddManualAppt}
      />

      <ProfessionalModal
        isOpen={showProfModal}
        editingProfessional={editingProf}
        services={services}
        name={profName}
        phone={profPhone}
        email={profEmail}
        role={profRole}
        avatar={profAvatar}
        active={profActive}
        displayOrder={profDisplayOrder}
        workDays={profWorkDays}
        workHoursStart={profHoursStart}
        workHoursEnd={profHoursEnd}
        lunchStart={profLunchStart}
        lunchEnd={profLunchEnd}
        noLunchBreak={profNoLunchBreak}
        defaultAppointmentDuration={profDefaultAppointmentDuration}
        servicesIds={profServicesIds}
        remunerationType={profRemType}
        remunerationValue={profRemValue}
        onChangeName={setProfName}
        onChangePhone={setProfPhone}
        onChangeEmail={setProfEmail}
        onChangeRole={setProfRole}
        onChangeAvatar={setProfAvatar}
        onChangeActive={setProfActive}
        onChangeDisplayOrder={setProfDisplayOrder}
        onChangeWorkDays={setProfWorkDays}
        onChangeWorkHoursStart={setProfHoursStart}
        onChangeWorkHoursEnd={setProfHoursEnd}
        onChangeLunchStart={setProfLunchStart}
        onChangeLunchEnd={setProfLunchEnd}
        onChangeNoLunchBreak={setProfNoLunchBreak}
        onChangeDefaultAppointmentDuration={setProfDefaultAppointmentDuration}
        onChangeServicesIds={setProfServicesIds}
        onChangeRemunerationType={setProfRemType}
        onChangeRemunerationValue={setProfRemValue}
        isSaving={isSavingProfessional}
        onClose={() => {
          setShowProfModal(false);
          setEditingProf(null);
        }}
        onSubmit={handleAddNewProf}
      />

      <ServiceModal
        isOpen={showServiceModal}
        editingService={editingService}
        name={servName}
        category={servCategory}
        categories={serviceCategories}
        duration={servDuration}
        displayOrder={servDisplayOrder}
        price={servPrice}
        description={servDescription}
        active={servActive}
        requireDeposit={servRequireDeposit}
        depositValue={servDepositValue}
        onChangeName={setServName}
        onChangeCategory={setServCategory}
        onChangeDuration={setServDuration}
        onChangeDisplayOrder={setServDisplayOrder}
        onChangePrice={setServPrice}
        onChangeDescription={setServDescription}
        onChangeActive={setServActive}
        onChangeRequireDeposit={setServRequireDeposit}
        onChangeDepositValue={setServDepositValue}
        onClose={() => {
          setShowServiceModal(false);
          setEditingService(null);
        }}
        onSubmit={handleAddNewService}
      />

      <PermissionsModal
        professional={showPermissionModal}
        onClose={() => setShowPermissionModal(null)}
        onApplySimplePermissions={handleApplySimplePermissions}
      />
    </div>
  );
}
