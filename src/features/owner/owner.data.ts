import type {
  Appointment,
  AppointmentStatus,
  CashExpense,
  Client,
  EstablishmentConfig,
  PaymentType,
  Product,
  Professional,
  Receipt,
  ReceiptItem,
  ReceiptPayment,
  RemunerationType,
  Service,
} from "../../types";

import type {
  OwnerSaasInvoice,
  OwnerSaasSubscription,
} from "./owner.types";

import { calculateCommissionValue } from "./owner.utils";

import type {
  CommissionPaymentRecord,
  ExpensePaymentRecord,
  ExpenseTemplateRecord,
} from "./components/FinanceView";

import type {
  ReceiptDraftItem,
  ReceiptPayload,
} from "./components/ReceiptsView";

import { supabase } from "../../lib/supabase";
import { prepareImageForStorage } from "../../lib/imageUpload";

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function normalizeClientPhone(value: string): string {
  const digits = onlyDigits(value);

  if (digits.startsWith("55") && digits.length > 11) {
    return digits.slice(2);
  }

  return digits;
}

export function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export const SUPABASE_PRODUCTS_SELECT =
  "id,tenant_id,code,description,quantity,cost_price,sale_price,active,created_at,updated_at";

export type SupabaseProductResponse = {
  id: string;
  tenant_id: string;
  code: string;
  description: string;
  quantity: number;
  cost_price: number;
  sale_price: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export function mapSupabaseProductToAppProduct(
  product: SupabaseProductResponse,
): Product {
  return {
    id: product.id,
    tenantId: product.tenant_id,
    code: product.code || "",
    description: product.description || "",
    quantity: Number(product.quantity) || 0,
    costPrice: Number(product.cost_price) || 0,
    salePrice: Number(product.sale_price) || 0,
    active: product.active !== false,
    createdAt: product.created_at,
    updatedAt: product.updated_at,
  };
}

export type TenantSettingsResponse = {
  tenant_id: string;
  tenant_slug?: string;
  slug?: string;
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

export interface SettingsViewMediaFiles {
  logoFile: File | null;
  coverFile: File | null;
}

export async function legacyDataUrlToPreparedImage(params: {
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

export async function uploadTenantPublicImage(params: {
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

export function mapTenantSettingsToConfig(
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

export type SupabaseProfessionalResponse = {
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

export const defaultProfessionalPermissions: Professional["permissions"] = {
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

export function normalizeProfessionalPermissions(
  permissions: Professional["permissions"] | null | undefined,
): Professional["permissions"] {
  return {
    ...defaultProfessionalPermissions,
    ...(permissions || {}),
    viewChairRental: false,
  };
}

export function normalizeProfessionalTime(
  value: string | null | undefined,
  fallback: string,
): string {
  if (!value) return fallback;

  return String(value).slice(0, 5);
}

export function mapSupabaseProfessionalToAppProfessional(
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

export function buildProfessionalPayload(professional: Professional) {
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

export type SupabaseServiceResponse = {
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

export type SupabaseServiceCategoryResponse = {
  id: string;
  name: string;
  sort_order: number;
  active: boolean;
};

export function mapSupabaseServiceToAppService(
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

export function buildServicePayload(service: Service) {
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

export type SupabaseAppointmentResponse = {
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

export function mapSupabaseAppointmentToAppAppointment(
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

export const SUPABASE_CLIENTS_SELECT =
  "id,name,phone,phone_normalized,cpf,email,birth_date,notes,total_spent,client_cancel_count,client_reschedule_count,created_at,updated_at";

export type SupabaseClientResponse = {
  id: string;
  name: string;
  phone: string;
  phone_normalized: string | null;
  cpf: string | null;
  email: string | null;
  birth_date: string | null;
  notes: string | null;
  total_spent: number;
  client_cancel_count: number;
  client_reschedule_count: number;
  created_at: string;
  updated_at: string;
};

export function mapSupabaseClientToAppClient(client: SupabaseClientResponse): Client {
  const normalizedPhone = normalizeClientPhone(client.phone || "");

  return {
    id: client.id,
    internalCode: `CLI-${String(client.id || normalizedPhone).replace(/\D/g, "").slice(-6).padStart(6, "0")}`,
    name: client.name || "",
    phone: client.phone || "",
    phoneNormalized: client.phone_normalized || normalizedPhone,
    phoneHistory: [],
    cpf: client.cpf || undefined,
    email: client.email || undefined,
    birthDate: client.birth_date || undefined,
    preferredProfessionalId: null,
    notes: client.notes || "",
    absences: 0,
    cancellations: Number(client.client_cancel_count) || 0,
    totalSpent: Number(client.total_spent) || 0,
  };
}

export const SUPABASE_RECEIPTS_SELECT =
  "id,tenant_id,client_id,appointment_id,client_name,client_phone,payment_type,status,subtotal,discount_value,total_amount,amount_paid,amount_pending,notes,paid_at,created_at,updated_at";

export const SUPABASE_RECEIPT_ITEMS_SELECT =
  "id,tenant_id,receipt_id,appointment_id,service_id,service_name,professional_id,professional_name,price,commission_value,item_type,product_id,item_description,quantity,unit_price,created_at";

export const SUPABASE_RECEIPT_PAYMENTS_SELECT =
  "id,tenant_id,receipt_id,payment_type,amount,created_at";

export const SUPABASE_CASH_EXPENSES_SELECT =
  "id,tenant_id,description,amount,payment_type,expense_date,notes,created_at,updated_at";

export type SupabaseReceiptResponse = {
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
  amount_paid: number;
  amount_pending: number;
  notes: string | null;
  paid_at: string;
  created_at: string;
  updated_at: string;
};

export type SupabaseReceiptItemResponse = {
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
  product_id: string | null;
  item_description: string | null;
  quantity: number;
  unit_price: number;
  created_at: string;
};

export type SupabaseReceiptPaymentResponse = {
  id: string;
  tenant_id: string;
  receipt_id: string;
  payment_type: PaymentType | string;
  amount: number;
  created_at: string;
};

export type SupabaseCashExpenseResponse = {
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

export type SupabaseCommissionPaymentResponse = {
  id: string;
  tenant_id: string;
  professional_id: string;
  period_start: string;
  period_end: string;
  calculated_commission: number;
  extra_value: number;
  discount_value: number;
  amount_paid: number;
  payment_type: PaymentType | string;
  paid_at: string;
  notes: string | null;
  created_at: string;
};

export type SupabaseExpenseTemplateResponse = {
  id: string;
  tenant_id: string;
  description: string;
  expected_amount: number;
  due_day: number | null;
  is_monthly: boolean;
  active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type SupabaseExpensePaymentResponse = {
  id: string;
  tenant_id: string;
  expense_template_id: string | null;
  description: string;
  competence_month: string;
  due_date: string | null;
  expected_amount: number;
  interest_value: number;
  fine_value: number;
  discount_value: number;
  amount_paid: number;
  payment_type: PaymentType | string;
  status: string;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export function isUuid(value: string | null | undefined): boolean {
  return Boolean(
    value &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value,
      ),
  );
}

export function toNullableUuid(value: string | null | undefined): string | null {
  return isUuid(value) ? String(value) : null;
}

export function normalizeReceiptPaymentType(value: unknown): PaymentType {
  return ["dinheiro", "pix", "debito", "credito", "pendente", "cortesia"].includes(
    String(value),
  )
    ? (value as PaymentType)
    : "dinheiro";
}

export function normalizeReceiptStatus(value: unknown): Receipt["status"] {
  if (String(value) === "cancelled") return "cancelled";
  if (String(value) === "pending") return "pending";
  return "paid";
}

export function normalizeReceiptItemType(value: unknown): ReceiptItem["itemType"] {
  return ["appointment", "extra", "manual", "product"].includes(String(value))
    ? (value as ReceiptItem["itemType"])
    : "appointment";
}

export function mapSupabaseReceiptItemToAppReceiptItem(
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
    productId: item.product_id || undefined,
    itemDescription:
      item.item_description || item.service_name || "Item do recebimento",
    quantity: Number(item.quantity) || 1,
    unitPrice: Number(item.unit_price) || Number(item.price) || 0,
    price: Number(item.price) || 0,
    commissionValue: Number(item.commission_value) || 0,
    itemType: normalizeReceiptItemType(item.item_type),
  };
}

export function mapSupabaseReceiptPaymentToAppReceiptPayment(
  payment: SupabaseReceiptPaymentResponse,
): ReceiptPayment {
  return {
    id: payment.id,
    receiptId: payment.receipt_id,
    paymentType: normalizeReceiptPaymentType(payment.payment_type),
    amount: Number(payment.amount) || 0,
    createdAt: String(payment.created_at || "").slice(0, 16),
  };
}

export function mapSupabaseReceiptToAppReceipt(params: {
  receipt: SupabaseReceiptResponse;
  items: SupabaseReceiptItemResponse[];
  payments?: SupabaseReceiptPaymentResponse[];
}): Receipt {
  const { receipt, items, payments = [] } = params;

  return {
    id: receipt.id,
    clientId: receipt.client_id || undefined,
    clientName: receipt.client_name || "",
    clientPhone: receipt.client_phone || "",
    appointmentId: receipt.appointment_id || undefined,
    items: items.map(mapSupabaseReceiptItemToAppReceiptItem),
    payments: payments.map(mapSupabaseReceiptPaymentToAppReceiptPayment),
    paymentType: normalizeReceiptPaymentType(receipt.payment_type),
    status: normalizeReceiptStatus(receipt.status),
    subtotal: Number(receipt.subtotal) || 0,
    discountValue: Number(receipt.discount_value) || 0,
    totalAmount: Number(receipt.total_amount) || 0,
    amountPaid: Number(receipt.amount_paid) || 0,
    amountPending: Number(receipt.amount_pending) || 0,
    notes: receipt.notes || "",
    paidAt: String(receipt.paid_at || receipt.created_at || "").slice(0, 16),
    createdAt: String(receipt.created_at || receipt.paid_at || "").slice(0, 16),
  };
}

export function mapSupabaseCashExpenseToAppCashExpense(
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

export function mapSupabaseCommissionPaymentToAppRecord(params: {
  payment: SupabaseCommissionPaymentResponse;
  professionals: Professional[];
}): CommissionPaymentRecord {
  const { payment, professionals } = params;
  const professional = professionals.find(
    (item) => item.id === payment.professional_id,
  );

  return {
    id: payment.id,
    professionalId: payment.professional_id,
    professionalName: professional?.name || "Profissional",
    periodStart: String(payment.period_start || "").slice(0, 10),
    periodEnd: String(payment.period_end || "").slice(0, 10),
    calculatedCommission: Number(payment.calculated_commission) || 0,
    extraValue: Number(payment.extra_value) || 0,
    discountValue: Number(payment.discount_value) || 0,
    amountPaid: Number(payment.amount_paid) || 0,
    paymentType: normalizeReceiptPaymentType(payment.payment_type),
    paidAt: String(payment.paid_at || "").slice(0, 10),
    notes: payment.notes || undefined,
    createdAt: String(payment.created_at || "").slice(0, 16),
  };
}

export function mapSupabaseExpenseTemplateToAppRecord(
  template: SupabaseExpenseTemplateResponse,
): ExpenseTemplateRecord {
  return {
    id: template.id,
    description: template.description || "Despesa",
    expectedAmount: Number(template.expected_amount) || 0,
    dueDay:
      template.due_day === null || template.due_day === undefined
        ? undefined
        : Number(template.due_day),
    isMonthly: template.is_monthly === true,
    active: template.active !== false,
    notes: template.notes || undefined,
  };
}

export function mapSupabaseExpensePaymentToAppRecord(
  payment: SupabaseExpensePaymentResponse,
): ExpensePaymentRecord {
  const normalizedStatus =
    payment.status === "paid"
      ? "paid"
      : payment.status === "cancelled"
        ? "cancelled"
        : "pending";

  return {
    id: payment.id,
    expenseTemplateId: payment.expense_template_id || undefined,
    description: payment.description || "Despesa",
    competenceMonth: String(payment.competence_month || "").slice(0, 10),
    dueDate: payment.due_date
      ? String(payment.due_date).slice(0, 10)
      : undefined,
    expectedAmount: Number(payment.expected_amount) || 0,
    interestValue: Number(payment.interest_value) || 0,
    fineValue: Number(payment.fine_value) || 0,
    discountValue: Number(payment.discount_value) || 0,
    amountPaid: Number(payment.amount_paid) || 0,
    paymentType: normalizeReceiptPaymentType(payment.payment_type),
    status: normalizedStatus,
    paidAt: payment.paid_at
      ? String(payment.paid_at).slice(0, 10)
      : undefined,
    notes: payment.notes || undefined,
  };
}

export function buildReceiptInsertPayload(params: {
  tenantId: string;
  payload: ReceiptPayload;
  subtotal: number;
  discountValue: number;
  totalAmount: number;
}) {
  const { tenantId, payload, subtotal, discountValue, totalAmount } = params;

  const normalizedAmountPaid = Math.max(
    0,
    Math.min(Number(payload.amountPaid) || 0, totalAmount),
  );

  const normalizedAmountPending = Math.max(
    0,
    totalAmount - normalizedAmountPaid,
  );

  return {
    tenant_id: tenantId,
    client_id: toNullableUuid(payload.clientId),
    appointment_id: toNullableUuid(payload.appointmentId),
    client_name: payload.clientName,
    client_phone: payload.clientPhone,
    payment_type: payload.paymentType,
    status: payload.status === "pending" ? "pending" : "paid",
    subtotal,
    discount_value: discountValue,
    total_amount: totalAmount,
    amount_paid: normalizedAmountPaid,
    amount_pending: normalizedAmountPending,
    notes: payload.notes || null,
  };
}

export function buildReceiptItemInsertPayload(params: {
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
    product_id: toNullableUuid(receiptItem.productId),
    item_description:
      receiptItem.itemDescription || receiptItem.serviceName || "Item",
    quantity: Math.max(1, Number(receiptItem.quantity) || 1),
    unit_price:
      Number(receiptItem.unitPrice) || Number(receiptItem.price) || 0,
  };
}

export function buildOwnerAppointmentPayload(
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

export function buildReceiptFinancialAppointments(receipts: Receipt[]): Appointment[] {
  return receipts
    .filter((receipt) => receipt.status === "paid")
    .flatMap((receipt) => {
      return receipt.items
        .filter((item) => item.itemType !== "product")
        .map((item) => ({
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

export function calculateReceiptTotals(receipts: Receipt[], baseDateStr: string) {
  const activeReceipts = receipts.filter(
    (receipt) => receipt.status !== "cancelled",
  );

  const todayReceipts = activeReceipts.filter((receipt) => {
    return receipt.paidAt.slice(0, 10) === baseDateStr;
  });

  return {
    totalReceivedToday: todayReceipts.reduce(
      (sum, receipt) => sum + (receipt.amountPaid ?? receipt.totalAmount),
      0,
    ),
    totalReceivedMonth: activeReceipts.reduce(
      (sum, receipt) => sum + (receipt.amountPaid ?? receipt.totalAmount),
      0,
    ),
    totalCommissionsMonth: activeReceipts.reduce((sum, receipt) => {
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

export function buildReceiptItems(params: {
  draftItems: ReceiptDraftItem[];
  receiptId: string;
  services: Service[];
  products: Product[];
  professionals: Professional[];
}): ReceiptItem[] {
  const { draftItems, receiptId, services, products, professionals } = params;

  return draftItems.map((draftItem) => {
    if (draftItem.itemType === "product") {
      const product = products.find(
        (item) => item.id === draftItem.productId,
      );
      const quantity = Math.max(1, Number(draftItem.quantity) || 1);
      const unitPrice =
        Number(draftItem.unitPrice) ||
        Number(product?.salePrice) ||
        0;
      const description =
        draftItem.itemDescription ||
        product?.description ||
        "Produto";

      return {
        id: `${receiptId}-${draftItem.id}`,
        receiptId,
        appointmentId: undefined,
        serviceId: "",
        serviceName: description,
        professionalId: "",
        professionalName: "Venda de produto",
        productId: draftItem.productId,
        itemDescription: description,
        quantity,
        unitPrice,
        price: Number(draftItem.price) || quantity * unitPrice,
        commissionValue: 0,
        itemType: "product",
      };
    }

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
      productId: undefined,
      itemDescription: service?.name || "Serviço personalizado",
      quantity: 1,
      unitPrice: Number(draftItem.price) || 0,
      price: Number(draftItem.price) || 0,
      commissionValue,
      itemType: draftItem.itemType,
    };
  });
}

export function normalizeServiceCategoryName(value: string): string {
  return value.trim().replace(/\s+/g, " ").toUpperCase();
}

export function getInitialServiceCategories(services: Service[]): string[] {
  const categories = services
    .map((service) => normalizeServiceCategoryName(service.category))
    .filter(Boolean);

  const uniqueCategories = Array.from(new Set(categories));

  if (uniqueCategories.length > 0) {
    return uniqueCategories;
  }

  return [];
}

export function getServiceDisplayOrder(service: Service): number {
  const serviceRecord = service as unknown as Record<string, unknown>;
  const displayOrder = Number(serviceRecord.displayOrder);

  return Number.isFinite(displayOrder) && displayOrder > 0 ? displayOrder : 999;
}

export function getServiceCategoryOrder(service: Service): number {
  const serviceRecord = service as unknown as Record<string, unknown>;
  const categoryOrder = Number(serviceRecord.categoryOrder);

  return Number.isFinite(categoryOrder) && categoryOrder > 0
    ? categoryOrder
    : 999;
}

export function buildInitialServiceCategoryOrders(
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

export function sortServicesForDisplay(params: {
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

export interface AgendaCreateAppointmentPayload {
  clientName: string;
  clientPhone: string;
  serviceId: string;
  professionalId: string;
  date: string;
  time: string;
  notes: string;
  paymentType: PaymentType;
}

export interface AgendaCreateAppointmentResult {
  appointmentId?: string;
  clientActionLink?: string;
}

export function getAgendaSpeedPublicOrigin(): string {
  if (typeof window === "undefined") {
    return "https://agendaspeed.com.br";
  }

  const origin = window.location.origin.replace("https://www.", "https://");

  if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
    return "https://agendaspeed.com.br";
  }

  return origin;
}

export function extractClientPublicToken(data: unknown): string {
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

export function buildOwnerPublicBookingUrl(slug: string): string {
  const normalizedSlug = String(slug || "")
    .trim()
    .toLowerCase()
    .replace(/^\/+|\/+$/g, "");

  if (!normalizedSlug) {
    return "";
  }

  if (typeof window === "undefined") {
    return `https://agendaspeed.com.br/${normalizedSlug}`;
  }

  const hostname = window.location.hostname;
  const isLocalhost =
    hostname === "localhost" || hostname === "127.0.0.1";

  const origin = isLocalhost
    ? "https://agendaspeed.com.br"
    : window.location.origin.replace("https://www.", "https://");

  return `${origin}/${normalizedSlug}`;
}


export type SupabaseOwnerSaasSubscriptionResponse = {
  tenant_id: string;
  subscription_id: string;
  tenant_name: string;
  subscription_status: string;
  monthly_price: number;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  due_date: string | null;
  paid_until: string | null;
  billing_method: string | null;
  external_provider: string | null;
  external_subscription_id: string | null;
  days_until_due: number | null;
  is_due_soon: boolean | null;
  is_overdue: boolean | null;
  pix_key: string | null;
  pix_key_type: string | null;
  pix_beneficiary_name: string | null;
  whatsapp_support: string | null;
  asaas_enabled: boolean | null;
};

export type SupabaseOwnerSaasInvoiceResponse = {
  id: string;
  reference_month: string;
  amount: number;
  due_date: string;
  status: string;
  payment_method: string | null;
  paid_at: string | null;
  paid_amount: number | null;
  provider: string | null;
  provider_invoice_url: string | null;
  created_at: string;
};

export function mapOwnerSaasSubscription(
  row: SupabaseOwnerSaasSubscriptionResponse,
): OwnerSaasSubscription {
  return {
    tenantId: row.tenant_id || "",
    subscriptionId: row.subscription_id || "",
    tenantName: row.tenant_name || "",
    subscriptionStatus: row.subscription_status || "trial",
    monthlyPrice: Number(row.monthly_price) || 0,
    trialStartedAt: row.trial_started_at || "",
    trialEndsAt: row.trial_ends_at || "",
    currentPeriodStart: row.current_period_start || "",
    currentPeriodEnd: row.current_period_end || "",
    dueDate: row.due_date || "",
    paidUntil: row.paid_until || "",
    billingMethod: row.billing_method || "",
    externalProvider: row.external_provider || "",
    externalSubscriptionId: row.external_subscription_id || "",
    daysUntilDue: Number(row.days_until_due) || 0,
    isDueSoon: row.is_due_soon === true,
    isOverdue: row.is_overdue === true,
    pixKey: row.pix_key || "",
    pixKeyType: row.pix_key_type || "",
    pixBeneficiaryName: row.pix_beneficiary_name || "",
    whatsappSupport: row.whatsapp_support || "",
    asaasEnabled: row.asaas_enabled === true,
  };
}

export function mapOwnerSaasInvoice(
  row: SupabaseOwnerSaasInvoiceResponse,
): OwnerSaasInvoice {
  return {
    id: row.id,
    referenceMonth: row.reference_month || "",
    amount: Number(row.amount) || 0,
    dueDate: row.due_date || "",
    status: row.status || "pending",
    paymentMethod: row.payment_method || "",
    paidAt: row.paid_at || "",
    paidAmount: Number(row.paid_amount) || 0,
    provider: row.provider || "",
    providerInvoiceUrl: row.provider_invoice_url || "",
    createdAt: row.created_at || "",
  };
}

