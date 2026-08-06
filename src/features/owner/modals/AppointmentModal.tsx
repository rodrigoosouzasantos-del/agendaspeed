/**
 * Modal de Agendamento Manual do Painel do Dono - AgendaZap.
 *
 * Fluxo rápido por etapas:
 * - escolher serviço;
 * - escolher profissional ou qualquer profissional disponível;
 * - escolher data e horário com disponibilidade;
 * - informar dados do cliente;
 * - revisar e finalizar.
 */

import React, {
  useEffect,
  useMemo,
  useState
} from 'react';

import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  MessageCircle,
  Search,
  UserRound,
  Users,
  X
} from 'lucide-react';

import {
  Appointment,
  PaymentType,
  Professional,
  Service
} from '../../../types';

import { getProfessionalScheduleForDateStr } from '../../../lib/professionalSchedule';

interface AppointmentModalProps {
  isOpen: boolean;
  services: Service[];
  professionals: Professional[];
  appointments?: Appointment[];

  clientName: string;
  clientPhone: string;
  serviceId: string;
  professionalId: string;
  date: string;
  time: string;
  notes: string;
  paymentType: PaymentType;

  onChangeClientName: (value: string) => void;
  onChangeClientPhone: (value: string) => void;
  onChangeServiceId: (value: string) => void;
  onChangeProfessionalId: (value: string) => void;
  onChangeDate: (value: string) => void;
  onChangeTime: (value: string) => void;
  onChangeNotes: (value: string) => void;
  onChangePaymentType: (value: PaymentType) => void;

  onClose: () => void;
  onSubmit: (event: React.FormEvent) => void;
}

type AppointmentStep =
  | 'service'
  | 'professional'
  | 'datetime'
  | 'client'
  | 'review';

interface AvailableSlot {
  professional: Professional;
  time: string;
}

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

function formatCurrency(value: number): string {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
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

function formatDateBr(dateStr: string): string {
  if (!dateStr || !dateStr.includes('-')) {
    return dateStr;
  }

  return dateStr.split('-').reverse().join('/');
}

function getWeekDayShortLabel(dateStr: string): string {
  const labels = [
    'Dom',
    'Seg',
    'Ter',
    'Qua',
    'Qui',
    'Sex',
    'Sáb'
  ];

  return labels[parseLocalDate(dateStr).getDay()];
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

function getAppointmentDate(appointment: Appointment): string {
  return appointment.dateTime.split('T')[0];
}

function getAppointmentTime(appointment: Appointment): string {
  return appointment.dateTime.split('T')[1]?.slice(0, 5) || '';
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

  if ([
    'cancelled',
    'absent',
    'rescheduled'
  ].includes(appointment.status)) {
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

  const daySchedule = getProfessionalScheduleForDateStr(professional, date);

  if (!professional.active || !daySchedule.enabled) {
    return false;
  }

  if (!professional.services.includes(service.id)) {
    return false;
  }

  const slotStart = timeToMinutes(time);
  const slotEnd = slotStart + service.duration;

  const workStart = timeToMinutes(daySchedule.start);
  const workEnd = timeToMinutes(daySchedule.end);
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

function generateDateOptions(): string[] {
  const today = getTodayStr();

  return Array.from({ length: 14 }, (_, index) => {
    return addDays(today, index);
  });
}

function generateTimeOptions(params: {
  service: Service;
  selectedProfessional: Professional | null;
  professionalsForService: Professional[];
  date: string;
  appointments: Appointment[];
  services: Service[];
  anyProfessional: boolean;
}): AvailableSlot[] {
  const {
    service,
    selectedProfessional,
    professionalsForService,
    date,
    appointments,
    services,
    anyProfessional
  } = params;

  const targetProfessionals = anyProfessional || !selectedProfessional
    ? professionalsForService
    : [selectedProfessional];

  const slots: AvailableSlot[] = [];

  targetProfessionals.forEach((professional) => {
    const daySchedule = getProfessionalScheduleForDateStr(professional, date);
    const start = timeToMinutes(daySchedule.start);
    const end = timeToMinutes(daySchedule.end);

    for (let minute = start; minute < end; minute += 30) {
      const time = minutesToTime(minute);
      const isAvailable = isProfessionalAvailableForSlot({
        professional,
        service,
        date,
        time,
        services,
        appointments
      });

      if (isAvailable) {
        slots.push({
          professional,
          time
        });
      }
    }
  });

  return slots.sort((first, second) => {
    const timeComparison = first.time.localeCompare(second.time);

    if (timeComparison !== 0) {
      return timeComparison;
    }

    return first.professional.name.localeCompare(second.professional.name);
  });
}

function getAvailabilityLabel(count: number): {
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
      label: 'Poucos horários',
      className: 'bg-orange-50 text-orange-700 border-orange-100'
    };
  }

  return {
    label: 'Disponível',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-100'
  };
}

export default function AppointmentModal({
  isOpen,
  services,
  professionals,
  appointments = [],
  clientName,
  clientPhone,
  serviceId,
  professionalId,
  date,
  time,
  notes,
  paymentType,
  onChangeClientName,
  onChangeClientPhone,
  onChangeServiceId,
  onChangeProfessionalId,
  onChangeDate,
  onChangeTime,
  onChangeNotes,
  onChangePaymentType,
  onClose,
  onSubmit
}: AppointmentModalProps) {
  const [currentStep, setCurrentStep] =
    useState<AppointmentStep>('service');

  const [serviceSearch, setServiceSearch] = useState('');
  const [anyProfessional, setAnyProfessional] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCurrentStep('service');
      setServiceSearch('');
      setAnyProfessional(false);
    }
  }, [isOpen]);

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
      .sort((first, second) => {
        const firstOrder = Number((first as unknown as Record<string, unknown>).displayOrder) || 999;
        const secondOrder = Number((second as unknown as Record<string, unknown>).displayOrder) || 999;

        if (firstOrder !== secondOrder) {
          return firstOrder - secondOrder;
        }

        return first.name.localeCompare(second.name);
      });
  }, [
    services,
    serviceSearch
  ]);

  const selectedService = services.find((service) => {
    return service.id === serviceId;
  }) || null;

  const professionalsForService = useMemo(() => {
    if (!selectedService) {
      return [];
    }

    return professionals
      .filter((professional) => {
        return (
          professional.active &&
          professional.services.includes(selectedService.id)
        );
      })
      .sort((first, second) => {
        const firstOrder = Number(first.displayOrder) || 999;
        const secondOrder = Number(second.displayOrder) || 999;

        if (firstOrder !== secondOrder) {
          return firstOrder - secondOrder;
        }

        return first.name.localeCompare(second.name);
      });
  }, [
    professionals,
    selectedService
  ]);

  const selectedProfessional = professionals.find((professional) => {
    return professional.id === professionalId;
  }) || null;

  const dateOptions = useMemo(() => {
    return generateDateOptions();
  }, []);

  const selectedDate = date || getTodayStr();

  const timeOptions = useMemo(() => {
    if (!selectedService) {
      return [];
    }

    return generateTimeOptions({
      service: selectedService,
      selectedProfessional,
      professionalsForService,
      date: selectedDate,
      appointments,
      services,
      anyProfessional
    });
  }, [
    selectedService,
    selectedProfessional,
    professionalsForService,
    selectedDate,
    appointments,
    services,
    anyProfessional
  ]);

  const canGoToProfessional = Boolean(selectedService);
  const canGoToDateTime = Boolean(selectedService && (professionalId || anyProfessional));
  const canGoToClient = Boolean(selectedService && professionalId && date && time);
  const canSubmit = Boolean(
    selectedService &&
    professionalId &&
    date &&
    time &&
    clientName.trim() &&
    normalizePhone(clientPhone).length >= 10
  );

  const selectedSlotProfessional = professionals.find((professional) => {
    return professional.id === professionalId;
  }) || null;

  const handleSelectService = (service: Service) => {
    onChangeServiceId(service.id);
    onChangeProfessionalId('');
    onChangeDate('');
    onChangeTime('');
    setAnyProfessional(false);
    setCurrentStep('professional');
  };

  const handleSelectProfessional = (professional: Professional) => {
    setAnyProfessional(false);
    onChangeProfessionalId(professional.id);
    onChangeTime('');
    setCurrentStep('datetime');
  };

  const handleSelectAnyProfessional = () => {
    setAnyProfessional(true);
    onChangeProfessionalId('');
    onChangeTime('');
    setCurrentStep('datetime');
  };

  const handleSelectDate = (value: string) => {
    onChangeDate(value);
    onChangeTime('');
  };

  const handleSelectSlot = (slot: AvailableSlot) => {
    onChangeProfessionalId(slot.professional.id);
    onChangeTime(slot.time);
  };

  const handlePhoneChange = (value: string) => {
    onChangeClientPhone(formatPhoneInput(value));
  };

  const stepItems = [
    {
      id: 'service' as AppointmentStep,
      number: 1,
      title: 'Serviço',
      subtitle: 'Escolha o serviço'
    },
    {
      id: 'professional' as AppointmentStep,
      number: 2,
      title: 'Profissional',
      subtitle: 'Escolha quem atende'
    },
    {
      id: 'datetime' as AppointmentStep,
      number: 3,
      title: 'Data e horário',
      subtitle: 'Escolha a vaga'
    },
    {
      id: 'client' as AppointmentStep,
      number: 4,
      title: 'Cliente',
      subtitle: 'Nome e WhatsApp'
    },
    {
      id: 'review' as AppointmentStep,
      number: 5,
      title: 'Resumo',
      subtitle: 'Finalizar'
    }
  ];

  if (!isOpen) {
    return null;
  }

  return (
    <div
      id="modal-add-appt"
      className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4"
    >
      <div className="bg-white rounded-3xl w-full max-w-5xl border text-left shadow-2xl relative overflow-hidden max-h-[94vh] flex flex-col">
        <div className="px-5 sm:px-7 py-5 border-b bg-white flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-black text-neutral-950">
              Agendar atendimento
            </h3>

            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Fluxo rápido em etapas para criar o horário na Agenda Geral e na agenda do profissional.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-2xl border bg-white text-zinc-400 hover:text-zinc-700 hover:bg-neutral-50 shrink-0 flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 sm:px-7 py-4 border-b bg-neutral-50/70 overflow-x-auto">
          <div className="min-w-max grid grid-cols-5 gap-2">
            {stepItems.map((step) => {
              const isActive = currentStep === step.id;
              const isDone =
                (step.id === 'service' && Boolean(serviceId)) ||
                (step.id === 'professional' && Boolean(professionalId || anyProfessional)) ||
                (step.id === 'datetime' && Boolean(date && time)) ||
                (step.id === 'client' && Boolean(clientName && clientPhone)) ||
                (step.id === 'review' && false);

              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setCurrentStep(step.id)}
                  className={`rounded-2xl border px-3 py-3 text-left transition ${
                    isActive
                      ? 'bg-white border-orange-500 ring-2 ring-orange-100'
                      : isDone
                        ? 'bg-emerald-50 border-emerald-100'
                        : 'bg-white border-neutral-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border ${
                      isActive
                        ? 'border-orange-500 text-orange-600'
                        : isDone
                          ? 'border-emerald-200 bg-emerald-100 text-emerald-700'
                          : 'border-neutral-200 bg-neutral-100 text-neutral-500'
                    }`}>
                      {isDone && !isActive ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        step.number
                      )}
                    </span>

                    <span>
                      <strong className="text-xs font-black text-neutral-900 block">
                        {step.title}
                      </strong>

                      <span className="text-[10px] text-slate-500 font-semibold">
                        {step.subtitle}
                      </span>
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <form onSubmit={onSubmit} className="flex-1 overflow-y-auto bg-slate-50/60">
          <div className="p-5 sm:p-7">
            {currentStep === 'service' && (
              <div className="max-w-3xl mx-auto space-y-5">
                <div>
                  <h4 className="text-2xl font-black text-neutral-950">
                    Escolha o serviço
                  </h4>

                  <p className="text-sm text-slate-500 mt-1">
                    Selecione o atendimento desejado para filtrar os profissionais disponíveis.
                  </p>
                </div>

                <div className="relative">
                  <Search className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />

                  <input
                    type="search"
                    value={serviceSearch}
                    onChange={(event) => setServiceSearch(event.target.value)}
                    placeholder="Buscar serviço..."
                    className="w-full rounded-2xl border border-neutral-200 bg-white py-3 pl-11 pr-4 text-sm font-semibold text-neutral-800 outline-none focus:border-orange-500"
                  />
                </div>

                <div className="space-y-3">
                  {activeServices.map((service) => {
                    const isSelected = service.id === serviceId;

                    return (
                      <button
                        key={service.id}
                        type="button"
                        onClick={() => handleSelectService(service)}
                        className={`w-full rounded-2xl border p-4 bg-white text-left transition hover:shadow-md ${
                          isSelected
                            ? 'border-orange-500 ring-2 ring-orange-100'
                            : 'border-neutral-200 hover:border-orange-300'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="min-w-0">
                            <span className="text-[10px] font-black uppercase tracking-widest text-orange-600 bg-orange-50 px-2 py-1 rounded-lg">
                              {service.category}
                            </span>

                            <h5 className="text-sm sm:text-base font-black text-neutral-950 mt-2">
                              {service.name}
                            </h5>

                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                              {service.description || 'Serviço disponível para agendamento.'}
                            </p>
                          </div>

                          <div className="text-right shrink-0">
                            <strong className="text-sm font-black text-neutral-950 block">
                              {formatCurrency(service.price)}
                            </strong>

                            <span className="text-xs font-bold text-slate-500">
                              {formatDuration(service.duration)}
                            </span>

                            <ChevronRight className="w-5 h-5 text-orange-600 ml-auto mt-2" />
                          </div>
                        </div>
                      </button>
                    );
                  })}

                  {activeServices.length === 0 && (
                    <div className="bg-white border border-dashed rounded-2xl p-10 text-center">
                      <p className="text-sm font-bold text-neutral-700">
                        Nenhum serviço encontrado.
                      </p>

                      <p className="text-xs text-slate-400 mt-1">
                        Tente buscar por outro nome.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {currentStep === 'professional' && (
              <div className="max-w-3xl mx-auto space-y-5">
                <div>
                  <h4 className="text-2xl font-black text-neutral-950">
                    Escolha o profissional
                  </h4>

                  <p className="text-sm text-slate-500 mt-1">
                    Mostramos apenas profissionais que realizam o serviço selecionado.
                  </p>
                </div>

                {selectedService && (
                  <div className="rounded-2xl border bg-orange-50/60 border-orange-100 p-4">
                    <span className="text-[10px] font-black uppercase tracking-widest text-orange-700">
                      Serviço escolhido
                    </span>

                    <p className="text-sm font-black text-neutral-950 mt-1">
                      {selectedService.name} • {formatCurrency(selectedService.price)} • {formatDuration(selectedService.duration)}
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSelectAnyProfessional}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    anyProfessional
                      ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-100'
                      : 'bg-white border-neutral-200 hover:border-emerald-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                        <Users className="w-6 h-6" />
                      </span>

                      <span>
                        <strong className="text-sm font-black text-neutral-950 block">
                          Qualquer profissional disponível
                        </strong>

                        <span className="text-xs text-slate-500 font-semibold">
                          O sistema mostra os melhores encaixes entre todos que fazem este serviço.
                        </span>
                      </span>
                    </div>

                    <ChevronRight className="w-5 h-5 text-emerald-600 shrink-0" />
                  </div>
                </button>

                <div className="space-y-3">
                  {professionalsForService.map((professional) => {
                    const availabilityCount = dateOptions.reduce((total, dateOption) => {
                      if (!selectedService) {
                        return total;
                      }

                      return total + generateTimeOptions({
                        service: selectedService,
                        selectedProfessional: professional,
                        professionalsForService: [professional],
                        date: dateOption,
                        appointments,
                        services,
                        anyProfessional: false
                      }).length;
                    }, 0);

                    const availability = getAvailabilityLabel(availabilityCount);
                    const isSelected = professional.id === professionalId && !anyProfessional;
                    const isSoldOut = availabilityCount === 0;

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
                        className={`w-full rounded-2xl border p-4 text-left transition ${
                          isSelected
                            ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-100'
                            : isSoldOut
                              ? 'bg-neutral-50 border-neutral-200 opacity-70 cursor-not-allowed'
                              : 'bg-white border-neutral-200 hover:border-emerald-300 hover:shadow-md'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <img
                              src={professional.avatar}
                              alt={professional.name}
                              className="w-14 h-14 rounded-2xl border object-cover shrink-0"
                              referrerPolicy="no-referrer"
                            />

                            <span className="min-w-0">
                              <strong className="text-sm font-black text-neutral-950 block truncate">
                                {professional.name}
                              </strong>

                              <span className="text-xs text-slate-500 block font-semibold">
                                {professional.role}
                              </span>

                              <span className={`inline-block mt-2 px-2 py-1 rounded-lg border text-[10px] font-black ${availability.className}`}>
                                {availability.label}
                              </span>
                            </span>
                          </div>

                          <span className="text-right shrink-0">
                            <strong className="text-sm font-black text-neutral-950 block">
                              {availabilityCount}
                            </strong>

                            <span className="text-[10px] font-bold text-slate-400 uppercase">
                              horários
                            </span>
                          </span>
                        </div>
                      </button>
                    );
                  })}

                  {professionalsForService.length === 0 && (
                    <div className="bg-white border border-dashed rounded-2xl p-10 text-center">
                      <p className="text-sm font-bold text-neutral-700">
                        Nenhum profissional realiza este serviço.
                      </p>

                      <p className="text-xs text-slate-400 mt-1">
                        Revise o cadastro do serviço ou habilite profissionais para este atendimento.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {currentStep === 'datetime' && (
              <div className="max-w-4xl mx-auto space-y-5">
                <div>
                  <h4 className="text-2xl font-black text-neutral-950">
                    Escolha data e horário
                  </h4>

                  <p className="text-sm text-slate-500 mt-1">
                    Horários ocupados são ocultados automaticamente.
                  </p>
                </div>

                <div className="bg-white border rounded-3xl p-4 space-y-4">
                  <div>
                    <span className="text-xs font-black text-neutral-500 uppercase tracking-widest font-mono">
                      Data do atendimento
                    </span>

                    <div className="flex gap-2 overflow-x-auto mt-3 pb-1">
                      {dateOptions.map((dateOption) => {
                        const slotsForDate = selectedService
                          ? generateTimeOptions({
                              service: selectedService,
                              selectedProfessional,
                              professionalsForService,
                              date: dateOption,
                              appointments,
                              services,
                              anyProfessional
                            }).length
                          : 0;

                        const isSelected = selectedDate === dateOption;

                        return (
                          <button
                            key={dateOption}
                            type="button"
                            onClick={() => handleSelectDate(dateOption)}
                            className={`min-w-[92px] rounded-2xl border px-3 py-3 text-center transition ${
                              isSelected
                                ? 'bg-orange-50 border-orange-500 ring-2 ring-orange-100'
                                : slotsForDate === 0
                                  ? 'bg-neutral-50 border-neutral-200 opacity-70'
                                  : 'bg-white border-neutral-200 hover:border-orange-300'
                            }`}
                          >
                            <span className="text-[10px] font-black uppercase text-slate-400 block">
                              {dateOption === getTodayStr() ? 'Hoje' : getWeekDayShortLabel(dateOption)}
                            </span>

                            <strong className="text-sm font-black text-neutral-950 block mt-1">
                              {formatDateBr(dateOption).slice(0, 5)}
                            </strong>

                            <span className={`text-[10px] font-black rounded-lg px-2 py-1 inline-block mt-2 ${
                              slotsForDate === 0
                                ? 'bg-red-50 text-red-600'
                                : 'bg-emerald-50 text-emerald-700'
                            }`}>
                              {slotsForDate === 0 ? 'Esgotado' : `${slotsForDate} disp.`}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-black text-neutral-500 uppercase tracking-widest font-mono">
                        Horários disponíveis
                      </span>

                      <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-2 py-1">
                        {timeOptions.length} horários
                      </span>
                    </div>

                    {timeOptions.length === 0 ? (
                      <div className="bg-neutral-50 border border-dashed rounded-2xl p-8 text-center mt-3">
                        <p className="text-sm font-black text-neutral-800">
                          Horário esgotado para esta seleção.
                        </p>

                        <p className="text-xs text-slate-400 mt-1">
                          Tente outro profissional ou escolha outra data.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mt-3">
                        {timeOptions.map((slot) => {
                          const isSelected =
                            time === slot.time &&
                            professionalId === slot.professional.id;

                          return (
                            <button
                              key={`${slot.professional.id}-${slot.time}`}
                              type="button"
                              onClick={() => handleSelectSlot(slot)}
                              className={`rounded-xl border px-3 py-3 text-left transition ${
                                isSelected
                                  ? 'bg-orange-50 border-orange-500 ring-2 ring-orange-100'
                                  : 'bg-white border-neutral-200 hover:border-orange-300'
                              }`}
                            >
                              <strong className="text-sm font-black text-neutral-950 block">
                                {slot.time}
                              </strong>

                              <span className="text-[10px] text-slate-500 font-bold block mt-1 truncate">
                                {anyProfessional ? slot.professional.name : 'Disponível'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {selectedService && selectedSlotProfessional && date && time && (
                  <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4">
                    <span className="text-[10px] font-black uppercase tracking-widest text-orange-700">
                      Selecionado
                    </span>

                    <p className="text-sm font-bold text-neutral-900 mt-1">
                      {selectedService.name} com {selectedSlotProfessional.name} em {formatDateBr(date)} às {time}
                    </p>
                  </div>
                )}
              </div>
            )}

            {currentStep === 'client' && (
              <div className="max-w-2xl mx-auto space-y-5">
                <div>
                  <h4 className="text-2xl font-black text-neutral-950">
                    Dados do cliente
                  </h4>

                  <p className="text-sm text-slate-500 mt-1">
                    Informe apenas o essencial para concluir o agendamento.
                  </p>
                </div>

                <div className="bg-white border rounded-3xl p-5 space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider block">
                      Nome do cliente
                    </label>

                    <input
                      id="input-manual-appt-client"
                      type="text"
                      placeholder="Ex: Carlos Albuquerque"
                      value={clientName}
                      onChange={(event) => onChangeClientName(event.target.value)}
                      className="w-full bg-neutral-50 border rounded-xl py-3 px-3.5 text-sm outline-none focus:border-orange-500"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider block">
                      WhatsApp
                    </label>

                    <input
                      id="input-manual-appt-phone"
                      type="tel"
                      placeholder="(99) 99999-9999"
                      value={clientPhone}
                      onChange={(event) => handlePhoneChange(event.target.value)}
                      className="w-full bg-neutral-50 border rounded-xl py-3 px-3.5 text-sm outline-none focus:border-orange-500"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider block">
                      Observação opcional
                    </label>

                    <textarea
                      value={notes}
                      onChange={(event) => onChangeNotes(event.target.value)}
                      placeholder="Ex: cliente prefere horário rápido, não usar navalha, observação interna..."
                      rows={3}
                      className="w-full bg-neutral-50 border rounded-xl py-3 px-3.5 text-sm outline-none focus:border-orange-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider block">
                      Forma de pagamento
                    </label>

                    <select
                      value={paymentType}
                      onChange={(event) => onChangePaymentType(event.target.value as PaymentType)}
                      className="w-full bg-neutral-50 border rounded-xl py-3 px-3.5 text-sm outline-none focus:border-orange-500"
                    >
                      <option value="pix">PIX</option>
                      <option value="dinheiro">Dinheiro</option>
                      <option value="credito">Cartão de Crédito</option>
                      <option value="debito">Cartão de Débito</option>
                      <option value="pendente">A pagar</option>
                      <option value="cortesia">Cortesia</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 'review' && (
              <div className="max-w-2xl mx-auto space-y-5">
                <div>
                  <h4 className="text-2xl font-black text-neutral-950">
                    Resumo do agendamento
                  </h4>

                  <p className="text-sm text-slate-500 mt-1">
                    Confira os dados antes de finalizar.
                  </p>
                </div>

                <div className="bg-white border rounded-3xl p-5 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-neutral-50 border rounded-2xl p-4">
                      <span className="text-[10px] font-black text-slate-400 uppercase">
                        Cliente
                      </span>

                      <p className="text-sm font-black text-neutral-950 mt-1">
                        {clientName || 'Não informado'}
                      </p>

                      <p className="text-xs font-bold text-slate-500 mt-1">
                        {clientPhone || 'WhatsApp não informado'}
                      </p>
                    </div>

                    <div className="bg-neutral-50 border rounded-2xl p-4">
                      <span className="text-[10px] font-black text-slate-400 uppercase">
                        Data e horário
                      </span>

                      <p className="text-sm font-black text-neutral-950 mt-1">
                        {date ? formatDateBr(date) : '--/--/----'} às {time || '--:--'}
                      </p>

                      <p className="text-xs font-bold text-slate-500 mt-1">
                        {selectedSlotProfessional?.name || 'Profissional não selecionado'}
                      </p>
                    </div>
                  </div>

                  <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4">
                    <span className="text-[10px] font-black text-orange-700 uppercase">
                      Serviço
                    </span>

                    <p className="text-sm font-black text-neutral-950 mt-1">
                      {selectedService?.name || 'Serviço não selecionado'}
                    </p>

                    <p className="text-xs font-bold text-slate-500 mt-1">
                      {selectedService
                        ? `${formatCurrency(selectedService.price)} • ${formatDuration(selectedService.duration)}`
                        : 'Valor e duração indisponíveis'}
                    </p>
                  </div>

                  <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
                    <div className="flex items-start gap-3">
                      <MessageCircle className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />

                      <p className="text-xs text-emerald-800 leading-relaxed font-semibold">
                        Ao finalizar, o agendamento entra na Agenda Geral e na agenda do profissional. Na próxima etapa do projeto, vamos conectar o envio automático do WhatsApp com link exclusivo para confirmar, cancelar ou remarcar.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="sticky bottom-0 bg-white border-t px-5 sm:px-7 py-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                if (currentStep === 'service') {
                  onClose();
                  return;
                }

                if (currentStep === 'professional') {
                  setCurrentStep('service');
                  return;
                }

                if (currentStep === 'datetime') {
                  setCurrentStep('professional');
                  return;
                }

                if (currentStep === 'client') {
                  setCurrentStep('datetime');
                  return;
                }

                setCurrentStep('client');
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-xs font-black text-neutral-700 hover:bg-neutral-50 transition"
            >
              <ChevronLeft className="w-4 h-4" />
              {currentStep === 'service' ? 'Cancelar' : 'Voltar'}
            </button>

            {currentStep !== 'review' ? (
              <button
                type="button"
                onClick={() => {
                  if (currentStep === 'service' && canGoToProfessional) {
                    setCurrentStep('professional');
                    return;
                  }

                  if (currentStep === 'professional' && canGoToDateTime) {
                    setCurrentStep('datetime');
                    return;
                  }

                  if (currentStep === 'datetime' && canGoToClient) {
                    setCurrentStep('client');
                    return;
                  }

                  if (currentStep === 'client' && clientName && clientPhone) {
                    setCurrentStep('review');
                  }
                }}
                disabled={
                  (currentStep === 'service' && !canGoToProfessional) ||
                  (currentStep === 'professional' && !canGoToDateTime) ||
                  (currentStep === 'datetime' && !canGoToClient) ||
                  (currentStep === 'client' && (!clientName || normalizePhone(clientPhone).length < 10))
                }
                className="inline-flex items-center gap-1.5 rounded-xl bg-orange-600 px-5 py-3 text-xs font-black text-white hover:bg-orange-700 disabled:bg-neutral-200 disabled:text-neutral-400 disabled:cursor-not-allowed transition"
              >
                Avançar
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                id="btn-submit-manual-appt"
                type="submit"
                disabled={!canSubmit}
                className="inline-flex items-center gap-1.5 rounded-xl bg-orange-600 px-5 py-3 text-xs font-black text-white hover:bg-orange-700 disabled:bg-neutral-200 disabled:text-neutral-400 disabled:cursor-not-allowed transition"
              >
                Finalizar agendamento
                <CheckCircle2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
