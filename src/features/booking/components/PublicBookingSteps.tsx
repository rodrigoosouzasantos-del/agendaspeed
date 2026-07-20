/**
 * Componentes visuais das etapas da Vitrine pública.
 */

import React from 'react';
import {
  ArrowLeft, CalendarDays, CheckCircle2, ChevronRight, Clock, Instagram,
  MapPin, MessageCircle, Phone, User, Users, Zap
} from 'lucide-react';
import { Professional, Service } from '../../../types';
import { BookingDateOption, BookingTimeSlot } from '../booking.types';
import {
  ClientBookingFeedbackState,
  formatDateBr, formatPublicCurrency, formatPublicDuration, formatPublicPhone,
  getFirstName, normalizePublicAddress
} from '../publicBooking.data';

function BookingStepShell({
  title,
  description,
  onBack,
  children
}: {
  title: string;
  description: string;
  onBack: () => void;
  children?: React.ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-8">
      <div className="mb-4 flex items-start gap-3">
        <button
          type="button"
          onClick={onBack}
          className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-[#1A3038] shadow-sm transition hover:border-[#E0A96D]/60 hover:bg-[#FBF4EC]"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#1A3038] sm:text-3xl">
            {title}
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-600">
            {description}
          </p>
        </div>
      </div>

      {children}
    </main>
  );
}

export function BookingHeader({
  logoUrl,
  coverUrl,
  companyName,
  companyAddress,
  companyPhone,
  instagram,
  showBackToSiteButton,
  onNavigateBack
}: {
  logoUrl: string;
  coverUrl?: string;
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  instagram: string;
  showBackToSiteButton: boolean;
  onNavigateBack: () => void;
}) {
  const formattedAddress = normalizePublicAddress(companyAddress);

  return (
    <header className="bg-[#F4F6F6] pb-4">
      <div className="mx-auto w-full max-w-6xl px-3 pt-3 sm:px-4 sm:pt-5">
        {coverUrl ? (
          <div className="overflow-hidden rounded-[1.75rem] border border-white/80 bg-white/70 p-1.5 shadow-[0_18px_55px_rgba(26,48,56,0.10)] ring-1 ring-[#E0A96D]/15 sm:p-2">
            <img
              src={coverUrl}
              alt={`Fachada ${companyName}`}
              className="h-44 w-full rounded-[1.35rem] object-cover sm:h-60 lg:h-72"
              referrerPolicy="no-referrer"
            />
          </div>
        ) : (
          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#1A3038]">
              AgendaSpeed
            </p>
          </div>
        )}

        <div className="relative z-10 mx-auto -mt-8 w-[calc(100%-1.5rem)] max-w-3xl rounded-[1.75rem] border border-white/80 bg-white/95 p-4 shadow-[0_18px_55px_rgba(26,48,56,0.09)] backdrop-blur sm:-mt-10 sm:p-5">
          <div className="flex items-center gap-4">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={`Logo ${companyName}`}
                className="h-16 w-16 shrink-0 rounded-2xl border border-slate-200 bg-white object-contain p-1.5 shadow-sm"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-[#FBF4EC] text-[#E0A96D] shadow-sm">
                <Zap className="h-7 w-7" />
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h1 className="truncate text-xl font-semibold tracking-tight text-[#1A3038] sm:text-2xl">
                  {companyName || 'AgendaSpeed'}
                </h1>

                {showBackToSiteButton && (
                  <button
                    type="button"
                    onClick={onNavigateBack}
                    className="inline-flex rounded-xl bg-orange-500 px-3 py-2 text-xs font-black text-white shadow-[0_10px_22px_rgba(249,115,22,0.24)] transition hover:bg-orange-600"
                  >
                    Voltar ao site
                  </button>
                )}
              </div>

              <div className="mt-2 space-y-1.5 text-xs font-semibold leading-relaxed text-slate-600">
                {formattedAddress && (
                  <p className="flex items-start gap-1.5">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#1A3038]" />
                    <span>{formattedAddress}</span>
                  </p>
                )}

                {companyPhone && (
                  <p className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 shrink-0 text-[#1A3038]" />
                    <span>{formatPublicPhone(companyPhone)}</span>
                  </p>
                )}

                {instagram && (
                  <p className="flex items-center gap-1.5">
                    <Instagram className="h-3.5 w-3.5 shrink-0 text-[#1A3038]" />
                    <span>{instagram}</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export function ServiceSelectionStep({
  services,
  categories,
  activeCategory,
  onChangeCategory,
  onSelectService
}: {
  services: Service[];
  categories: string[];
  activeCategory: string;
  onChangeCategory: (category: string) => void;
  onSelectService: (service: Service) => void;
}) {
  return (
    <main className="mx-auto w-full max-w-6xl px-3 pb-8 sm:px-4">
      <div className="sticky top-0 z-20 -mx-3 border-y border-slate-200 bg-[#F4F6F6]/95 px-3 py-3 backdrop-blur sm:-mx-4 sm:px-4">
        <div className="no-scrollbar flex gap-2 overflow-x-auto whitespace-nowrap pb-0.5">
          {categories.map((category) => {
            const isActive = activeCategory === category;

            return (
              <button
                key={category}
                type="button"
                onClick={() => onChangeCategory(category)}
                className={`shrink-0 rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-[0.08em] shadow-sm transition ${
                  isActive
                    ? 'border-[#E0A96D] bg-[#E0A96D] text-[#1A3038] shadow-[0_8px_22px_rgba(224,169,109,0.22)]'
                    : 'border-[#E0A96D]/25 bg-white/80 text-slate-600 hover:border-[#E0A96D]/60 hover:bg-[#FBF4EC] hover:text-[#1A3038]'
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {services.map((service) => (
          <article
            key={service.id}
            className="group relative overflow-hidden rounded-[1.6rem] border border-slate-200/80 bg-white p-4 shadow-[0_14px_38px_rgba(26,48,56,0.055)] transition hover:border-[#E0A96D]/60 hover:shadow-[0_20px_48px_rgba(26,48,56,0.085)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <span className="inline-flex rounded-full border border-[#E0A96D]/30 bg-[#FBF4EC] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-[#8A663F]">
                  {service.category || 'Serviço'}
                </span>

                <h2 className="mt-3 line-clamp-2 text-base font-semibold leading-tight text-[#1A3038] sm:text-lg">
                  {service.name}
                </h2>
              </div>

              <div className="shrink-0 rounded-2xl border border-[#E0A96D]/45 bg-[#FBF4EC] px-3 py-2 text-right text-[#1A3038] shadow-[0_8px_22px_rgba(224,169,109,0.18)]">
                <span className="block text-[9px] font-black uppercase leading-none text-[#8A663F]">
                  A partir de
                </span>
                <strong className="block text-sm font-black leading-tight text-[#E0A96D]">
                  {formatPublicCurrency(service.price)}
                </strong>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-[#E0A96D]/20 bg-[#FBF4EC] px-2.5 py-1 text-[11px] font-semibold text-[#8A663F]">
                <Clock className="h-3.5 w-3.5 text-[#E0A96D]" />
                {formatPublicDuration(service.duration)}
              </span>

              {service.requireDeposit && service.depositValue !== null && (
                <span className="inline-flex items-center gap-1 rounded-full border border-[#E0A96D]/35 bg-[#FBF4EC] px-2.5 py-1 text-[11px] font-semibold text-[#8A663F]">
                  Sinal de {formatPublicCurrency(service.depositValue)}
                </span>
              )}
            </div>

            <p className="mt-3 line-clamp-2 min-h-[38px] text-sm font-medium leading-relaxed text-slate-600">
              {service.description || 'Serviço disponível para agendamento.'}
            </p>

            <button
              type="button"
              onClick={() => onSelectService(service)}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#E0A96D] px-4 py-3 text-sm font-black text-[#1A3038] shadow-sm transition hover:bg-[#D69B5F]"
            >
              Escolher serviço
              <ChevronRight className="h-4 w-4" />
            </button>
          </article>
        ))}

        {services.length === 0 && (
          <div className="col-span-full rounded-[1.6rem] border border-dashed border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-600">
            Nenhum serviço disponível nesta categoria.
          </div>
        )}
      </div>
    </main>
  );
}

export function ProfessionalSelectionStep({
  selectedService,
  selectedProfessional,
  availableProfessionals,
  onSelectProfessional,
  onBack
}: {
  selectedService: Service;
  selectedProfessional: Professional | null;
  availableProfessionals: Professional[];
  onSelectProfessional: (professional: Professional) => void;
  onBack: () => void;
}) {
  return (
    <BookingStepShell
      title="Escolha o profissional"
      description="Toque em quem você prefere para realizar o atendimento."
      onBack={onBack}
    >
      <div className="overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-100 bg-[#1A3038] px-4 py-3 text-white">
          <Users className="h-4 w-4" />
          <h2 className="text-sm font-semibold">Profissionais disponíveis</h2>
        </div>

        <div className="divide-y divide-slate-100 p-2">
          {availableProfessionals.map((professional) => {
            const isSelected = selectedProfessional?.id === professional.id;

            return (
              <button
                key={professional.id}
                type="button"
                onClick={() => onSelectProfessional(professional)}
                className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition ${
                  isSelected ? 'bg-[#FBF4EC]' : 'hover:bg-[#F4F6F6]'
                }`}
              >
                {professional.avatar ? (
                  <img
                    src={professional.avatar}
                    alt={professional.name}
                    className="h-16 w-16 shrink-0 rounded-2xl border border-slate-200 object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-[#F4F6F6] text-[#1A3038]">
                    <User className="h-7 w-7" />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-semibold text-[#1A3038]">
                    {professional.name}
                  </p>
                  <p className="mt-0.5 truncate text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
                    {professional.role || 'Profissional'}
                  </p>
                  <span className="mt-2 inline-flex rounded-full border border-[#E0A96D]/30 bg-[#FBF4EC] px-2.5 py-1 text-[11px] font-black text-[#8A663F]">
                    {formatPublicCurrency(selectedService.price)}
                  </span>
                </div>

                <ChevronRight className="h-5 w-5 shrink-0 text-[#1A3038]" />
              </button>
            );
          })}

          {availableProfessionals.length === 0 && (
            <div className="rounded-2xl bg-[#F4F6F6] p-6 text-center text-sm font-semibold text-slate-600">
              Nenhum profissional disponível para este serviço.
            </div>
          )}
        </div>
      </div>
    </BookingStepShell>
  );
}

export function DateTimeSelectionStep({
  selectedService,
  selectedProfessional,
  selectedDate,
  selectedTime,
  dateOptions,
  timeSlots,
  onChangeDate,
  onChangeTime,
  onBack,
  onNextStep
}: {
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
}) {
  return (
    <BookingStepShell
      title="Escolha a data e o horário"
      description={`Agendamento com ${selectedProfessional.name} para ${selectedService.name}.`}
      onBack={onBack}
    >
      <div className="space-y-3">
        <section className="overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 bg-[#1A3038] px-4 py-3 text-white">
            <CalendarDays className="h-4 w-4" />
            <h2 className="text-sm font-black">Escolha uma data</h2>
          </div>

          <div className="no-scrollbar flex gap-2 overflow-x-auto p-3">
            {dateOptions.map((dateOption) => {
              const isSelected = selectedDate === dateOption.dateStr;

              return (
                <button
                  key={dateOption.dateStr}
                  type="button"
                  onClick={() => onChangeDate(dateOption.dateStr)}
                  className={`min-w-[104px] rounded-2xl border px-4 py-3 text-center shadow-sm transition ${
                    isSelected
                      ? 'border-[#E0A96D] bg-[#E0A96D] text-[#1A3038]'
                      : 'border-slate-200 bg-white/70 text-[#1A3038] hover:border-[#E0A96D]/60 hover:bg-white'
                  }`}
                >
                  <span className="block text-[10px] font-black uppercase tracking-[0.12em]">
                    {dateOption.dayOfWeekStr}
                  </span>
                  <strong className="mt-1 block text-sm font-black">
                    {dateOption.label}
                  </strong>
                  {isSelected && <CheckCircle2 className="mx-auto mt-2 h-4 w-4" />}
                </button>
              );
            })}

            {dateOptions.length === 0 && (
              <div className="w-full rounded-2xl bg-[#F4F6F6] p-6 text-center text-sm font-semibold text-slate-600">
                Nenhuma data disponível no momento.
              </div>
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 bg-[#1A3038]/90 px-4 py-3 text-white">
            <Clock className="h-4 w-4" />
            <h2 className="text-sm font-black">Escolha um horário</h2>
          </div>

          <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-4">
            {timeSlots.map((slot) => {
              const isSelected = selectedTime === slot.time;

              return (
                <button
                  key={slot.time}
                  type="button"
                  onClick={() => onChangeTime(slot.time)}
                  className={`rounded-2xl border px-3 py-3 text-sm font-black shadow-sm transition ${
                    isSelected
                      ? 'border-[#E0A96D] bg-[#E0A96D] text-[#1A3038]'
                      : 'border-slate-200 bg-white/70 text-[#1A3038] hover:border-[#E0A96D]/60 hover:bg-white'
                  }`}
                >
                  {slot.time}
                </button>
              );
            })}

            {timeSlots.length === 0 && (
              <div className="col-span-full rounded-2xl bg-[#F4F6F6] p-6 text-center text-sm font-semibold text-slate-600">
                Escolha uma data disponível para visualizar os horários.
              </div>
            )}
          </div>
        </section>

        <div className="flex items-center justify-between border-t border-slate-200 pt-4">
          <button
            type="button"
            onClick={onBack}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-600 transition hover:border-[#E0A96D]/60 hover:text-[#1A3038]"
          >
            Voltar
          </button>

          <button
            type="button"
            onClick={onNextStep}
            disabled={!selectedDate || !selectedTime}
            className={`rounded-2xl px-5 py-3 text-sm font-black transition ${
              selectedDate && selectedTime
                ? 'bg-[#E0A96D] text-[#1A3038] hover:bg-[#D69B5F]'
                : 'cursor-not-allowed bg-slate-200 text-slate-400'
            }`}
          >
            Continuar
          </button>
        </div>
      </div>
    </BookingStepShell>
  );
}

export function ClientInfoStep({
  selectedService,
  selectedProfessional,
  selectedDate,
  selectedTime,
  clientName,
  clientPhone,
  clientEmail,
  notes,
  onChangeClientName,
  onChangeClientPhone,
  onChangeClientEmail,
  onChangeNotes,
  onBack,
  onNextStep
}: {
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
}) {
  return (
    <BookingStepShell
      title="Dados do cliente"
      description="Informe seu nome e WhatsApp para continuar."
      onBack={onBack}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onNextStep();
        }}
        className="rounded-[1.6rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
      >
        <div className="mb-4 rounded-2xl border border-slate-200 bg-[#F4F6F6] p-3 text-xs font-semibold text-slate-600">
          <strong className="block text-[#1A3038]">Resumo</strong>
          {selectedService.name} com {selectedProfessional.name} em {formatDateBr(selectedDate)} às {selectedTime}.
        </div>

        <div className="space-y-3">
          <label className="block space-y-1">
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-600">WhatsApp</span>
            <div className="relative">
              <Phone className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
              <input
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                value={clientPhone}
                onChange={(event) => onChangeClientPhone(event.target.value)}
                placeholder="(99) 99999-9999"
                maxLength={15}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-[#F4F6F6] pl-10 pr-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-[#1A3038] focus:bg-white"
                required
              />
            </div>
          </label>

          <label className="block space-y-1">
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-600">Nome completo</span>
            <div className="relative">
              <User className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                autoComplete="name"
                value={clientName}
                onChange={(event) => onChangeClientName(event.target.value)}
                placeholder="DIGITE SEU NOME COMPLETO"
                className="h-11 w-full rounded-2xl border border-slate-200 bg-[#F4F6F6] pl-10 pr-3 text-sm font-semibold uppercase text-slate-700 outline-none transition focus:border-[#1A3038] focus:bg-white"
                required
              />
            </div>
          </label>

          <input
            type="hidden"
            value={clientEmail}
            onChange={(event) => onChangeClientEmail(event.target.value)}
          />

          <input
            type="hidden"
            value={notes}
            onChange={(event) => onChangeNotes(event.target.value)}
          />

          <p className="rounded-2xl border border-slate-200 bg-[#F4F6F6] px-3 py-3 text-xs font-semibold leading-relaxed text-slate-600">
            Usaremos estes dados apenas para identificar seu agendamento e permitir contato pelo WhatsApp.
          </p>
        </div>

        <div className="mt-5 flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-600 transition hover:border-[#E0A96D]/60 hover:text-[#1A3038]"
          >
            Voltar
          </button>

          <button
            type="submit"
            disabled={!clientName.trim() || !clientPhone.trim()}
            className={`rounded-2xl px-5 py-3 text-sm font-black transition ${
              clientName.trim() && clientPhone.trim()
                ? 'bg-[#E0A96D] text-[#1A3038] hover:bg-[#D69B5F]'
                : 'cursor-not-allowed bg-slate-200 text-slate-400'
            }`}
          >
            Continuar
          </button>
        </div>
      </form>
    </BookingStepShell>
  );
}

export function BookingSuccessView({
  selectedService,
  selectedProfessional,
  selectedDate,
  selectedTime,
  clientName,
  companyName,
  companyAddress,
  whatsappUrl,
  onNavigateBack
}: {
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
}) {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-2xl items-center px-4 py-8">
      <div className="w-full rounded-[1.8rem] border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FBF4EC] text-[#E0A96D]">
          <CheckCircle2 className="h-8 w-8" />
        </div>

        <h1 className="mt-4 text-2xl font-black text-[#1A3038]">
          Atendimento realizado com sucesso!
        </h1>
        <p className="mt-2 text-sm font-medium text-slate-600">
          {getFirstName(clientName)}, seu agendamento foi registrado. Envie a confirmação pelo WhatsApp para o estabelecimento receber os dados.
        </p>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-[#F4F6F6] p-4 text-left text-sm font-semibold text-slate-600">
          <p><strong className="text-[#1A3038]">Serviço:</strong> {selectedService?.name || '-'}</p>
          <p><strong className="text-[#1A3038]">Profissional:</strong> {selectedProfessional?.name || '-'}</p>
          <p><strong className="text-[#1A3038]">Data:</strong> {formatDateBr(selectedDate)} às {selectedTime}</p>
          <p><strong className="text-[#1A3038]">Local:</strong> {normalizePublicAddress(companyAddress) || companyName}</p>
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#E0A96D] px-5 py-3 text-sm font-black text-[#1A3038] transition hover:bg-[#D69B5F]"
            >
              <MessageCircle className="h-4 w-4" />
              Enviar no WhatsApp
            </a>
          )}

          <button
            type="button"
            onClick={onNavigateBack}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-600 transition hover:border-[#E0A96D]/60 hover:text-[#1A3038]"
          >
            Fazer novo agendamento
          </button>
        </div>
      </div>
    </main>
  );
}

export function ClientBookingFeedbackModal({
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
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#FBF4EC] text-[#E0A96D]">
            <span className="text-xl font-black">
              !
            </span>
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-black text-[#1A3038]">
              {title}
            </h2>

            <p className="text-sm leading-relaxed text-slate-600">
              {description}
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl bg-[#E0A96D] px-5 py-3 text-sm font-black text-[#1A3038] shadow-sm hover:bg-[#D69B5F]"
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  );
}

