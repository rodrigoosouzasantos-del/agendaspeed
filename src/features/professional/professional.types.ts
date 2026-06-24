/**

* Tipos internos do painel do profissional - AgendaZap.
*
* Este arquivo centraliza os tipos usados pelo colaborador/profissional,
* mantendo o componente principal mais limpo e preparado para evolução.
  */

import type { FormEvent } from 'react';

import { LocalState } from '../../data';

import {
Appointment,
AppointmentStatus,
Professional,
Service
} from '../../types';

export interface ProfessionalDashboardProps {
state: LocalState;
professionalId: string;
professionalAccessToken?: string;
onModifyAppointment: (
apptId: string,
updates: Partial<Appointment>
) => void;
onAddManualAppointment: (appt: Appointment) => void;
onLogOut: () => void;
}

export type ProfessionalTab = 'agenda' | 'relatorios';

export type ProfessionalDayFilter = 'today' | 'week' | 'all';

export type ProfessionalStatusFilter = AppointmentStatus | 'all';

export interface ProfessionalManualAppointmentFormState {
clientName: string;
clientPhone: string;
serviceId: string;
date: string;
time: string;
notes: string;
}

export interface ProfessionalFinancialSummary {
completedAppointments: Appointment[];
activeAppointments: Appointment[];
totalProduced: number;
commissionExpected: number;
chairRentalFee: number;
isChairRental: boolean;
}

export interface ProfessionalHeaderProps {
configName: string;
professional: Professional;
activeTab: ProfessionalTab;
onChangeTab: (tab: ProfessionalTab) => void;
onLogOut: () => void;
}

export interface ProfessionalAgendaViewProps {
configName: string;
professional: Professional;
services: Service[];
filteredAppointments: Appointment[];
dayFilter: ProfessionalDayFilter;
statusFilter: ProfessionalStatusFilter;
canCreateAppointments: boolean;
onChangeDayFilter: (filter: ProfessionalDayFilter) => void;
onChangeStatusFilter: (filter: ProfessionalStatusFilter) => void;
onOpenManualAppointmentModal: () => void;
onModifyAppointment: (
apptId: string,
updates: Partial<Appointment>
) => void;
}

export interface ProfessionalReportsViewProps {
professional: Professional;
services: Service[];
completedAppointments: Appointment[];
activeAppointments: Appointment[];
totalProduced: number;
commissionExpected: number;
chairRentalFee: number;
isChairRental: boolean;
}

export interface ManualAppointmentModalProps {
professional: Professional;
services: Service[];
myServices: Service[];
formState: ProfessionalManualAppointmentFormState;
onChangeFormState: (
updates: Partial<ProfessionalManualAppointmentFormState>
) => void;
onClose: () => void;
onSubmit: (event: FormEvent) => void;
}

export interface AppointmentRowData {
appointment: Appointment;
service: Service | undefined;
appointmentDate: string;
appointmentTime: string;
formattedDate: string;
}

export interface ProfessionalComputedData {
currentProfessional: Professional | undefined;
professionalAppointments: Appointment[];
filteredAppointments: Appointment[];
completedAppointments: Appointment[];
activeAppointments: Appointment[];
myServices: Service[];
financialSummary: ProfessionalFinancialSummary;
}
