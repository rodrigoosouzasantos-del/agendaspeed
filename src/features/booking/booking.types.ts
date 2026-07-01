/**
 * Tipos internos do fluxo público de agendamento - AgendaZap.
 *
 * Este arquivo centraliza os tipos usados na Vitrine pública onde
 * o cliente final escolhe serviço, profissional, data e horário.
 */

import React from 'react';

import { LocalState } from '../../data';

import {
  Appointment,
  Professional,
  Service
} from '../../types';

export interface ClientBookingProps {
  state: LocalState;
  onAddAppointment: (appointment: Appointment) => void;
  onNavigateBack: () => void;
}

export type BookingStep = 1 | 2 | 3 | 4 | 5 | 6;

export interface BookingDateOption {
  dateStr: string;
  dayOfWeekStr: string;
  label: string;
}

export interface BookingTimeSlot {
  time: string;
  available: boolean;
}



export interface BookingScheduleDay {
  id: string;
  professionalId: string;
  date: string;
  status: 'open' | 'closed';
  isOutOfRegularSchedule?: boolean;
}

export interface BookingAgendaBlockedInterval {
  id: string;
  professionalId: string;
  date: string;
  startTime: string;
  endTime: string;
  reason?: string;
}

export interface BookingSelectionState {
  selectedService: Service | null;
  selectedProfessional: Professional | null;
  selectedDate: string;
  selectedTime: string;
}

export interface BookingClientFormState {
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  notes: string;
}

export interface BookingComputedData {
  categories: string[];
  filteredServices: Service[];
  availableProfessionals: Professional[];
  dateOptions: BookingDateOption[];
  timeSlots: BookingTimeSlot[];
}

export interface BookingHeaderProps {
  logoUrl: string;
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  instagram: string;
  onNavigateBack: () => void;
}

export interface ServiceSelectionStepProps {
  services: Service[];
  categories: string[];
  activeCategory: string;
  onChangeCategory: (category: string) => void;
  onSelectService: (service: Service) => void;
}

export interface ProfessionalSelectionStepProps {
  selectedService: Service;
  selectedProfessional: Professional | null;
  availableProfessionals: Professional[];
  onSelectProfessional: (professional: Professional) => void;
  onBack: () => void;
}

export interface DateTimeSelectionStepProps {
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
}

export interface ClientInfoStepProps {
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
}

export interface BookingReviewStepProps {
  selectedService: Service;
  selectedProfessional: Professional;
  selectedDate: string;
  selectedTime: string;
  clientName: string;
  clientPhone: string;
  onBack: () => void;
  onSubmit: (event: React.FormEvent) => void;
}

export interface BookingSuccessViewProps {
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
}

export interface BookingFooterProps {
  companyName: string;
}
