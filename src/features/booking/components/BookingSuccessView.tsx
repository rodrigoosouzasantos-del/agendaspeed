/**
 * Tela de sucesso do agendamento público - AgendaZap.
 *
 * Responsável por:
 * - confirmar visualmente que o horário foi registrado;
 * - exibir resumo do agendamento;
 * - abrir WhatsApp com mensagem pré-configurada;
 * - permitir voltar para a página do estabelecimento.
 */

import React from 'react';

import {
  CalendarDays,
  CheckCircle2,
  Clock,
  MapPin,
  MessageCircle,
  Scissors,
  UserCheck
} from 'lucide-react';

import { BookingSuccessViewProps } from '../booking.types';

function formatCurrency(value: number): string {
  return `R$ ${value.toFixed(2)}`;
}

function formatDateBr(dateStr: string): string {
  if (!dateStr || !dateStr.includes('-')) {
    return dateStr;
  }

  return dateStr.split('-').reverse().join('/');
}

export default function BookingSuccessView({
  selectedService,
  selectedProfessional,
  selectedDate,
  selectedTime,
  clientName,
  companyName,
  companyAddress,
  whatsappUrl,
  onNavigateBack
}: BookingSuccessViewProps) {
  const formattedDate = formatDateBr(selectedDate);

  return (
    <section className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      
      <div className="bg-white border rounded-3xl p-6 sm:p-8 shadow-xs text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-9 h-9" />
        </div>

        <div>
          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest font-mono">
            Agendamento registrado
          </span>

          <h2 className="text-2xl font-black text-neutral-950 tracking-tight mt-1">
            Horário solicitado com sucesso!
          </h2>

          <p className="text-sm text-neutral-500 leading-relaxed mt-2 max-w-md mx-auto">
            {clientName}, seu horário foi registrado. Agora envie a mensagem pelo WhatsApp para o estabelecimento confirmar o atendimento.
          </p>
        </div>

        <a
          href={whatsappUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-black px-5 py-3 rounded-2xl transition shadow-sm"
        >
          <MessageCircle className="w-4 h-4" />
          Enviar confirmação pelo WhatsApp
        </a>
      </div>

      <div className="bg-white border rounded-3xl p-5 shadow-xs space-y-4">
        <h3 className="text-sm font-black text-neutral-950">
          Resumo do agendamento
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          
          <div className="bg-neutral-50 border rounded-2xl p-4">
            <div className="flex items-center gap-2 text-orange-600 mb-2">
              <Scissors className="w-4 h-4" />

              <span className="text-[10px] font-black uppercase tracking-widest font-mono">
                Serviço
              </span>
            </div>

            <h4 className="text-sm font-black text-neutral-950">
              {selectedService?.name || 'Serviço selecionado'}
            </h4>

            {selectedService && (
              <p className="text-xs text-neutral-500 mt-1">
                {selectedService.duration} minutos • {formatCurrency(selectedService.price)}
              </p>
            )}
          </div>

          <div className="bg-neutral-50 border rounded-2xl p-4">
            <div className="flex items-center gap-2 text-orange-600 mb-2">
              <UserCheck className="w-4 h-4" />

              <span className="text-[10px] font-black uppercase tracking-widest font-mono">
                Profissional
              </span>
            </div>

            {selectedProfessional ? (
              <div className="flex items-center gap-3">
                <img
                  src={selectedProfessional.avatar}
                  alt={selectedProfessional.name}
                  className="w-11 h-11 rounded-2xl object-cover border bg-white shrink-0"
                  referrerPolicy="no-referrer"
                />

                <div className="min-w-0">
                  <h4 className="text-sm font-black text-neutral-950 truncate">
                    {selectedProfessional.name}
                  </h4>

                  <p className="text-xs text-neutral-500 truncate">
                    {selectedProfessional.role}
                  </p>
                </div>
              </div>
            ) : (
              <h4 className="text-sm font-black text-neutral-950">
                Profissional selecionado
              </h4>
            )}
          </div>

          <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-orange-700 mb-2">
              <CalendarDays className="w-4 h-4" />

              <span className="text-[10px] font-black uppercase tracking-widest font-mono">
                Data
              </span>
            </div>

            <h4 className="text-sm font-black text-neutral-950">
              {formattedDate}
            </h4>
          </div>

          <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-orange-700 mb-2">
              <Clock className="w-4 h-4" />

              <span className="text-[10px] font-black uppercase tracking-widest font-mono">
                Horário
              </span>
            </div>

            <h4 className="text-sm font-black text-neutral-950">
              {selectedTime}
            </h4>
          </div>

        </div>

        <div className="bg-neutral-50 border rounded-2xl p-4">
          <div className="flex items-center gap-2 text-neutral-600 mb-2">
            <MapPin className="w-4 h-4 text-orange-600" />

            <span className="text-[10px] font-black uppercase tracking-widest font-mono">
              Local
            </span>
          </div>

          <h4 className="text-sm font-black text-neutral-950">
            {companyName}
          </h4>

          <p className="text-xs text-neutral-500 mt-1">
            {companyAddress || 'Endereço não informado.'}
          </p>
        </div>
      </div>

      <div className="flex justify-center">
        <button
          type="button"
          onClick={onNavigateBack}
          className="px-5 py-3 rounded-xl text-xs font-black border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 transition"
        >
          Voltar para o estabelecimento
        </button>
      </div>

    </section>
  );
}