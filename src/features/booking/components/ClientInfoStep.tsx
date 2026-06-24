/**
 * Etapa de dados do cliente - AgendaZap.
 *
 * Responsável por:
 * - coletar nome do cliente;
 * - coletar WhatsApp com máscara;
 * - avançar para o resumo final do agendamento.
 */

import React from 'react';

import {
  ArrowLeft,
  Phone,
  User
} from 'lucide-react';

import { ClientInfoStepProps } from '../booking.types';

function formatPhoneMask(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);

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

function hasValidClientPhone(value: string): boolean {
  return value.replace(/\D/g, '').length >= 10;
}

export default function ClientInfoStep({
  clientName,
  clientPhone,
  onChangeClientName,
  onChangeClientPhone,
  onBack,
  onNextStep
}: ClientInfoStepProps) {
  const canContinue = Boolean(
    clientName.trim() &&
    hasValidClientPhone(clientPhone)
  );

  const handleContinue = () => {
    if (!canContinue) {
      return;
    }

    onNextStep();
  };

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
          <h2 className="text-2xl sm:text-3xl font-black text-neutral-950 tracking-tight">
            Dados do cliente
          </h2>

          <p className="text-sm text-neutral-500 mt-1">
            Informe seu nome e WhatsApp para continuar.
          </p>
        </div>
      </div>

      <div className="bg-white border rounded-3xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="space-y-1">
          <label
            htmlFor="booking-client-name"
            className="text-[10px] font-black text-neutral-600 uppercase tracking-widest font-mono block"
          >
            Nome completo
          </label>

          <div className="relative">
            <User className="absolute left-3.5 top-3 w-4 h-4 text-neutral-400" />

            <input
              id="booking-client-name"
              type="text"
              value={clientName}
              onChange={(event) => onChangeClientName(event.target.value)}
              placeholder="Digite seu nome completo"
              className="w-full bg-neutral-50 border rounded-xl py-3 pl-10 pr-3.5 text-sm outline-none focus:border-orange-500"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label
            htmlFor="booking-client-phone"
            className="text-[10px] font-black text-neutral-600 uppercase tracking-widest font-mono block"
          >
            WhatsApp
          </label>

          <div className="relative">
            <Phone className="absolute left-3.5 top-3 w-4 h-4 text-neutral-400" />

            <input
              id="booking-client-phone"
              type="tel"
              value={clientPhone}
              onChange={(event) => onChangeClientPhone(formatPhoneMask(event.target.value))}
              placeholder="(99) 99999-9999"
              className="w-full bg-neutral-50 border rounded-xl py-3 pl-10 pr-3.5 text-sm outline-none focus:border-orange-500"
            />
          </div>
        </div>

        <div className="bg-neutral-50 border rounded-2xl p-3">
          <p className="text-[11px] text-neutral-600 leading-relaxed">
            Usaremos estes dados apenas para identificar seu agendamento e permitir contato pelo WhatsApp.
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-3 rounded-xl text-xs font-black border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 transition flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>

          <button
            type="button"
            onClick={handleContinue}
            disabled={!canContinue}
            className={`px-5 py-3 rounded-xl text-xs font-black transition ${
              canContinue
                ? 'bg-orange-600 hover:bg-orange-700 text-white shadow-sm'
                : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
            }`}
          >
            Continuar
          </button>
        </div>
      </div>
    </section>
  );
}
