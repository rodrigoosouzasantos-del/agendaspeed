/**
 * Normalização, validação e integração da Vitrine pública.
 */

import { Appointment, EstablishmentConfig, Professional, Service } from '../../types';
import { BookingScheduleDay } from './booking.types';
import { supabase } from '../../lib/supabase';

export interface BookingAgendaBlockedInterval {
  id: string;
  professionalId: string;
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
}

export interface PublicBookingContextRow {
  config: Partial<EstablishmentConfig> & Record<string, unknown>;
  services: Service[];
  professionals: Professional[];
  appointments: Appointment[];
  agendaBlocks?: BookingAgendaBlockedInterval[];
  scheduleDays?: BookingScheduleDay[];
}

export function getPublicBookingSlug(): string {
  const parts = window.location.pathname.split('/').filter(Boolean);
  const firstPart = parts[0] || '';

  if (!firstPart || firstPart === 'agendar') {
    return '';
  }

  if (
    firstPart === 'login' ||
    firstPart === 'cadastro' ||
    firstPart === 'owner' ||
    firstPart === 'profissional' ||
    firstPart === 'primeiro-acesso'
  ) {
    return '';
  }

  return firstPart;
}


function readRemoteValue<T = unknown>(
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

function normalizeRemoteTime(value: unknown, fallback: string): string {
  if (!value) {
    return fallback;
  }

  return String(value).slice(0, 5);
}

export function normalizeRemoteService(service: Service): Service {
  const duration = Number(
    readRemoteValue(service, ['duration', 'durationMinutes', 'duration_minutes'])
  );
  const requireDeposit = readRemoteValue<boolean>(service, ['requireDeposit', 'require_deposit']);
  const depositValue = readRemoteValue<number | null>(service, ['depositValue', 'deposit_value']);

  return {
    ...service,
    duration: Number.isFinite(duration) && duration > 0 ? duration : 30,
    requireDeposit: Boolean(requireDeposit ?? service.requireDeposit ?? false),
    depositValue: depositValue ?? service.depositValue ?? null
  };
}


export function normalizeRemoteBlockedInterval(rawBlock: Record<string, unknown>): BookingAgendaBlockedInterval {
  return {
    id: String(rawBlock.id || ''),
    professionalId: String(rawBlock.professionalId || rawBlock.professional_id || ''),
    date: String(rawBlock.date || rawBlock.block_date || '').slice(0, 10),
    startTime: String(rawBlock.startTime || rawBlock.start_time || '').slice(0, 5),
    endTime: String(rawBlock.endTime || rawBlock.end_time || '').slice(0, 5),
    reason: String(rawBlock.reason || rawBlock.notes || 'Bloqueado')
  };
}


export function normalizeRemoteScheduleDay(rawDay: Record<string, unknown>): BookingScheduleDay {
  const status = String(rawDay.status || 'closed') === 'open' ? 'open' : 'closed';

  return {
    id: String(rawDay.id || ''),
    professionalId: String(rawDay.professionalId || rawDay.professional_id || ''),
    date: String(rawDay.date || rawDay.day_date || '').slice(0, 10),
    status,
    isOutOfRegularSchedule: Boolean(rawDay.isOutOfRegularSchedule || rawDay.is_out_of_regular_schedule)
  };
}

export function isPublicScheduleDayOpen(params: {
  openDays: BookingScheduleDay[];
  selectedProfessional: Professional | null;
  selectedDate: string;
}): boolean {
  const {
    openDays,
    selectedProfessional,
    selectedDate
  } = params;

  if (!selectedProfessional || !selectedDate) {
    return false;
  }

  return openDays.some((scheduleDay) => {
    return (
      scheduleDay.professionalId === selectedProfessional.id &&
      scheduleDay.date === selectedDate &&
      scheduleDay.status === 'open'
    );
  });
}

export function buildDemoServices(): Service[] {
  return [
    {
      id: 'demo-service-corte-feminino',
      name: 'Corte de Cabelo Feminino',
      category: 'CABELO',
      duration: 60,
      price: 150,
      description: 'Corte personalizado com acabamento profissional.',
      professionals: ['demo-professional-ana'],
      specificCommission: null,
      requireDeposit: false,
      depositValue: null,
      active: true
    },
    {
      id: 'demo-service-corte-masculino',
      name: 'Corte de Cabelo Masculino',
      category: 'BARBA & CABELO',
      duration: 40,
      price: 60,
      description: 'Corte masculino com lavagem e finalização.',
      professionals: ['demo-professional-carlos'],
      specificCommission: null,
      requireDeposit: false,
      depositValue: null,
      active: true
    },
    {
      id: 'demo-service-barba',
      name: 'Barba com Toalha Quente',
      category: 'BARBA',
      duration: 30,
      price: 50,
      description: 'Barba completa com toalha quente.',
      professionals: ['demo-professional-carlos'],
      specificCommission: null,
      requireDeposit: false,
      depositValue: null,
      active: true
    }
  ];
}

export function buildDemoProfessionals(): Professional[] {
  return [
    {
      id: 'demo-professional-ana',
      name: 'ANA',
      phone: '(11) 99999-1111',
      email: 'ana@exemplo.com',
      role: 'Cabeleireira',
      displayOrder: 1,
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=240&h=240&fit=crop',
      active: true,
      workDays: [1, 2, 3, 4, 5, 6],
      workHoursStart: '09:00',
      workHoursEnd: '18:00',
      lunchStart: '12:00',
      lunchEnd: '13:00',
      noLunchBreak: false,
      defaultAppointmentDuration: 30,
      services: ['demo-service-corte-feminino'],
      remType: 'commission_percent',
      remValue: 40,
      chairRentalValue: 0,
      chairRentalStatus: 'inactive',
      permissions: {
        viewOwnCalendar: true,
        createAppts: true,
        rescheduleAppts: true,
        cancelAppts: true,
        blockCalendar: true,
        openSpots: true,
        viewFinancial: false,
        viewCommission: false,
        viewChairRental: false,
        manageOwnCalendar: 'yes'
      }
    },
    {
      id: 'demo-professional-carlos',
      name: 'CARLOS',
      phone: '(11) 99999-2222',
      email: 'carlos@exemplo.com',
      role: 'Barbeiro',
      displayOrder: 2,
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=240&h=240&fit=crop',
      active: true,
      workDays: [1, 2, 3, 4, 5, 6],
      workHoursStart: '09:00',
      workHoursEnd: '19:00',
      lunchStart: '12:00',
      lunchEnd: '13:00',
      noLunchBreak: false,
      defaultAppointmentDuration: 30,
      services: [
        'demo-service-corte-masculino',
        'demo-service-barba'
      ],
      remType: 'commission_percent',
      remValue: 40,
      chairRentalValue: 0,
      chairRentalStatus: 'inactive',
      permissions: {
        viewOwnCalendar: true,
        createAppts: true,
        rescheduleAppts: true,
        cancelAppts: true,
        blockCalendar: true,
        openSpots: true,
        viewFinancial: false,
        viewCommission: false,
        viewChairRental: false,
        manageOwnCalendar: 'yes'
      }
    }
  ] as Professional[];
}

export function buildDemoOpenScheduleDays(professionals: Professional[]): BookingScheduleDay[] {
  const today = new Date();
  const activeProfessionals = professionals.filter((professional) => professional.active);
  const scheduleDays: BookingScheduleDay[] = [];

  for (let dayIndex = 1; dayIndex <= 3; dayIndex += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() + dayIndex);
    const dateStr = getLocalDateStr(date);

    activeProfessionals.forEach((professional) => {
      scheduleDays.push({
        id: `demo-${professional.id}-${dateStr}`,
        professionalId: professional.id,
        date: dateStr,
        status: 'open',
        isOutOfRegularSchedule: true
      });
    });
  }

  return scheduleDays;
}

export function normalizeRemoteProfessional(professional: Professional): Professional {
  const workDays = readRemoteValue<number[]>(professional, ['workDays', 'work_days']);
  const services = readRemoteValue<string[]>(professional, ['services', 'servicesIds', 'services_ids', 'service_ids']);
  const displayOrder = Number(readRemoteValue(professional, ['displayOrder', 'display_order']));
  const defaultAppointmentDuration = Number(
    readRemoteValue(professional, [
      'defaultAppointmentDuration',
      'defaultAppointmentDurationMinutes',
      'default_appointment_duration',
      'default_appointment_duration_minutes'
    ])
  );
  const noLunchBreak = Boolean(
    readRemoteValue(professional, ['noLunchBreak', 'no_lunch_break']) ?? false
  );

  const weeklySchedule = readRemoteValue<Professional['weeklySchedule']>(professional, [
    'weeklySchedule',
    'weekly_schedule'
  ]);

  return {
    ...professional,
    phone: String(readRemoteValue(professional, ['phone', 'whatsapp']) || professional.phone || ''),
    avatar: String(readRemoteValue(professional, ['avatar', 'avatarUrl', 'avatar_url']) || professional.avatar || ''),
    displayOrder: Number.isFinite(displayOrder) ? displayOrder : professional.displayOrder,
    weeklySchedule: weeklySchedule || professional.weeklySchedule,
    workDays: Array.isArray(workDays) ? workDays.map(Number) : professional.workDays || [],
    workHoursStart: normalizeRemoteTime(
      readRemoteValue(professional, ['workHoursStart', 'work_hours_start']),
      professional.workHoursStart || '09:00'
    ),
    workHoursEnd: normalizeRemoteTime(
      readRemoteValue(professional, ['workHoursEnd', 'work_hours_end']),
      professional.workHoursEnd || '19:00'
    ),
    lunchStart: normalizeRemoteTime(
      readRemoteValue(professional, ['lunchStart', 'lunch_start']),
      professional.lunchStart || '12:00'
    ),
    lunchEnd: normalizeRemoteTime(
      readRemoteValue(professional, ['lunchEnd', 'lunch_end']),
      professional.lunchEnd || '13:00'
    ),
    noLunchBreak,
    defaultAppointmentDuration: Number.isFinite(defaultAppointmentDuration) && defaultAppointmentDuration > 0
      ? defaultAppointmentDuration
      : professional.defaultAppointmentDuration || 30,
    services: Array.isArray(services) ? services : professional.services || []
  };
}

export function mergeConfigWithFallback(
  fallbackConfig: EstablishmentConfig,
  remoteConfig?: Partial<EstablishmentConfig> & Record<string, unknown>
): EstablishmentConfig {
  if (!remoteConfig) {
    return fallbackConfig;
  }

  return {
    ...fallbackConfig,
    ...remoteConfig,
    // Em vitrine real, identidade e mídias vêm exclusivamente do Supabase.
    // Campos vazios são legítimos e não podem cair em dados fictícios do estado inicial.
    name: String(readRemoteValue(remoteConfig, ['name']) ?? ''),
    logo: String(readRemoteValue(remoteConfig, ['logo', 'logo_url', 'logoUrl']) ?? ''),
    coverImage: String(readRemoteValue(remoteConfig, ['coverImage', 'cover_url', 'coverUrl', 'cover']) ?? ''),
    address: String(readRemoteValue(remoteConfig, ['address']) ?? ''),
    phone: String(readRemoteValue(remoteConfig, ['phone', 'whatsapp']) ?? ''),
    instagram: String(readRemoteValue(remoteConfig, ['instagram']) ?? ''),
    workDays: Array.isArray(remoteConfig.workDays)
      ? remoteConfig.workDays as number[]
      : Array.isArray(remoteConfig.work_days)
        ? remoteConfig.work_days as number[]
        : fallbackConfig.workDays,
    workHoursStart: String(remoteConfig.workHoursStart || remoteConfig.work_hours_start || fallbackConfig.workHoursStart || '08:00'),
    workHoursEnd: String(remoteConfig.workHoursEnd || remoteConfig.work_hours_end || fallbackConfig.workHoursEnd || '19:00'),
    minLeadTimeMinutes: Number(remoteConfig.minLeadTimeMinutes ?? fallbackConfig.minLeadTimeMinutes ?? 0),
    maxFutureDays: Number(remoteConfig.maxFutureDays ?? remoteConfig.max_future_days ?? fallbackConfig.maxFutureDays ?? 30),
    cancellationPolicy: String(remoteConfig.cancellationPolicy || fallbackConfig.cancellationPolicy || ''),
    autoApprove: Boolean(remoteConfig.autoApprove ?? fallbackConfig.autoApprove ?? false),
    requireDepositGlobal: Boolean(remoteConfig.requireDepositGlobal ?? fallbackConfig.requireDepositGlobal ?? false),
    defaultMsgTemplate: String(remoteConfig.defaultMsgTemplate || fallbackConfig.defaultMsgTemplate || '')
  };
}

export interface ClientBookingFeedbackState {
  title: string;
  description: string;
}

export interface PublicBookingCreationRow {
  appointment_id: string;
  client_id: string;
  public_short_token?: string;
  public_access_token?: string;
  client_public_access_token?: string;
  access_token?: string;
  token?: string;
  whatsapp_url: string;
  success: boolean;
  message: string;
}

function padDateNumber(value: number): string {
  return String(value).padStart(2, '0');
}

export function getLocalDateStr(date: Date = new Date()): string {
  return [
    date.getFullYear(),
    padDateNumber(date.getMonth() + 1),
    padDateNumber(date.getDate())
  ].join('-');
}

function getLocalTimeStr(date: Date = new Date()): string {
  return [
    padDateNumber(date.getHours()),
    padDateNumber(date.getMinutes())
  ].join(':');
}

function timeToMinutesForBlock(time: string): number {
  const [hours, minutes] = String(time || '00:00').slice(0, 5).split(':').map(Number);

  return (Number.isFinite(hours) ? hours : 0) * 60 + (Number.isFinite(minutes) ? minutes : 0);
}

function getServiceDurationMinutesForBlock(
  selectedService: Service | null,
  selectedProfessional: Professional | null
): number {
  const serviceDuration = Number(
    selectedService
      ? readRemoteValue(selectedService, ['duration', 'durationMinutes', 'duration_minutes'])
      : 0
  );

  if (Number.isFinite(serviceDuration) && serviceDuration > 0) {
    return serviceDuration;
  }

  const professionalDuration = Number(
    selectedProfessional
      ? readRemoteValue(selectedProfessional, [
          'defaultAppointmentDuration',
          'defaultAppointmentDurationMinutes',
          'default_appointment_duration',
          'default_appointment_duration_minutes'
        ])
      : 0
  );

  return Number.isFinite(professionalDuration) && professionalDuration > 0
    ? professionalDuration
    : 30;
}

function bookingIntervalOverlapsBlock(params: {
  block: BookingAgendaBlockedInterval;
  selectedProfessional: Professional | null;
  selectedService: Service | null;
  selectedDate: string;
  selectedTime: string;
}): boolean {
  const {
    block,
    selectedProfessional,
    selectedService,
    selectedDate,
    selectedTime
  } = params;

  if (
    !selectedProfessional ||
    !block.professionalId ||
    block.professionalId !== selectedProfessional.id ||
    block.date !== selectedDate ||
    !selectedTime
  ) {
    return false;
  }

  const selectedStartMinutes = timeToMinutesForBlock(selectedTime);
  const selectedEndMinutes =
    selectedStartMinutes + getServiceDurationMinutesForBlock(selectedService, selectedProfessional);
  const blockStartMinutes = timeToMinutesForBlock(block.startTime);
  const blockEndMinutes = timeToMinutesForBlock(block.endTime);

  if (blockEndMinutes <= blockStartMinutes) {
    return false;
  }

  return selectedStartMinutes < blockEndMinutes && selectedEndMinutes > blockStartMinutes;
}

export function isTimeBlockedForPublicBooking(params: {
  blockedIntervals: BookingAgendaBlockedInterval[];
  selectedProfessional: Professional | null;
  selectedService: Service | null;
  selectedDate: string;
  selectedTime: string;
}): boolean {
  const {
    blockedIntervals,
    selectedProfessional,
    selectedService,
    selectedDate,
    selectedTime
  } = params;

  return blockedIntervals.some((block) =>
    bookingIntervalOverlapsBlock({
      block,
      selectedProfessional,
      selectedService,
      selectedDate,
      selectedTime
    })
  );
}


export function isPastBookingDateTime(
  selectedDate: string,
  selectedTime: string
): boolean {
  if (!selectedDate || !selectedTime) {
    return false;
  }

  const today = getLocalDateStr();

  if (selectedDate < today) {
    return true;
  }

  if (selectedDate > today) {
    return false;
  }

  return selectedTime <= getLocalTimeStr();
}

export function formatDateBr(dateStr: string): string {
  if (!dateStr || !dateStr.includes('-')) {
    return dateStr;
  }

  return dateStr.split('-').reverse().join('/');
}

function normalizeWhatsappNumber(value: string): string {
  const digits = String(value || '').replace(/\D/g, '');

  if (!digits) {
    return '';
  }

  if (digits.startsWith('55')) {
    return digits;
  }

  return `55${digits}`;
}

export function buildClientFollowUpLink(token: string): string {
  const safeToken = encodeURIComponent(token);

  return `${window.location.origin}/meus-agendamentos/${safeToken}`;
}

export function extractPublicAccessToken(value: unknown): string {
  const firstValue = Array.isArray(value) ? value[0] : value;

  if (typeof firstValue === 'string') {
    return firstValue.trim();
  }

  if (firstValue && typeof firstValue === 'object') {
    const record = firstValue as Record<string, unknown>;

    return String(
      record.public_short_token ||
      record.public_access_token ||
      record.client_public_access_token ||
      record.access_token ||
      record.token ||
      ''
    ).trim();
  }

  return '';
}

export async function getClientPublicAccessTokenByAppointment(
  appointmentId: string
): Promise<string> {
  if (!appointmentId) {
    return '';
  }

  const { data, error } = await supabase.rpc(
    'get_my_client_public_access_token_by_appointment',
    {
      p_appointment_id: appointmentId
    }
  );

  if (error) {
    throw new Error(
      error.message ||
      'O agendamento foi criado, mas não foi possível gerar o link de acompanhamento.'
    );
  }

  return extractPublicAccessToken(data);
}

export function buildClientFollowUpWhatsappUrl(params: {
  companyPhone: string;
  companyName: string;
  clientName: string;
  serviceName: string;
  professionalName: string;
  selectedDate: string;
  selectedTime: string;
  followUpLink: string;
}): string {
  const phone = normalizeWhatsappNumber(params.companyPhone);

  if (!phone) {
    return '';
  }

  const message = [
    'Olá,',
    '',
    'Atendimento realizado com sucesso! 😊',
    '',
    `Cliente: ${params.clientName}`,
    `Serviço: ${params.serviceName}`,
    `Profissional: ${params.professionalName}`,
    `Data: ${formatDateBr(params.selectedDate)}`,
    `Horário: ${params.selectedTime}`,
    '',
    'Segue meu link de acompanhamento para confirmar presença, remarcar ou cancelar, caso necessário:',
    params.followUpLink
  ].join('\n');

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}


export function formatPublicCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(Number(value) || 0);
}

export function formatPublicDuration(minutes: number): string {
  const safeMinutes = Number(minutes) || 0;

  if (safeMinutes >= 60) {
    const hours = Math.floor(safeMinutes / 60);
    const remainingMinutes = safeMinutes % 60;

    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h`;
  }

  return `${safeMinutes} min`;
}

export function formatPublicPhone(value: string): string {
  const digits = String(value || '').replace(/\D/g, '');
  const localDigits = digits.startsWith('55') && digits.length > 11 ? digits.slice(2) : digits;

  if (localDigits.length <= 2) {
    return localDigits;
  }

  if (localDigits.length <= 6) {
    return `(${localDigits.slice(0, 2)}) ${localDigits.slice(2)}`;
  }

  if (localDigits.length <= 10) {
    return `(${localDigits.slice(0, 2)}) ${localDigits.slice(2, 6)}-${localDigits.slice(6)}`;
  }

  return `(${localDigits.slice(0, 2)}) ${localDigits.slice(2, 7)}-${localDigits.slice(7, 11)}`;
}

export function normalizeClientName(value: string): string {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .toLocaleUpperCase('pt-BR');
}

export function getLocalWhatsappDigits(value: string): string {
  const digits = String(value || '').replace(/\D/g, '');

  if (digits.startsWith('55') && digits.length > 11) {
    return digits.slice(2, 13);
  }

  return digits.slice(0, 11);
}

export function formatClientWhatsapp(value: string): string {
  return formatPublicPhone(getLocalWhatsappDigits(value));
}

export function isValidClientWhatsapp(value: string): boolean {
  const digits = getLocalWhatsappDigits(value);

  return digits.length === 10 || digits.length === 11;
}

interface PublicClientLookupRow {
  found?: boolean;
  client_name?: string;
  name?: string;
}

export async function findPublicClientNameByPhone(params: {
  slug: string;
  phone: string;
}): Promise<string> {
  const phoneDigits = getLocalWhatsappDigits(params.phone);

  if (!params.slug || !isValidClientWhatsapp(phoneDigits)) {
    return '';
  }

  const { data, error } = await supabase.rpc(
    'get_public_client_name_by_phone',
    {
      p_slug: params.slug,
      p_phone: phoneDigits
    }
  );

  if (error) {
    console.warn(
      'Não foi possível consultar o nome do cliente pelo WhatsApp:',
      error.message
    );
    return '';
  }

  const firstRow = (
    Array.isArray(data) ? data[0] : data
  ) as PublicClientLookupRow | null;

  if (!firstRow || firstRow.found === false) {
    return '';
  }

  return normalizeClientName(
    String(firstRow.client_name || firstRow.name || '')
  ).trim();
}

export function normalizePublicAddress(address: string): string {
  return String(address || '')
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' - ');
}

export function getFirstName(value: string): string {
  return String(value || '').trim().split(/\s+/)[0] || value;
}

