/**
 * Tela de Agenda Geral do Painel do Dono - AgendaZap.
 *
 * Fluxo guiado aprovado:
 * - Agendar por Data;
 * - Agendar por Serviço;
 * - Agendar por Profissional;
 * - Agenda por Profissional.
 *
 * A tela conduz o atendente por etapas limpas, sem abrir novas áreas abaixo
 * misturando informações. Cada clique avança uma fase do agendamento.
 */

import React, {
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';

import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  Info,
  Lock,
  Phone,
  Briefcase,
  Search,
  UserRound,
  UsersRound
} from 'lucide-react';

import {
  Appointment,
  Client,
  EstablishmentConfig,
  PaymentType,
  Professional,
  Service
} from '../../../types';

import {
  formatCurrency,
  formatDateBr
} from '../owner.utils';

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

interface AgendaViewProps {
  appointments: Appointment[];
  professionals: Professional[];
  services: Service[];
  config: EstablishmentConfig;
  clients?: Client[];
  onCreateAppointment: (payload: AgendaCreateAppointmentPayload) => void;
  onUpdateAppointmentStatus?: (appointmentId: string, status: Appointment['status']) => void;
  onOpenRescheduleAppointment?: (appointment: Appointment) => void;
}

type AgendaStartMode = 'date' | 'service' | 'professional' | 'professionalAgenda';

type AgendaStep =
  | 'start'
  | 'selectDate'
  | 'selectService'
  | 'selectProfessional'
  | 'selectDateTime'
  | 'clientData'
  | 'professionalAgenda'
  | 'success';

interface AvailableSlot {
  professional: Professional;
  service: Service;
  date: string;
  time: string;
}

const LOOKAHEAD_DAYS = 7;

function padDatePart(value: number): string {
  return String(value).padStart(2, '0');
}

function formatLocalDateStr(date: Date): string {
  const year = date.getFullYear();
  const month = padDatePart(date.getMonth() + 1);
  const day = padDatePart(date.getDate());

  return `${year}-${month}-${day}`;
}

function parseLocalDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00`);
}

function addDays(dateStr: string, days: number): string {
  const date = parseLocalDate(dateStr);
  date.setDate(date.getDate() + days);

  return formatLocalDateStr(date);
}

function getTodayStr(): string {
  return formatLocalDateStr(new Date());
}

function getCurrentTimeInMinutes(): number {
  const now = new Date();

  return (now.getHours() * 60) + now.getMinutes();
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);

  return (hours * 60) + minutes;
}

function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return `${padDatePart(hours)}:${padDatePart(remainingMinutes)}`;
}

function getWeekDayShortLabel(dateStr: string): string {
  const labels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return labels[parseLocalDate(dateStr).getDay()] || '';
}

function getAppointmentDate(appointment: Appointment): string {
  return appointment.dateTime.split('T')[0] || '';
}

function getAppointmentTime(appointment: Appointment): string {
  return appointment.dateTime.split('T')[1]?.slice(0, 5) || '';
}

function normalizeText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function normalizePhone(value: string): string {
  return value.replace(/\D/g, '').slice(0, 11);
}

function formatPhoneInput(value: string): string {
  const digits = normalizePhone(value);

  if (digits.length <= 2) {
    return digits;
  }

  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }

  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes}min`;
}

function professionalCanDoService(params: {
  professional: Professional;
  service: Service;
}): boolean {
  const { professional, service } = params;

  return (
    professional.services.includes(service.id) ||
    service.professionals.includes(professional.id)
  );
}

function appointmentBlocksSlot(params: {
  appointment: Appointment;
  professionalId: string;
  date: string;
  slotStart: number;
  slotEnd: number;
  services: Service[];
}): boolean {
  const {
    appointment,
    professionalId,
    date,
    slotStart,
    slotEnd,
    services
  } = params;

  if (appointment.professionalId !== professionalId) {
    return false;
  }

  if (getAppointmentDate(appointment) !== date) {
    return false;
  }

  if (['cancelled', 'absent', 'rescheduled'].includes(appointment.status)) {
    return false;
  }

  const appointmentStart = timeToMinutes(getAppointmentTime(appointment));
  const appointmentService = services.find((service) => {
    return service.id === appointment.serviceId;
  });
  const appointmentEnd = appointmentStart + (appointmentService?.duration || 30);

  return slotStart < appointmentEnd && slotEnd > appointmentStart;
}

function isProfessionalAvailableForSlot(params: {
  professional: Professional;
  service: Service;
  date: string;
  time: string;
  services: Service[];
  appointments: Appointment[];
}): boolean {
  const {
    professional,
    service,
    date,
    time,
    services,
    appointments
  } = params;

  const weekDay = parseLocalDate(date).getDay();

  if (!professional.active || !professional.workDays.includes(weekDay)) {
    return false;
  }

  if (!professionalCanDoService({ professional, service })) {
    return false;
  }

  const slotStart = timeToMinutes(time);
  const slotEnd = slotStart + service.duration;

  const workStart = timeToMinutes(professional.workHoursStart);
  const workEnd = timeToMinutes(professional.workHoursEnd);
  const lunchStart = timeToMinutes(professional.lunchStart);
  const lunchEnd = timeToMinutes(professional.lunchEnd);

  if (slotStart < workStart || slotEnd > workEnd) {
    return false;
  }

  const overlapsLunch = slotStart < lunchEnd && slotEnd > lunchStart;

  if (overlapsLunch) {
    return false;
  }

  const isPastToday =
    date === getTodayStr() &&
    slotStart <= getCurrentTimeInMinutes();

  if (isPastToday) {
    return false;
  }

  return !appointments.some((appointment) => {
    return appointmentBlocksSlot({
      appointment,
      professionalId: professional.id,
      date,
      slotStart,
      slotEnd,
      services
    });
  });
}

function generateSlotsForSelection(params: {
  professional: Professional;
  service: Service;
  date: string;
  services: Service[];
  appointments: Appointment[];
}): AvailableSlot[] {
  const {
    professional,
    service,
    date,
    services,
    appointments
  } = params;

  const slots: AvailableSlot[] = [];
  const start = timeToMinutes(professional.workHoursStart);
  const end = timeToMinutes(professional.workHoursEnd);

  for (let minute = start; minute < end; minute += 30) {
    const time = minutesToTime(minute);
    const isAvailable = isProfessionalAvailableForSlot({
      professional,
      service,
      date,
      services,
      appointments,
      time
    });

    if (isAvailable) {
      slots.push({
        professional,
        service,
        date,
        time
      });
    }
  }

  return slots;
}

function getAvailabilityBadge(count: number): {
  label: string;
  className: string;
} {
  if (count === 0) {
    return {
      label: 'Horário esgotado',
      className: 'bg-red-50 text-red-700 border-red-100'
    };
  }

  if (count <= 3) {
    return {
      label: `${count} horários livres`,
      className: 'bg-orange-50 text-orange-700 border-orange-100'
    };
  }

  return {
    label: `${count} horários livres`,
    className: 'bg-emerald-50 text-emerald-700 border-emerald-100'
  };
}

export default function AgendaView({
  appointments,
  professionals,
  services,
  config,
  clients = [],
  onCreateAppointment,
  onUpdateAppointmentStatus,
  onOpenRescheduleAppointment
}: AgendaViewProps) {
  const [mode, setMode] = useState<AgendaStartMode | null>(null);
  const [currentStep, setCurrentStep] = useState<AgendaStep>('start');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [selectedProfessionalId, setSelectedProfessionalId] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientNotes, setClientNotes] = useState('');
  const [whatsAppConfirmUrl, setWhatsAppConfirmUrl] = useState('');
  const [serviceSearch, setServiceSearch] = useState('');
  const [professionalSearch, setProfessionalSearch] = useState('');
  const viewTopRef = useRef<HTMLDivElement | null>(null);

  const todayStr = getTodayStr();

  useEffect(() => {
    if (currentStep !== 'start') {
      viewTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [currentStep]);

  const dateOptions = useMemo(() => {
    return Array.from({ length: LOOKAHEAD_DAYS }, (_, index) => {
      return addDays(todayStr, index);
    });
  }, [todayStr]);

  const activeServices = useMemo(() => {
    const normalizedSearch = normalizeText(serviceSearch);

    return services
      .filter((service) => service.active)
      .filter((service) => {
        if (!normalizedSearch) {
          return true;
        }

        return (
          normalizeText(service.name).includes(normalizedSearch) ||
          normalizeText(service.category).includes(normalizedSearch) ||
          normalizeText(service.description || '').includes(normalizedSearch)
        );
      })
      .sort((first, second) => first.name.localeCompare(second.name, 'pt-BR'));
  }, [
    services,
    serviceSearch
  ]);

  const activeProfessionals = useMemo(() => {
    const normalizedSearch = normalizeText(professionalSearch);

    return professionals
      .filter((professional) => professional.active)
      .filter((professional) => {
        if (!normalizedSearch) {
          return true;
        }

        return (
          normalizeText(professional.name).includes(normalizedSearch) ||
          normalizeText(professional.role).includes(normalizedSearch)
        );
      })
      .sort((first, second) => {
        const firstOrder = Number(first.displayOrder) || 999;
        const secondOrder = Number(second.displayOrder) || 999;

        if (firstOrder !== secondOrder) {
          return firstOrder - secondOrder;
        }

        return first.name.localeCompare(second.name, 'pt-BR');
      });
  }, [
    professionals,
    professionalSearch
  ]);

  const selectedService = services.find((service) => {
    return service.id === selectedServiceId;
  }) || null;

  const selectedProfessional = professionals.find((professional) => {
    return professional.id === selectedProfessionalId;
  }) || null;

  const servicesForSelectedProfessional = useMemo(() => {
    if (!selectedProfessional) {
      return activeServices;
    }

    return activeServices.filter((service) => {
      return professionalCanDoService({
        professional: selectedProfessional,
        service
      });
    });
  }, [
    activeServices,
    selectedProfessional
  ]);

  const professionalsForSelectedService = useMemo(() => {
    if (!selectedService) {
      return activeProfessionals;
    }

    return activeProfessionals.filter((professional) => {
      return professionalCanDoService({
        professional,
        service: selectedService
      });
    });
  }, [
    activeProfessionals,
    selectedService
  ]);

  const availableSlots = useMemo(() => {
    if (!selectedService || !selectedProfessional || !selectedDate) {
      return [];
    }

    return generateSlotsForSelection({
      professional: selectedProfessional,
      service: selectedService,
      date: selectedDate,
      services,
      appointments
    });
  }, [
    appointments,
    selectedDate,
    selectedProfessional,
    selectedService,
    services
  ]);

  const canGoClientData = Boolean(
    selectedService &&
    selectedProfessional &&
    selectedDate &&
    selectedTime
  );

  const canSubmit = Boolean(
    canGoClientData &&
    clientName.trim() &&
    normalizePhone(clientPhone).length >= 10
  );

  const resetFlow = () => {
    setMode(null);
    setCurrentStep('start');
    setSelectedDate('');
    setSelectedServiceId('');
    setSelectedProfessionalId('');
    setSelectedTime('');
    setClientName('');
    setClientPhone('');
    setClientNotes('');
    setWhatsAppConfirmUrl('');
    setServiceSearch('');
    setProfessionalSearch('');
  };

  const startMode = (nextMode: AgendaStartMode) => {
    resetFlow();
    setMode(nextMode);

    if (nextMode === 'date') {
      setCurrentStep('selectDate');
      return;
    }

    if (nextMode === 'service') {
      setCurrentStep('selectService');
      return;
    }

    if (nextMode === 'professionalAgenda') {
      setSelectedDate(todayStr);
      setCurrentStep('selectProfessional');
      return;
    }

    setCurrentStep('selectProfessional');
  };

  const goBack = () => {
    if (currentStep === 'start') {
      return;
    }

    if (currentStep === 'success') {
      resetFlow();
      return;
    }

    if (currentStep === 'selectDate') {
      resetFlow();
      return;
    }

    if (currentStep === 'selectService') {
      if (mode === 'date') {
        setSelectedServiceId('');
        setCurrentStep('selectProfessional');
        return;
      }

      if (mode === 'professional') {
        setSelectedServiceId('');
        setCurrentStep('selectProfessional');
        return;
      }

      resetFlow();
      return;
    }

    if (currentStep === 'selectProfessional') {
      if (mode === 'date') {
        setSelectedProfessionalId('');
        setCurrentStep('selectDate');
        return;
      }

      if (mode === 'service') {
        setSelectedProfessionalId('');
        setCurrentStep('selectService');
        return;
      }

      resetFlow();
      return;
    }

    if (currentStep === 'professionalAgenda') {
      setSelectedProfessionalId('');
      setCurrentStep('selectProfessional');
      return;
    }

    if (currentStep === 'selectDateTime') {
      setSelectedTime('');

      if (mode === 'date') {
        setCurrentStep('selectService');
        return;
      }

      if (mode === 'service') {
        setCurrentStep('selectProfessional');
        return;
      }

      setCurrentStep('selectService');
      return;
    }

    if (currentStep === 'clientData') {
      setCurrentStep('selectDateTime');
    }
  };

  const handleSelectDateFirst = (date: string) => {
    setSelectedDate(date);
    setSelectedProfessionalId('');
    setSelectedServiceId('');
    setSelectedTime('');
    setCurrentStep('selectProfessional');
  };

  const handleSelectService = (service: Service) => {
    setSelectedServiceId(service.id);
    setSelectedTime('');

    if (mode === 'service') {
      setSelectedProfessionalId('');
      setSelectedDate('');
      setCurrentStep('selectProfessional');
      return;
    }

    if (mode === 'date') {
      setCurrentStep('selectDateTime');
      return;
    }

    setSelectedDate('');
    setCurrentStep('selectDateTime');
  };

  const handleSelectProfessional = (professional: Professional) => {
    setSelectedProfessionalId(professional.id);
    setSelectedTime('');

    if (mode === 'date') {
      setSelectedServiceId('');
      setCurrentStep('selectService');
      return;
    }

    if (mode === 'professionalAgenda') {
      setSelectedServiceId('');
      setSelectedTime('');
      setSelectedDate(selectedDate || todayStr);
      setCurrentStep('professionalAgenda');
      return;
    }

    if (mode === 'professional') {
      setSelectedServiceId('');
      setSelectedDate('');
      setCurrentStep('selectService');
      return;
    }

    setSelectedDate('');
    setCurrentStep('selectDateTime');
  };

  const handleSelectDateTimeDate = (date: string) => {
    setSelectedDate(date);
    setSelectedTime('');
  };

  const findClientByPhone = (phone: string) => {
    const normalizedPhone = normalizePhone(phone);

    if (normalizedPhone.length < 10) {
      return null;
    }

    return clients.find((client) => {
      const mainPhone = normalizePhone(client.phone || '');
      const normalizedStoredPhone = normalizePhone(client.phoneNormalized || '');
      const historyPhones = client.phoneHistory || [];

      return (
        mainPhone === normalizedPhone ||
        normalizedStoredPhone === normalizedPhone ||
        historyPhones.some((historyPhone) => normalizePhone(historyPhone) === normalizedPhone)
      );
    }) || null;
  };

  const handleClientPhoneChange = (value: string) => {
    const formattedPhone = formatPhoneInput(value);
    const matchedClient = findClientByPhone(formattedPhone);

    setClientPhone(formattedPhone);

    if (matchedClient) {
      setClientName(matchedClient.name);

      if (!clientNotes.trim() && matchedClient.notes) {
        setClientNotes(matchedClient.notes);
      }
    }
  };

  const buildAppointmentActionLink = () => {
    const baseUrl = window.location.origin;
    const params = new URLSearchParams({
      phone: normalizePhone(clientPhone),
      date: selectedDate,
      time: selectedTime
    });

    return `${baseUrl}/meu-agendamento?${params.toString()}`;
  };

  const buildClientConfirmationWhatsAppUrl = () => {
    if (!selectedService || !selectedProfessional || !selectedDate || !selectedTime || !clientPhone) {
      return '';
    }

    const phone = normalizePhone(clientPhone);
    const actionLink = buildAppointmentActionLink();
    const message = [
      `Olá, ${clientName.trim() || 'tudo bem'}! Seu horário foi agendado com sucesso.`,
      '',
      `Serviço: ${selectedService.name}`,
      `Profissional: ${selectedProfessional.name}`,
      `Data: ${formatDateBr(selectedDate)}`,
      `Horário: ${selectedTime}`,
      '',
      'Para confirmar, cancelar ou remarcar, acesse:',
      actionLink
    ].join('\n');

    return `https://api.whatsapp.com/send?phone=55${phone}&text=${encodeURIComponent(message)}`;
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    onCreateAppointment({
      clientName: clientName.trim(),
      clientPhone,
      serviceId: selectedServiceId,
      professionalId: selectedProfessionalId,
      date: selectedDate,
      time: selectedTime,
      notes: clientNotes,
      paymentType: 'pendente'
    });

    const confirmationUrl = buildClientConfirmationWhatsAppUrl();
    setWhatsAppConfirmUrl(confirmationUrl);

    if (confirmationUrl) {
      window.open(confirmationUrl, '_blank', 'noopener,noreferrer');
    }

    setCurrentStep('success');
  };

  const getSlotsForProfessionalAcrossPeriod = (professional: Professional): number => {
    const targetServices = selectedService
      ? [selectedService]
      : activeServices.filter((service) => {
          return professionalCanDoService({ professional, service });
        });

    return dateOptions.reduce((total, dateOption) => {
      return total + targetServices.reduce((serviceTotal, service) => {
        return serviceTotal + generateSlotsForSelection({
          professional,
          service,
          date: selectedDate || dateOption,
          services,
          appointments
        }).length;
      }, 0);
    }, 0);
  };

  const getSlotsForProfessionalOnSelectedDate = (professional: Professional): number => {
    if (!selectedDate) {
      return 0;
    }

    const targetServices = selectedService
      ? [selectedService]
      : activeServices.filter((service) => {
          return professionalCanDoService({ professional, service });
        });

    return targetServices.reduce((total, service) => {
      return total + generateSlotsForSelection({
        professional,
        service,
        date: selectedDate,
        services,
        appointments
      }).length;
    }, 0);
  };

  const getSlotsForDate = (date: string): number => {
    const targetProfessionals = selectedProfessional
      ? [selectedProfessional]
      : professionalsForSelectedService;

    if (!selectedService) {
      return targetProfessionals.reduce((professionalTotal, professional) => {
        const professionalServices = activeServices.filter((service) => {
          return professionalCanDoService({ professional, service });
        });

        return professionalTotal + professionalServices.reduce((serviceTotal, service) => {
          return serviceTotal + generateSlotsForSelection({
            professional,
            service,
            date,
            services,
            appointments
          }).length;
        }, 0);
      }, 0);
    }

    return targetProfessionals.reduce((total, professional) => {
      return total + generateSlotsForSelection({
        professional,
        service: selectedService,
        date,
        services,
        appointments
      }).length;
    }, 0);
  };

  const renderModeCards = () => {
    const cards = [
      {
        id: 'date' as AgendaStartMode,
        title: 'Agendar por Data',
        description: 'Cliente perguntou se tem horário em um dia específico.',
        icon: CalendarDays
      },
      {
        id: 'service' as AgendaStartMode,
        title: 'Agendar por Serviço',
        description: `Buscar horários pelo serviço nos próximos ${LOOKAHEAD_DAYS} dias.`,
        icon: Briefcase
      },
      {
        id: 'professional' as AgendaStartMode,
        title: 'Agendar com Profissional',
        description: 'Cliente pediu horário com um profissional específico.',
        icon: UserRound
      },
      {
        id: 'professionalAgenda' as AgendaStartMode,
        title: 'Agenda por Profissional',
        description: 'Abrir agenda individual para cancelar, remarcar ou marcar faltou.',
        icon: UsersRound
      }
    ];

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <button
              key={card.id}
              type="button"
              onClick={() => startMode(card.id)}
              className="bg-white rounded-2xl border border-neutral-200 p-4 text-left shadow-sm transition hover:border-orange-300 hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <span className="w-11 h-11 rounded-xl bg-neutral-100 text-neutral-900 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5" />
                </span>

                <span className="min-w-0">
                  <strong className="text-sm font-black text-neutral-950 block">
                    {card.title}
                  </strong>

                  <span className="text-[11px] text-neutral-500 font-semibold leading-snug block mt-1">
                    {card.description}
                  </span>
                </span>
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  const renderDateSelection = () => {
    return (
      <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b">
          <h3 className="text-base font-black text-neutral-950">
            Escolha o dia da agenda
          </h3>

          <p className="text-xs text-neutral-500 font-semibold mt-1">
            Use quando o cliente perguntou por um dia específico. Dias passados não aparecem.
          </p>
        </div>

        <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          {dateOptions.map((dateOption) => {
            const freeSlots = getSlotsForDate(dateOption);
            const isSelected = selectedDate === dateOption;

            return (
              <button
                key={dateOption}
                type="button"
                onClick={() => handleSelectDateFirst(dateOption)}
                className={`rounded-2xl border p-3 text-center transition ${
                  isSelected
                    ? 'bg-orange-50 border-orange-500 ring-2 ring-orange-100'
                    : freeSlots === 0
                      ? 'bg-red-50/40 border-red-100 hover:border-red-200'
                      : 'bg-white border-neutral-200 hover:border-orange-300 hover:shadow-md'
                }`}
              >
                <span className="text-[10px] font-black uppercase text-neutral-400 block">
                  {dateOption === todayStr ? 'Hoje' : getWeekDayShortLabel(dateOption)}
                </span>

                <strong className="text-base font-black text-neutral-950 block mt-1">
                  {formatDateBr(dateOption).slice(0, 5)}
                </strong>

                <span className={`text-[10px] font-black rounded-lg px-2 py-1 inline-block mt-3 ${
                  freeSlots === 0
                    ? 'bg-red-100 text-red-700'
                    : 'bg-emerald-50 text-emerald-700'
                }`}>
                  {freeSlots === 0 ? 'Esgotado' : `${freeSlots} livres`}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderServiceSelection = () => {
    const serviceList = selectedProfessional
      ? servicesForSelectedProfessional.filter((service) => {
          const normalizedSearch = normalizeText(serviceSearch);

          if (!normalizedSearch) {
            return true;
          }

          return (
            normalizeText(service.name).includes(normalizedSearch) ||
            normalizeText(service.category).includes(normalizedSearch)
          );
        })
      : activeServices;

    return (
      <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-black text-neutral-950">
              Escolha o serviço
            </h3>

            <p className="text-xs text-neutral-500 font-semibold mt-1">
              {selectedProfessional
                ? `Mostrando serviços realizados por ${selectedProfessional.name}.`
                : 'Escolha o serviço solicitado pelo cliente.'}
            </p>
          </div>

          <div className="relative w-full lg:w-72">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={serviceSearch}
              onChange={(event) => setServiceSearch(event.target.value)}
              placeholder="Buscar serviço..."
              className="w-full bg-neutral-50 border rounded-xl pl-9 pr-3 py-2.5 text-xs font-semibold outline-none focus:border-orange-300"
            />
          </div>
        </div>

        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {serviceList.map((service) => {
            const serviceProfessional = selectedProfessional;
            const count = serviceProfessional && selectedDate
              ? generateSlotsForSelection({
                  professional: serviceProfessional,
                  service,
                  date: selectedDate,
                  services,
                  appointments
                }).length
              : serviceProfessional
                ? dateOptions.reduce((total, dateOption) => {
                    return total + generateSlotsForSelection({
                      professional: serviceProfessional,
                      service,
                      date: dateOption,
                      services,
                      appointments
                    }).length;
                  }, 0)
                : professionalsForSelectedService.reduce((total, professional) => {
                    if (!professionalCanDoService({ professional, service })) {
                      return total;
                    }

                    return total + dateOptions.reduce((dateTotal, dateOption) => {
                      return dateTotal + generateSlotsForSelection({
                        professional,
                        service,
                        date: selectedDate || dateOption,
                        services,
                        appointments
                      }).length;
                    }, 0);
                  }, 0);

            const availability = getAvailabilityBadge(count);
            const isSoldOut = count === 0;

            return (
              <button
                key={service.id}
                type="button"
                onClick={() => {
                  if (!isSoldOut) {
                    handleSelectService(service);
                  }
                }}
                disabled={isSoldOut}
                className={`rounded-2xl border p-3 text-left transition ${
                  selectedServiceId === service.id
                    ? 'bg-orange-50 border-orange-500 ring-2 ring-orange-100'
                    : isSoldOut
                      ? 'bg-red-50/40 border-red-100 opacity-80 cursor-not-allowed'
                      : 'bg-white border-neutral-200 hover:border-orange-300 hover:shadow-md'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                      <Briefcase className="w-5 h-5" />
                    </span>

                    <span className="min-w-0">
                      <strong className="text-sm font-black text-neutral-950 block truncate">
                        {service.name}
                      </strong>

                      <span className="text-[10px] font-black text-neutral-400 uppercase tracking-wider block mt-1">
                        {service.category}
                      </span>

                      <span className="flex items-center gap-2 text-xs text-neutral-500 font-semibold mt-2">
                        <Clock className="w-3.5 h-3.5" />
                        {formatDuration(service.duration)}
                      </span>
                    </span>
                  </div>

                  <span className="text-right shrink-0">
                    <strong className="text-sm font-black text-neutral-950 block">
                      {formatCurrency(service.price)}
                    </strong>

                    {service.requireDeposit && (
                      <span className="text-[10px] font-black text-orange-600 block mt-1">
                        Sinal {formatCurrency(service.depositValue || 0)}
                      </span>
                    )}
                  </span>
                </div>

                <span className={`inline-block mt-4 px-2 py-1 rounded-lg border text-[10px] font-black ${availability.className}`}>
                  {availability.label}
                </span>
              </button>
            );
          })}

          {serviceList.length === 0 && (
            <div className="md:col-span-2 bg-neutral-50 border border-dashed rounded-2xl p-10 text-center">
              <p className="text-sm font-black text-neutral-800">
                Nenhum serviço encontrado.
              </p>

              <p className="text-xs text-neutral-400 mt-1">
                Revise a busca ou o cadastro de serviços ativos.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderProfessionalSelection = () => {
    const professionalList = selectedService
      ? professionalsForSelectedService
      : activeProfessionals;

    return (
      <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-black text-neutral-950">
              Escolha o profissional
            </h3>

            <p className="text-xs text-neutral-500 font-semibold mt-1">
              {mode === 'professionalAgenda'
                ? 'Escolha o profissional para abrir a agenda individual.'
                : selectedDate
                  ? `Mostrando disponibilidade para ${formatDateBr(selectedDate)}.`
                  : selectedService
                    ? `Apenas profissionais que realizam ${selectedService.name}.`
                    : `Consulte disponibilidade nos próximos ${LOOKAHEAD_DAYS} dias.`}
            </p>
          </div>

          <div className="relative w-full lg:w-72">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={professionalSearch}
              onChange={(event) => setProfessionalSearch(event.target.value)}
              placeholder="Buscar profissional..."
              className="w-full bg-neutral-50 border rounded-xl pl-9 pr-3 py-2.5 text-xs font-semibold outline-none focus:border-orange-300"
            />
          </div>
        </div>

        <div className="p-4 space-y-3">
          {professionalList.map((professional) => {
            const availabilityCount = selectedDate
              ? getSlotsForProfessionalOnSelectedDate(professional)
              : getSlotsForProfessionalAcrossPeriod(professional);

            const availability = getAvailabilityBadge(availabilityCount);
            const isSoldOut = mode !== 'professionalAgenda' && availabilityCount === 0;

            return (
              <button
                key={professional.id}
                type="button"
                onClick={() => {
                  if (!isSoldOut) {
                    handleSelectProfessional(professional);
                  }
                }}
                disabled={isSoldOut}
                className={`w-full rounded-2xl border p-3 text-left transition ${
                  selectedProfessionalId === professional.id
                    ? 'bg-orange-50 border-orange-500 ring-2 ring-orange-100'
                    : isSoldOut
                      ? 'bg-red-50/40 border-red-100 opacity-80 cursor-not-allowed'
                      : 'bg-white border-neutral-200 hover:border-orange-300 hover:shadow-md'
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-10 h-10 rounded-full bg-neutral-100 border flex items-center justify-center text-xs font-black text-neutral-700 shrink-0 overflow-hidden">
                      {professional.avatar ? (
                        <img
                          src={professional.avatar}
                          alt={professional.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        professional.name.slice(0, 2).toUpperCase()
                      )}
                    </span>

                    <span className="min-w-0">
                      <strong className="text-sm font-black text-neutral-950 block truncate">
                        {professional.name}
                      </strong>

                      <span className="text-xs text-neutral-500 font-semibold block mt-1">
                        {professional.role}
                      </span>
                    </span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`px-3 py-1 rounded-full border text-[10px] font-black ${mode === 'professionalAgenda' ? 'bg-neutral-50 text-neutral-700 border-neutral-200' : availability.className}`}>
                      {mode === 'professionalAgenda' ? 'Abrir agenda' : availability.label}
                    </span>

                    {isSoldOut ? (
                      <Lock className="w-4 h-4 text-red-500" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-neutral-400" />
                    )}
                  </div>
                </div>
              </button>
            );
          })}

          {professionalList.length === 0 && (
            <div className="bg-neutral-50 border border-dashed rounded-2xl p-10 text-center">
              <p className="text-sm font-black text-neutral-800">
                Nenhum profissional encontrado.
              </p>

              <p className="text-xs text-neutral-400 mt-1">
                Revise a busca ou o cadastro dos colaboradores ativos.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderDateTimeSelection = () => {
    return (
      <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-black text-neutral-950">
              Escolha data e horário
            </h3>

            <p className="text-xs text-neutral-500 font-semibold mt-1">
              Horários ocupados, almoço e horários passados são ocultados automaticamente.
            </p>
          </div>

          <div className="bg-neutral-50 border rounded-2xl p-3 text-xs min-w-[260px]">
            <span className="font-black text-neutral-950 block">
              Resumo selecionado
            </span>

            <span className="text-neutral-500 font-semibold block mt-1">
              {selectedService?.name || 'Serviço não selecionado'}
            </span>

            <span className="text-neutral-500 font-semibold block">
              {selectedProfessional?.name || 'Profissional não selecionado'}
            </span>
          </div>
        </div>

        <div className="p-4 space-y-5">
          <div>
            <span className="text-xs font-black text-neutral-500 uppercase tracking-widest font-mono">
              Data do atendimento
            </span>

            <div className="flex gap-2 overflow-x-auto mt-3 pb-1">
              {dateOptions.map((dateOption) => {
                const slotsForDate = selectedService && selectedProfessional
                  ? generateSlotsForSelection({
                      professional: selectedProfessional,
                      service: selectedService,
                      date: dateOption,
                      services,
                      appointments
                    }).length
                  : 0;
                const isSelected = selectedDate === dateOption;

                return (
                  <button
                    key={dateOption}
                    type="button"
                    onClick={() => handleSelectDateTimeDate(dateOption)}
                    disabled={slotsForDate === 0}
                    className={`min-w-[96px] rounded-2xl border px-3 py-2.5 text-center transition ${
                      isSelected
                        ? 'bg-orange-50 border-orange-500 ring-2 ring-orange-100'
                        : slotsForDate === 0
                          ? 'bg-red-50/40 border-red-100 opacity-80 cursor-not-allowed'
                          : 'bg-white border-neutral-200 hover:border-orange-300'
                    }`}
                  >
                    <span className="text-[10px] font-black uppercase text-neutral-400 block">
                      {dateOption === todayStr ? 'Hoje' : getWeekDayShortLabel(dateOption)}
                    </span>

                    <strong className="text-sm font-black text-neutral-950 block mt-1">
                      {formatDateBr(dateOption).slice(0, 5)}
                    </strong>

                    <span className={`text-[10px] font-black rounded-lg px-2 py-1 inline-block mt-2 ${
                      slotsForDate === 0
                        ? 'bg-red-100 text-red-700'
                        : 'bg-emerald-50 text-emerald-700'
                    }`}>
                      {slotsForDate === 0 ? 'Esgotado' : `${slotsForDate} disp.`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t pt-5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-black text-neutral-500 uppercase tracking-widest font-mono">
                Horários disponíveis
              </span>

              <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-2 py-1">
                {availableSlots.length} horários
              </span>
            </div>

            {availableSlots.length === 0 ? (
              <div className="bg-neutral-50 border border-dashed rounded-2xl p-8 text-center mt-3">
                <p className="text-sm font-black text-neutral-800">
                  Horário esgotado para esta seleção.
                </p>

                <p className="text-xs text-neutral-400 mt-1">
                  Volte uma etapa e tente outro profissional, serviço ou data.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mt-3">
                {availableSlots.map((slot) => {
                  const isSelected = selectedTime === slot.time;

                  return (
                    <button
                      key={`${slot.professional.id}-${slot.service.id}-${slot.date}-${slot.time}`}
                      type="button"
                      onClick={() => setSelectedTime(slot.time)}
                      className={`rounded-xl border px-3 py-2.5 text-left transition ${
                        isSelected
                          ? 'bg-orange-50 border-orange-500 ring-2 ring-orange-100'
                          : 'bg-white border-neutral-200 hover:border-orange-300'
                      }`}
                    >
                      <strong className="text-sm font-black text-neutral-950 block">
                        {slot.time}
                      </strong>

                      <span className="text-[10px] text-neutral-500 font-bold block mt-1 truncate">
                        Disponível
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-t pt-4 flex justify-end">
            <button
              type="button"
              disabled={!canGoClientData}
              onClick={() => setCurrentStep('clientData')}
              className={`w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-black transition flex items-center justify-center gap-2 ${
                canGoClientData
                  ? 'bg-orange-600 hover:bg-orange-700 text-white shadow-sm'
                  : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
              }`}
            >
              Avançar
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderProfessionalAgenda = () => {
    const professionalAppointments = appointments
      .filter((appointment) => {
        return (
          appointment.professionalId === selectedProfessionalId &&
          getAppointmentDate(appointment) === selectedDate
        );
      })
      .sort((first, second) => getAppointmentTime(first).localeCompare(getAppointmentTime(second)));

    const getAppointmentCardClassName = (status: Appointment['status']) => {
      if (status === 'confirmed') {
        return 'border-emerald-200 bg-emerald-50/80 shadow-emerald-950/5';
      }

      if (status === 'cancelled') {
        return 'border-neutral-300 bg-neutral-100/90 shadow-neutral-950/5 opacity-90';
      }

      if (status === 'absent') {
        return 'border-red-200 bg-red-50/85 shadow-red-950/5';
      }

      if (status === 'completed') {
        return 'border-sky-200 bg-sky-50/80 shadow-sky-950/5';
      }

      return 'border-amber-200 bg-amber-50/85 shadow-amber-950/5';
    };

    const getAppointmentFooterLabel = (status: Appointment['status']) => {
      if (status === 'confirmed') return 'CLIENTE CONFIRMOU PRESENÇA';
      if (status === 'cancelled') return 'ATENDIMENTO CANCELADO';
      if (status === 'absent') return 'CLIENTE FALTOU';
      if (status === 'completed') return 'ATENDIMENTO FINALIZADO';
      return 'AGUARDANDO CONFIRMAÇÃO';
    };

    const getAppointmentFooterClassName = (status: Appointment['status']) => {
      if (status === 'confirmed') return 'text-emerald-800';
      if (status === 'cancelled') return 'text-neutral-600';
      if (status === 'absent') return 'text-red-800';
      if (status === 'completed') return 'text-sky-800';
      return 'text-amber-800';
    };

    const handleStatusAction = (appointmentId: string, status: Appointment['status']) => {
      if (onUpdateAppointmentStatus) {
        onUpdateAppointmentStatus(appointmentId, status);
      }
    };

    return (
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <div className="border-b p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-base font-extrabold tracking-tight text-neutral-950">
                Agenda de {selectedProfessional?.name}
              </h3>

              <p className="mt-1 text-xs font-medium text-neutral-500">
                Consulte os horários e tome ações rápidas no atendimento.
              </p>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {dateOptions.map((dateOption) => {
                const isSelected = selectedDate === dateOption;

                return (
                  <button
                    key={dateOption}
                    type="button"
                    onClick={() => setSelectedDate(dateOption)}
                    className={`min-w-[78px] rounded-xl border px-3 py-2 text-center transition ${
                      isSelected
                        ? 'border-orange-500 bg-orange-600 text-white shadow-sm'
                        : 'border-neutral-200 bg-white text-neutral-600 hover:border-orange-300'
                    }`}
                  >
                    <span className="block text-[10px] font-extrabold uppercase tracking-wider">
                      {dateOption === todayStr ? 'Hoje' : getWeekDayShortLabel(dateOption)}
                    </span>

                    <strong className="mt-0.5 block text-xs font-extrabold">
                      {formatDateBr(dateOption).slice(0, 5)}
                    </strong>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-3 p-4">
          {professionalAppointments.length === 0 ? (
            <div className="rounded-2xl border border-dashed bg-neutral-50 p-8 text-center">
              <p className="text-sm font-extrabold text-neutral-800">
                Nenhum atendimento nesta data.
              </p>

              <p className="mt-1 text-xs text-neutral-400">
                Escolha outra data acima ou volte para selecionar outro profissional.
              </p>
            </div>
          ) : (
            professionalAppointments.map((appointment) => {
              const service = services.find((item) => item.id === appointment.serviceId);
              const disabledActions = !onUpdateAppointmentStatus;

              return (
                <div
                  key={appointment.id}
                  className={`rounded-2xl border p-4 shadow-sm transition ${getAppointmentCardClassName(appointment.status)}`}
                >
                  <div className="grid grid-cols-1 gap-4 xl:grid-cols-[96px_1fr_auto] xl:items-center">
                    <div className="flex items-center gap-3 xl:block">
                      <span className="block rounded-2xl bg-white/80 px-4 py-3 text-center font-mono text-2xl font-extrabold leading-none tracking-[-0.04em] text-neutral-950 shadow-sm ring-1 ring-black/5">
                        {getAppointmentTime(appointment)}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-neutral-500">
                        Cliente:{' '}
                        <span className="text-neutral-950">
                          {appointment.clientName}
                        </span>
                      </p>

                      <h4 className="mt-2 break-words text-lg font-extrabold leading-tight tracking-[-0.03em] text-neutral-950">
                        {service?.name || 'Serviço não localizado'}
                      </h4>

                      <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-neutral-500">
                        Profissional: {selectedProfessional?.name || 'Profissional'}
                      </p>

                      {appointment.clientPhone && (
                        <p className="mt-1 text-xs font-semibold text-neutral-500">
                          WhatsApp: {appointment.clientPhone}
                        </p>
                      )}

                      {appointment.notes && (
                        <p className="mt-2 rounded-xl bg-white/65 px-3 py-2 text-xs font-medium leading-relaxed text-neutral-600 ring-1 ring-black/5">
                          {appointment.notes}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:min-w-[460px]">
                      <button
                        type="button"
                        disabled={disabledActions || appointment.status === 'confirmed'}
                        onClick={() => handleStatusAction(appointment.id, 'confirmed')}
                        className={`rounded-xl px-3 py-2.5 text-xs font-extrabold transition ${
                          disabledActions || appointment.status === 'confirmed'
                            ? 'cursor-not-allowed bg-emerald-100 text-emerald-700'
                            : 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700'
                        }`}
                      >
                        Confirmar
                      </button>

                      <button
                        type="button"
                        disabled={!onOpenRescheduleAppointment}
                        onClick={() => onOpenRescheduleAppointment?.(appointment)}
                        className={`rounded-xl px-3 py-2.5 text-xs font-extrabold transition ${
                          onOpenRescheduleAppointment
                            ? 'bg-orange-600 text-white shadow-sm hover:bg-orange-700'
                            : 'cursor-not-allowed bg-orange-100 text-orange-400'
                        }`}
                      >
                        Reagendar
                      </button>

                      <button
                        type="button"
                        disabled={disabledActions || appointment.status === 'cancelled'}
                        onClick={() => handleStatusAction(appointment.id, 'cancelled')}
                        className={`rounded-xl px-3 py-2.5 text-xs font-extrabold transition ${
                          disabledActions || appointment.status === 'cancelled'
                            ? 'cursor-not-allowed bg-neutral-200 text-neutral-500'
                            : 'bg-neutral-800 text-white shadow-sm hover:bg-neutral-900'
                        }`}
                      >
                        Cancelou
                      </button>

                      <button
                        type="button"
                        disabled={disabledActions || appointment.status === 'absent'}
                        onClick={() => handleStatusAction(appointment.id, 'absent')}
                        className={`rounded-xl px-3 py-2.5 text-xs font-extrabold transition ${
                          disabledActions || appointment.status === 'absent'
                            ? 'cursor-not-allowed bg-red-100 text-red-700'
                            : 'bg-red-700 text-white shadow-sm hover:bg-red-800'
                        }`}
                      >
                        Faltou
                      </button>
                    </div>
                  </div>

                  <div
                    className={`mt-3 border-t border-black/5 pt-3 font-mono text-[10px] font-extrabold uppercase tracking-[0.18em] ${getAppointmentFooterClassName(appointment.status)}`}
                  >
                    {getAppointmentFooterLabel(appointment.status)}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  const renderClientData = () => {
    const matchedClient = findClientByPhone(clientPhone);

    return (
      <form onSubmit={handleSubmit} className="bg-white border rounded-2xl shadow-sm overflow-hidden max-w-5xl mx-auto">
        <div className="p-4 border-b">
          <h3 className="text-base font-black text-neutral-950">
            Dados do cliente
          </h3>

          <p className="text-xs text-neutral-500 font-semibold mt-1">
            Informe primeiro o WhatsApp. Se o cliente já existir, o nome será preenchido automaticamente.
          </p>
        </div>

        <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-3">
            <div>
              <label className="text-xs font-black text-neutral-500 uppercase tracking-widest font-mono block mb-1.5">
                WhatsApp
              </label>

              <div className="relative">
                <Phone className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={clientPhone}
                  onChange={(event) => handleClientPhoneChange(event.target.value)}
                  placeholder="(14) 99999-9999"
                  className="w-full bg-neutral-50 border rounded-xl pl-9 pr-3 py-2 text-sm font-semibold outline-none focus:border-orange-300"
                  autoFocus
                />
              </div>

              {matchedClient && (
                <p className="mt-1.5 text-[11px] font-bold text-emerald-700">
                  Cliente encontrado na base: {matchedClient.name}
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-black text-neutral-500 uppercase tracking-widest font-mono block mb-1.5">
                Nome do cliente
              </label>

              <input
                value={clientName}
                onChange={(event) => setClientName(event.target.value)}
                placeholder="Ex.: Maria Silva"
                className="w-full bg-neutral-50 border rounded-xl px-3 py-2 text-sm font-semibold outline-none focus:border-orange-300"
              />
            </div>

            <div>
              <label className="text-xs font-black text-neutral-500 uppercase tracking-widest font-mono block mb-1.5">
                Observações
              </label>

              <textarea
                value={clientNotes}
                onChange={(event) => setClientNotes(event.target.value)}
                placeholder="Ex.: Cliente prefere atendimento rápido."
                className="w-full bg-neutral-50 border rounded-xl px-3 py-2 text-sm font-semibold outline-none focus:border-orange-300 min-h-[62px] resize-none"
              />
            </div>
          </div>

          <div className="bg-neutral-50 border rounded-2xl p-3 h-fit">
            <span className="text-xs font-black text-neutral-500 uppercase tracking-widest font-mono block">
              Resumo
            </span>

            <div className="mt-3 space-y-2.5 text-sm">
              <div>
                <span className="text-[10px] font-black text-neutral-400 uppercase block">
                  Serviço
                </span>
                <strong className="text-neutral-950">
                  {selectedService?.name}
                </strong>
              </div>

              <div>
                <span className="text-[10px] font-black text-neutral-400 uppercase block">
                  Profissional
                </span>
                <strong className="text-neutral-950">
                  {selectedProfessional?.name}
                </strong>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] font-black text-neutral-400 uppercase block">
                    Data
                  </span>
                  <strong className="text-neutral-950">
                    {formatDateBr(selectedDate)}
                  </strong>
                </div>

                <div>
                  <span className="text-[10px] font-black text-neutral-400 uppercase block">
                    Hora
                  </span>
                  <strong className="text-neutral-950">
                    {selectedTime}
                  </strong>
                </div>
              </div>

              <div className="border-t pt-2.5">
                <span className="text-[10px] font-black text-neutral-400 uppercase block">
                  Valor do serviço
                </span>
                <strong className="text-lg text-neutral-950">
                  {formatCurrency(selectedService?.price || 0)}
                </strong>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t bg-neutral-50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-neutral-500 font-semibold flex items-center gap-2">
            <Info className="w-4 h-4" />
            A cobrança fica para o caixa. Aqui salvamos somente o agendamento.
          </p>

          <button
            type="submit"
            disabled={!canSubmit}
            className={`w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-black transition ${
              canSubmit
                ? 'bg-orange-600 hover:bg-orange-700 text-white shadow-sm'
                : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
            }`}
          >
            Confirmar agendamento
          </button>
        </div>
      </form>
    );
  };

  const renderSuccess = () => {
    return (
      <div className="bg-white border rounded-2xl shadow-sm p-8 text-center max-w-2xl mx-auto">
        <span className="w-14 h-14 bg-emerald-50 text-emerald-700 rounded-full mx-auto flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8" />
        </span>

        <h3 className="text-2xl font-black text-neutral-950 mt-4">
          Agendamento criado com sucesso
        </h3>

        <p className="text-sm text-neutral-500 font-semibold mt-2">
          O atendimento foi incluído na agenda geral de {config.name}.
        </p>

        <div className="mt-5 flex flex-col sm:flex-row justify-center gap-2">
          {whatsAppConfirmUrl && (
            <a
              href={whatsAppConfirmUrl}
              target="_blank"
              rel="noreferrer"
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-xs font-black transition inline-flex items-center justify-center gap-2"
            >
              <Phone className="w-4 h-4" />
              Enviar confirmação no WhatsApp
            </a>
          )}

          <button
            type="button"
            onClick={resetFlow}
            className="bg-orange-600 hover:bg-orange-700 text-white px-5 py-2.5 rounded-xl text-xs font-black transition"
          >
            Fazer novo agendamento
          </button>
        </div>
      </div>
    );
  };

  const renderCurrentStep = () => {
    if (currentStep === 'selectDate') {
      return renderDateSelection();
    }

    if (currentStep === 'selectService') {
      return renderServiceSelection();
    }

    if (currentStep === 'selectProfessional') {
      return renderProfessionalSelection();
    }

    if (currentStep === 'selectDateTime') {
      return renderDateTimeSelection();
    }

    if (currentStep === 'clientData') {
      return renderClientData();
    }

    if (currentStep === 'professionalAgenda') {
      return renderProfessionalAgenda();
    }

    if (currentStep === 'success') {
      return renderSuccess();
    }

    return null;
  };


  return (
    <div id="view-agenda" ref={viewTopRef} className="space-y-4 text-left animate-none">
      {currentStep === 'start' ? (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-extrabold tracking-tight text-neutral-950">
                Agenda Geral do Salão
              </h2>

              <p className="text-xs text-neutral-500 mt-1 font-semibold">
                Escolha uma opção para iniciar. Depois disso, a tela mostra somente o próximo passo.
              </p>
            </div>

            <div className="bg-white border rounded-xl px-3 py-2 text-[11px] text-neutral-500 font-semibold flex items-center gap-2 shadow-sm">
              <Info className="w-4 h-4 text-neutral-400" />
              Dias passados não aparecem.
            </div>
          </div>

          {renderModeCards()}
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3 bg-white border rounded-2xl px-3 py-2 shadow-sm">
          <button
            type="button"
            onClick={goBack}
            className="bg-orange-600 hover:bg-orange-700 border border-orange-600 text-white px-3 py-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>

        </div>
      )}

      {renderCurrentStep()}
    </div>
  );
}
