/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Professional, Service, Client, Appointment, EstablishmentConfig } from './types';

// Let's establish the reference point of current time: 2026-06-09
const BASE_DATE = '2026-06-09';

// Dates relative helper
export function getRelativeDateStr(offsetDays: number): string {
  const date = new Date(BASE_DATE);
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().split('T')[0];
}

export const INITIAL_CONFIG: EstablishmentConfig = {
  name: "Studio Beleza Viva & Barbearia",
  logo: "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?q=80&w=150&h=150&fit=crop",
  coverImage: "https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=1200&h=400&fit=crop",
  address: "Av. Paulista, 1000 - Bela Vista, São Paulo - SP",
  phone: "11999998888",
  instagram: "@studiobelezaviva",
  workDays: [1, 2, 3, 4, 5, 6], // Tue - Sat, or Mon to Sat (1-6 is Monday through Saturday)
  workHoursStart: "08:00",
  workHoursEnd: "20:00",
  minLeadTimeMinutes: 30,
  maxFutureDays: 45,
  cancellationPolicy: "Cancelamento gratuito em até 2 horas de antecedência. Em caso de falta sem aviso, será cobrado taxa de 50% no próximo agendamento.",
  autoApprove: true,
  requireDepositGlobal: false,
  defaultMsgTemplate: "Olá, {cliente}! Confirmamos seu agendamento para o dia {data} às {hora} com {profissional}. Serviço: {servico}. No endereço: {endereco}."
};

export const INITIAL_SERVICES: Service[] = [
  {
    id: "serv-1",
    name: "Corte de Cabelo Masculino & Lavagem",
    category: "Barba & Cabelo",
    duration: 40,
    price: 60.00,
    description: "Corte moderno ou clássico com tesoura e máquina, inclui lavagem com shampoo especial e finalização com pomada.",
    professionals: ["prof-1", "prof-3"],
    specificCommission: null,
    requireDeposit: false,
    depositValue: null,
    active: true
  },
  {
    id: "serv-2",
    name: "Corte de Cabelo Feminino (Visagismo)",
    category: "Cabelo",
    duration: 60,
    price: 150.00,
    description: "Corte feminino personalizado com análise de visagismo, lavagem e escova finalizadora.",
    professionals: ["prof-2"],
    specificCommission: 45, // 45% comissão específica para este serviço estrela
    requireDeposit: true,
    depositValue: 30, // 30 reais de sinal
    active: true
  },
  {
    id: "serv-3",
    name: "Barba Degradê com Toalha Quente",
    category: "Barba & Cabelo",
    duration: 30,
    price: 50.00,
    description: "Barba desenhada com navalha, utilizando toalha quente e óleos hidratantes essenciais para massagem da pele.",
    professionals: ["prof-1"],
    specificCommission: null,
    requireDeposit: false,
    depositValue: null,
    active: true
  },
  {
    id: "serv-4",
    name: "Manicure & Pedicure Completo",
    category: "Unhas",
    duration: 75,
    price: 80.00,
    description: "Tratamento completo das unhas das mãos e pés, incluindo cutilagem, esfoliação e esmaltação premium.",
    professionals: ["prof-2", "prof-4"],
    specificCommission: null,
    requireDeposit: false,
    depositValue: null,
    active: true
  },
  {
    id: "serv-5",
    name: "Design de Sobrancelha com Henna",
    category: "Estética",
    duration: 30,
    price: 45.00,
    description: "Mapeamento facial para definição do melhor desenho e pigmentação natural com henna de alta fixação.",
    professionals: ["prof-2", "prof-4", "prof-3"],
    specificCommission: null,
    requireDeposit: false,
    depositValue: null,
    active: true
  },
  {
    id: "serv-6",
    name: "Limpeza de Pele Profunda",
    category: "Estética",
    duration: 60,
    price: 120.00,
    description: "Remoção de cravos e impurezas, esfoliação, tonificação, máscara calmante e LED terapia facial.",
    professionals: ["prof-4"],
    specificCommission: 50, // 50% comissão fixa
    requireDeposit: true,
    depositValue: 40,
    active: true
  },
  {
    id: "serv-7",
    name: "Escova Hidratante Profissional",
    category: "Cabelo",
    duration: 45,
    price: 90.00,
    description: "Tratamento express de lavagem com máscara reconstrutora seguido de escova modeladora.",
    professionals: ["prof-2", "prof-3"],
    specificCommission: null,
    requireDeposit: false,
    depositValue: null,
    active: true
  }
];

export const INITIAL_PROFESSIONALS: Professional[] = [
  {
    id: "prof-1",
    name: "João Silva (Barbeiro)",
    phone: "11988887777",
    email: "joao@agendazap.com",
    role: "Barbeiro Master",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=120&h=120&fit=crop",
    active: true,
    displayOrder: 1,
    workDays: [1, 2, 3, 4, 5, 6],
    workHoursStart: "08:00",
    workHoursEnd: "18:00",
    lunchStart: "12:00",
    lunchEnd: "13:00",
    services: ["serv-1", "serv-3"],
    remType: "commission_percent",
    remValue: 40, // 40% de comissão
    chairRentalValue: 0,
    chairRentalStatus: "inactive",
    permissions: {
      viewOwnCalendar: true,
      createAppts: true,
      rescheduleAppts: true,
      cancelAppts: true,
      blockCalendar: true,
      openSpots: true,
      viewFinancial: true,
      viewCommission: true,
      viewChairRental: false,
      manageOwnCalendar: "yes" // João pode gerenciar tudo na própria agenda
    }
  },
  {
    id: "prof-2",
    name: "Maria Santos (Cabelereira)",
    phone: "11977776666",
    email: "maria@agendazap.com",
    role: "Hair Stylist Principal",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=120&h=120&fit=crop",
    active: true,
    displayOrder: 2,
    workDays: [2, 3, 4, 5, 6], // Terça a Sábado
    workHoursStart: "09:00",
    workHoursEnd: "19:00",
    lunchStart: "13:00",
    lunchEnd: "14:00",
    services: ["serv-2", "serv-4", "serv-5", "serv-7"],
    remType: "commission_percent",
    remValue: 40,
    chairRentalValue: 0,
    chairRentalStatus: "inactive",
    permissions: {
      viewOwnCalendar: true,
      createAppts: true,
      rescheduleAppts: true,
      cancelAppts: true,
      blockCalendar: true,
      openSpots: true,
      viewFinancial: true,
      viewCommission: false,
      viewChairRental: false,
      manageOwnCalendar: "yes"
    }
  },
  {
    id: "prof-3",
    name: "Camila Oliveira (Esteticista)",
    phone: "11966665555",
    email: "camila@agendazap.com",
    role: "Especialista em Cílios & Sobrancelhas",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=120&h=120&fit=crop",
    active: true,
    displayOrder: 3,
    workDays: [1, 2, 3, 4, 5], // Segunda a Sexta
    workHoursStart: "09:00",
    workHoursEnd: "18:00",
    lunchStart: "12:00",
    lunchEnd: "13:00",
    services: ["serv-1", "serv-5", "serv-7"],
    remType: "commission_fixed",
    remValue: 20.00, // R$20 fixo por serviço
    chairRentalValue: 0,
    chairRentalStatus: "inactive",
    permissions: {
      viewOwnCalendar: true,
      createAppts: true,
      rescheduleAppts: false,
      cancelAppts: false,
      blockCalendar: false,
      openSpots: false,
      viewFinancial: false,
      viewCommission: true,
      viewChairRental: false,
      manageOwnCalendar: "only_available" // Somente adicionar nos horários disponíveis
    }
  },
  {
    id: "prof-4",
    name: "Juliana Costa (Manicure & Estética)",
    phone: "11955554444",
    email: "juliana@agendazap.com",
    role: "Designer de Unhas",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=120&h=120&fit=crop",
    active: true,
    displayOrder: 4,
    workDays: [2, 3, 4, 5, 6],
    workHoursStart: "09:00",
    workHoursEnd: "19:00",
    lunchStart: "12:30",
    lunchEnd: "13:30",
    services: ["serv-4", "serv-5", "serv-6"],
    remType: "commission_percent",
    remValue: 35, // 35% de comissão
    chairRentalValue: 0,
    chairRentalStatus: "inactive",
    permissions: {
      viewOwnCalendar: true,
      createAppts: false,
      rescheduleAppts: false,
      cancelAppts: false,
      blockCalendar: false,
      openSpots: false,
      viewFinancial: false,
      viewCommission: true,
      viewChairRental: false,
      manageOwnCalendar: "no" // Apenas visualiza a agenda dela
    }
  }
];

export const INITIAL_CLIENTS: Client[] = [
  {
    id: "cli-1",
    name: "Carlos Ferreira",
    phone: "11911112222",
    email: "carlos.fe@gmail.com",
    birthDate: "1990-04-12",
    preferredProfessionalId: "prof-1",
    notes: "Cliente exigente. Prefere café expresso forte.",
    absences: 1,
    cancellations: 2,
    totalSpent: 410.00
  },
  {
    id: "cli-2",
    name: "Bruna Albuquerque",
    phone: "11922223333",
    email: "bruna.alb@hotmail.com",
    birthDate: "1995-09-24",
    preferredProfessionalId: "prof-2",
    notes: "Fazer retoque a cada 30 dias.",
    absences: 0,
    cancellations: 0,
    totalSpent: 600.00
  },
  {
    id: "cli-3",
    name: "Felipe Macedo",
    phone: "11933334444",
    email: "felipe.m@outlook.com",
    birthDate: "1988-01-30",
    preferredProfessionalId: "prof-1",
    notes: "Sempre usa máquina 1 nas laterais.",
    absences: 0,
    cancellations: 1,
    totalSpent: 180.00
  },
  {
    id: "cli-4",
    name: "Amanda Lima",
    phone: "11944445555",
    email: "amanda.lima@yahoo.com",
    birthDate: "1992-12-05",
    preferredProfessionalId: "prof-4",
    notes: "Unhas bem curtas, prefere tons nude.",
    absences: 2, // Faltou algumas vezes
    cancellations: 0,
    totalSpent: 160.00
  },
  {
    id: "cli-5",
    name: "Gabriela Rocha",
    phone: "11955556666",
    email: "gabi.rocha@gmail.com",
    birthDate: "1997-07-18",
    preferredProfessionalId: "prof-2",
    notes: "Cabelo cacheado natural, usar amaciantes leves.",
    absences: 0,
    cancellations: 0,
    totalSpent: 300.00
  },
  {
    id: "cli-6",
    name: "Rodrigo Santos",
    phone: "11966667777",
    email: "rodrigo.santos@gmail.com",
    birthDate: "1986-10-10",
    preferredProfessionalId: "prof-3",
    notes: "Gosta de marcar no fim do dia.",
    absences: 0,
    cancellations: 0,
    totalSpent: 120.00
  }
];

// Seed appointments dynamically around Base Date (2026-06-09)
export const INITIAL_APPOINTMENTS: Appointment[] = [
  // Ontem (Yesterday 2026-06-08) -> Finalizados para alimentar financeiro
  {
    id: "appt-1",
    dateTime: `${getRelativeDateStr(-1)}T09:00`,
    clientName: "Carlos Ferreira",
    clientPhone: "11911112222",
    clientEmail: "carlos.fe@gmail.com",
    serviceId: "serv-1", // Corte R$60
    professionalId: "prof-1", // João - 40% comissão = R$24
    price: 60.00,
    status: "completed",
    paymentType: "pix",
    notes: "Cortou cabelo curto clássico.",
    commissionPaid: true,
    commissionValue: 24.00,
    depositPaid: false
  },
  {
    id: "appt-2",
    dateTime: `${getRelativeDateStr(-1)}T10:30`,
    clientName: "Felipe Macedo",
    clientPhone: "11933334444",
    clientEmail: "felipe.m@outlook.com",
    serviceId: "serv-3", // Barba R$50
    professionalId: "prof-1", // João - 40% comissão = R$20
    price: 50.00,
    status: "completed",
    paymentType: "dinheiro",
    notes: "",
    commissionPaid: false,
    commissionValue: 20.00,
    depositPaid: false
  },
  {
    id: "appt-3",
    dateTime: `${getRelativeDateStr(-1)}T14:00`,
    clientName: "Bruna Albuquerque",
    clientPhone: "11922223333",
    clientEmail: "bruna.alb@hotmail.com",
    serviceId: "serv-2", // Corte Feminino R$150
    professionalId: "prof-2",
    price: 150.00,
    status: "completed",
    paymentType: "credito",
    notes: "Fez visagismo completo, adorou o resultado.",
    commissionPaid: false,
    commissionValue: 0.00,
    depositPaid: true
  },
  {
    id: "appt-4",
    dateTime: `${getRelativeDateStr(-1)}T16:00`,
    clientName: "Amanda Lima",
    clientPhone: "11944445555",
    clientEmail: "amanda.lima@yahoo.com",
    serviceId: "serv-4", // Manicure R$80
    professionalId: "prof-4", // Juliana - mixed. 35% comissão = R$28.
    price: 80.00,
    status: "completed",
    paymentType: "debito",
    notes: "Esmalte vermelho cereja.",
    commissionPaid: true,
    commissionValue: 28.00,
    depositPaid: false
  },

  // HOJE (Today 2026-06-09)
  {
    id: "appt-5",
    dateTime: `${getRelativeDateStr(0)}T08:30`,
    clientName: "Rodrigo Santos",
    clientPhone: "11966667777",
    clientEmail: "rodrigo.santos@gmail.com",
    serviceId: "serv-1", // Corte R$60
    professionalId: "prof-3", // Camila - fixed comissão = R$20
    price: 60.00,
    status: "completed", // Já concluído de manhã cedo
    paymentType: "pix",
    notes: "Sem lavar.",
    commissionPaid: false,
    commissionValue: 20.00,
    depositPaid: false
  },
  {
    id: "appt-6",
    dateTime: `${getRelativeDateStr(0)}T10:00`,
    clientName: "Gabriela Rocha",
    clientPhone: "11955556666",
    clientEmail: "gabi.rocha@gmail.com",
    serviceId: "serv-7", // Escova R$90
    professionalId: "prof-2",
    price: 90.00,
    status: "confirmed", // Agendado e confirmado para o meio do dia
    paymentType: "pix",
    notes: "Precisa sair pontualmente às 11:00.",
    commissionPaid: false,
    commissionValue: 0.00,
    depositPaid: false
  },
  {
    id: "appt-7",
    dateTime: `${getRelativeDateStr(0)}T11:00`,
    clientName: "Amanda Lima",
    clientPhone: "11944445555",
    clientEmail: "amanda.lima@yahoo.com",
    serviceId: "serv-5", // Design Sobrancelha R$45
    professionalId: "prof-4",
    price: 45.00,
    status: "absent", // Cliente Faltou Hoje cedo!
    paymentType: "pendente",
    notes: "",
    commissionPaid: false,
    commissionValue: 0,
    depositPaid: false
  },
  {
    id: "appt-8",
    dateTime: `${getRelativeDateStr(0)}T14:30`,
    clientName: "Felipe Macedo",
    clientPhone: "11933334444",
    serviceId: "serv-1", // Corte masculino R$60
    professionalId: "prof-1", // João (40% commission = R$24)
    price: 60.00,
    status: "attending", // Está sendo atendido exatamente agora!
    paymentType: "debito",
    notes: "Cabelo úmido.",
    commissionPaid: false,
    commissionValue: 24.00,
    depositPaid: false
  },
  {
    id: "appt-9",
    dateTime: `${getRelativeDateStr(0)}T16:00`,
    clientName: "Carlos Ferreira",
    clientPhone: "11911112222",
    serviceId: "serv-3", // Barba R$50
    professionalId: "prof-1", // João (40% commission = R$20)
    price: 50.00,
    status: "scheduled", // Agendado para breve
    paymentType: "pix",
    notes: "Passar balm suave.",
    commissionPaid: false,
    commissionValue: 20.00,
    depositPaid: false
  },
  {
    id: "appt-10",
    dateTime: `${getRelativeDateStr(0)}T17:30`,
    clientName: "Juliana Santos",
    clientPhone: "11988112233",
    serviceId: "serv-6", // Limpeza de Pele R$120
    professionalId: "prof-4", // Juliana (50% especifico comissão por ser serv-6 = R$60)
    price: 120.00,
    status: "scheduled",
    paymentType: "pix",
    notes: "Alergia a mentol, usar calmante de camomila.",
    commissionPaid: false,
    commissionValue: 60.00,
    depositPaid: true
  },

  // AMANHÃ & Futuro
  {
    id: "appt-11",
    dateTime: `${getRelativeDateStr(1)}T09:00`,
    clientName: "Bruna Albuquerque",
    clientPhone: "11922223333",
    serviceId: "serv-4", // Manicure R$80
    professionalId: "prof-2", // Maria
    price: 80.00,
    status: "scheduled",
    paymentType: "credito",
    notes: "Fazer francesinha impecável.",
    commissionPaid: false,
    commissionValue: 0,
    depositPaid: false
  },
  {
    id: "appt-12",
    dateTime: `${getRelativeDateStr(1)}T11:00`,
    clientName: "Rodrigo Santos",
    clientPhone: "11966667777",
    serviceId: "serv-3", // Barba R$50
    professionalId: "prof-1", // João
    price: 50.00,
    status: "confirmed",
    paymentType: "dinheiro",
    notes: "",
    commissionPaid: false,
    commissionValue: 20.00,
    depositPaid: false
  },
  {
    id: "appt-13",
    dateTime: `${getRelativeDateStr(2)}T15:00`,
    clientName: "Pedro Alves",
    clientPhone: "11999887766",
    serviceId: "serv-2", // Corte Feminino (ou unissex visagismo) R$150
    professionalId: "prof-2", // Maria
    price: 150.00,
    status: "scheduled",
    paymentType: "pix",
    notes: "Agendado via link público de teste.",
    commissionPaid: false,
    commissionValue: 0.00,
    depositPaid: true
  }
];

// Helper functions to manage localStorage DB
export interface LocalState {
  config: EstablishmentConfig;
  services: Service[];
  professionals: Professional[];
  clients: Client[];
  appointments: Appointment[];
}

export function getLocalState(): LocalState {
  try {
    const data = localStorage.getItem('agendazap_state');
    if (data) {
      const parsed = JSON.parse(data);
      // Double check if everything is there
      if (parsed.config && parsed.services && parsed.professionals && parsed.clients && parsed.appointments) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Error reading localStorage", e);
  }

  // Not in localStorage, set initial state
  const state: LocalState = {
    config: INITIAL_CONFIG,
    services: INITIAL_SERVICES,
    professionals: INITIAL_PROFESSIONALS,
    clients: INITIAL_CLIENTS,
    appointments: INITIAL_APPOINTMENTS
  };
  saveLocalState(state);
  return state;
}

export function saveLocalState(state: LocalState): void {
  try {
    localStorage.setItem('agendazap_state', JSON.stringify(state));
  } catch (e) {
    console.error("Error writing localStorage", e);
  }
}

// Resets localStorage state
export function resetLocalState(): LocalState {
  const state: LocalState = {
    config: INITIAL_CONFIG,
    services: INITIAL_SERVICES,
    professionals: INITIAL_PROFESSIONALS,
    clients: INITIAL_CLIENTS,
    appointments: INITIAL_APPOINTMENTS
  };
  saveLocalState(state);
  return state;
}
