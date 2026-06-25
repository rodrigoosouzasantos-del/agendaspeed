/**
 * Etapa da Vitrine de serviços - AgendaSpeed.
 *
 * Responsável por:
 * - listar categorias de serviços;
 * - permitir busca por serviço;
 * - listar serviços disponíveis de forma direta;
 * - avançar diretamente para escolha do profissional.
 */

import React, {
  useMemo,
  useState
} from 'react';

import {
  ChevronRight,
  Clock,
  Search,
  WalletCards
} from 'lucide-react';

import {
  ServiceSelectionStepProps
} from '../booking.types';

function formatCurrency(value: number): string {
  return `R$ ${value.toFixed(2)}`;
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
  const [searchTerm, setSearchTerm] = useState('');

  const visibleServices = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      return services;
    }

    return services.filter((service) => {
      return (
        service.name.toLowerCase().includes(normalizedSearch) ||
        service.description.toLowerCase().includes(normalizedSearch) ||
        service.category.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [
    services,
    searchTerm
  ]);

  return (
    <section className="mx-auto max-w-5xl px-4 py-4 sm:px-6 sm:py-5">
      <div className="sticky top-0 z-20 -mx-4 border-b border-neutral-200/80 bg-neutral-50/95 px-4 pb-3 pt-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="relative mb-3">
          <Search className="absolute left-4 top-3.5 h-4 w-4 text-neutral-400" />

          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Procurar serviço..."
            className="w-full rounded-2xl border border-neutral-200 bg-white py-3 pl-11 pr-4 text-sm font-bold text-neutral-800 outline-none shadow-sm transition placeholder:text-neutral-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {categories.map((category) => {
            const isActive = activeCategory === category;

            return (
              <button
                key={category}
                type="button"
                onClick={() => onChangeCategory(category)}
                className={`shrink-0 rounded-full border px-4 py-2.5 text-[11px] font-black uppercase tracking-tight transition ${
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

      <div className="mt-4 space-y-3">
        {visibleServices.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-neutral-300 bg-white p-8 text-center">
            <p className="text-sm font-black text-neutral-800">
              Nenhum serviço encontrado.
            </p>

            <p className="mt-1 text-xs font-semibold text-neutral-400">
              Tente buscar por outro nome ou escolha outra categoria.
            </p>
          </div>
        ) : (
          visibleServices.map((service) => (
            <button
              key={service.id}
              type="button"
              onClick={() => onSelectService(service)}
              className="group w-full rounded-[1.75rem] border border-neutral-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-xl hover:shadow-orange-950/5 sm:p-5"
            >
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <span className="mb-2 inline-flex rounded-full bg-orange-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-orange-700 ring-1 ring-orange-100">
                    {service.category}
                  </span>

                  <h3 className="text-lg font-black leading-tight tracking-[-0.03em] text-neutral-950 sm:text-xl">
                    {service.name}
                  </h3>

                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-black text-neutral-600">
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

                  <p className="mt-3 line-clamp-2 text-sm font-semibold leading-relaxed text-neutral-500">
                    {service.description || 'Serviço disponível para agendamento.'}
                  </p>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-3">
                  <div className="rounded-2xl bg-neutral-950 px-4 py-3 text-right text-white shadow-lg shadow-neutral-900/10">
                    <span className="block text-[10px] font-black uppercase tracking-[0.12em] text-orange-300">
                      A partir de
                    </span>

                    <span className="block text-base font-black leading-none tracking-tight">
                      {formatCurrency(service.price)}
                    </span>
                  </div>

                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-600 text-white shadow-lg shadow-orange-600/25 transition group-hover:bg-orange-700">
                    <ChevronRight className="h-5 w-5" />
                  </span>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </section>
  );
}
