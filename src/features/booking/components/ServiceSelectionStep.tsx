/**
 * Etapa da Vitrine de serviços - AgendaBless.
 *
 * Responsável por:
 * - listar categorias de serviços;
 * - listar serviços disponíveis de forma direta;
 * - avançar diretamente para escolha do profissional.
 */

import React, { useState } from 'react';

import {
  ChevronRight,
  Clock,
  WalletCards
} from 'lucide-react';

import {
  ServiceSelectionStepProps
} from '../booking.types';

// Quantidade de caracteres exibidos antes de mostrar "ver mais".
const DESCRIPTION_PREVIEW_LIMIT = 110;

function formatCurrency(value: number): string {
  return `R$ ${value.toFixed(2)}`;
}

function truncateDescription(text: string, limit: number): string {
  if (text.length <= limit) {
    return text;
  }

  const sliced = text.slice(0, limit);
  const lastSpaceIndex = sliced.lastIndexOf(' ');

  const safeSlice = lastSpaceIndex > 40 ? sliced.slice(0, lastSpaceIndex) : sliced;

  return `${safeSlice.trimEnd()}...`;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes}min`;
}

export default function ServiceSelectionStep({
  services,
  categories,
  activeCategory,
  onChangeCategory,
  onSelectService
}: ServiceSelectionStepProps) {
  const [expandedServiceIds, setExpandedServiceIds] = useState<Set<string>>(new Set());

  const toggleDescription = (serviceId: string) => {
    setExpandedServiceIds((current) => {
      const next = new Set(current);

      if (next.has(serviceId)) {
        next.delete(serviceId);
      } else {
        next.add(serviceId);
      }

      return next;
    });
  };

  return (
    <section className="mx-auto max-w-5xl px-4 py-3 sm:px-6 sm:py-4">
      <div className="sticky top-0 z-20 -mx-4 border-b border-neutral-200/80 bg-neutral-50/95 px-4 pb-3 pt-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categories.map((category) => {
            const isActive = activeCategory === category;

            return (
              <button
                key={category}
                type="button"
                onClick={() => onChangeCategory(category)}
                className={`shrink-0 rounded-full border px-4 py-2.5 text-[11px] font-bold uppercase tracking-tight transition ${
                  isActive
                    ? 'border-neutral-950 bg-neutral-950 text-white shadow-lg shadow-neutral-900/15'
                    : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 hover:bg-neutral-100'
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3 space-y-3">
        {services.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-neutral-300 bg-white p-8 text-center">
            <p className="text-sm font-extrabold text-neutral-800">
              Nenhum serviço disponível.
            </p>

            <p className="mt-1 text-xs font-medium text-neutral-400">
              O estabelecimento ainda não possui serviços ativos para agendamento.
            </p>
          </div>
        ) : (
          services.map((service) => {
            const fullDescription =
              service.description || 'Serviço disponível para agendamento.';
            const isExpanded = expandedServiceIds.has(service.id);
            const isTruncatable = fullDescription.length > DESCRIPTION_PREVIEW_LIMIT;
            const visibleDescription = isExpanded
              ? fullDescription
              : truncateDescription(fullDescription, DESCRIPTION_PREVIEW_LIMIT);

            return (
            <div
              key={service.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelectService(service)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelectService(service);
                }
              }}
              className="group w-full cursor-pointer rounded-[1.75rem] border border-neutral-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-xl hover:shadow-orange-950/5 sm:p-5"
            >
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <span className="mb-2 inline-flex rounded-full bg-orange-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-orange-700 ring-1 ring-orange-100">
                    {service.category}
                  </span>

                  <h3 className="text-lg font-extrabold leading-tight tracking-[-0.03em] text-neutral-950 sm:text-xl">
                    {service.name}
                  </h3>

                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-extrabold text-neutral-600">
                    <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-1">
                      <Clock className="h-3.5 w-3.5 text-orange-600" />
                      {formatDuration(service.duration)}
                    </span>

                    {service.requireDeposit && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-orange-700">
                        <WalletCards className="h-3.5 w-3.5" />
                        Sinal de {formatCurrency(service.depositValue || 0)}
                      </span>
                    )}
                  </div>

                  <p className="mt-3 whitespace-pre-line break-words text-sm font-medium leading-relaxed text-neutral-500">
                    {visibleDescription}
                    {isTruncatable && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleDescription(service.id);
                        }}
                        className="ml-1.5 inline font-bold text-orange-700 underline decoration-orange-300 underline-offset-2 hover:text-orange-800"
                      >
                        {isExpanded ? 'ver menos' : 'ver mais'}
                      </button>
                    )}
                  </p>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-3">
                  <div className="rounded-2xl bg-neutral-950 px-4 py-3 text-right text-white shadow-lg shadow-neutral-900/10">
                    <span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-orange-300">
                      A partir de
                    </span>

                    <span className="block text-base font-extrabold leading-none tracking-tight">
                      {formatCurrency(service.price)}
                    </span>
                  </div>

                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-600 text-white shadow-lg shadow-orange-600/25 transition group-hover:bg-orange-700">
                    <ChevronRight className="h-5 w-5" />
                  </span>
                </div>
              </div>
            </div>
            );
          })
        )}
      </div>
    </section>
  );
}