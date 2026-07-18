/**
 * Funções auxiliares do módulo Painel do Dono - AgendaZap.
 *
 * Este arquivo remove cálculos, filtros e formatações do OwnerDashboard.tsx,
 * deixando o componente principal mais limpo e mais fácil de manter.
 */

import {
  Appointment,
  AppointmentStatus,
  Client,
  Professional,
  Service
} from '../../types';

import {
  CalendarView,
  OwnerFinancialSummary
} from './owner.types';

export const DEMO_BASE_DATE_STR = '2026-06-09';

export function getTodayDateStr(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function getDayDiff(startDateStr: string, endDateStr: string): number {
  const startTime = new Date(`${startDateStr}T00:00:00`).getTime();
  const endTime = new Date(`${endDateStr}T00:00:00`).getTime();

  return Math.floor((endTime - startTime) / (1000 * 60 * 60 * 24));
}

export function getAppointmentDate(appointment: Appointment): string {
  return appointment.dateTime.split('T')[0] || '';
}

export function normalizePhone(value: string): string {
  return value.replace(/\D/g, '');
}

export function getClientPhoneKey(client: Client): string {
  const clientRecord = client as unknown as Record<string, unknown>;

  return String(clientRecord.phoneNormalized || normalizePhone(client.phone));
}

export function getClientInternalCode(params: {
  clients: Client[];
  fallbackIndex?: number;
}): string {
  const { clients, fallbackIndex = 0 } = params;

  const highestCodeNumber = clients.reduce((highest, client) => {
    const clientRecord = client as unknown as Record<string, unknown>;
    const internalCode = String(clientRecord.internalCode || '');
    const codeNumber = Number(internalCode.replace(/\D/g, ''));

    if (Number.isFinite(codeNumber) && codeNumber > highest) {
      return codeNumber;
    }

    return highest;
  }, 0);

  const nextCodeNumber = highestCodeNumber > 0
    ? highestCodeNumber + 1
    : clients.length + fallbackIndex + 1;

  return `CLI-${String(nextCodeNumber).padStart(6, '0')}`;
}


export function getAppointmentTime(appointment: Appointment): string {
  return appointment.dateTime.split('T')[1] || '';
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

export function filterAppointments(params: {
  appointments: Appointment[];
  baseDateStr: string;
  professionalFilter: string;
  statusFilter: string;
  calendarView: CalendarView;
}): Appointment[] {
  const {
    appointments,
    baseDateStr,
    professionalFilter,
    statusFilter,
    calendarView
  } = params;

  return appointments
    .filter((appointment) => {
      const appointmentDateStr = getAppointmentDate(appointment);

      if (
        professionalFilter !== 'all' &&
        appointment.professionalId !== professionalFilter
      ) {
        return false;
      }

      if (
        statusFilter !== 'all' &&
        appointment.status !== statusFilter
      ) {
        return false;
      }

      if (calendarView === 'today') {
        return appointmentDateStr === baseDateStr;
      }

      if (calendarView === 'week') {
        const diff = getDayDiff(baseDateStr, appointmentDateStr);
        return diff >= 0 && diff <= 7;
      }

      return true;
    })
    .sort((a, b) => a.dateTime.localeCompare(b.dateTime));
}

export function getCompletedAppointments(
  appointments: Appointment[]
): Appointment[] {
  return appointments.filter((appointment) => appointment.status === 'completed');
}

export function getTodayAppointments(params: {
  appointments: Appointment[];
  baseDateStr: string;
}): Appointment[] {
  const { appointments, baseDateStr } = params;

  return appointments.filter((appointment) => {
    return getAppointmentDate(appointment) === baseDateStr;
  });
}

export function calculateOwnerFinancialSummary(params: {
  appointments: Appointment[];
  professionals: Professional[];
  baseDateStr: string;
}): OwnerFinancialSummary {
  const { appointments, professionals, baseDateStr } = params;

  const completedAppointments = getCompletedAppointments(appointments);

  const todayAppointments = getTodayAppointments({
    appointments,
    baseDateStr
  });

  const completedToday = todayAppointments.filter((appointment) => {
    return appointment.status === 'completed';
  });

  const totalReceivedToday = completedToday.reduce((sum, appointment) => {
    return sum + appointment.price;
  }, 0);

  const totalReceivedMonth = completedAppointments.reduce((sum, appointment) => {
    return sum + appointment.price;
  }, 0);

  const totalCommissionsMonth = completedAppointments.reduce((sum, appointment) => {
    return sum + appointment.commissionValue;
  }, 0);

  const activeProfessionalsCount = professionals.filter((professional) => {
    return professional.active;
  }).length;

  const clientAbsencesCount = appointments.filter((appointment) => {
    return appointment.status === 'absent';
  }).length;

  return {
    completedAppointments,
    todayAppointments,
    completedToday,
    totalReceivedToday,
    totalReceivedMonth,
    totalCommissionsMonth,
    activeProfessionalsCount,
    clientAbsencesCount
  };
}

export function calculateCommissionValue(params: {
  service: Service;
  professional: Professional;
}): number {
  const { service, professional } = params;

  if (professional.remType === 'commission_percent') {
    const rate =
      service.specificCommission !== null
        ? service.specificCommission
        : professional.remValue;

    return (service.price * rate) / 100;
  }

  if (professional.remType === 'commission_fixed') {
    return professional.remValue;
  }

  if (professional.remType === 'mixed') {
    return (service.price * professional.remValue) / 100;
  }

  return 0;
}

export function calculateProfessionalCommission(params: {
  professional: Professional;
  services: Service[];
  completedAppointments: Appointment[];
}): number {
  const { professional, services, completedAppointments } = params;

  const professionalAppointments = completedAppointments.filter((appointment) => {
    return appointment.professionalId === professional.id;
  });

  if (professional.remType === 'commission_percent') {
    return professionalAppointments.reduce((sum, appointment) => {
      const service = services.find((item) => item.id === appointment.serviceId);
      const rate =
        service?.specificCommission !== null && service?.specificCommission !== undefined
          ? service.specificCommission
          : professional.remValue;

      return sum + (appointment.price * rate) / 100;
    }, 0);
  }

  if (professional.remType === 'commission_fixed') {
    return professionalAppointments.length * professional.remValue;
  }

  if (professional.remType === 'mixed') {
    return professionalAppointments.reduce((sum, appointment) => {
      return sum + (appointment.price * professional.remValue) / 100;
    }, 0);
  }

  return 0;
}

export function calculateProfessionalGrossRevenue(params: {
  professionalId: string;
  completedAppointments: Appointment[];
}): number {
  const { professionalId, completedAppointments } = params;

  return completedAppointments
    .filter((appointment) => appointment.professionalId === professionalId)
    .reduce((sum, appointment) => sum + appointment.price, 0);
}

export function countProfessionalCompletedAppointments(params: {
  professionalId: string;
  completedAppointments: Appointment[];
}): number {
  const { professionalId, completedAppointments } = params;

  return completedAppointments.filter((appointment) => {
    return appointment.professionalId === professionalId;
  }).length;
}

export function filterClients(params: {
  clients: Client[];
  search: string;
}): Client[] {
  const { clients, search } = params;
  const searchLower = search.toLowerCase().trim();

  if (!searchLower) {
    return clients;
  }

  const searchDigits = normalizePhone(search);

  return clients.filter((client) => {
    const phoneKey = getClientPhoneKey(client);

    return (
      client.name.toLowerCase().includes(searchLower) ||
      phoneKey.includes(searchDigits)
    );
  });
}

export function upsertClientFromAppointment(params: {
  clients: Client[];
  clientName: string;
  clientPhone: string;
  preferredProfessionalId: string | null;
  birthDate?: string;
  notes?: string;
}): Client[] {
  const {
    clients,
    clientName,
    clientPhone,
    preferredProfessionalId,
    birthDate,
    notes
  } = params;

  const phoneNormalized = normalizePhone(clientPhone);

  if (!phoneNormalized) {
    return clients;
  }

  const existingClient = clients.find((client) => {
    return getClientPhoneKey(client) === phoneNormalized;
  });

  if (existingClient) {
    return clients.map((client) => {
      if (client.id !== existingClient.id) {
        return client;
      }

      const previousPhone = normalizePhone(client.phone);
      const currentHistory = ((client as unknown as Record<string, unknown>).phoneHistory as string[] | undefined) || [];
      const nextPhoneHistory =
        previousPhone && previousPhone !== phoneNormalized && !currentHistory.includes(previousPhone)
          ? [...currentHistory, previousPhone]
          : currentHistory;

      return {
        ...client,
        name: clientName || client.name,
        phone: clientPhone,
        phoneNormalized,
        phoneHistory: nextPhoneHistory,
        birthDate: birthDate || client.birthDate,
        preferredProfessionalId: preferredProfessionalId || client.preferredProfessionalId,
        notes: notes || client.notes
      };
    });
  }

  const newClient: Client = {
    id: `cli-new-${Date.now()}`,
    internalCode: getClientInternalCode({
      clients
    }),
    name: clientName,
    phone: clientPhone,
    phoneNormalized,
    phoneHistory: [],
    birthDate,
    preferredProfessionalId,
    notes: notes || 'Cliente adicionado via painel do dono.',
    absences: 0,
    cancellations: 0,
    totalSpent: 0
  };

  return [...clients, newClient];
}

export function updateClientsAfterAppointmentStatusChange(params: {
  clients: Client[];
  appointments: Appointment[];
  appointmentId: string;
  destinationStatus: AppointmentStatus;
}): Client[] {
  const {
    clients,
    appointments,
    appointmentId,
    destinationStatus
  } = params;

  const appointment = appointments.find((item) => item.id === appointmentId);

  if (!appointment) {
    return clients;
  }

  if (destinationStatus === 'completed') {
    return clients.map((client) => {
      if (getClientPhoneKey(client) !== normalizePhone(appointment.clientPhone)) {
        return client;
      }

      return {
        ...client,
        totalSpent: client.totalSpent + appointment.price
      };
    });
  }

  if (destinationStatus === 'absent') {
    return clients.map((client) => {
      if (getClientPhoneKey(client) !== normalizePhone(appointment.clientPhone)) {
        return client;
      }

      return {
        ...client,
        absences: client.absences + 1
      };
    });
  }

  return clients;
}

export function getWorkDaysFormatted(workDays: number[]): string {
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return workDays
    .map((dayIndex) => weekDays[dayIndex])
    .filter(Boolean)
    .join(', ');
}

export function getRemunerationLabel(professional: Professional): string {
  if (professional.remType === 'commission_percent') {
    return `${professional.remValue}% Comis.`;
  }

  if (professional.remType === 'commission_fixed') {
    return `R$ ${professional.remValue.toFixed(2)} Fix`;
  }

  if (professional.remType === 'chair_rental') {
    return `Aluguel (${professional.chairRentalValue.toFixed(0)}/m)`;
  }

  if (professional.remType === 'mixed') {
    return `${professional.remValue}% + Aluguel`;
  }

  if (professional.remType === 'no_commission') {
    return 'Sem comissão';
  }

  return 'Não definido';
}

export function getStatusLabel(status: AppointmentStatus): string {
  const labels: Record<string, string> = {
    scheduled: 'Agendado',
    confirmed: 'Confirmado',
    attending: 'Em atendimento',
    completed: 'Finalizado',
    cancelled: 'Cancelado',
    absent: 'Cliente faltou',
    rescheduled: 'Remarcado'
  };

  return labels[status] || status;
}

export function getStatusBadgeClassName(status: AppointmentStatus): string {
  if (status === 'scheduled') {
    return 'bg-zinc-100 text-zinc-650 border border-zinc-200';
  }

  if (status === 'confirmed') {
    return 'bg-sky-50 text-sky-700 border border-sky-150';
  }

  if (status === 'attending') {
    return 'bg-orange-50 text-orange-700 border border-orange-200 font-extrabold';
  }

  if (status === 'completed') {
    return 'bg-emerald-50 text-emerald-800 border border-emerald-200';
  }

  if (status === 'absent') {
    return 'bg-red-50 text-red-800 border border-red-200';
  }

  if (status === 'rescheduled') {
    return 'bg-blue-50 text-blue-700 border border-blue-200';
  }

  return 'bg-neutral-150 text-neutral-600 border border-neutral-200';
}

export function buildWhatsAppReminderUrl(params: {
  phone: string;
  template: string;
  clientName: string;
  formattedDate: string;
  appointmentTime: string;
  professionalName?: string;
  serviceName?: string;
  address: string;
}): string {
  const {
    phone,
    template,
    clientName,
    formattedDate,
    appointmentTime,
    professionalName,
    serviceName,
    address
  } = params;

  const message = template
    .replace('{cliente}', clientName)
    .replace('{data}', formattedDate)
    .replace('{hora}', appointmentTime)
    .replace('{profissional}', professionalName?.split(' ')[0] || '')
    .replace('{servico}', serviceName || '')
    .replace('{endereco}', address);

  return `https://api.whatsapp.com/send?phone=55${phone}&text=${encodeURIComponent(message)}`;
}

export function getPaymentLabel(paymentType: string): string {
  const labels: Record<string, string> = {
    pix: 'PIX',
    dinheiro: 'Dinheiro',
    credito: 'Cartão de Crédito',
    debito: 'Cartão de Débito',
    pendente: 'Pendente',
    cortesia: 'Cortesia'
  };

  return labels[paymentType] || paymentType;
}