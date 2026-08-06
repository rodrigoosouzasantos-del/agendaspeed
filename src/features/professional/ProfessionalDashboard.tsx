import React, {
  useEffect,
  useMemo,
  useRef,
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
  ProfessionalCommissionPaymentRecord,
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
  buildWeeklyScheduleFromLegacyFields,
  getProfessionalScheduleForDateStr,
  isValidWeeklySchedule
} from '../../lib/professionalSchedule';

import {
  ProfessionalAgendaConfirmModal,
  ProfessionalAgendaFeedbackModal
} from './agenda/ProfessionalAgendaModals';

import {
  getTodayDateStr
} from './agenda/professionalAgenda.utils';

interface ProfessionalDashboardFeedbackState {
  title: string;
  description: string;
}

function getProfessionalAccessErrorMessage(error: unknown): string {
  if (typeof error === 'string') {
    return error;
  }

  if (!error || typeof error !== 'object') {
    return String(error || '');
  }

  const errorRecord = error as Record<string, unknown>;
  const candidates = [
    errorRecord.message,
    errorRecord.details,
    errorRecord.hint,
    errorRecord.cause
  ];

  for (const candidate of candidates) {
    const candidateMessage = getProfessionalAccessErrorMessage(candidate);

    if (candidateMessage) {
      return candidateMessage;
    }
  }

  return '';
}

function isTemporaryConnectionError(error: unknown): boolean {
  const message = getProfessionalAccessErrorMessage(error).toLowerCase();

  return (
    message.includes('failed to fetch') ||
    message.includes('networkerror') ||
    message.includes('network error') ||
    message.includes('load failed') ||
    message.includes('connection') ||
    message.includes('timeout')
  );
}

function waitForRetry(delayMs: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, delayMs);
  });
}

function isConfirmedInvalidAccessError(error: unknown): boolean {
  const message = getProfessionalAccessErrorMessage(error).toLowerCase();

  return (
    message.includes('link do profissional inválido') ||
    message.includes('link do profissional invalido') ||
    message.includes('link inválido ou expirado') ||
    message.includes('link invalido ou expirado') ||
    message.includes('token inválido') ||
    message.includes('token invalido') ||
    message.includes('token expirado')
  );
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


function mapPublicCommissionPayment(
  rawPayment: Record<string, unknown>
): ProfessionalCommissionPaymentRecord {
  const rawPaymentType = String(
    rawPayment.paymentType ||
      rawPayment.payment_type ||
      'dinheiro'
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
    : 'dinheiro';

  return {
    id: String(rawPayment.id || ''),
    professionalId: String(
      rawPayment.professionalId ||
        rawPayment.professional_id ||
        ''
    ),
    periodStart: String(
      rawPayment.periodStart ||
        rawPayment.period_start ||
        ''
    ).slice(0, 10),
    periodEnd: String(
      rawPayment.periodEnd ||
        rawPayment.period_end ||
        ''
    ).slice(0, 10),
    calculatedCommission:
      Number(
        rawPayment.calculatedCommission ||
          rawPayment.calculated_commission
      ) || 0,
    extraValue:
      Number(rawPayment.extraValue || rawPayment.extra_value) || 0,
    discountValue:
      Number(rawPayment.discountValue || rawPayment.discount_value) || 0,
    amountPaid:
      Number(rawPayment.amountPaid || rawPayment.amount_paid) || 0,
    paymentType: normalizedPaymentType,
    paidAt: String(
      rawPayment.paidAt ||
        rawPayment.paid_at ||
        ''
    ).slice(0, 10),
    notes: rawPayment.notes
      ? String(rawPayment.notes)
      : undefined,
    createdAt: rawPayment.createdAt || rawPayment.created_at
      ? String(rawPayment.createdAt || rawPayment.created_at)
      : undefined
  };
}

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

function buildProfessionalAppointmentPayload(
  appointment: Omit<Appointment, 'id'>,
  options: {
    allowOvertime?: boolean;
    allowLunchOverlap?: boolean;
  } = {}
) {
  const [date, time] = appointment.dateTime.split('T');

  return {
    service_id: appointment.serviceId,
    professional_id: appointment.professionalId,
    starts_at_local: `${date}T${time}`,
    client_name: appointment.clientName,
    client_phone: appointment.clientPhone,
    client_email: appointment.clientEmail || null,
    payment_type: appointment.paymentType || 'pendente',
    notes: appointment.notes || 'Agendamento criado pelo profissional.',
    allow_overtime: options.allowOvertime === true,
    allow_lunch_overlap: options.allowLunchOverlap === true
  };
}


function mapPublicProfessional(rawProfessional: Record<string, unknown>): Professional {
  const rawPermissions =
    (rawProfessional.permissions as Partial<Professional["permissions"]> | undefined) || {};

  return {
    id: String(rawProfessional.id || ''),
    name: String(rawProfessional.name || 'Profissional'),
    phone: String(rawProfessional.phone || ''),
    email: String(rawProfessional.email || ''),
    role: String(rawProfessional.role || 'Profissional'),
    displayOrder: Number(rawProfessional.displayOrder || rawProfessional.display_order || 999),
    avatar: String(rawProfessional.avatar || rawProfessional.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=120&h=120&fit=crop'),
    active: rawProfessional.active !== false,
    weeklySchedule: isValidWeeklySchedule(
      rawProfessional.weeklySchedule || rawProfessional.weekly_schedule
    )
      ? ((rawProfessional.weeklySchedule ||
          rawProfessional.weekly_schedule) as Professional['weeklySchedule'])
      : buildWeeklyScheduleFromLegacyFields({
          workDays: Array.isArray(rawProfessional.workDays)
            ? (rawProfessional.workDays as number[])
            : [1, 2, 3, 4, 5, 6],
          workHoursStart: String(rawProfessional.workHoursStart || rawProfessional.work_hours_start || '09:00'),
          workHoursEnd: String(rawProfessional.workHoursEnd || rawProfessional.work_hours_end || '19:00'),
        }),
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
      viewOwnCalendar: rawPermissions.viewOwnCalendar ?? true,
      createAppts: rawPermissions.createAppts ?? true,
      rescheduleAppts: rawPermissions.rescheduleAppts ?? true,
      cancelAppts: rawPermissions.cancelAppts ?? true,
      blockCalendar: rawPermissions.blockCalendar ?? false,
      openSpots: rawPermissions.openSpots ?? true,
      viewFinancial: rawPermissions.viewFinancial ?? true,
      viewCommission: rawPermissions.viewCommission ?? true,
      viewChairRental: rawPermissions.viewChairRental ?? false,
      manageOwnCalendar: rawPermissions.manageOwnCalendar ?? 'yes',
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
    maxFutureDays: Number(
      rawConfig.maxFutureDays ||
        rawConfig.max_future_days ||
        14
    ),
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

function minutesToTime(totalMinutes: number): string {
  const normalizedMinutes = Math.max(0, totalMinutes);
  const hour = Math.floor(normalizedMinutes / 60);
  const minute = normalizedMinutes % 60;

  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
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


function normalizeErrorMessage(message: string): string {
  return message
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

function getProfessionalManualAppointmentErrorFeedback(
  errorMessage: string
): ProfessionalDashboardFeedbackState {
  const normalizedMessage = normalizeErrorMessage(errorMessage);

  if (
    normalizedMessage.includes('schedule_day') ||
    normalizedMessage.includes('agenda fechada') ||
    normalizedMessage.includes('dia fechado') ||
    normalizedMessage.includes('open schedule') ||
    normalizedMessage.includes('sem agenda aberta') ||
    normalizedMessage.includes('professional_schedule_days')
  ) {
    return {
      title: 'Agenda fechada',
      description: 'A agenda deste profissional está fechada para esta data. Abra o dia na agenda antes de criar o agendamento.'
    };
  }

  if (
    normalizedMessage.includes('block') ||
    normalizedMessage.includes('bloque') ||
    normalizedMessage.includes('professional_schedule_blocks')
  ) {
    return {
      title: 'Horário bloqueado',
      description: 'Este horário está bloqueado na agenda do profissional. Escolha outro horário ou remova o bloqueio antes de agendar.'
    };
  }

  if (
    normalizedMessage.includes('overlap') ||
    normalizedMessage.includes('conflit') ||
    normalizedMessage.includes('sobrepos') ||
    normalizedMessage.includes('ocupado') ||
    normalizedMessage.includes('indisponivel') ||
    normalizedMessage.includes('not available')
  ) {
    return {
      title: 'Horário indisponível',
      description: 'Este horário conflita com outro atendimento ativo. Atualize a agenda e escolha outro horário disponível.'
    };
  }

  if (
    normalizedMessage.includes('almoco') ||
    normalizedMessage.includes('lunch') ||
    normalizedMessage.includes('intervalo')
  ) {
    return {
      title: 'Intervalo de almoço',
      description: 'Este serviço invade o intervalo de almoço do profissional. Escolha outro horário disponível.'
    };
  }

  if (
    normalizedMessage.includes('expediente') ||
    normalizedMessage.includes('work_hours') ||
    normalizedMessage.includes('fora do horario') ||
    normalizedMessage.includes('business hours') ||
    normalizedMessage.includes('working hours')
  ) {
    return {
      title: 'Fora do expediente',
      description: 'Este serviço não cabe dentro do expediente do profissional. Escolha outro horário disponível.'
    };
  }

  if (
    normalizedMessage.includes('past') ||
    normalizedMessage.includes('passad') ||
    normalizedMessage.includes('anterior')
  ) {
    return {
      title: 'Agendamento não permitido',
      description: 'Não é permitido criar agendamento manual em data anterior ou em horário que já passou.'
    };
  }

  if (
    normalizedMessage.includes('service') ||
    normalizedMessage.includes('servico')
  ) {
    return {
      title: 'Serviço não permitido',
      description: 'Este serviço não está disponível para o profissional selecionado. Revise o cadastro do profissional ou escolha outro serviço.'
    };
  }

  if (
    normalizedMessage.includes('professional') ||
    normalizedMessage.includes('profissional')
  ) {
    return {
      title: 'Profissional indisponível',
      description: 'Não foi possível validar a agenda deste profissional. Atualize a página e tente novamente.'
    };
  }

  return {
    title: 'Agendamento não criado',
    description: errorMessage || 'Não foi possível criar o agendamento no banco de dados.'
  };
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
  const [scheduleExceptionConfirmation, setScheduleExceptionConfirmation] =
    useState<{
      type: 'overtime' | 'lunch_overlap';
      appointment: Appointment;
      serviceEndTime: string;
      workHoursEnd: string;
      lunchStart: string;
      lunchEnd: string;
    } | null>(null);

  const [manualFormState, setManualFormState] =
    useState<ProfessionalManualAppointmentFormState>(
      getInitialManualAppointmentFormState()
    );

  const [supabaseAppointments, setSupabaseAppointments] = useState<Appointment[] | null>(null);
  const [tokenProfessional, setTokenProfessional] = useState<Professional | null>(null);
  const [tokenServices, setTokenServices] = useState<Service[] | null>(null);
  const [tokenConfig, setTokenConfig] = useState<EstablishmentConfig | null>(null);
  const [commissionPayments, setCommissionPayments] =
    useState<ProfessionalCommissionPaymentRecord[]>([]);
  const professionalAccessRequestInFlightRef = useRef(false);

  const config = tokenConfig || stateConfig;
  const services = tokenServices || stateServices;
  const professionals = tokenProfessional ? [tokenProfessional] : stateProfessionals;
  const effectiveProfessionalId = tokenProfessional?.id || professionalId;
  const appointments = supabaseAppointments || stateAppointments;

  useEffect(() => {
    let isMounted = true;

    async function loadProfessionalAppointments() {
      if (professionalAccessRequestInFlightRef.current) {
        return;
      }

      professionalAccessRequestInFlightRef.current = true;

      try {
        if (professionalAccessToken) {
          let data: unknown = null;
          let accessError: unknown = null;

          for (let attempt = 0; attempt < 3; attempt += 1) {
            try {
              const response = await supabase.rpc('get_professional_access_context', {
                p_token: professionalAccessToken
              });

              data = response.data;
              accessError = response.error;
            } catch (requestError) {
              data = null;
              accessError = requestError;
            }

            if (!accessError || !isTemporaryConnectionError(accessError)) {
              break;
            }

            if (attempt < 2) {
              await waitForRetry(800 * (attempt + 1));
            }
          }

          if (!isMounted) return;

          if (accessError) {
            if (
              isTemporaryConnectionError(accessError) ||
              !isConfirmedInvalidAccessError(accessError)
            ) {
              console.warn(
                'Conexão temporariamente indisponível ao atualizar a agenda do profissional.'
              );
              return;
            }

            const accessErrorMessage =
              getProfessionalAccessErrorMessage(accessError);

            console.error(
              'Erro ao carregar acesso do profissional:',
              accessErrorMessage
            );
            setFeedbackMessage({
              title: 'Link inválido',
              description:
                accessErrorMessage ||
                'Não foi possível carregar o acesso do profissional.'
            });
            return;
          }

          const firstRow = Array.isArray(data) ? data[0] : null;

          if (!firstRow?.success) {
            const responseMessage =
              getProfessionalAccessErrorMessage(firstRow?.message);

            if (
              isTemporaryConnectionError(responseMessage) ||
              !isConfirmedInvalidAccessError(responseMessage)
            ) {
              console.warn(
                'Conexão temporariamente indisponível ao atualizar a agenda do profissional.'
              );
              return;
            }

            setFeedbackMessage({
              title: 'Link inválido',
              description:
                responseMessage ||
                'Este link de acesso não está disponível.'
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
          const loadedCommissionPayments = Array.isArray(firstRow.commission_payments)
            ? firstRow.commission_payments.map(
                (payment: Record<string, unknown>) =>
                  mapPublicCommissionPayment(payment)
              )
            : [];
          setTokenConfig(mapPublicConfig(firstRow.config || {}));
          setTokenProfessional(loadedProfessional);
          setTokenServices(loadedServices);
          setSupabaseAppointments(loadedAppointments);
          setCommissionPayments(loadedCommissionPayments);
          setFeedbackMessage((currentFeedback) => {
            return currentFeedback?.title === 'Link inválido'
              ? null
              : currentFeedback;
          });
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
      } finally {
        professionalAccessRequestInFlightRef.current = false;
      }
    }

    loadProfessionalAppointments();

    const refreshInterval = window.setInterval(() => {
      loadProfessionalAppointments();
    }, 50000);

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

  const canViewReports = Boolean(
    currentProfessional?.permissions.viewFinancial === true ||
    currentProfessional?.permissions.viewCommission === true ||
    currentProfessional?.permissions.viewChairRental === true
  );

  useEffect(() => {
    if (!canViewReports && activeTab === 'relatorios') {
      setActiveTab('agenda');
    }
  }, [
    activeTab,
    canViewReports
  ]);

  const handleChangeTab = (nextTab: ProfessionalTab) => {
    if (nextTab === 'relatorios' && !canViewReports) {
      setActiveTab('agenda');
      setFeedbackMessage({
        title: 'Acesso não permitido',
        description: 'Os relatórios não estão liberados para este profissional.'
      });
      return;
    }

    setActiveTab(nextTab);
  };

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

  const saveManualAppointment = async (
    newAppointment: Appointment,
    options: {
      allowOvertime?: boolean;
      allowLunchOverlap?: boolean;
    } = {}
  ) => {
    const { data, error } = professionalAccessToken
      ? await supabase.rpc('create_professional_access_appointment', {
        p_token: professionalAccessToken,
        p_appointment: buildProfessionalAppointmentPayload(
          newAppointment,
          options
        )
      })
      : await supabase.rpc('create_my_owner_appointment', {
        p_appointment: buildProfessionalAppointmentPayload(
          newAppointment,
          options
        )
      });

    if (error) {
      setFeedbackMessage(
        getProfessionalManualAppointmentErrorFeedback(
          error.message || 'Não foi possível criar o agendamento no banco de dados.'
        )
      );
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

    setScheduleExceptionConfirmation(null);
    setShowAddModal(false);
    handleResetManualAppointmentForm();
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

    const serviceStartMinutes = timeToMinutes(manualFormState.time);
    const serviceEndMinutes =
      serviceStartMinutes +
      Math.max(1, Number(selectedService.duration) || 30);
    const daySchedule = getProfessionalScheduleForDateStr(
      currentProfessional,
      manualFormState.date
    );
    const professionalEndMinutes = timeToMinutes(daySchedule.end);
    const professionalRecord = currentProfessional as Professional & {
      noLunchBreak?: boolean;
    };
    const hasLunchBreak = !professionalRecord.noLunchBreak;
    const lunchStartMinutes = timeToMinutes(
      currentProfessional.lunchStart
    );
    const lunchEndMinutes = timeToMinutes(
      currentProfessional.lunchEnd
    );
    const overlapsLunch =
      hasLunchBreak &&
      serviceStartMinutes < lunchEndMinutes &&
      serviceEndMinutes > lunchStartMinutes;

    if (serviceEndMinutes > professionalEndMinutes) {
      setScheduleExceptionConfirmation({
        type: 'overtime',
        appointment: newAppointment,
        serviceEndTime: minutesToTime(serviceEndMinutes),
        workHoursEnd: daySchedule.end.slice(0, 5),
        lunchStart: currentProfessional.lunchStart.slice(0, 5),
        lunchEnd: currentProfessional.lunchEnd.slice(0, 5)
      });
      return;
    }

    if (overlapsLunch) {
      setScheduleExceptionConfirmation({
        type: 'lunch_overlap',
        appointment: newAppointment,
        serviceEndTime: minutesToTime(serviceEndMinutes),
        workHoursEnd: daySchedule.end.slice(0, 5),
        lunchStart: currentProfessional.lunchStart.slice(0, 5),
        lunchEnd: currentProfessional.lunchEnd.slice(0, 5)
      });
      return;
    }

    await saveManualAppointment(newAppointment);
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
        <p className="font-medium">
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
        onChangeTab={handleChangeTab}
        onLogOut={onLogOut}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {activeTab === 'agenda' || !canViewReports ? (
          <ProfessionalCalendarAgendaView
            professional={currentProfessional}
            services={services}
            appointments={appointments}
            maxFutureDays={Math.max(
              1,
              Number(config.maxFutureDays) || 10
            )}
            selectedDate={selectedDate}
            onChangeSelectedDate={setSelectedDate}
            onOpenManualAppointmentAtDateTime={handleOpenManualAppointmentAtDateTime}
            onModifyAppointment={handleModifyAppointmentSync}
            professionalAccessToken={professionalAccessToken}
          />
        ) : (
          <ProfessionalReportsView
            professional={currentProfessional}
            services={services}
            completedAppointments={financialSummary.completedAppointments}
            activeAppointments={financialSummary.activeAppointments}
            commissionPayments={commissionPayments}
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
          professionalAccessToken={professionalAccessToken}
          formState={manualFormState}
          onChangeFormState={handleChangeManualFormState}
          onClose={handleCloseManualAppointmentModal}
          onSubmit={handleAddManualSubmit}
        />
      )}

      {scheduleExceptionConfirmation && (
        <ProfessionalAgendaConfirmModal
          title={
            scheduleExceptionConfirmation.type === 'lunch_overlap'
              ? 'Serviço ultrapassa o intervalo de almoço'
              : 'Serviço ultrapassa o expediente'
          }
          description={
            scheduleExceptionConfirmation.type === 'lunch_overlap'
              ? `Este serviço termina às ${scheduleExceptionConfirmation.serviceEndTime} e ultrapassa o intervalo de almoço, definido das ${scheduleExceptionConfirmation.lunchStart} às ${scheduleExceptionConfirmation.lunchEnd}. Deseja agendar mesmo assim?`
              : `Este serviço termina às ${scheduleExceptionConfirmation.serviceEndTime}, mas o expediente termina às ${scheduleExceptionConfirmation.workHoursEnd}. Deseja agendar mesmo assim?`
          }
          cancelLabel="Não, escolher outro horário"
          confirmLabel="Sim, agendar"
          onCancel={() => setScheduleExceptionConfirmation(null)}
          onConfirm={() => {
            void saveManualAppointment(
              scheduleExceptionConfirmation.appointment,
              scheduleExceptionConfirmation.type === 'lunch_overlap'
                ? { allowLunchOverlap: true }
                : { allowOvertime: true }
            );
          }}
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
