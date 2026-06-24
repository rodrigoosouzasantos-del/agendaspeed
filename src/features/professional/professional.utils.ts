import {
  Appointment,
  AppointmentStatus,
  Professional,
  Service
} from '../../types';

import {
  ProfessionalDayFilter,
  ProfessionalFinancialSummary,
  ProfessionalManualAppointmentFormState,
  ProfessionalStatusFilter
} from './professional.types';

export const PROFESSIONAL_BASE_DATE_STR = '2026-06-09';

export function getProfessionalAppointmentDate(appointment: Appointment): string {
  return appointment.dateTime.split('T')[0] || '';
}

export function getProfessionalAppointmentTime(appointment: Appointment): string {
  return appointment.dateTime.split('T')[1] || '';
}

export function getDayDiff(baseDateStr: string, comparedDateStr: string): number {
  const baseTime = new Date(`${baseDateStr}T00:00:00`).getTime();
  const comparedTime = new Date(`${comparedDateStr}T00:00:00`).getTime();

  return Math.floor((comparedTime - baseTime) / (1000 * 60 * 60 * 24));
}

export function formatDateBr(dateStr: string): string {
  if (!dateStr || !dateStr.includes('-')) {
    return dateStr;
  }

  return dateStr.split('-').reverse().join('/');
}

export function formatCurrency(value: number): string {
  return `R$ ${value.toFixed(2)}`;
}

export function getProfessionalAppointments(params: {
  appointments: Appointment[];
  professionalId: string;
}): Appointment[] {
  const { appointments, professionalId } = params;

  return appointments.filter((appointment) => {
    return appointment.professionalId === professionalId;
  });
}

export function filterProfessionalAppointments(params: {
  appointments: Appointment[];
  dayFilter: ProfessionalDayFilter;
  statusFilter: ProfessionalStatusFilter;
  baseDateStr?: string;
}): Appointment[] {
  const {
    appointments,
    dayFilter,
    statusFilter,
    baseDateStr = PROFESSIONAL_BASE_DATE_STR
  } = params;

  return appointments
    .filter((appointment) => {
      const appointmentDateStr = getProfessionalAppointmentDate(appointment);

      if (statusFilter !== 'all' && appointment.status !== statusFilter) {
        return false;
      }

      if (dayFilter === 'today') {
        return appointmentDateStr === baseDateStr;
      }

      if (dayFilter === 'week') {
        const diff = getDayDiff(baseDateStr, appointmentDateStr);

        return diff >= 0 && diff <= 7;
      }

      return true;
    })
    .sort((firstAppointment, secondAppointment) => {
      return firstAppointment.dateTime.localeCompare(secondAppointment.dateTime);
    });
}

export function getCompletedProfessionalAppointments(
  appointments: Appointment[]
): Appointment[] {
  return appointments.filter((appointment) => {
    return appointment.status === 'completed';
  });
}

export function getActiveProfessionalAppointments(
  appointments: Appointment[]
): Appointment[] {
  return appointments.filter((appointment) => {
    return (
      appointment.status === 'scheduled' ||
      appointment.status === 'confirmed'
    );
  });
}

export function calculateProfessionalCommission(params: {
  appointment: Appointment;
  professional: Professional;
  services: Service[];
}): number {
  const {
    appointment,
    professional,
    services
  } = params;

  const service = services.find((item) => {
    return item.id === appointment.serviceId;
  });

  if (professional.remType === 'commission_percent') {
    const rate =
      service?.specificCommission !== null &&
      service?.specificCommission !== undefined
        ? service.specificCommission
        : professional.remValue;

    return (appointment.price * rate) / 100;
  }

  if (professional.remType === 'commission_fixed') {
    return professional.remValue;
  }

  if (professional.remType === 'mixed') {
    return (appointment.price * professional.remValue) / 100;
  }

  return 0;
}

export function calculateProfessionalFinancialSummary(params: {
  appointments: Appointment[];
  professional: Professional;
  services: Service[];
}): ProfessionalFinancialSummary {
  const {
    appointments,
    professional,
    services
  } = params;

  const completedAppointments = getCompletedProfessionalAppointments(appointments);
  const activeAppointments = getActiveProfessionalAppointments(appointments);

  const totalProduced = completedAppointments.reduce((sum, appointment) => {
    return sum + appointment.price;
  }, 0);

  const commissionExpected = completedAppointments.reduce((sum, appointment) => {
    return sum + calculateProfessionalCommission({
      appointment,
      professional,
      services
    });
  }, 0);

  const isChairRental = false;

  return {
    completedAppointments,
    activeAppointments,
    totalProduced,
    commissionExpected,
    chairRentalFee: 0,
    isChairRental
  };
}

export function getProfessionalServices(params: {
  services: Service[];
  professional: Professional;
}): Service[] {
  const { services, professional } = params;

  return services.filter((service) => {
    return professional.services.includes(service.id);
  });
}

export function getStatusLabel(status: AppointmentStatus): string {
  const statusLabels: Record<AppointmentStatus, string> = {
    scheduled: 'Agendado',
    confirmed: 'Confirmado',
    attending: 'Atendendo',
    completed: 'Finalizado',
    cancelled: 'Cancelado',
    absent: 'Falta (Não Compareceu)',
    rescheduled: 'Remarcado'
  };

  return statusLabels[status] || status;
}

export function getStatusBadgeClassName(status: AppointmentStatus): string {
  if (status === 'scheduled') {
    return 'bg-zinc-50 border-zinc-200 text-zinc-600';
  }

  if (status === 'confirmed') {
    return 'bg-sky-50 border-sky-200 text-sky-700';
  }

  if (status === 'attending') {
    return 'bg-orange-50 border-orange-200 text-orange-700 font-extrabold';
  }

  if (status === 'completed') {
    return 'bg-emerald-50 border-emerald-250 text-emerald-800';
  }

  if (status === 'absent') {
    return 'bg-red-50 border-red-200 text-red-800';
  }

  if (status === 'rescheduled') {
    return 'bg-blue-50 border-blue-200 text-blue-700';
  }

  return 'bg-neutral-50 text-neutral-500 border';
}

export function getRemunerationDescription(professional: Professional): string {
  if (professional.remType === 'commission_fixed') {
    return `Você recebe valor fixo de ${formatCurrency(professional.remValue)} por atendimento finalizado.`;
  }

  if (professional.remType === 'commission_percent') {
    return `Você recebe ${professional.remValue}% de comissão sobre seus atendimentos finalizados.`;
  }

  return 'Remuneração não configurada.';
}

export function buildProfessionalWhatsAppUrl(params: {
  clientPhone: string;
  clientName: string;
  professionalName: string;
  configName: string;
  formattedDate: string;
  appointmentTime: string;
}): string {
  const {
    clientPhone,
    clientName,
    professionalName,
    configName,
    formattedDate,
    appointmentTime
  } = params;

  const firstName = professionalName.split(' ')[0];

  const message = `Olá ${clientName}! Aqui é o ${firstName} do ${configName}. Gostaria de confirmar seu horário no dia ${formattedDate} às ${appointmentTime}.`;

  return `https://api.whatsapp.com/send?phone=55${clientPhone}&text=${encodeURIComponent(message)}`;
}

export function buildManualAppointment(params: {
  formState: ProfessionalManualAppointmentFormState;
  selectedService: Service;
  professional: Professional;
  professionalId: string;
  services: Service[];
}): Appointment {
  const {
    formState,
    selectedService,
    professional,
    professionalId,
    services
  } = params;

  const commissionValue = calculateProfessionalCommission({
    appointment: {
      id: 'commission-preview',
      dateTime: `${formState.date}T${formState.time}`,
      clientName: formState.clientName,
      clientPhone: formState.clientPhone,
      serviceId: selectedService.id,
      professionalId,
      price: selectedService.price,
      status: 'confirmed',
      paymentType: 'pix',
      notes: formState.notes,
      commissionPaid: false,
      commissionValue: 0,
      depositPaid: false
    },
    professional,
    services
  });

  return {
    id: `manual-appt-${Date.now()}`,
    dateTime: `${formState.date}T${formState.time}`,
    clientName: formState.clientName,
    clientPhone: formState.clientPhone,
    serviceId: selectedService.id,
    professionalId,
    price: selectedService.price,
    status: 'confirmed',
    paymentType: 'pix',
    notes: formState.notes || 'Adicionado manualmente pelo colaborador.',
    commissionPaid: false,
    commissionValue,
    depositPaid: false
  };
}

export function getInitialManualAppointmentFormState(): ProfessionalManualAppointmentFormState {
  return {
    clientName: '',
    clientPhone: '',
    serviceId: '',
    date: '',
    time: '',
    notes: ''
  };
}

export function validateManualAppointmentForm(
  formState: ProfessionalManualAppointmentFormState
): boolean {
  return Boolean(
    formState.clientName.trim() &&
    formState.clientPhone.trim() &&
    formState.serviceId &&
    formState.date &&
    formState.time
  );
}