import React, {
  useEffect,
  useMemo,
  useState
} from 'react';

import {
  Appointment,
  EstablishmentConfig,
  PaymentType,
  Professional,
  Service
} from '../../types';

import {
  ProfessionalDashboardProps,
  ProfessionalManualAppointmentFormState,
  ProfessionalTab
} from './professional.types';

import {
  buildManualAppointment,
  calculateProfessionalFinancialSummary,
  getInitialManualAppointmentFormState,
  getProfessionalAppointments,
  getProfessionalServices,
  validateManualAppointmentForm
} from './professional.utils';

import ProfessionalHeader from './components/ProfessionalHeader';
import ProfessionalReportsView from './components/ProfessionalReportsView';

import ProfessionalCalendarAgendaView from './agenda/ProfessionalCalendarAgendaView';

import ManualAppointmentModal from './modals/ManualAppointmentModal';

import { supabase } from '../../lib/supabase';

import {
  ProfessionalAgendaFeedbackModal
} from './agenda/ProfessionalAgendaModals';

import {
  getTodayDateStr
} from './agenda/professionalAgenda.utils';

interface ProfessionalDashboardFeedbackState {
  title: string;
  description: string;
}

type SupabaseProfessionalAppointmentResponse = {
  id: string;
  date_time: string;
  client_name: string;
  client_phone: string;
  client_email: string | null;
  service_id: string;
  professional_id: string;
  price: number;
  status: Appointment['status'] | string;
  payment_type: PaymentType | string | null;
  notes: string | null;
  commission_paid: boolean;
  commission_value: number;
  deposit_paid: boolean;
};

function mapSupabaseAppointmentToProfessionalAppointment(
  appointment: SupabaseProfessionalAppointmentResponse
): Appointment {
  const rawAppointment = appointment as unknown as Record<string, unknown>;

  const rawStatus = String(rawAppointment.status || 'scheduled');
  const normalizedStatus = [
    'scheduled',
    'confirmed',
    'attending',
    'completed',
    'cancelled',
    'absent',
    'rescheduled'
  ].includes(rawStatus)
    ? rawStatus as Appointment['status']
    : 'scheduled';

  const rawPaymentType = String(
    rawAppointment.payment_type || rawAppointment.paymentType || 'pendente'
  );
  const normalizedPaymentType = [
    'dinheiro',
    'pix',
    'debito',
    'credito',
    'pendente',
    'cortesia'
  ].includes(rawPaymentType)
    ? rawPaymentType as PaymentType
    : 'pendente';

  return {
    id: String(rawAppointment.id || ''),
    dateTime: String(
      rawAppointment.date_time ||
        rawAppointment.dateTime ||
        rawAppointment.starts_at_local ||
        rawAppointment.startsAtLocal ||
        ''
    ),
    clientName: String(rawAppointment.client_name || rawAppointment.clientName || ''),
    clientPhone: String(rawAppointment.client_phone || rawAppointment.clientPhone || ''),
    clientEmail: rawAppointment.client_email || rawAppointment.clientEmail
      ? String(rawAppointment.client_email || rawAppointment.clientEmail)
      : undefined,
    serviceId: String(rawAppointment.service_id || rawAppointment.serviceId || ''),
    professionalId: String(
      rawAppointment.professional_id || rawAppointment.professionalId || ''
    ),
    price: Number(rawAppointment.price) || 0,
    status: normalizedStatus,
    paymentType: normalizedPaymentType,
    notes: String(rawAppointment.notes || ''),
    commissionPaid:
      rawAppointment.commission_paid === true ||
      rawAppointment.commissionPaid === true,
    commissionValue:
      Number(rawAppointment.commission_value || rawAppointment.commissionValue) || 0,
    depositPaid:
      rawAppointment.deposit_paid === true || rawAppointment.depositPaid === true
  };
}

function buildProfessionalAppointmentPayload(appointment: Omit<Appointment, 'id'>) {
  const [date, time] = appointment.dateTime.split('T');

  return {
    service_id: appointment.serviceId,
    professional_id: appointment.professionalId,
    starts_at_local: `${date}T${time}`,
    client_name: appointment.clientName,
    client_phone: appointment.clientPhone,
    client_email: appointment.clientEmail || null,
    payment_type: appointment.paymentType || 'pendente',
    notes: appointment.notes || 'Agendamento criado pelo profissional.'
  };
}


function mapPublicProfessional(rawProfessional: Record<string, unknown>): Professional {
  return {
    id: String(rawProfessional.id || ''),
    name: String(rawProfessional.name || 'Profissional'),
    phone: String(rawProfessional.phone || ''),
    email: String(rawProfessional.email || ''),
    role: String(rawProfessional.role || 'Profissional'),
    displayOrder: Number(rawProfessional.displayOrder || rawProfessional.display_order || 999),
    avatar: String(rawProfessional.avatar || rawProfessional.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=120&h=120&fit=crop'),
    active: rawProfessional.active !== false,
    workDays: Array.isArray(rawProfessional.workDays) ? rawProfessional.workDays as number[] : [1, 2, 3, 4, 5, 6],
    workHoursStart: String(rawProfessional.workHoursStart || rawProfessional.work_hours_start || '09:00'),
    workHoursEnd: String(rawProfessional.workHoursEnd || rawProfessional.work_hours_end || '19:00'),
    lunchStart: String(rawProfessional.lunchStart || rawProfessional.lunch_start || '12:00'),
    lunchEnd: String(rawProfessional.lunchEnd || rawProfessional.lunch_end || '13:00'),
    services: Array.isArray(rawProfessional.services) ? rawProfessional.services.map(String) : [],
    remType: String(rawProfessional.remType || rawProfessional.rem_type || 'commission_percent') as Professional['remType'],
    remValue: Number(rawProfessional.remValue || rawProfessional.rem_value || 0),
    chairRentalValue: Number(rawProfessional.chairRentalValue || rawProfessional.chair_rental_value || 0),
    chairRentalStatus: String(rawProfessional.chairRentalStatus || rawProfessional.chair_rental_status || 'inactive') as Professional['chairRentalStatus'],
    permissions: {
      viewOwnCalendar: true,
      createAppts: true,
      rescheduleAppts: true,
      cancelAppts: true,
      blockCalendar: false,
      openSpots: true,
      viewFinancial: true,
      viewCommission: true,
      viewChairRental: false,
      manageOwnCalendar: 'yes',
      ...((rawProfessional.permissions || {}) as Professional['permissions'])
    }
  };
}

function mapPublicService(rawService: Record<string, unknown>): Service {
  return {
    id: String(rawService.id || ''),
    name: String(rawService.name || ''),
    category: String(rawService.category || 'SERVIÇOS'),
    categoryOrder: Number(rawService.categoryOrder || rawService.category_order || 999),
    displayOrder: Number(rawService.displayOrder || rawService.display_order || 999),
    duration: Number(rawService.duration || rawService.duration_minutes || 30),
    price: Number(rawService.price || 0),
    description: String(rawService.description || ''),
    professionals: Array.isArray(rawService.professionals) ? rawService.professionals.map(String) : [],
    specificCommission: null,
    requireDeposit: rawService.requireDeposit === true || rawService.require_deposit === true,
    depositValue: rawService.depositValue || rawService.deposit_value ? Number(rawService.depositValue || rawService.deposit_value) : null,
    active: rawService.active !== false
  } as Service;
}

function mapPublicConfig(rawConfig: Record<string, unknown>): EstablishmentConfig {
  return {
    name: String(rawConfig.name || ''),
    logo: String(rawConfig.logo || rawConfig.logo_url || ''),
    coverImage: String(rawConfig.coverImage || rawConfig.cover_url || ''),
    address: String(rawConfig.address || ''),
    phone: String(rawConfig.phone || ''),
    instagram: String(rawConfig.instagram || ''),
    workDays: Array.isArray(rawConfig.workDays) ? rawConfig.workDays as number[] : [1, 2, 3, 4, 5, 6],
    workHoursStart: String(rawConfig.workHoursStart || '08:00'),
    workHoursEnd: String(rawConfig.workHoursEnd || '19:00'),
    minLeadTimeMinutes: Number(rawConfig.minLeadTimeMinutes || 0),
    maxFutureDays: Number(rawConfig.maxFutureDays || 14),
    cancellationPolicy: String(rawConfig.cancellationPolicy || ''),
    autoApprove: rawConfig.autoApprove === true,
    requireDepositGlobal: rawConfig.requireDepositGlobal === true,
    defaultMsgTemplate: String(rawConfig.defaultMsgTemplate || '')
  } as EstablishmentConfig;
}


function timeToMinutes(time: string): number {
  const [hour, minute] = time.split(':').map(Number);

  return hour * 60 + minute;
}

function getCurrentTimeMinutes(): number {
  const now = new Date();

  return now.getHours() * 60 + now.getMinutes();
}

function isPastManualAppointmentDateTime(
  date: string,
  time: string
): boolean {
  const today = getTodayDateStr();

  if (date < today) {
    return true;
  }

  if (date > today) {
    return false;
  }

  return timeToMinutes(time) <= getCurrentTimeMinutes();
}

export default function ProfessionalDashboard({
  state,
  professionalId,
  professionalAccessToken,
  onModifyAppointment,
  onAddManualAppointment,
  onLogOut
}: ProfessionalDashboardProps) {
  const {
    config: stateConfig,
    appointments: stateAppointments,
    services: stateServices,
    professionals: stateProfessionals
  } = state;

  const [activeTab, setActiveTab] = useState<ProfessionalTab>('agenda');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateStr());
  const [showAddModal, setShowAddModal] = useState(false);
  const [feedbackMessage, setFeedbackMessage] =
    useState<ProfessionalDashboardFeedbackState | null>(null);

  const [manualFormState, setManualFormState] =
    useState<ProfessionalManualAppointmentFormState>(
      getInitialManualAppointmentFormState()
    );

  const [supabaseAppointments, setSupabaseAppointments] = useState<Appointment[] | null>(null);
  const [tokenProfessional, setTokenProfessional] = useState<Professional | null>(null);
  const [tokenServices, setTokenServices] = useState<Service[] | null>(null);
  const [tokenConfig, setTokenConfig] = useState<EstablishmentConfig | null>(null);

  const config = tokenConfig || stateConfig;
  const services = tokenServices || stateServices;
  const professionals = tokenProfessional ? [tokenProfessional] : stateProfessionals;
  const effectiveProfessionalId = tokenProfessional?.id || professionalId;
  const appointments = supabaseAppointments || stateAppointments;

  useEffect(() => {
    let isMounted = true;

    async function loadProfessionalAppointments() {
      if (professionalAccessToken) {
        const { data, error } = await supabase.rpc('get_professional_access_context', {
          p_token: professionalAccessToken
        });

        if (!isMounted) return;

        if (error) {
          console.error('Erro ao carregar acesso do profissional:', error.message);
          setFeedbackMessage({
            title: 'Link inválido',
            description: error.message || 'Não foi possível carregar o acesso do profissional.'
          });
          return;
        }

        const firstRow = Array.isArray(data) ? data[0] : null;

        if (!firstRow?.success) {
          setFeedbackMessage({
            title: 'Link inválido',
            description: firstRow?.message || 'Este link de acesso não está disponível.'
          });
          return;
        }

        const loadedProfessional = mapPublicProfessional(firstRow.professional || {});
        const loadedServices = Array.isArray(firstRow.services)
          ? firstRow.services.map((service: Record<string, unknown>) => mapPublicService(service))
          : [];
        const loadedAppointments = Array.isArray(firstRow.appointments)
          ? (firstRow.appointments as SupabaseProfessionalAppointmentResponse[]).map(mapSupabaseAppointmentToProfessionalAppointment)
          : [];

        setTokenConfig(mapPublicConfig(firstRow.config || {}));
        setTokenProfessional(loadedProfessional);
        setTokenServices(loadedServices);
        setSupabaseAppointments(loadedAppointments);
        return;
      }

      if (!professionalId) return;

      const { data, error } = await supabase.rpc('get_my_professional_appointments', {
        p_professional_id: professionalId
      });

      if (!isMounted) return;

      if (error) {
        console.error('Erro ao carregar agenda do profissional:', error.message);
        return;
      }

      const rows = (
        Array.isArray(data) ? data : []
      ) as SupabaseProfessionalAppointmentResponse[];

      setSupabaseAppointments(rows.map(mapSupabaseAppointmentToProfessionalAppointment));
    }

    loadProfessionalAppointments();

    const refreshInterval = window.setInterval(() => {
      loadProfessionalAppointments();
    }, 10000);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadProfessionalAppointments();
      }
    };

    window.addEventListener('focus', handleVisibilityChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      window.clearInterval(refreshInterval);
      window.removeEventListener('focus', handleVisibilityChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [professionalAccessToken, professionalId]);

  const currentProfessional = useMemo(() => {
    return professionals.find((professional) => {
      return professional.id === effectiveProfessionalId;
    });
  }, [
    professionals,
    effectiveProfessionalId
  ]);

  const professionalAppointments = useMemo(() => {
    return getProfessionalAppointments({
      appointments,
      professionalId: effectiveProfessionalId
    });
  }, [
    appointments,
    effectiveProfessionalId
  ]);

  const myServices = useMemo(() => {
    if (!currentProfessional) {
      return [];
    }

    return getProfessionalServices({
      services,
      professional: currentProfessional
    });
  }, [
    services,
    currentProfessional
  ]);

  const financialSummary = useMemo(() => {
    if (!currentProfessional) {
      return {
        completedAppointments: [],
        activeAppointments: [],
        totalProduced: 0,
        commissionExpected: 0,
        chairRentalFee: 0,
        isChairRental: false
      };
    }

    return calculateProfessionalFinancialSummary({
      appointments: professionalAppointments,
      professional: currentProfessional,
      services
    });
  }, [
    currentProfessional,
    professionalAppointments,
    services
  ]);

  const handleChangeManualFormState = (
    updates: Partial<ProfessionalManualAppointmentFormState>
  ) => {
    setManualFormState((currentState) => ({
      ...currentState,
      ...updates
    }));
  };

  const handleCloseManualAppointmentModal = () => {
    setShowAddModal(false);
  };

  const handleResetManualAppointmentForm = () => {
    setManualFormState(getInitialManualAppointmentFormState());
  };

  const handleOpenManualAppointmentAtDateTime = (
    date: string,
    time: string
  ) => {
    if (isPastManualAppointmentDateTime(date, time)) {
      setFeedbackMessage({
        title: 'Horário indisponível',
        description: 'Não é permitido criar agendamento manual em data ou horário que já passou.'
      });
      return;
    }

    setManualFormState({
      ...getInitialManualAppointmentFormState(),
      date,
      time
    });

    setShowAddModal(true);
  };

  const handleAddManualSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!currentProfessional) {
      setFeedbackMessage({
        title: 'Profissional não localizado',
        description: 'Não foi possível localizar o profissional para criar o agendamento manual.'
      });
      return;
    }

    if (!validateManualAppointmentForm(manualFormState)) {
      setFeedbackMessage({
        title: 'Dados incompletos',
        description: 'Preencha todos os campos do agendamento manual antes de continuar.'
      });
      return;
    }

    if (isPastManualAppointmentDateTime(
      manualFormState.date,
      manualFormState.time
    )) {
      setFeedbackMessage({
        title: 'Agendamento não permitido',
        description: 'Não é permitido criar agendamento manual em data anterior ou em horário que já passou.'
      });
      return;
    }

    const selectedService = services.find((service) => {
      return service.id === manualFormState.serviceId;
    });

    if (!selectedService) {
      setFeedbackMessage({
        title: 'Serviço não localizado',
        description: 'Não foi possível localizar o serviço selecionado para este agendamento.'
      });
      return;
    }

    const newAppointment: Appointment = buildManualAppointment({
      formState: manualFormState,
      selectedService,
      professional: currentProfessional,
      professionalId: effectiveProfessionalId,
      services
    });

    const { data, error } = professionalAccessToken
      ? await supabase.rpc('create_professional_access_appointment', {
        p_token: professionalAccessToken,
        p_appointment: buildProfessionalAppointmentPayload(newAppointment)
      })
      : await supabase.rpc('create_my_owner_appointment', {
        p_appointment: buildProfessionalAppointmentPayload(newAppointment)
      });

    if (error) {
      setFeedbackMessage({
        title: 'Agendamento não criado',
        description: error.message || 'Não foi possível criar o agendamento no banco de dados.'
      });
      return;
    }

    const savedRow = (Array.isArray(data) ? data[0] : null) as
      | SupabaseProfessionalAppointmentResponse
      | null;

    const savedAppointment = savedRow
      ? mapSupabaseAppointmentToProfessionalAppointment(savedRow)
      : newAppointment;

    setSupabaseAppointments((currentAppointments) => [
      savedAppointment,
      ...(currentAppointments || appointments)
    ]);

    onAddManualAppointment(savedAppointment);

    setShowAddModal(false);
    handleResetManualAppointmentForm();
  };

  const handleModifyAppointmentSync = async (
    appointmentId: string,
    updates: Partial<Appointment>
  ) => {
    if (!updates.status) {
      onModifyAppointment(appointmentId, updates);
      return;
    }

    const baseAppointments = supabaseAppointments || appointments;
    const previousAppointment = baseAppointments.find((appointment) => {
      return appointment.id === appointmentId;
    });

    const optimisticAppointments = baseAppointments.map((appointment) => {
      if (appointment.id !== appointmentId) return appointment;
      return {
        ...appointment,
        ...updates
      };
    });

    setSupabaseAppointments(optimisticAppointments);
    onModifyAppointment(appointmentId, updates);

    const { data, error } = professionalAccessToken
      ? await supabase.rpc('update_professional_access_appointment_status', {
        p_token: professionalAccessToken,
        p_appointment_id: appointmentId,
        p_status: updates.status
      })
      : await supabase.rpc('update_my_appointment_status', {
        p_appointment_id: appointmentId,
        p_status: updates.status
      });

    if (error) {
      setSupabaseAppointments(baseAppointments);

      if (previousAppointment) {
        onModifyAppointment(appointmentId, {
          status: previousAppointment.status
        });
      }

      setFeedbackMessage({
        title: 'Status não atualizado',
        description: error.message || 'Não foi possível sincronizar o status com a Agenda Geral.'
      });
      return;
    }

    const savedRow = (Array.isArray(data) ? data[0] : null) as
      | SupabaseProfessionalAppointmentResponse
      | null;

    if (!savedRow) return;

    const savedAppointment = mapSupabaseAppointmentToProfessionalAppointment(savedRow);

    setSupabaseAppointments((currentAppointments) => {
      const currentBaseAppointments = currentAppointments || optimisticAppointments;
      return currentBaseAppointments.map((appointment) => {
        if (appointment.id !== savedAppointment.id) return appointment;
        return savedAppointment;
      });
    });

    onModifyAppointment(savedAppointment.id, savedAppointment);
  };

  if (!currentProfessional) {
    return (
      <div className="p-12 text-center text-neutral-850">
        <p className="font-bold">
          Colaborador não cadastrado ou inativo.
        </p>

        <button
          type="button"
          onClick={onLogOut}
          className="mt-4 bg-orange-600 text-white px-4 py-2 rounded-xl"
        >
          Voltar
        </button>
      </div>
    );
  }

  return (
    <div
      id="professional-dashboard"
      className="min-h-screen bg-neutral-50 flex flex-col font-sans text-neutral-900"
    >
      <ProfessionalHeader
        configName={config.name}
        professional={currentProfessional}
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        onLogOut={onLogOut}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {activeTab === 'agenda' ? (
          <ProfessionalCalendarAgendaView
            professional={currentProfessional}
            services={services}
            appointments={appointments}
            selectedDate={selectedDate}
            onChangeSelectedDate={setSelectedDate}
            onOpenManualAppointmentAtDateTime={handleOpenManualAppointmentAtDateTime}
            onModifyAppointment={handleModifyAppointmentSync}
          />
        ) : (
          <ProfessionalReportsView
            professional={currentProfessional}
            services={services}
            completedAppointments={financialSummary.completedAppointments}
            activeAppointments={financialSummary.activeAppointments}
            totalProduced={financialSummary.totalProduced}
            commissionExpected={financialSummary.commissionExpected}
            chairRentalFee={financialSummary.chairRentalFee}
            isChairRental={financialSummary.isChairRental}
          />
        )}
      </main>

      {showAddModal && (
        <ManualAppointmentModal
          professional={currentProfessional}
          services={services}
          myServices={myServices}
          formState={manualFormState}
          onChangeFormState={handleChangeManualFormState}
          onClose={handleCloseManualAppointmentModal}
          onSubmit={handleAddManualSubmit}
        />
      )}

      {feedbackMessage && (
        <ProfessionalAgendaFeedbackModal
          title={feedbackMessage.title}
          description={feedbackMessage.description}
          onClose={() => setFeedbackMessage(null)}
        />
      )}
    </div>
  );
}
