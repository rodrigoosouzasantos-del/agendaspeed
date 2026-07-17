/**
 * Página pública da Vitrine de agendamento - AgendaZap.
 *
 * Este arquivo coordena o fluxo público usado pelo cliente final.
 *
 * Responsabilidades:
 * - exibir a Vitrine do estabelecimento;
 * - controlar etapas do agendamento;
 * - selecionar serviço;
 * - selecionar profissional;
 * - selecionar data e horário;
 * - coletar dados do cliente;
 * - criar agendamento;
 * - preparar mensagem do WhatsApp para o cliente enviar manualmente;
 * - exibir tela de sucesso.
 */

import React, {
  useEffect,
  useMemo,
  useState
} from 'react';

import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  Instagram,
  MapPin,
  MessageCircle,
  Phone,
  User,
  Users,
  Zap
} from 'lucide-react';

import {
  Appointment,
  EstablishmentConfig,
  Professional,
  Service
} from '../../types';

import {
  BookingDateOption,
  BookingScheduleDay,
  BookingStep,
  BookingTimeSlot,
  ClientBookingProps
} from './booking.types';

import {
  calculateBookingCommission,
  filterServicesByCategory,
  generateDateOptions,
  generateTimeSlotObjects,
  getActiveServiceCategories,
  getAvailableProfessionalsForService
} from './booking.utils';

import { supabase } from '../../lib/supabase';


interface BookingAgendaBlockedInterval {
  id: string;
  professionalId: string;
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
}

interface PublicBookingContextRow {
  config: Partial<EstablishmentConfig> & Record<string, unknown>;
  services: Service[];
  professionals: Professional[];
  appointments: Appointment[];
  agendaBlocks?: BookingAgendaBlockedInterval[];
  scheduleDays?: BookingScheduleDay[];
}

function getPublicBookingSlug(): string {
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

function normalizeRemoteService(service: Service): Service {
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


function normalizeRemoteBlockedInterval(rawBlock: Record<string, unknown>): BookingAgendaBlockedInterval {
  return {
    id: String(rawBlock.id || ''),
    professionalId: String(rawBlock.professionalId || rawBlock.professional_id || ''),
    date: String(rawBlock.date || rawBlock.block_date || '').slice(0, 10),
    startTime: String(rawBlock.startTime || rawBlock.start_time || '').slice(0, 5),
    endTime: String(rawBlock.endTime || rawBlock.end_time || '').slice(0, 5),
    reason: String(rawBlock.reason || rawBlock.notes || 'Bloqueado')
  };
}


function normalizeRemoteScheduleDay(rawDay: Record<string, unknown>): BookingScheduleDay {
  const status = String(rawDay.status || 'closed') === 'open' ? 'open' : 'closed';

  return {
    id: String(rawDay.id || ''),
    professionalId: String(rawDay.professionalId || rawDay.professional_id || ''),
    date: String(rawDay.date || rawDay.day_date || '').slice(0, 10),
    status,
    isOutOfRegularSchedule: Boolean(rawDay.isOutOfRegularSchedule || rawDay.is_out_of_regular_schedule)
  };
}

function isPublicScheduleDayOpen(params: {
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

function buildDemoOpenScheduleDays(professionals: Professional[]): BookingScheduleDay[] {
  const today = new Date();
  const activeProfessionals = professionals.filter((professional) => professional.active);
  const scheduleDays: BookingScheduleDay[] = [];

  for (let dayIndex = 0; dayIndex < 3; dayIndex += 1) {
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

function normalizeRemoteProfessional(professional: Professional): Professional {
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

  return {
    ...professional,
    phone: String(readRemoteValue(professional, ['phone', 'whatsapp']) || professional.phone || ''),
    avatar: String(readRemoteValue(professional, ['avatar', 'avatarUrl', 'avatar_url']) || professional.avatar || ''),
    displayOrder: Number.isFinite(displayOrder) ? displayOrder : professional.displayOrder,
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

function mergeConfigWithFallback(
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

interface ClientBookingFeedbackState {
  title: string;
  description: string;
}

interface PublicBookingCreationRow {
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

function getLocalDateStr(date: Date = new Date()): string {
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

function isTimeBlockedForPublicBooking(params: {
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


function isPastBookingDateTime(
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

function formatDateBr(dateStr: string): string {
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

function buildClientFollowUpLink(token: string): string {
  const safeToken = encodeURIComponent(token);

  return `${window.location.origin}/meus-agendamentos/${safeToken}`;
}

function extractPublicAccessToken(value: unknown): string {
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

async function getClientPublicAccessTokenByAppointment(
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

function buildClientFollowUpWhatsappUrl(params: {
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


function formatPublicCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(Number(value) || 0);
}

function formatPublicDuration(minutes: number): string {
  const safeMinutes = Number(minutes) || 0;

  if (safeMinutes >= 60) {
    const hours = Math.floor(safeMinutes / 60);
    const remainingMinutes = safeMinutes % 60;

    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h`;
  }

  return `${safeMinutes} min`;
}

function formatPublicPhone(value: string): string {
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

function normalizeClientName(value: string): string {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .toLocaleUpperCase('pt-BR');
}

function getLocalWhatsappDigits(value: string): string {
  const digits = String(value || '').replace(/\D/g, '');

  if (digits.startsWith('55') && digits.length > 11) {
    return digits.slice(2, 13);
  }

  return digits.slice(0, 11);
}

function formatClientWhatsapp(value: string): string {
  return formatPublicPhone(getLocalWhatsappDigits(value));
}

function isValidClientWhatsapp(value: string): boolean {
  const digits = getLocalWhatsappDigits(value);

  return digits.length === 10 || digits.length === 11;
}

interface PublicClientLookupRow {
  found?: boolean;
  client_name?: string;
  name?: string;
}

async function findPublicClientNameByPhone(params: {
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

function normalizePublicAddress(address: string): string {
  return String(address || '')
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' - ');
}

function getFirstName(value: string): string {
  return String(value || '').trim().split(/\s+/)[0] || value;
}

function BookingStepShell({
  title,
  description,
  onBack,
  children
}: {
  title: string;
  description: string;
  onBack: () => void;
  children?: React.ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-8">
      <div className="mb-4 flex items-start gap-3">
        <button
          type="button"
          onClick={onBack}
          className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-[#1A3038] shadow-sm transition hover:border-[#E0A96D]/60 hover:bg-[#FBF4EC]"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#1A3038] sm:text-3xl">
            {title}
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-600">
            {description}
          </p>
        </div>
      </div>

      {children}
    </main>
  );
}

function BookingHeader({
  logoUrl,
  coverUrl,
  companyName,
  companyAddress,
  companyPhone,
  instagram,
  showBackToSiteButton,
  onNavigateBack
}: {
  logoUrl: string;
  coverUrl?: string;
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  instagram: string;
  showBackToSiteButton: boolean;
  onNavigateBack: () => void;
}) {
  const formattedAddress = normalizePublicAddress(companyAddress);

  return (
    <header className="bg-[#F4F6F6] pb-4">
      <div className="mx-auto w-full max-w-6xl px-3 pt-3 sm:px-4 sm:pt-5">
        {coverUrl ? (
          <div className="overflow-hidden rounded-[1.75rem] border border-white/80 bg-white/70 p-1.5 shadow-[0_18px_55px_rgba(26,48,56,0.10)] ring-1 ring-[#E0A96D]/15 sm:p-2">
            <img
              src={coverUrl}
              alt={`Fachada ${companyName}`}
              className="h-44 w-full rounded-[1.35rem] object-cover sm:h-60 lg:h-72"
              referrerPolicy="no-referrer"
            />
          </div>
        ) : (
          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#1A3038]">
              AgendaSpeed
            </p>
          </div>
        )}

        <div className="relative z-10 mx-auto -mt-8 w-[calc(100%-1.5rem)] max-w-3xl rounded-[1.75rem] border border-white/80 bg-white/95 p-4 shadow-[0_18px_55px_rgba(26,48,56,0.09)] backdrop-blur sm:-mt-10 sm:p-5">
          <div className="flex items-center gap-4">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={`Logo ${companyName}`}
                className="h-16 w-16 shrink-0 rounded-2xl border border-slate-200 bg-white object-contain p-1.5 shadow-sm"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-[#FBF4EC] text-[#E0A96D] shadow-sm">
                <Zap className="h-7 w-7" />
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h1 className="truncate text-xl font-black tracking-tight text-[#1A3038] sm:text-2xl">
                  {companyName || 'AgendaSpeed'}
                </h1>

                {showBackToSiteButton && (
                  <button
                    type="button"
                    onClick={onNavigateBack}
                    className="inline-flex rounded-xl bg-orange-500 px-3 py-2 text-xs font-black text-white shadow-[0_10px_22px_rgba(249,115,22,0.24)] transition hover:bg-orange-600"
                  >
                    Voltar ao site
                  </button>
                )}
              </div>

              <div className="mt-2 space-y-1.5 text-xs font-semibold leading-relaxed text-slate-600">
                {formattedAddress && (
                  <p className="flex items-start gap-1.5">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#1A3038]" />
                    <span>{formattedAddress}</span>
                  </p>
                )}

                {companyPhone && (
                  <p className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 shrink-0 text-[#1A3038]" />
                    <span>{formatPublicPhone(companyPhone)}</span>
                  </p>
                )}

                {instagram && (
                  <p className="flex items-center gap-1.5">
                    <Instagram className="h-3.5 w-3.5 shrink-0 text-[#1A3038]" />
                    <span>{instagram}</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function ServiceSelectionStep({
  services,
  categories,
  activeCategory,
  onChangeCategory,
  onSelectService
}: {
  services: Service[];
  categories: string[];
  activeCategory: string;
  onChangeCategory: (category: string) => void;
  onSelectService: (service: Service) => void;
}) {
  return (
    <main className="mx-auto w-full max-w-6xl px-3 pb-8 sm:px-4">
      <div className="sticky top-0 z-20 -mx-3 border-y border-slate-200 bg-[#F4F6F6]/95 px-3 py-3 backdrop-blur sm:-mx-4 sm:px-4">
        <div className="no-scrollbar flex gap-2 overflow-x-auto whitespace-nowrap pb-0.5">
          {categories.map((category) => {
            const isActive = activeCategory === category;

            return (
              <button
                key={category}
                type="button"
                onClick={() => onChangeCategory(category)}
                className={`shrink-0 rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-[0.08em] shadow-sm transition ${
                  isActive
                    ? 'border-[#E0A96D] bg-[#E0A96D] text-[#1A3038] shadow-[0_8px_22px_rgba(224,169,109,0.22)]'
                    : 'border-[#E0A96D]/25 bg-white/80 text-slate-600 hover:border-[#E0A96D]/60 hover:bg-[#FBF4EC] hover:text-[#1A3038]'
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {services.map((service) => (
          <article
            key={service.id}
            className="group relative overflow-hidden rounded-[1.6rem] border border-slate-200/80 bg-white p-4 shadow-[0_14px_38px_rgba(26,48,56,0.055)] transition hover:border-[#E0A96D]/60 hover:shadow-[0_20px_48px_rgba(26,48,56,0.085)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <span className="inline-flex rounded-full border border-[#E0A96D]/30 bg-[#FBF4EC] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-[#8A663F]">
                  {service.category || 'Serviço'}
                </span>

                <h2 className="mt-3 line-clamp-2 text-base font-black leading-tight text-[#1A3038] sm:text-lg">
                  {service.name}
                </h2>
              </div>

              <div className="shrink-0 rounded-2xl border border-[#E0A96D]/45 bg-[#FBF4EC] px-3 py-2 text-right text-[#1A3038] shadow-[0_8px_22px_rgba(224,169,109,0.18)]">
                <span className="block text-[9px] font-black uppercase leading-none text-[#8A663F]">
                  A partir de
                </span>
                <strong className="block text-sm font-black leading-tight text-[#E0A96D]">
                  {formatPublicCurrency(service.price)}
                </strong>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-[#E0A96D]/20 bg-[#FBF4EC] px-2.5 py-1 text-[11px] font-semibold text-[#8A663F]">
                <Clock className="h-3.5 w-3.5 text-[#E0A96D]" />
                {formatPublicDuration(service.duration)}
              </span>

              {service.requireDeposit && service.depositValue !== null && (
                <span className="inline-flex items-center gap-1 rounded-full border border-[#E0A96D]/35 bg-[#FBF4EC] px-2.5 py-1 text-[11px] font-semibold text-[#8A663F]">
                  Sinal de {formatPublicCurrency(service.depositValue)}
                </span>
              )}
            </div>

            <p className="mt-3 line-clamp-2 min-h-[38px] text-sm font-medium leading-relaxed text-slate-600">
              {service.description || 'Serviço disponível para agendamento.'}
            </p>

            <button
              type="button"
              onClick={() => onSelectService(service)}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#E0A96D] px-4 py-3 text-sm font-black text-[#1A3038] shadow-sm transition hover:bg-[#D69B5F]"
            >
              Escolher serviço
              <ChevronRight className="h-4 w-4" />
            </button>
          </article>
        ))}

        {services.length === 0 && (
          <div className="col-span-full rounded-[1.6rem] border border-dashed border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-600">
            Nenhum serviço disponível nesta categoria.
          </div>
        )}
      </div>
    </main>
  );
}

function ProfessionalSelectionStep({
  selectedService,
  selectedProfessional,
  availableProfessionals,
  onSelectProfessional,
  onBack
}: {
  selectedService: Service;
  selectedProfessional: Professional | null;
  availableProfessionals: Professional[];
  onSelectProfessional: (professional: Professional) => void;
  onBack: () => void;
}) {
  return (
    <BookingStepShell
      title="Escolha o profissional"
      description="Toque em quem você prefere para realizar o atendimento."
      onBack={onBack}
    >
      <div className="overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-100 bg-[#1A3038] px-4 py-3 text-white">
          <Users className="h-4 w-4" />
          <h2 className="text-sm font-black">Profissionais disponíveis</h2>
        </div>

        <div className="divide-y divide-slate-100 p-2">
          {availableProfessionals.map((professional) => {
            const isSelected = selectedProfessional?.id === professional.id;

            return (
              <button
                key={professional.id}
                type="button"
                onClick={() => onSelectProfessional(professional)}
                className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition ${
                  isSelected ? 'bg-[#FBF4EC]' : 'hover:bg-[#F4F6F6]'
                }`}
              >
                {professional.avatar ? (
                  <img
                    src={professional.avatar}
                    alt={professional.name}
                    className="h-16 w-16 shrink-0 rounded-2xl border border-slate-200 object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-[#F4F6F6] text-[#1A3038]">
                    <User className="h-7 w-7" />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-black text-[#1A3038]">
                    {professional.name}
                  </p>
                  <p className="mt-0.5 truncate text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
                    {professional.role || 'Profissional'}
                  </p>
                  <span className="mt-2 inline-flex rounded-full border border-[#E0A96D]/30 bg-[#FBF4EC] px-2.5 py-1 text-[11px] font-black text-[#8A663F]">
                    {formatPublicCurrency(selectedService.price)}
                  </span>
                </div>

                <ChevronRight className="h-5 w-5 shrink-0 text-[#1A3038]" />
              </button>
            );
          })}

          {availableProfessionals.length === 0 && (
            <div className="rounded-2xl bg-[#F4F6F6] p-6 text-center text-sm font-semibold text-slate-600">
              Nenhum profissional disponível para este serviço.
            </div>
          )}
        </div>
      </div>
    </BookingStepShell>
  );
}

function DateTimeSelectionStep({
  selectedService,
  selectedProfessional,
  selectedDate,
  selectedTime,
  dateOptions,
  timeSlots,
  onChangeDate,
  onChangeTime,
  onBack,
  onNextStep
}: {
  selectedService: Service;
  selectedProfessional: Professional;
  selectedDate: string;
  selectedTime: string;
  dateOptions: BookingDateOption[];
  timeSlots: BookingTimeSlot[];
  onChangeDate: (date: string) => void;
  onChangeTime: (time: string) => void;
  onBack: () => void;
  onNextStep: () => void;
}) {
  return (
    <BookingStepShell
      title="Escolha a data e o horário"
      description={`Agendamento com ${selectedProfessional.name} para ${selectedService.name}.`}
      onBack={onBack}
    >
      <div className="space-y-3">
        <section className="overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 bg-[#1A3038] px-4 py-3 text-white">
            <CalendarDays className="h-4 w-4" />
            <h2 className="text-sm font-black">Escolha uma data</h2>
          </div>

          <div className="no-scrollbar flex gap-2 overflow-x-auto p-3">
            {dateOptions.map((dateOption) => {
              const isSelected = selectedDate === dateOption.dateStr;

              return (
                <button
                  key={dateOption.dateStr}
                  type="button"
                  onClick={() => onChangeDate(dateOption.dateStr)}
                  className={`min-w-[104px] rounded-2xl border px-4 py-3 text-center shadow-sm transition ${
                    isSelected
                      ? 'border-[#E0A96D] bg-[#E0A96D] text-[#1A3038]'
                      : 'border-slate-200 bg-white/70 text-[#1A3038] hover:border-[#E0A96D]/60 hover:bg-white'
                  }`}
                >
                  <span className="block text-[10px] font-black uppercase tracking-[0.12em]">
                    {dateOption.dayOfWeekStr}
                  </span>
                  <strong className="mt-1 block text-sm font-black">
                    {dateOption.label}
                  </strong>
                  {isSelected && <CheckCircle2 className="mx-auto mt-2 h-4 w-4" />}
                </button>
              );
            })}

            {dateOptions.length === 0 && (
              <div className="w-full rounded-2xl bg-[#F4F6F6] p-6 text-center text-sm font-semibold text-slate-600">
                Nenhuma data disponível no momento.
              </div>
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 bg-[#1A3038]/90 px-4 py-3 text-white">
            <Clock className="h-4 w-4" />
            <h2 className="text-sm font-black">Escolha um horário</h2>
          </div>

          <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-4">
            {timeSlots.map((slot) => {
              const isSelected = selectedTime === slot.time;

              return (
                <button
                  key={slot.time}
                  type="button"
                  onClick={() => onChangeTime(slot.time)}
                  className={`rounded-2xl border px-3 py-3 text-sm font-black shadow-sm transition ${
                    isSelected
                      ? 'border-[#E0A96D] bg-[#E0A96D] text-[#1A3038]'
                      : 'border-slate-200 bg-white/70 text-[#1A3038] hover:border-[#E0A96D]/60 hover:bg-white'
                  }`}
                >
                  {slot.time}
                </button>
              );
            })}

            {timeSlots.length === 0 && (
              <div className="col-span-full rounded-2xl bg-[#F4F6F6] p-6 text-center text-sm font-semibold text-slate-600">
                Escolha uma data disponível para visualizar os horários.
              </div>
            )}
          </div>
        </section>

        <div className="flex items-center justify-between border-t border-slate-200 pt-4">
          <button
            type="button"
            onClick={onBack}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-600 transition hover:border-[#E0A96D]/60 hover:text-[#1A3038]"
          >
            Voltar
          </button>

          <button
            type="button"
            onClick={onNextStep}
            disabled={!selectedDate || !selectedTime}
            className={`rounded-2xl px-5 py-3 text-sm font-black transition ${
              selectedDate && selectedTime
                ? 'bg-[#E0A96D] text-[#1A3038] hover:bg-[#D69B5F]'
                : 'cursor-not-allowed bg-slate-200 text-slate-400'
            }`}
          >
            Continuar
          </button>
        </div>
      </div>
    </BookingStepShell>
  );
}

function ClientInfoStep({
  selectedService,
  selectedProfessional,
  selectedDate,
  selectedTime,
  clientName,
  clientPhone,
  clientEmail,
  notes,
  onChangeClientName,
  onChangeClientPhone,
  onChangeClientEmail,
  onChangeNotes,
  onBack,
  onNextStep
}: {
  selectedService: Service;
  selectedProfessional: Professional;
  selectedDate: string;
  selectedTime: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  notes: string;
  onChangeClientName: (value: string) => void;
  onChangeClientPhone: (value: string) => void;
  onChangeClientEmail: (value: string) => void;
  onChangeNotes: (value: string) => void;
  onBack: () => void;
  onNextStep: () => void;
}) {
  return (
    <BookingStepShell
      title="Dados do cliente"
      description="Informe seu nome e WhatsApp para continuar."
      onBack={onBack}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onNextStep();
        }}
        className="rounded-[1.6rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
      >
        <div className="mb-4 rounded-2xl border border-slate-200 bg-[#F4F6F6] p-3 text-xs font-semibold text-slate-600">
          <strong className="block text-[#1A3038]">Resumo</strong>
          {selectedService.name} com {selectedProfessional.name} em {formatDateBr(selectedDate)} às {selectedTime}.
        </div>

        <div className="space-y-3">
          <label className="block space-y-1">
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-600">WhatsApp</span>
            <div className="relative">
              <Phone className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
              <input
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                value={clientPhone}
                onChange={(event) => onChangeClientPhone(event.target.value)}
                placeholder="(99) 99999-9999"
                maxLength={15}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-[#F4F6F6] pl-10 pr-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-[#1A3038] focus:bg-white"
                required
              />
            </div>
          </label>

          <label className="block space-y-1">
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-600">Nome completo</span>
            <div className="relative">
              <User className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                autoComplete="name"
                value={clientName}
                onChange={(event) => onChangeClientName(event.target.value)}
                placeholder="DIGITE SEU NOME COMPLETO"
                className="h-11 w-full rounded-2xl border border-slate-200 bg-[#F4F6F6] pl-10 pr-3 text-sm font-semibold uppercase text-slate-700 outline-none transition focus:border-[#1A3038] focus:bg-white"
                required
              />
            </div>
          </label>

          <input
            type="hidden"
            value={clientEmail}
            onChange={(event) => onChangeClientEmail(event.target.value)}
          />

          <input
            type="hidden"
            value={notes}
            onChange={(event) => onChangeNotes(event.target.value)}
          />

          <p className="rounded-2xl border border-slate-200 bg-[#F4F6F6] px-3 py-3 text-xs font-semibold leading-relaxed text-slate-600">
            Usaremos estes dados apenas para identificar seu agendamento e permitir contato pelo WhatsApp.
          </p>
        </div>

        <div className="mt-5 flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-600 transition hover:border-[#E0A96D]/60 hover:text-[#1A3038]"
          >
            Voltar
          </button>

          <button
            type="submit"
            disabled={!clientName.trim() || !clientPhone.trim()}
            className={`rounded-2xl px-5 py-3 text-sm font-black transition ${
              clientName.trim() && clientPhone.trim()
                ? 'bg-[#E0A96D] text-[#1A3038] hover:bg-[#D69B5F]'
                : 'cursor-not-allowed bg-slate-200 text-slate-400'
            }`}
          >
            Continuar
          </button>
        </div>
      </form>
    </BookingStepShell>
  );
}

function BookingSuccessView({
  selectedService,
  selectedProfessional,
  selectedDate,
  selectedTime,
  clientName,
  companyName,
  companyAddress,
  whatsappUrl,
  onNavigateBack
}: {
  selectedService: Service | null;
  selectedProfessional: Professional | null;
  selectedDate: string;
  selectedTime: string;
  clientName: string;
  clientPhone: string;
  companyName: string;
  companyAddress: string;
  whatsappUrl: string;
  onNavigateBack: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-2xl items-center px-4 py-8">
      <div className="w-full rounded-[1.8rem] border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FBF4EC] text-[#E0A96D]">
          <CheckCircle2 className="h-8 w-8" />
        </div>

        <h1 className="mt-4 text-2xl font-black text-[#1A3038]">
          Atendimento realizado com sucesso!
        </h1>
        <p className="mt-2 text-sm font-medium text-slate-600">
          {getFirstName(clientName)}, seu agendamento foi registrado. Envie a confirmação pelo WhatsApp para o estabelecimento receber os dados.
        </p>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-[#F4F6F6] p-4 text-left text-sm font-semibold text-slate-600">
          <p><strong className="text-[#1A3038]">Serviço:</strong> {selectedService?.name || '-'}</p>
          <p><strong className="text-[#1A3038]">Profissional:</strong> {selectedProfessional?.name || '-'}</p>
          <p><strong className="text-[#1A3038]">Data:</strong> {formatDateBr(selectedDate)} às {selectedTime}</p>
          <p><strong className="text-[#1A3038]">Local:</strong> {normalizePublicAddress(companyAddress) || companyName}</p>
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#E0A96D] px-5 py-3 text-sm font-black text-[#1A3038] transition hover:bg-[#D69B5F]"
            >
              <MessageCircle className="h-4 w-4" />
              Enviar no WhatsApp
            </a>
          )}

          <button
            type="button"
            onClick={onNavigateBack}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-600 transition hover:border-[#E0A96D]/60 hover:text-[#1A3038]"
          >
            Fazer novo agendamento
          </button>
        </div>
      </div>
    </main>
  );
}

function ClientBookingFeedbackModal({
  title,
  description,
  onClose
}: ClientBookingFeedbackState & {
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-neutral-200">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#FBF4EC] text-[#E0A96D]">
            <span className="text-xl font-black">
              !
            </span>
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-black text-[#1A3038]">
              {title}
            </h2>

            <p className="text-sm leading-relaxed text-slate-600">
              {description}
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl bg-[#E0A96D] px-5 py-3 text-sm font-black text-[#1A3038] shadow-sm hover:bg-[#D69B5F]"
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ClientBooking({
  state,
  onAddAppointment,
  onNavigateBack
}: ClientBookingProps) {
  const publicSlug = useMemo(() => getPublicBookingSlug(), []);

  const [remoteBookingContext, setRemoteBookingContext] =
    useState<PublicBookingContextRow | null>(null);
  const [loadingRemoteContext, setLoadingRemoteContext] = useState(Boolean(publicSlug));
  const [remoteContextError, setRemoteContextError] = useState('');
  const [agendaBlocks, setAgendaBlocks] = useState<BookingAgendaBlockedInterval[]>([]);
  const [agendaOpenDays, setAgendaOpenDays] = useState<BookingScheduleDay[]>([]);

  const config = useMemo(() => {
    return mergeConfigWithFallback(state.config, remoteBookingContext?.config);
  }, [state.config, remoteBookingContext]);

  // Em uma vitrine real, a resposta do Supabase é a única fonte válida.
  // Mesmo uma lista vazia é um resultado legítimo e não deve cair em dados demo/localStorage.
  const services = remoteBookingContext
    ? remoteBookingContext.services
    : state.services;

  const professionals = remoteBookingContext
    ? remoteBookingContext.professionals
    : state.professionals;

  const isDemoBooking = !publicSlug;
  const appointments = isDemoBooking
    ? []
    : remoteBookingContext?.appointments || state.appointments;
  const blockedIntervals = isDemoBooking
    ? []
    : remoteBookingContext?.agendaBlocks || agendaBlocks;

  const demoOpenDays = useMemo(() => {
    return isDemoBooking ? buildDemoOpenScheduleDays(professionals) : [];
  }, [isDemoBooking, professionals]);

  const effectiveAgendaOpenDays = isDemoBooking ? demoOpenDays : agendaOpenDays;

  const [currentStep, setCurrentStep] = useState<BookingStep>(1);

  const [activeCategory, setActiveCategory] = useState('Todos');

  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');

  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientNameWasAutoFilled, setClientNameWasAutoFilled] = useState(false);
  const [notes, setNotes] = useState('');

  const [createdWhatsappUrl, setCreatedWhatsappUrl] = useState('');
  const [submittingBooking, setSubmittingBooking] = useState(false);
  const [feedbackMessage, setFeedbackMessage] =
    useState<ClientBookingFeedbackState | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadPublicBookingContext() {
      if (!publicSlug) {
        setLoadingRemoteContext(false);
        return;
      }

      setLoadingRemoteContext(true);
      setRemoteContextError('');

      const { data, error } = await supabase.rpc('get_public_booking_context', {
        p_slug: publicSlug
      });

      if (!isMounted) return;

      if (error) {
        setRemoteBookingContext(null);
        setRemoteContextError(error.message || 'Não foi possível carregar a vitrine.');
        setLoadingRemoteContext(false);
        return;
      }

      const firstRow = Array.isArray(data) ? data[0] : null;

      if (!firstRow) {
        setRemoteBookingContext(null);
        setRemoteContextError('Vitrine não encontrada ou indisponível.');
        setLoadingRemoteContext(false);
        return;
      }

      const contextAgendaBlocks = Array.isArray(firstRow.agenda_blocks)
        ? firstRow.agenda_blocks.map((block: Record<string, unknown>) => normalizeRemoteBlockedInterval(block))
        : [];

      const contextScheduleDays = Array.isArray(firstRow.schedule_days)
        ? firstRow.schedule_days.map((day: Record<string, unknown>) => normalizeRemoteScheduleDay(day))
        : [];

      setRemoteBookingContext({
        config: firstRow.config || {},
        services: Array.isArray(firstRow.services)
          ? firstRow.services.map(normalizeRemoteService)
          : [],
        professionals: Array.isArray(firstRow.professionals)
          ? firstRow.professionals.map(normalizeRemoteProfessional)
          : [],
        appointments: Array.isArray(firstRow.appointments) ? firstRow.appointments : [],
        agendaBlocks: contextAgendaBlocks,
        scheduleDays: contextScheduleDays
      });

      setAgendaBlocks(contextAgendaBlocks);
      setAgendaOpenDays(contextScheduleDays);

      const { data: blocksData, error: blocksError } = await supabase.rpc(
        'get_public_professional_schedule_blocks',
        {
          p_slug: publicSlug
        }
      );

      if (!isMounted) return;

      if (blocksError) {
        console.error('Erro ao carregar bloqueios públicos da agenda:', blocksError.message);
      }

      if (Array.isArray(blocksData)) {
        const normalizedBlocks = blocksData.map((block: Record<string, unknown>) =>
          normalizeRemoteBlockedInterval(block)
        );

        setAgendaBlocks(normalizedBlocks);
        setRemoteBookingContext((currentContext) =>
          currentContext
            ? {
                ...currentContext,
                agendaBlocks: normalizedBlocks
              }
            : currentContext
        );
      }

      const { data: scheduleDaysData, error: scheduleDaysError } = await supabase.rpc(
        'get_public_professional_schedule_days',
        {
          p_slug: publicSlug
        }
      );

      if (!isMounted) return;

      if (scheduleDaysError) {
        console.error('Erro ao carregar dias abertos da agenda pública:', scheduleDaysError.message);
      }

      if (Array.isArray(scheduleDaysData)) {
        const normalizedScheduleDays = scheduleDaysData.map((day: Record<string, unknown>) =>
          normalizeRemoteScheduleDay(day)
        );

        setAgendaOpenDays(normalizedScheduleDays);
        setRemoteBookingContext((currentContext) =>
          currentContext
            ? {
                ...currentContext,
                scheduleDays: normalizedScheduleDays
              }
            : currentContext
        );
      }

      setLoadingRemoteContext(false);
    }

    loadPublicBookingContext();

    return () => {
      isMounted = false;
    };
  }, [publicSlug]);


  const categories = useMemo(() => {
    return getActiveServiceCategories(services);
  }, [services]);

  useEffect(() => {
    if (!categories.includes(activeCategory)) {
      setActiveCategory('Todos');
    }
  }, [categories, activeCategory]);

  const filteredServices = useMemo(() => {
    return filterServicesByCategory({
      services,
      activeCategory
    });
  }, [
    services,
    activeCategory
  ]);

  const availableProfessionals = useMemo(() => {
    return getAvailableProfessionalsForService({
      professionals,
      selectedService
    });
  }, [
    professionals,
    selectedService
  ]);

  const baseDateOptions = useMemo(() => {
    return generateDateOptions({
      config,
      selectedProfessional,
      selectedService,
      appointments,
      services,
      openDays: effectiveAgendaOpenDays,
      numberOfDays: config.maxFutureDays || 30
    });
  }, [
    config,
    selectedProfessional,
    selectedService,
    appointments,
    effectiveAgendaOpenDays,
    services
  ]);

  const dateOptions = useMemo(() => {
    if (!selectedProfessional) {
      return baseDateOptions;
    }

    return baseDateOptions.filter((dateOption) => {
      const availableSlotsForDate = generateTimeSlotObjects({
        appointments,
        selectedProfessional,
        selectedService,
        services,
        openDays: effectiveAgendaOpenDays,
        selectedDate: dateOption.dateStr
      });

      return availableSlotsForDate.some((slot) =>
        slot.available &&
        !isTimeBlockedForPublicBooking({
          blockedIntervals,
          selectedProfessional,
          selectedService,
          selectedDate: dateOption.dateStr,
          selectedTime: slot.time
        })
      );
    });
  }, [
    appointments,
    baseDateOptions,
    blockedIntervals,
    effectiveAgendaOpenDays,
    selectedProfessional,
    selectedService,
    services
  ]);

  const timeSlots = useMemo(() => {
    const generatedSlots = generateTimeSlotObjects({
      appointments,
      selectedProfessional,
      selectedService,
      services,
      openDays: effectiveAgendaOpenDays,
      selectedDate
    });

    return generatedSlots.filter((slot) =>
      slot.available &&
      !isTimeBlockedForPublicBooking({
        blockedIntervals,
        selectedProfessional,
        selectedService,
        selectedDate,
        selectedTime: slot.time
      })
    );
  }, [
    appointments,
    selectedProfessional,
    selectedService,
    services,
    blockedIntervals,
    effectiveAgendaOpenDays,
    selectedDate
  ]);

  const coverUrl =
    String(config.coverImage || '') ||
    ('cover' in config
      ? String(config.cover || '')
      : 'coverUrl' in config
        ? String(config.coverUrl || '')
        : '');

  const whatsappUrl = createdWhatsappUrl;

  const showFeedbackMessage = (
    title: string,
    description: string
  ) => {
    setFeedbackMessage({
      title,
      description
    });
  };

  const handleChangeClientName = (value: string) => {
    setClientName(normalizeClientName(value));
    setClientNameWasAutoFilled(false);
  };

  const handleChangeClientPhone = (value: string) => {
    const formattedPhone = formatClientWhatsapp(value);

    setClientPhone(formattedPhone);

    if (!isValidClientWhatsapp(formattedPhone)) {
      if (clientNameWasAutoFilled) {
        setClientName('');
      }

      setClientNameWasAutoFilled(false);
    }
  };

  useEffect(() => {
    if (
      currentStep !== 4 ||
      !publicSlug ||
      !isValidClientWhatsapp(clientPhone)
    ) {
      return;
    }

    let isCancelled = false;

    const lookupTimeoutId = window.setTimeout(async () => {
      const foundClientName = await findPublicClientNameByPhone({
        slug: publicSlug,
        phone: clientPhone
      });

      if (isCancelled) return;

      if (foundClientName) {
        setClientName(foundClientName);
        setClientNameWasAutoFilled(true);
        return;
      }

      if (clientNameWasAutoFilled) {
        setClientName('');
      }

      setClientNameWasAutoFilled(false);
    }, 450);

    return () => {
      isCancelled = true;
      window.clearTimeout(lookupTimeoutId);
    };
  }, [
    currentStep,
    publicSlug,
    clientPhone,
    clientNameWasAutoFilled
  ]);

  const handleSelectService = (service: Service) => {
    setSelectedService(service);
    setSelectedProfessional(null);
    setSelectedDate('');
    setSelectedTime('');
    setCurrentStep(2);
  };

  const handleSelectProfessional = (professional: Professional) => {
    setSelectedProfessional(professional);
    setSelectedDate('');
    setSelectedTime('');
    setCurrentStep(3);
  };

  const handleChangeDate = (date: string) => {
    setSelectedDate(date);
    setSelectedTime('');
  };

  const handleChangeTime = (time: string) => {
    if (isPastBookingDateTime(selectedDate, time)) {
      showFeedbackMessage(
        'Horário indisponível',
        'Este horário já passou e não pode mais ser selecionado para agendamento.'
      );
      return;
    }

    setSelectedTime(time);
  };

  const handleGoToClientInfo = () => {
    if (!selectedDate || !selectedTime) {
      showFeedbackMessage(
        'Data e horário obrigatórios',
        'Escolha a data e o horário para continuar.'
      );
      return;
    }

    if (
      selectedProfessional &&
      !isPublicScheduleDayOpen({
        openDays: effectiveAgendaOpenDays,
        selectedProfessional,
        selectedDate
      })
    ) {
      showFeedbackMessage(
        'Agenda fechada',
        'Este dia não está aberto para agendamento. Escolha uma data disponível.'
      );
      setSelectedDate('');
      setSelectedTime('');
      return;
    }

    if (isPastBookingDateTime(selectedDate, selectedTime)) {
      showFeedbackMessage(
        'Horário indisponível',
        'Este horário já passou. Escolha outro horário disponível para continuar.'
      );
      setSelectedTime('');
      return;
    }

    setCurrentStep(4);
  };

  const handleBackToServices = () => {
    setCurrentStep(1);
  };

  const handleBackToProfessionals = () => {
    setCurrentStep(2);
  };

  const handleBackToDateTime = () => {
    setCurrentStep(3);
  };

  const handleResetBooking = () => {
    setCurrentStep(1);
    setActiveCategory('Todos');
    setSelectedService(null);
    setSelectedProfessional(null);
    setSelectedDate('');
    setSelectedTime('');
    setClientName('');
    setClientPhone('');
    setClientEmail('');
    setClientNameWasAutoFilled(false);
    setNotes('');
    setCreatedWhatsappUrl('');
  };

  const handleSubmitBooking = async (event?: React.FormEvent) => {
    event?.preventDefault();

    if (submittingBooking) {
      return;
    }

    if (!selectedService || !selectedProfessional) {
      showFeedbackMessage(
        'Dados incompletos',
        'Selecione um serviço e um profissional antes de concluir.'
      );
      return;
    }

    if (!selectedDate || !selectedTime) {
      showFeedbackMessage(
        'Data e horário obrigatórios',
        'Selecione uma data e um horário antes de concluir.'
      );
      return;
    }

    if (
      !isPublicScheduleDayOpen({
        openDays: effectiveAgendaOpenDays,
        selectedProfessional,
        selectedDate
      })
    ) {
      showFeedbackMessage(
        'Agenda fechada',
        'Este dia não está aberto para agendamento. Volte e escolha outra data disponível.'
      );
      setCurrentStep(3);
      setSelectedDate('');
      setSelectedTime('');
      return;
    }

    if (isPastBookingDateTime(selectedDate, selectedTime)) {
      showFeedbackMessage(
        'Agendamento não permitido',
        'Este horário já passou. Volte e escolha outro horário disponível.'
      );
      setCurrentStep(3);
      setSelectedTime('');
      return;
    }

    const selectedTimeIsBlocked = isTimeBlockedForPublicBooking({
      blockedIntervals,
      selectedProfessional,
      selectedService,
      selectedDate,
      selectedTime
    });

    const selectedTimeIsStillAvailable = !selectedTimeIsBlocked && generateTimeSlotObjects({
      appointments,
      selectedProfessional,
      selectedService,
      services,
      openDays: effectiveAgendaOpenDays,
      selectedDate
    }).some((slot) => slot.time === selectedTime && slot.available);

    if (!selectedTimeIsStillAvailable) {
      showFeedbackMessage(
        'Horário indisponível',
        'Este horário acabou de ser ocupado ou não está mais dentro da agenda do profissional. Escolha outro horário disponível.'
      );
      setCurrentStep(3);
      setSelectedTime('');
      return;
    }

    if (!clientName.trim() || !clientPhone.trim()) {
      showFeedbackMessage(
        'Dados do cliente obrigatórios',
        'Informe seu nome e WhatsApp para concluir o agendamento.'
      );
      return;
    }

    if (!isValidClientWhatsapp(clientPhone)) {
      showFeedbackMessage(
        'WhatsApp inválido',
        'Informe um número com DDD, usando 10 ou 11 dígitos.'
      );
      return;
    }

    const normalizedClientName = normalizeClientName(clientName).trim();
    const normalizedClientPhone = getLocalWhatsappDigits(clientPhone);

    const commissionValue = calculateBookingCommission({
      selectedService,
      selectedProfessional
    });

    const appointmentNotes = [
      notes.trim(),
      clientEmail.trim() ? `E-mail do cliente: ${clientEmail.trim()}` : ''
    ]
      .filter(Boolean)
      .join(' | ');


    setSubmittingBooking(true);

    if (isDemoBooking) {
      // Demonstração fictícia: não grava no Supabase, não atualiza estado local
      // e não polui nenhum cadastro, agenda ou histórico.
      setCreatedWhatsappUrl('');
      setCurrentStep(5);
      setSubmittingBooking(false);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('create_public_booking', {
        p_slug: publicSlug || 'domcabelo',
        p_service_id: selectedService.id,
        p_professional_id: selectedProfessional.id,
        p_starts_at_local: `${selectedDate}T${selectedTime}`,
        p_client_name: normalizedClientName,
        p_client_phone: normalizedClientPhone,
        p_client_email: clientEmail.trim() || null,
        p_notes: appointmentNotes || null
      });

      if (error) {
        showFeedbackMessage(
          'Não foi possível criar o agendamento',
          error.message || 'Verifique se o horário ainda está disponível e tente novamente.'
        );
        setSubmittingBooking(false);
        return;
      }

      const firstRow = (Array.isArray(data) ? data[0] : null) as PublicBookingCreationRow | null;

      if (!firstRow?.success || !firstRow.appointment_id) {
        showFeedbackMessage(
          'Não foi possível criar o agendamento',
          firstRow?.message || 'Verifique os dados informados e tente novamente.'
        );
        setSubmittingBooking(false);
        return;
      }

      const newAppointment: Appointment = {
        id: firstRow.appointment_id,
        dateTime: `${selectedDate}T${selectedTime}`,
        clientName: normalizedClientName,
        clientPhone: normalizedClientPhone,
        clientEmail: clientEmail.trim() || undefined,
        serviceId: selectedService.id,
        professionalId: selectedProfessional.id,
        price: selectedService.price,
        status: 'scheduled',
        paymentType: 'pendente',
        notes: appointmentNotes || 'Agendamento realizado pela Vitrine pública.',
        commissionPaid: false,
        commissionValue,
        depositPaid: false
      };

      onAddAppointment(newAppointment);

      setRemoteBookingContext((current) => {
        if (!current) return current;

        return {
          ...current,
          appointments: [
            ...current.appointments,
            newAppointment
          ]
        };
      });

      const tokenReturnedWithBooking = extractPublicAccessToken(firstRow);
      const followUpToken =
        tokenReturnedWithBooking ||
        await getClientPublicAccessTokenByAppointment(firstRow.appointment_id);

      if (!followUpToken) {
        showFeedbackMessage(
          'Agendamento criado, mas link indisponível',
          'Seu horário foi reservado, porém não foi possível gerar o link para confirmar, remarcar ou cancelar. Entre em contato com o estabelecimento.'
        );
        setSubmittingBooking(false);
        return;
      }

      const followUpLink = buildClientFollowUpLink(followUpToken);
      const nextWhatsappUrl = buildClientFollowUpWhatsappUrl({
        companyPhone: config.phone,
        companyName: config.name || 'estabelecimento',
        clientName: normalizedClientName,
        serviceName: selectedService.name,
        professionalName: selectedProfessional.name,
        selectedDate,
        selectedTime,
        followUpLink
      });

      setCreatedWhatsappUrl(nextWhatsappUrl);
      setCurrentStep(5);
      setSubmittingBooking(false);
    } catch (error) {
      showFeedbackMessage(
        'Erro inesperado',
        error instanceof Error ? error.message : 'Não foi possível concluir o agendamento.'
      );
      setSubmittingBooking(false);
    }
  };

  if (loadingRemoteContext) {
    return (
      <div className="min-h-screen bg-[#F4F6F6] flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-3xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-[#1A3038]/10 border-t-[#E0A96D]" />
          <h1 className="text-xl font-black text-[#1A3038]">Carregando vitrine...</h1>
          <p className="mt-2 text-sm text-slate-600">Buscando dados reais do estabelecimento.</p>
        </div>
      </div>
    );
  }

  if (remoteContextError) {
    return (
      <div className="min-h-screen bg-[#F4F6F6] flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-xl font-black text-red-600">!</div>
          <h1 className="text-xl font-black text-[#1A3038]">Vitrine indisponível</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">{remoteContextError}</p>
          <button
            type="button"
            onClick={onNavigateBack}
            className="mt-6 rounded-2xl bg-[#E0A96D] px-5 py-3 text-sm font-black text-[#1A3038] hover:bg-[#D69B5F]"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F6F6] text-[#1A3038] font-sans">
      {currentStep === 1 && (
        <BookingHeader
          logoUrl={config.logo}
          coverUrl={coverUrl}
          companyName={config.name}
          companyAddress={config.address}
          companyPhone={config.phone}
          instagram={config.instagram}
          showBackToSiteButton={isDemoBooking}
          onNavigateBack={onNavigateBack}
        />
      )}

      {currentStep === 1 && (
        <ServiceSelectionStep
          services={filteredServices}
          categories={categories}
          activeCategory={activeCategory}
          onChangeCategory={setActiveCategory}
          onSelectService={handleSelectService}
        />
      )}

      {currentStep === 2 && selectedService && (
        <ProfessionalSelectionStep
          selectedService={selectedService}
          selectedProfessional={selectedProfessional}
          availableProfessionals={availableProfessionals}
          onSelectProfessional={handleSelectProfessional}
          onBack={handleBackToServices}
        />
      )}

      {currentStep === 3 && selectedService && selectedProfessional && (
        <DateTimeSelectionStep
          selectedService={selectedService}
          selectedProfessional={selectedProfessional}
          selectedDate={selectedDate}
          selectedTime={selectedTime}
          dateOptions={dateOptions}
          timeSlots={timeSlots}
          onChangeDate={handleChangeDate}
          onChangeTime={handleChangeTime}
          onBack={handleBackToProfessionals}
          onNextStep={handleGoToClientInfo}
        />
      )}

      {currentStep === 4 && selectedService && selectedProfessional && (
        <ClientInfoStep
          selectedService={selectedService}
          selectedProfessional={selectedProfessional}
          selectedDate={selectedDate}
          selectedTime={selectedTime}
          clientName={clientName}
          clientPhone={clientPhone}
          clientEmail={clientEmail}
          notes={notes}
          onChangeClientName={handleChangeClientName}
          onChangeClientPhone={handleChangeClientPhone}
          onChangeClientEmail={setClientEmail}
          onChangeNotes={setNotes}
          onBack={handleBackToDateTime}
          onNextStep={handleSubmitBooking}
        />
      )}

      {currentStep === 5 && (
        <BookingSuccessView
          selectedService={selectedService}
          selectedProfessional={selectedProfessional}
          selectedDate={selectedDate}
          selectedTime={selectedTime}
          clientName={clientName}
          clientPhone={clientPhone}
          companyName={config.name}
          companyAddress={config.address}
          whatsappUrl={whatsappUrl}
          onNavigateBack={handleResetBooking}
        />
      )}

      {feedbackMessage && (
        <ClientBookingFeedbackModal
          title={feedbackMessage.title}
          description={feedbackMessage.description}
          onClose={() => setFeedbackMessage(null)}
        />
      )}

      <footer className="py-8 flex justify-center">
        <div className="inline-flex items-center gap-2 text-[#1A3038]">
          <span className="w-9 h-9 rounded-xl bg-[#E0A96D] text-[#1A3038] flex items-center justify-center shadow-[0_8px_22px_rgba(224,169,109,0.22)]">
            <span className="text-lg font-black leading-none">
              ⚡
            </span>
          </span>

          <span className="text-lg font-black tracking-tight">
            Agenda<span className="text-[#E0A96D]">Speed</span>
          </span>
        </div>
      </footer>
    </div>
  );
}
