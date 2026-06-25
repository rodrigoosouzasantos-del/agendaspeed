/**
 * Etapa de escolha do profissional - AgendaSpeed.
 *
 * Responsável por:
 * - listar somente profissionais habilitados para o serviço;
 * - exibir o valor final do serviço com aquele profissional;
 * - avançar para escolha de data e horário ao selecionar o profissional.
 */

import React from 'react';

import {
  ArrowLeft,
  ChevronRight,
  UserCheck
} from 'lucide-react';

import {
  ProfessionalSelectionStepProps
} from '../booking.types';

import {
  Professional,
  Service
} from '../../../types';

function formatCurrency(value: number): string {
  return `R$ ${value.toFixed(2)}`;
}

function getProfessionalServicePrice(params: {
  service: Service;
  professional: Professional;
}): number {
  const {
    service,
    professional
  } = params;

  const professionalRecord = professional as unknown as Record<string, unknown>;
  const servicePrices = professionalRecord.servicePrices;

  if (
    servicePrices &&
    typeof servicePrices === 'object' &&
    service.id in servicePrices
  ) {
    const customPrice = Number(
      (servicePrices as Record<string, unknown>)[service.id]
    );

    if (!Number.isNaN(customPrice) && customPrice > 0) {
      return customPrice;
    }
  }

  return service.price;
}

export default function ProfessionalSelectionStep({
  selectedService,
  selectedProfessional,
  availableProfessionals,
  onSelectProfessional,
  onBack
}: ProfessionalSelectionStepProps) {
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
            Escolha o profissional
          </h2>

          <p className="text-sm text-neutral-500 mt-1">
            Toque em quem você prefere para realizar o atendimento.
          </p>
        </div>
      </div>

      <div className="bg-white border rounded-3xl p-3 sm:p-4 shadow-xs space-y-2">
        <div className="flex items-center gap-2 px-1 pb-1">
          <UserCheck className="w-4 h-4 text-orange-600" />

          <h3 className="text-sm font-extrabold text-neutral-950">
            Profissionais disponíveis
          </h3>
        </div>

        {availableProfessionals.length === 0 ? (
          <div className="border border-dashed rounded-2xl p-8 text-center">
            <p className="text-sm font-bold text-neutral-700">
              Nenhum profissional disponível para este serviço.
            </p>

            <p className="text-xs text-neutral-400 mt-1">
              Volte e escolha outro serviço ou fale diretamente com o estabelecimento.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {availableProfessionals.map((professional) => {
              const isSelected = selectedProfessional?.id === professional.id;
              const finalPrice = getProfessionalServicePrice({
                service: selectedService,
                professional
              });

              return (
                <button
                  key={professional.id}
                  type="button"
                  onClick={() => onSelectProfessional(professional)}
                  className={`w-full text-left py-4 px-1 flex items-center gap-3 rounded-2xl transition ${
                    isSelected
                      ? 'bg-orange-50'
                      : 'hover:bg-neutral-50'
                  }`}
                >
                  <img
                    src={professional.avatar}
                    alt={professional.name}
                    className="w-16 h-16 rounded-2xl object-cover border bg-neutral-100 shrink-0"
                    referrerPolicy="no-referrer"
                  />

                  <div className="flex-1 min-w-0">
                    <h4 className="text-[15px] font-extrabold text-neutral-950 truncate">
                      {professional.name}
                    </h4>

                    <p className="text-xs text-neutral-500 truncate mt-1">
                      {professional.role}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className="rounded-full bg-orange-50 border border-orange-100 px-2.5 py-1 text-[11px] font-extrabold text-orange-800">
                        {formatCurrency(finalPrice)}
                      </span>
                    </div>
                  </div>

                  <ChevronRight className="w-6 h-6 text-orange-600 shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
