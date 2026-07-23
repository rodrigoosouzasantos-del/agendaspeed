import React from 'react';
import {
  Briefcase,
  CheckCircle2,
  ChevronRight,
  Clock,
  Info,
  Lock,
  Phone,
  Search
} from 'lucide-react';

import {
  Client
} from '../../../types';

import {
  formatCurrency,
  formatDateBr
} from '../owner.utils';

import {
  formatDuration,
  generateSlotsForSelection,
  getAvailabilityBadge,
  getWeekDayShortLabel,
  normalizeText,
  professionalCanDoService
} from './agenda.utils';

interface AgendaBookingFlowProps {
  context: any;
}

export default function AgendaBookingFlow({
  context
}: AgendaBookingFlowProps) {
  const {
    activeProfessionals,
    activeServices,
    agendaLookaheadDays,
    appointments,
    availableSlots,
    blockedIntervals,
    canGoClientData,
    canSubmit,
    clientName,
    clientNameMatches,
    clientNotes,
    clientPhone,
    config,
    currentStep,
    dateOptions,
    findClientByPhone,
    getSlotsForDate,
    getSlotsForProfessionalAcrossPeriod,
    getSlotsForProfessionalOnSelectedDate,
    handleClientNameChange,
    handleClientPhoneChange,
    handleSelectClientByName,
    handleSelectDateFirst,
    handleSelectDateTimeDate,
    handleSelectProfessional,
    handleSelectService,
    handleSubmit,
    mode,
    openDays,
    openProfessionalAgendaManager,
    professionalSearch,
    professionalsForSelectedService,
    resetFlow,
    selectedDate,
    selectedProfessional,
    selectedProfessionalId,
    selectedService,
    selectedServiceId,
    selectedTime,
    serviceSearch,
    services,
    servicesForSelectedProfessional,
    setClientNotes,
    setCurrentStep,
    setProfessionalSearch,
    setSelectedTime,
    setServiceSearch,
    todayStr,
    whatsAppConfirmUrl
  } = context;

const renderProfessionalManagerCards = () => {
    return (
      <div className="space-y-4">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="h-1.5 bg-[#0f4c5c]" />
          <div className="px-4 py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#0f4c5c]">
                AGENDASPEED
              </p>
              <h3 className="text-lg font-semibold tracking-tight text-neutral-950 mt-1">
                Gerenciador de agenda dos profissionais
              </h3>
              <p className="text-xs text-slate-500 font-semibold mt-1">
                Clique no profissional para abrir a agenda individual e controlar horários, aberturas, bloqueios, agendamentos e confirmações.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-500 flex items-center gap-2">
              <Info className="w-4 h-4 text-slate-400" />
              Dias passados não aparecem.
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {activeProfessionals.map((professional: any) => {
            return (
              <button
                key={professional.id}
                type="button"
                onClick={() => openProfessionalAgendaManager(professional.id)}
                className="group overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition hover:border-[#0f4c5c]/35 hover:shadow-md"
              >
                <div className="h-1.5 bg-[#0f4c5c]" />
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
                      {professional.avatar ? (
                        <img
                          src={professional.avatar}
                          alt={professional.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span className="text-lg font-black text-slate-700">
                          {professional.name.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#0f4c5c]">
                        Profissional
                      </p>
                      <h4 className="mt-1 text-base font-semibold text-neutral-950 truncate">
                        {professional.name}
                      </h4>
                      <p className="mt-1 text-xs font-semibold text-slate-500 line-clamp-2 min-h-[32px]">
                        {professional.role || 'Especialidade não informada'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <span className="inline-flex items-center rounded-full border border-[#0f4c5c]/15 bg-[#0f4c5c]/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#0f4c5c]">
                      Abrir agenda
                    </span>

                    <ChevronRight className="w-5 h-5 text-slate-400 transition group-hover:text-[#0f4c5c]" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
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
            Use quando o cliente perguntou por um dia específico. Dias passados
            não aparecem.
          </p>
        </div>

        <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          {dateOptions.map((dateOption: any) => {
            const freeSlots = getSlotsForDate(dateOption);
            const isSelected = selectedDate === dateOption;

            return (
              <button
                key={dateOption}
                type="button"
                onClick={() => handleSelectDateFirst(dateOption)}
                className={`rounded-2xl border p-3 text-center transition ${
                  isSelected
                    ? "bg-[#0f4c5c]/5 border-[#0f4c5c] ring-2 ring-[#0f4c5c]/10"
                    : freeSlots === 0
                      ? "bg-red-50/40 border-red-100 hover:border-red-200"
                      : "bg-white border-neutral-200 hover:border-[#0f4c5c]/40 hover:shadow-md"
                }`}
              >
                <span className="text-[10px] font-black uppercase text-neutral-400 block">
                  {dateOption === todayStr
                    ? "Hoje"
                    : getWeekDayShortLabel(dateOption)}
                </span>

                <strong className="text-base font-black text-neutral-950 block mt-1">
                  {formatDateBr(dateOption).slice(0, 5)}
                </strong>

                <span
                  className={`text-[10px] font-black rounded-lg px-2 py-1 inline-block mt-3 ${
                    freeSlots === 0
                      ? "bg-red-100 text-red-700"
                      : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {freeSlots === 0 ? "Esgotado" : `${freeSlots} livres`}
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
      ? servicesForSelectedProfessional.filter((service: any) => {
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
                : "Escolha o serviço solicitado pelo cliente."}
            </p>
          </div>

          <div className="relative w-full lg:w-72">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={serviceSearch}
              onChange={(event: any) => setServiceSearch(event.target.value)}
              placeholder="Buscar serviço..."
              className="w-full bg-neutral-50 border rounded-xl pl-9 pr-3 py-2.5 text-xs font-semibold outline-none focus:border-[#0f4c5c]"
            />
          </div>
        </div>

        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {serviceList.map((service: any) => {
            const serviceProfessional = selectedProfessional;
            const count =
              serviceProfessional && selectedDate
                ? generateSlotsForSelection({
                    professional: serviceProfessional,
                    service,
                    date: selectedDate,
                    services,
                    appointments,
                    blockedIntervals,
                    openDays,
                  }).length
                : serviceProfessional
                  ? dateOptions.reduce((total: number, dateOption: string) => {
                      return (
                        total +
                        generateSlotsForSelection({
                          professional: serviceProfessional,
                          service,
                          date: dateOption,
                          services,
                          appointments,
                          blockedIntervals,
                          openDays,
                        }).length
                      );
                    }, 0)
                  : professionalsForSelectedService.reduce(
                      (total: number, professional: any) => {
                        if (
                          !professionalCanDoService({ professional, service })
                        ) {
                          return total;
                        }

                        return (
                          total +
                          dateOptions.reduce((dateTotal: number, dateOption: string) => {
                            return (
                              dateTotal +
                              generateSlotsForSelection({
                                professional,
                                service,
                                date: selectedDate || dateOption,
                                services,
                                appointments,
                                blockedIntervals,
                                openDays,
                              }).length
                            );
                          }, 0)
                        );
                      },
                      0,
                    );

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
                    ? "bg-[#0f4c5c]/5 border-[#0f4c5c] ring-2 ring-[#0f4c5c]/10"
                    : isSoldOut
                      ? "bg-red-50/40 border-red-100 opacity-80 cursor-not-allowed"
                      : "bg-white border-neutral-200 hover:border-[#0f4c5c]/40 hover:shadow-md"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="w-10 h-10 rounded-2xl bg-[#0f4c5c]/5 text-[#0f4c5c] flex items-center justify-center shrink-0">
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
                      <span className="text-[10px] font-black text-[#0f4c5c] block mt-1">
                        Sinal {formatCurrency(service.depositValue || 0)}
                      </span>
                    )}
                  </span>
                </div>

                <span
                  className={`inline-block mt-4 px-2 py-1 rounded-lg border text-[10px] font-black ${availability.className}`}
                >
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
              {mode === "professionalAgenda"
                ? "Escolha o profissional para abrir a agenda individual."
                : selectedDate
                  ? `Mostrando disponibilidade para ${formatDateBr(selectedDate)}.`
                  : selectedService
                    ? `Apenas profissionais que realizam ${selectedService.name}.`
                    : `Consulte disponibilidade nos próximos ${agendaLookaheadDays} dias.`}
            </p>
          </div>

          <div className="relative w-full lg:w-72">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={professionalSearch}
              onChange={(event: any) => setProfessionalSearch(event.target.value)}
              placeholder="Buscar profissional..."
              className="w-full bg-neutral-50 border rounded-xl pl-9 pr-3 py-2.5 text-xs font-semibold outline-none focus:border-[#0f4c5c]"
            />
          </div>
        </div>

        <div className="p-4 space-y-3">
          {professionalList.map((professional: any) => {
            const availabilityCount = selectedDate
              ? getSlotsForProfessionalOnSelectedDate(professional)
              : getSlotsForProfessionalAcrossPeriod(professional);

            const availability = getAvailabilityBadge(availabilityCount);
            const isSoldOut =
              mode !== "professionalAgenda" && availabilityCount === 0;

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
                    ? "bg-[#0f4c5c]/5 border-[#0f4c5c] ring-2 ring-[#0f4c5c]/10"
                    : isSoldOut
                      ? "bg-red-50/40 border-red-100 opacity-80 cursor-not-allowed"
                      : "bg-white border-neutral-200 hover:border-[#0f4c5c]/40 hover:shadow-md"
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
                    <span
                      className={`px-3 py-1 rounded-full border text-[10px] font-black ${mode === "professionalAgenda" ? "bg-neutral-50 text-neutral-700 border-neutral-200" : availability.className}`}
                    >
                      {mode === "professionalAgenda"
                        ? "Abrir agenda"
                        : availability.label}
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
              Horários ocupados, almoço e horários passados são ocultados
              automaticamente.
            </p>
          </div>

          <div className="bg-neutral-50 border rounded-2xl p-3 text-xs min-w-[260px]">
            <span className="font-black text-neutral-950 block">
              Resumo selecionado
            </span>

            <span className="text-neutral-500 font-semibold block mt-1">
              {selectedService?.name || "Serviço não selecionado"}
            </span>

            <span className="text-neutral-500 font-semibold block">
              {selectedProfessional?.name || "Profissional não selecionado"}
            </span>
          </div>
        </div>

        <div className="p-4 space-y-5">
          <div>
            <span className="text-xs font-black text-neutral-500 uppercase tracking-widest font-mono">
              Data do atendimento
            </span>

            <div className="flex gap-2 overflow-x-auto mt-3 pb-1">
              {dateOptions.map((dateOption: any) => {
                const slotsForDate =
                  selectedService && selectedProfessional
                    ? generateSlotsForSelection({
                        professional: selectedProfessional,
                        service: selectedService,
                        date: dateOption,
                        services,
                        appointments,
                        blockedIntervals,
                        openDays,
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
                        ? "bg-[#0f4c5c]/5 border-[#0f4c5c] ring-2 ring-[#0f4c5c]/10"
                        : slotsForDate === 0
                          ? "bg-red-50/40 border-red-100 opacity-80 cursor-not-allowed"
                          : "bg-white border-neutral-200 hover:border-[#0f4c5c]/40"
                    }`}
                  >
                    <span className="text-[10px] font-black uppercase text-neutral-400 block">
                      {dateOption === todayStr
                        ? "Hoje"
                        : getWeekDayShortLabel(dateOption)}
                    </span>

                    <strong className="text-sm font-black text-neutral-950 block mt-1">
                      {formatDateBr(dateOption).slice(0, 5)}
                    </strong>

                    <span
                      className={`text-[10px] font-black rounded-lg px-2 py-1 inline-block mt-2 ${
                        slotsForDate === 0
                          ? "bg-red-100 text-red-700"
                          : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {slotsForDate === 0
                        ? "Esgotado"
                        : `${slotsForDate} disp.`}
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
                {availableSlots.map((slot: any) => {
                  const isSelected = selectedTime === slot.time;

                  return (
                    <button
                      key={`${slot.professional.id}-${slot.service.id}-${slot.date}-${slot.time}`}
                      type="button"
                      onClick={() => setSelectedTime(slot.time)}
                      className={`rounded-xl border px-3 py-2.5 text-left transition ${
                        isSelected
                          ? "bg-[#0f4c5c]/5 border-[#0f4c5c] ring-2 ring-[#0f4c5c]/10"
                          : "bg-white border-neutral-200 hover:border-[#0f4c5c]/40"
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
              onClick={() => setCurrentStep("clientData")}
              className={`w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-black transition flex items-center justify-center gap-2 ${
                canGoClientData
                  ? "bg-[#0f4c5c] hover:bg-[#123945] text-white shadow-sm"
                  : "bg-neutral-200 text-neutral-400 cursor-not-allowed"
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


  const renderClientData = () => {
    const matchedClient = findClientByPhone(clientPhone);

    return (
      <form
        onSubmit={handleSubmit}
        className="bg-white border rounded-2xl shadow-sm overflow-hidden max-w-5xl mx-auto"
      >
        <div className="p-4 border-b">
          <h3 className="text-base font-black text-neutral-950">
            Dados do cliente
          </h3>

          <p className="text-xs text-neutral-500 font-semibold mt-1">
            Informe primeiro o nome. A busca por clientes será refinada durante
            a digitação e o WhatsApp poderá ser preenchido quando estiver cadastrado.
          </p>
        </div>

        <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-3">
            <div className="relative">
              <label className="text-xs font-black text-neutral-500 uppercase tracking-widest font-mono block mb-1.5">
                Nome do cliente
              </label>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />

                <input
                  value={clientName}
                  onChange={(event: any) =>
                    handleClientNameChange(event.target.value)
                  }
                  placeholder="Ex.: JOSE DA PADARIA"
                  className="w-full rounded-xl border bg-neutral-50 py-2 pl-9 pr-3 text-sm font-semibold uppercase outline-none focus:border-[#0f4c5c]"
                  autoFocus
                />
              </div>

              {clientName.trim() && clientNameMatches.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                  <div className="border-b border-slate-100 bg-slate-50 px-3 py-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                      Clientes encontrados
                    </p>
                  </div>

                  <div className="max-h-64 overflow-y-auto p-1.5">
                    {clientNameMatches.map((client: Client) => (
                      <button
                        key={client.id}
                        type="button"
                        onClick={() => handleSelectClientByName(client)}
                        className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-[#0f4c5c]/5"
                      >
                        <span className="min-w-0">
                          <strong className="block truncate text-sm font-semibold text-neutral-950">
                            {client.name}
                          </strong>

                          <span className="mt-0.5 block text-[11px] font-medium text-neutral-500">
                            {client.phone
                              ? `WhatsApp: ${client.phone}`
                              : "Cliente sem WhatsApp cadastrado"}
                          </span>
                        </span>

                        <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {clientName.trim() && clientNameMatches.length === 0 && (
                <p className="mt-1.5 text-[11px] font-medium text-slate-500">
                  Nenhum cliente cadastrado com esse início de nome. O agendamento poderá ser salvo como novo cliente.
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-black text-neutral-500 uppercase tracking-widest font-mono block mb-1.5">
                WhatsApp (opcional no agendamento interno)
              </label>

              <div className="relative">
                <Phone className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={clientPhone}
                  onChange={(event: any) =>
                    handleClientPhoneChange(event.target.value)
                  }
                  placeholder="(14) 99999-9999"
                  className="w-full bg-neutral-50 border rounded-xl pl-9 pr-3 py-2 text-sm font-semibold outline-none focus:border-[#0f4c5c]"
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
                Observações
              </label>

              <textarea
                value={clientNotes}
                onChange={(event: any) => setClientNotes(event.target.value)}
                placeholder="Ex.: Cliente prefere atendimento rápido."
                className="w-full bg-neutral-50 border rounded-xl px-3 py-2 text-sm font-semibold outline-none focus:border-[#0f4c5c] min-h-[62px] resize-none"
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
                  <strong className="text-neutral-950">{selectedTime}</strong>
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
            <Info className="w-4 h-4" />A cobrança fica para o caixa. Aqui
            salvamos somente o agendamento.
          </p>

          <button
            type="submit"
            disabled={!canSubmit}
            className={`w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-black transition ${
              canSubmit
                ? "bg-[#0f4c5c] hover:bg-[#123945] text-white shadow-sm"
                : "bg-neutral-200 text-neutral-400 cursor-not-allowed"
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
            className="bg-[#0f4c5c] hover:bg-[#123945] text-white px-5 py-2.5 rounded-xl text-xs font-black transition"
          >
            Fazer novo agendamento
          </button>
        </div>
      </div>
    );
  };

  const renderCurrentStep = () => {
    if (currentStep === "start") {
      return renderProfessionalManagerCards();
    }

    if (currentStep === "selectDate") {
      return renderDateSelection();
    }

    if (currentStep === "selectService") {
      return renderServiceSelection();
    }

    if (currentStep === "selectProfessional") {
      return renderProfessionalSelection();
    }

    if (currentStep === "selectDateTime") {
      return renderDateTimeSelection();
    }

    if (currentStep === "clientData") {
      return renderClientData();
    }

    if (currentStep === "success") {
      return renderSuccess();
    }

    return null;
  };
  return renderCurrentStep();
}
