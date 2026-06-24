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
 * - abrir WhatsApp com mensagem pré-configurada;
 * - exibir tela de sucesso.
 */

import React, {
  useEffect,
  useMemo,
  useState
} from 'react';

import {
  Appointment,
  EstablishmentConfig,
  Professional,
  Service
} from '../../types';

import {
  BookingStep,
  ClientBookingProps
} from './booking.types';

import {
  buildBookingWhatsAppUrl,
  calculateBookingCommission,
  filterServicesByCategory,
  generateDateOptions,
  generateTimeSlotObjects,
  getActiveServiceCategories,
  getAvailableProfessionalsForService
} from './booking.utils';

import BookingHeader from './components/BookingHeader';
import ServiceSelectionStep from './components/ServiceSelectionStep';
import ProfessionalSelectionStep from './components/ProfessionalSelectionStep';
import DateTimeSelectionStep from './components/DateTimeSelectionStep';
import ClientInfoStep from './components/ClientInfoStep';
import BookingSuccessView from './components/BookingSuccessView';
import { supabase } from '../../lib/supabase';


interface PublicBookingContextRow {
  config: Partial<EstablishmentConfig> & Record<string, unknown>;
  services: Service[];
  professionals: Professional[];
  appointments: Appointment[];
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
    name: String(remoteConfig.name || fallbackConfig.name || ''),
    logo: String(remoteConfig.logo || fallbackConfig.logo || ''),
    coverImage: String(remoteConfig.coverImage || fallbackConfig.coverImage || ''),
    address: String(remoteConfig.address || fallbackConfig.address || ''),
    phone: String(remoteConfig.phone || fallbackConfig.phone || ''),
    instagram: String(remoteConfig.instagram || fallbackConfig.instagram || ''),
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
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-orange-700">
            <span className="text-xl font-black">
              !
            </span>
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-black text-neutral-900">
              {title}
            </h2>

            <p className="text-sm leading-relaxed text-neutral-600">
              {description}
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl bg-orange-600 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-orange-700"
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

  const config = useMemo(() => {
    return mergeConfigWithFallback(state.config, remoteBookingContext?.config);
  }, [state.config, remoteBookingContext]);

  const services = remoteBookingContext?.services?.length
    ? remoteBookingContext.services
    : state.services;

  const professionals = remoteBookingContext?.professionals?.length
    ? remoteBookingContext.professionals
    : state.professionals;

  const appointments = remoteBookingContext?.appointments || state.appointments;

  const [currentStep, setCurrentStep] = useState<BookingStep>(1);

  const [activeCategory, setActiveCategory] = useState('Todos');

  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');

  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
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

      setRemoteBookingContext({
        config: firstRow.config || {},
        services: Array.isArray(firstRow.services)
          ? firstRow.services.map(normalizeRemoteService)
          : [],
        professionals: Array.isArray(firstRow.professionals)
          ? firstRow.professionals.map(normalizeRemoteProfessional)
          : [],
        appointments: Array.isArray(firstRow.appointments) ? firstRow.appointments : []
      });
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

  const dateOptions = useMemo(() => {
    return generateDateOptions({
      config,
      selectedProfessional,
      selectedService,
      appointments,
      services,
      numberOfDays: config.maxFutureDays || 30
    });
  }, [
    config,
    selectedProfessional,
    selectedService,
    appointments,
    services
  ]);

  const timeSlots = useMemo(() => {
    return generateTimeSlotObjects({
      appointments,
      selectedProfessional,
      selectedService,
      services,
      selectedDate
    });
  }, [
    appointments,
    selectedProfessional,
    selectedService,
    services,
    selectedDate
  ]);

  const coverUrl =
    'cover' in config
      ? String(config.cover || '')
      : 'coverUrl' in config
        ? String(config.coverUrl || '')
        : '';

  const whatsappUrl = createdWhatsappUrl || buildBookingWhatsAppUrl({
    config,
    selectedService,
    selectedProfessional,
    selectedDate,
    selectedTime,
    clientName
  });

  const showFeedbackMessage = (
    title: string,
    description: string
  ) => {
    setFeedbackMessage({
      title,
      description
    });
  };

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

    if (isPastBookingDateTime(selectedDate, selectedTime)) {
      showFeedbackMessage(
        'Agendamento não permitido',
        'Este horário já passou. Volte e escolha outro horário disponível.'
      );
      setCurrentStep(3);
      setSelectedTime('');
      return;
    }

    const selectedTimeIsStillAvailable = generateTimeSlotObjects({
      appointments,
      selectedProfessional,
      selectedService,
      services,
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

    const fallbackWhatsappUrl = buildBookingWhatsAppUrl({
      config,
      selectedService,
      selectedProfessional,
      selectedDate,
      selectedTime,
      clientName: clientName.trim()
    });

    setSubmittingBooking(true);

    try {
      const { data, error } = await supabase.rpc('create_public_booking', {
        p_slug: publicSlug || 'domcabelo',
        p_service_id: selectedService.id,
        p_professional_id: selectedProfessional.id,
        p_starts_at_local: `${selectedDate}T${selectedTime}`,
        p_client_name: clientName.trim(),
        p_client_phone: clientPhone.trim(),
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
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim(),
        clientEmail: clientEmail.trim() || undefined,
        serviceId: selectedService.id,
        professionalId: selectedProfessional.id,
        price: selectedService.price,
        status: config.autoApprove ? 'confirmed' : 'scheduled',
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

      const nextWhatsappUrl = firstRow.whatsapp_url || fallbackWhatsappUrl;

      setCreatedWhatsappUrl(nextWhatsappUrl);
      setCurrentStep(5);
      setSubmittingBooking(false);

      window.open(nextWhatsappUrl, '_blank', 'noopener,noreferrer');
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
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-3xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-orange-100 border-t-orange-600" />
          <h1 className="text-xl font-black text-neutral-950">Carregando vitrine...</h1>
          <p className="mt-2 text-sm text-neutral-500">Buscando dados reais do estabelecimento.</p>
        </div>
      </div>
    );
  }

  if (remoteContextError) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-xl font-black text-red-600">!</div>
          <h1 className="text-xl font-black text-neutral-950">Vitrine indisponível</h1>
          <p className="mt-2 text-sm leading-relaxed text-neutral-600">{remoteContextError}</p>
          <button
            type="button"
            onClick={onNavigateBack}
            className="mt-6 rounded-2xl bg-orange-600 px-5 py-3 text-sm font-black text-white hover:bg-orange-700"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans">
      {currentStep === 1 && (
        <BookingHeader
          logoUrl={config.logo}
          coverUrl={coverUrl}
          companyName={config.name}
          companyAddress={config.address}
          companyPhone={config.phone}
          instagram={config.instagram}
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
          onChangeClientName={setClientName}
          onChangeClientPhone={setClientPhone}
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
        <div className="inline-flex items-center gap-2 text-neutral-900">
          <span className="w-9 h-9 rounded-xl bg-orange-600 text-white flex items-center justify-center shadow-sm">
            <span className="text-lg font-black leading-none">
              ⚡
            </span>
          </span>

          <span className="text-lg font-black tracking-tight">
            Agenda<span className="text-orange-600">Zap</span>
          </span>
        </div>
      </footer>
    </div>
  );
}
