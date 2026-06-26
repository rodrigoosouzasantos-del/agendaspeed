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

import React, { useEffect, useState } from "react";

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
import ServicesView from "./components/ServicesView";
import ClientsView from "./components/ClientsView";
import FinanceView from "./components/FinanceView";
import ReceiptsView, {
  ReceiptDraftItem,
  ReceiptPayload,
} from "./components/ReceiptsView";
import SettingsView from "./components/SettingsView";
import { supabase } from "../../lib/supabase";

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
    avatar:
      professional.avatar ||
      "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=120&h=120&fit=crop",
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
  name: string;
  sort_order: number;
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

  return ["BARBA & CABELO", "CABELO", "UNHAS", "ESTÉTICA"];
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

export default function OwnerDashboard({
  state,
  onUpdateState,
  onNavigateToClient,
  onLogOut,
}: OwnerDashboardProps) {
  const { config, professionals, services, clients } = state;

  // A agenda precisa ser sempre uma fonte viva dentro do painel.
  // Ela é carregada do Supabase e atualizada localmente sem depender dos dados demo do App.
  const [liveAppointments, setLiveAppointments] = useState<Appointment[]>(
    state.appointments,
  );
  const appointments = liveAppointments;

  const [activeTab, setActiveTab] = useState<OwnerTab>("painel");
  const [receipts, setReceipts] = useState<Receipt[]>(() => {
    const stateRecord = state as unknown as Record<string, unknown>;
    return Array.isArray(stateRecord.receipts)
      ? (stateRecord.receipts as Receipt[])
      : [];
  });

  const [cashExpenses, setCashExpenses] = useState<CashExpense[]>(() => {
    const stateRecord = state as unknown as Record<string, unknown>;
    return Array.isArray(stateRecord.cashExpenses)
      ? (stateRecord.cashExpenses as CashExpense[])
      : [];
  });

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

  const [isSavingTenantSettings, setIsSavingTenantSettings] = useState(false);
  const [isLoadingProfessionals, setIsLoadingProfessionals] = useState(false);
  const [isLoadingServices, setIsLoadingServices] = useState(false);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(false);

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

      const [servicesResult, categoriesResult, professionalsResult] =
        await Promise.all([
          supabase.rpc("get_my_services"),
          supabase.rpc("get_my_service_categories"),
          supabase.rpc("get_my_professionals"),
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

      const professionalRows = (
        Array.isArray(professionalsResult.data) ? professionalsResult.data : []
      ) as SupabaseProfessionalResponse[];
      const nextProfessionals = professionalsResult.error
        ? professionals
        : professionalRows.map(mapSupabaseProfessionalToAppProfessional);

      setServiceCategories(nextCategories);
      setServiceCategoryOrders(nextCategoryOrders);

      if (
        !nextCategories.includes(normalizeServiceCategoryName(servCategory))
      ) {
        setServCategory(nextCategories[0] || "CABELO");
      }

      onUpdateState({
        ...state,
        professionals: nextProfessionals,
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

    async function loadAppointmentsFromSupabase(showLoading = true) {
      if (showLoading) {
        setIsLoadingAppointments(true);
      }

      const { data, error } = await supabase.rpc("get_my_appointments");

      if (!isMounted) return;

      if (error) {
        console.error("Erro ao carregar agendamentos:", error.message);
        setIsLoadingAppointments(false);
        return;
      }

      const rows = (
        Array.isArray(data) ? data : []
      ) as SupabaseAppointmentResponse[];
      const nextAppointments = rows.map(mapSupabaseAppointmentToAppAppointment);

      setLiveAppointments(nextAppointments);
      setIsLoadingAppointments(false);
    }

    loadAppointmentsFromSupabase(true);

    const refreshInterval = window.setInterval(() => {
      loadAppointmentsFromSupabase(false);
    }, 10000);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadAppointmentsFromSupabase(false);
      }
    };

    window.addEventListener("focus", handleVisibilityChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isMounted = false;
      window.clearInterval(refreshInterval);
      window.removeEventListener("focus", handleVisibilityChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
    // Carrega e mantém a agenda real sincronizada. A tabela appointments é a fonte única.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

    setShowApptModal(false);
    resetAppointmentForm();
  };

  const handleCreateAppointmentFromAgenda = async (
    payload: AgendaCreateAppointmentPayload,
  ) => {
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

  const handleAddNewProf = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!profName || !profPhone || !profRole) {
      alert("Favor inserir nome, WhatsApp e cargo do profissional.");
      return;
    }

    const professionalToSave: Professional = {
      id: editingProf?.id || `prof-${Date.now()}`,
      name: profName,
      phone: profPhone,
      email: profEmail || editingProf?.email || "",
      role: profRole,
      displayOrder: Number(profDisplayOrder) || 999,
      avatar:
        profAvatar ||
        "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=120&h=120&fit=crop",
      active: editingProf ? profActive : true,
      workDays: profWorkDays,
      workHoursStart: profHoursStart,
      workHoursEnd: profHoursEnd,
      lunchStart: profLunchStart,
      lunchEnd: profLunchEnd,
      noLunchBreak: profNoLunchBreak,
      defaultAppointmentDuration: Number(profDefaultAppointmentDuration) || 30,
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

    const { data, error } = await supabase.rpc("upsert_my_professional", {
      p_professional: buildProfessionalPayload(professionalToSave),
    });

    if (error) {
      alert(error.message || "Não foi possível salvar o profissional.");
      return;
    }

    const savedRow = (
      Array.isArray(data) ? data[0] : null
    ) as SupabaseProfessionalResponse | null;

    if (!savedRow?.id) {
      alert("Profissional salvo, mas não foi possível recarregar o registro.");
      return;
    }

    const savedProfessional =
      mapSupabaseProfessionalToAppProfessional(savedRow);

    const nextProfessionals = editingProf
      ? professionals.map((professional) => {
          return professional.id === editingProf.id
            ? savedProfessional
            : professional;
        })
      : [savedProfessional, ...professionals];

    onUpdateState({
      ...state,
      professionals: nextProfessionals,
    });

    setShowProfModal(false);
    setEditingProf(null);
    resetProfessionalForm();
  };

  const handleDeleteProf = async (professionalId: string) => {
    if (!confirm("Tem certeza que deseja inativar este colaborador?")) {
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

    onUpdateState({
      ...state,
      professionals: updatedProfessionals,
    });
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
    if (!professional.id) {
      alert("Profissional inválido para geração de link.");
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

    if (!result?.success || !result.link_local) {
      alert(
        result?.message || "Não foi possível gerar o link do profissional.",
      );
      return;
    }

    try {
      await navigator.clipboard.writeText(result.link_local);
      alert(
        `Link do profissional copiado para a área de transferência:

${result.link_local}`,
      );
    } catch {
      alert(`Link do profissional gerado:

${result.link_local}`);
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

    onUpdateState({
      ...state,
      professionals: updatedProfessionals,
    });

    setShowPermissionModal(savedProfessional);
  };

  const handleAddServiceCategory = async (categoryName: string) => {
    const normalizedCategory = normalizeServiceCategoryName(categoryName);

    if (!normalizedCategory) {
      alert("Informe o nome da categoria.");
      return;
    }

    if (serviceCategories.includes(normalizedCategory)) {
      alert("Esta categoria já está cadastrada.");
      return;
    }

    const nextOrder = Object.keys(serviceCategoryOrders).length + 1;

    const { error } = await supabase.rpc("upsert_my_service_category", {
      p_name: normalizedCategory,
      p_sort_order: nextOrder,
    });

    if (error) {
      alert(error.message || "Não foi possível cadastrar a categoria.");
      return;
    }

    setServiceCategories((currentCategories) => [
      ...currentCategories,
      normalizedCategory,
    ]);

    setServiceCategoryOrders((currentOrders) => ({
      ...currentOrders,
      [normalizedCategory]: nextOrder,
    }));

    setServCategory(normalizedCategory);
  };

  const handleDisableServiceCategory = async (categoryName: string) => {
    const normalizedCategory = normalizeServiceCategoryName(categoryName);

    const hasServiceUsingCategory = services.some((service) => {
      return (
        normalizeServiceCategoryName(service.category) === normalizedCategory
      );
    });

    if (hasServiceUsingCategory) {
      alert(
        "Esta categoria possui serviços cadastrados. Altere ou inative os serviços antes de desativar a categoria.",
      );
      return;
    }

    const { error } = await supabase.rpc("disable_my_service_category", {
      p_name: normalizedCategory,
    });

    if (error) {
      alert(error.message || "Não foi possível desativar a categoria.");
      return;
    }

    setServiceCategories((currentCategories) => {
      const nextCategories = currentCategories.filter((category) => {
        return category !== normalizedCategory;
      });

      if (servCategory === normalizedCategory) {
        setServCategory(nextCategories[0] || "CABELO");
      }

      return nextCategories;
    });

    setServiceCategoryOrders((currentOrders) => {
      const nextOrders = {
        ...currentOrders,
      };

      delete nextOrders[normalizedCategory];

      return nextOrders;
    });
  };

  const handleChangeServiceCategoryOrder = async (
    categoryName: string,
    order: number,
  ) => {
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
      alert(error.message || "Não foi possível salvar a ordem da categoria.");
      return;
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

    onUpdateState({
      ...state,
      services: updatedServices,
    });
  };

  const handleSaveCompanyConfig = async (event: React.FormEvent) => {
    event.preventDefault();

    if (isSavingTenantSettings) return;

    const updatedConfig: EstablishmentConfig = {
      ...config,
      name: configName,
      address: configAddress,
      phone: configPhone,
      instagram: configInstagram,
      logo: configLogo,
      coverImage: configCoverImage,
      workHoursStart: bookingWorkHoursStart,
      workHoursEnd: bookingWorkHoursEnd,
      minLeadTimeMinutes: bookingMinLeadTimeMinutes,
      maxFutureDays: bookingMaxFutureDays,
      autoApprove: configAutoApprove,
      defaultMsgTemplate: configDefaultTemplate,
    };

    onUpdateState({
      ...state,
      config: updatedConfig,
    });

    setIsSavingTenantSettings(true);

    const { data, error } = await supabase.rpc("update_my_tenant_settings", {
      p_name: configName,
      p_address: configAddress,
      p_phone: configPhone,
      p_instagram: configInstagram,
      p_logo_url: configLogo,
      p_cover_url: configCoverImage,
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

    setIsSavingTenantSettings(false);

    if (error) {
      console.error("Erro ao salvar configurações da empresa:", error.message);
      alert(`Não foi possível salvar no Supabase: ${error.message}`);
      return;
    }

    const saveResult = Array.isArray(data) ? data[0] : null;

    if (saveResult && saveResult.success === false) {
      alert(
        saveResult.message ||
          "Não foi possível salvar as configurações no Supabase.",
      );
      return;
    }

    alert("Configurações da empresa salvas com sucesso!");
  };

  const handleAddManualClient = (clientData: {
    name: string;
    phone: string;
    birthDate?: string;
  }) => {
    const updatedClients = upsertClientFromAppointment({
      clients,
      clientName: clientData.name,
      clientPhone: clientData.phone,
      preferredProfessionalId: null,
      birthDate: clientData.birthDate,
      notes: "Cliente cadastrado manualmente pelo estabelecimento.",
    });

    onUpdateState({
      ...state,
      clients: updatedClients,
    });
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

    const updatedClients: Client[] = clients.map((client) => {
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

    onUpdateState({
      ...state,
      clients: updatedClients,
    });

    return true;
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

  const handleConfirmReceipt = (payload: ReceiptPayload) => {
    const receiptId = `receipt-${Date.now()}`;
    const receiptItems = buildReceiptItems({
      draftItems: payload.items,
      receiptId,
      services,
      professionals,
    });

    const subtotal = receiptItems.reduce((sum, item) => sum + item.price, 0);
    const discountValue = Math.max(
      0,
      Math.min(Number(payload.discountValue) || 0, subtotal),
    );
    const totalAmount = Math.max(0, subtotal - discountValue);
    const now = new Date().toISOString();

    const receipt: Receipt = {
      id: receiptId,
      clientId: payload.clientId,
      clientName: payload.clientName,
      clientPhone: payload.clientPhone,
      appointmentId: payload.appointmentId,
      items: receiptItems,
      paymentType: payload.paymentType,
      status: "paid",
      subtotal,
      discountValue,
      totalAmount,
      notes: payload.notes,
      paidAt: now,
      createdAt: now,
    };

    const updatedReceipts = [receipt, ...receipts];

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

    const updatedClients = upsertClientFromAppointment({
      clients,
      clientName: payload.clientName,
      clientPhone: payload.clientPhone,
      preferredProfessionalId:
        updatedAppointments.find((appointment) => {
          return appointment.id === payload.appointmentId;
        })?.professionalId || null,
      notes: "Cliente atualizado pelo módulo de Recebimentos.",
    }).map((client) => {
      const clientPhoneKey = normalizeClientPhone(client.phone);
      const payloadPhoneKey = normalizeClientPhone(payload.clientPhone);

      if (clientPhoneKey !== payloadPhoneKey) {
        return client;
      }

      return {
        ...client,
        totalSpent: (client.totalSpent || 0) + totalAmount,
      };
    });

    setReceipts(updatedReceipts);
    setLiveAppointments(updatedAppointments);

    onUpdateState({
      ...state,
      appointments: updatedAppointments,
      clients: updatedClients,
      receipts: updatedReceipts,
      cashExpenses,
    } as unknown as typeof state);

    alert("Recebimento confirmado com sucesso.");
  };

  const handleConfirmCashExpense = (payload: {
    description: string;
    amount: number;
    paymentType: PaymentType;
    notes?: string;
  }) => {
    const now = new Date().toISOString();

    const expense: CashExpense = {
      id: `expense-${Date.now()}`,
      description: payload.description,
      amount: Number(payload.amount) || 0,
      paymentType: payload.paymentType,
      status: "paid",
      notes: payload.notes,
      paidAt: now,
      createdAt: now,
    };

    const updatedExpenses = [expense, ...cashExpenses];
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
              onOpenCreateService={handleOpenCreateService}
              onEditService={handleEditServiceTrigger}
              onAddCategory={handleAddServiceCategory}
              onDisableCategory={handleDisableServiceCategory}
              onChangeCategoryOrder={handleChangeServiceCategoryOrder}
            />
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
            />
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
              onSubmit={handleSaveCompanyConfig}
            />
          )}
        </main>
      </div>

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
