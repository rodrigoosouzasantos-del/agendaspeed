/**
 * Etapa de revisão e finalização do agendamento - AgendaSpeed.
 *
 * Responsável por:
 * - mostrar o resumo final do agendamento;
 * - confirmar o envio para o WhatsApp do estabelecimento.
 */

import React from 'react';

import {
  ArrowLeft,
  CalendarDays,
  CheckCircle,
  Clock,
  Phone,
  Scissors,
  User,
  UserCheck
} from 'lucide-react';

import {
  BookingReviewStepProps
} from '../booking.types';

function formatCurrency(value: number): string {
  return `R$ ${value.toFixed(2)}`;
}

function formatDateBr(dateStr: string): string {
  if (!dateStr || !dateStr.includes('-')) {
    return dateStr;
  }

  return dateStr.split('-').reverse().join('/');
}

export default function BookingReviewStep({
  selectedService,
  selectedProfessional,
  selectedDate,
  selectedTime,
  clientName,
  clientPhone,
  onBack,
  onSubmit
}: BookingReviewStepProps) {
  const formattedDate = formatDateBr(selectedDate);

  return (
    <section className="max-w-3xl mx-auto px-4 py-4 sm:py-5 space-y-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="w-10 h-10 rounded-2xl border border-neutral-200 bg-white text-neutral-700 flex items-center justify-center hover:bg-neutral-50 transition shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-neutral-950 tracking-tight">
            Resumo do agendamento
          </h2>

          <p className="text-sm text-neutral-500 mt-1">
            Confira os dados antes de finalizar.
          </p>
        </div>
      </div>

      <form
        onSubmit={onSubmit}
        className="bg-white border rounded-3xl p-4 sm:p-5 shadow-xs space-y-4"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-neutral-50 border rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-orange-600">
              <Scissors className="w-4 h-4" />

              <span className="text-[10px] font-bold uppercase tracking-widest">
                Serviço
              </span>
            </div>

            <h3 className="text-sm font-extrabold text-neutral-950">
              {selectedService.name}
            </h3>

            <p className="text-xs text-neutral-500">
              {selectedService.duration} minutos
            </p>

            <p className="text-base font-extrabold text-neutral-950">
              {formatCurrency(selectedService.price)}
            </p>
          </div>

          <div className="bg-neutral-50 border rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-orange-600">
              <UserCheck className="w-4 h-4" />

              <span className="text-[10px] font-bold uppercase tracking-widest">
                Profissional
              </span>
            </div>

            <div className="flex items-center gap-3">
              <img
                src={selectedProfessional.avatar}
                alt={selectedProfessional.name}
                className="w-12 h-12 rounded-2xl object-cover border bg-white shrink-0"
                referrerPolicy="no-referrer"
              />

              <div className="min-w-0">
                <h3 className="text-sm font-extrabold text-neutral-950 truncate">
                  {selectedProfessional.name}
                </h3>

                <p className="text-xs text-neutral-500 truncate">
                  {selectedProfessional.role}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-orange-700">
              <CalendarDays className="w-4 h-4" />

              <span className="text-[10px] font-bold uppercase tracking-widest">
                Data
              </span>
            </div>

            <span className="text-sm font-extrabold text-neutral-950 block mt-2">
              {formattedDate}
            </span>
          </div>

          <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-orange-700">
              <Clock className="w-4 h-4" />

              <span className="text-[10px] font-bold uppercase tracking-widest">
                Horário
              </span>
            </div>

            <span className="text-sm font-extrabold text-neutral-950 block mt-2">
              {selectedTime}
            </span>
          </div>
        </div>

        <div className="bg-neutral-50 border rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-orange-600">
            <User className="w-4 h-4" />

            <span className="text-[10px] font-bold uppercase tracking-widest">
              Cliente
            </span>
          </div>

          <div className="space-y-1">
            <p className="text-sm font-extrabold text-neutral-950">
              {clientName}
            </p>

            <p className="text-xs font-bold text-neutral-500 flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-orange-600" />
              {clientPhone}
            </p>
          </div>
        </div>

        {selectedService.requireDeposit && (
          <div className="text-[11px] font-bold text-orange-700 bg-orange-100 border border-orange-200 rounded-2xl px-3 py-2">
            Para confirmar este serviço, poderá ser necessário pagar um sinal de{' '}
            {formatCurrency(selectedService.depositValue || 0)}.
          </div>
        )}

        <div className="bg-neutral-950 text-white rounded-2xl p-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />

          <p className="text-xs leading-relaxed text-neutral-200">
            Ao finalizar, seu agendamento será registrado e uma mensagem pronta será aberta no WhatsApp do estabelecimento.
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-3 rounded-xl text-xs font-extrabold border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 transition flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>

          <button
            type="submit"
            className="px-5 py-3 rounded-xl text-xs font-extrabold bg-orange-600 hover:bg-orange-700 text-white shadow-sm transition"
          >
            Finalizar agendamento
          </button>
        </div>
      </form>
    </section>
  );
}
