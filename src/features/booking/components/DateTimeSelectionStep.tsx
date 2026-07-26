/**
 * Etapa de seleção de data e horário - AgendaBless.
 *
 * Responsável por:
 * - listar datas disponíveis;
 * - listar horários disponíveis;
 * - permitir voltar para profissionais;
 * - avançar para dados do cliente.
 */

import React from 'react';
import {
  ArrowLeft,
  CalendarDays,
  Check,
  Clock
} from 'lucide-react';

import { DateTimeSelectionStepProps } from '../booking.types';

export default function DateTimeSelectionStep({
  selectedDate,
  selectedTime,
  dateOptions,
  timeSlots,
  onChangeDate,
  onChangeTime,
  onBack,
  onNextStep
}: DateTimeSelectionStepProps) {
  const canContinue = Boolean(selectedDate && selectedTime);

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
            Escolha a data e o horário
          </h2>

          <p className="text-sm text-neutral-500 mt-1">
            Selecione o melhor dia e horário disponível.
          </p>
        </div>
      </div>

      <div className="bg-white border rounded-3xl p-4 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-orange-600" />

          <h3 className="text-sm font-extrabold text-neutral-950">
            Escolha uma data
          </h3>
        </div>

        {dateOptions.length === 0 ? (
          <div className="border border-dashed rounded-2xl p-8 text-center">
            <p className="text-sm font-bold text-neutral-700">
              Nenhuma data disponível.
            </p>

            <p className="text-xs text-neutral-400 mt-1">
              O profissional escolhido não possui agenda aberta nos próximos dias.
            </p>
          </div>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {dateOptions.map((option) => {
              const isSelected = selectedDate === option.dateStr;

              return (
                <button
                  key={option.dateStr}
                  type="button"
                  onClick={() => {
                    onChangeDate(option.dateStr);
                    onChangeTime('');
                  }}
                  className={`min-w-[96px] rounded-2xl border p-3 text-center transition shrink-0 ${
                    isSelected
                      ? 'border-orange-500 bg-orange-50 shadow-sm'
                      : 'border-neutral-200 bg-white hover:bg-neutral-50 hover:border-neutral-300'
                  }`}
                >
                  <span
                    className={`text-[10px] font-bold uppercase tracking-widest block ${
                      isSelected ? 'text-orange-600' : 'text-neutral-400'
                    }`}
                  >
                    {option.dayOfWeekStr}
                  </span>

                  <span className="text-sm font-extrabold text-neutral-950 block mt-1">
                    {option.label}
                  </span>

                  {isSelected && (
                    <span className="mt-2 mx-auto w-5 h-5 rounded-full bg-orange-600 text-white flex items-center justify-center">
                      <Check className="w-3 h-3" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-white border rounded-3xl p-4 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-orange-600" />

          <h3 className="text-sm font-extrabold text-neutral-950">
            Escolha um horário
          </h3>
        </div>

        {!selectedDate ? (
          <div className="border border-dashed rounded-2xl p-8 text-center">
            <p className="text-sm font-bold text-neutral-700">
              Selecione uma data primeiro.
            </p>

            <p className="text-xs text-neutral-400 mt-1">
              Depois disso, mostraremos os horários livres para atendimento.
            </p>
          </div>
        ) : timeSlots.length === 0 ? (
          <div className="border border-dashed rounded-2xl p-8 text-center">
            <p className="text-sm font-bold text-neutral-700">
              Nenhum horário disponível nesta data.
            </p>

            <p className="text-xs text-neutral-400 mt-1">
              Horários que já passaram não ficam disponíveis para agendamento. Escolha outra data ou fale diretamente com o estabelecimento.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {timeSlots.map((slot) => {
              const isSelected = selectedTime === slot.time;

              return (
                <button
                  key={slot.time}
                  type="button"
                  disabled={!slot.available}
                  onClick={() => onChangeTime(slot.time)}
                  className={`rounded-xl border px-3 py-3 text-xs font-extrabold transition ${
                    isSelected
                      ? 'border-orange-600 bg-orange-600 text-white shadow-sm'
                      : slot.available
                        ? 'border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50 hover:border-neutral-300'
                        : 'border-neutral-100 bg-neutral-100 text-neutral-300 cursor-not-allowed'
                  }`}
                >
                  {slot.time}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="sticky bottom-0 bg-neutral-50/95 backdrop-blur-sm border-t border-neutral-200 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-3 rounded-xl text-xs font-extrabold border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 transition flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>

          <button
            type="button"
            onClick={onNextStep}
            disabled={!canContinue}
            className={`px-5 py-3 rounded-xl text-xs font-extrabold transition ${
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
