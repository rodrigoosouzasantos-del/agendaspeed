/**
 * Etapa da Vitrine de serviços - AgendaSpeed.
 *
 * Responsável por:
 * - listar categorias de serviços;
 * - permitir busca por serviço;
 * - listar serviços disponíveis de forma moderna e objetiva;
 * - avançar diretamente para escolha do profissional.
 */

import React, {
  useMemo,
  useState
} from 'react';

import {
  ArrowUpRight,
  ChevronRight,
  Clock,
  Search,
  Sparkles,
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
    <section className="mx-auto max-w-5xl px-4 py-5 sm:px-6 sm:py-8">
      <div className="rounded-[2rem] border border-neutral-200 bg-white/90 p-3 shadow-xl shadow-neutral-900/5 backdrop-blur sm:p-5">
        <div className="sticky top-0 z-20 -mx-3 -mt-3 rounded-t-[2rem] border-b border-neutral-200 bg-white/95 px-3 pb-4 pt-3 backdrop-blur sm:-mx-5 sm:-mt-5 sm:px-5 sm:pt-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-neutral-950 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white">
                <Sparkles className="h-3.5 w-3.5 text-orange-400" />
                Serviços
              </div>

              <h2 className="text-2xl font-black tracking-[-0.04em] text-neutral-950 sm:text-3xl">
                Escolha seu atendimento
              </h2>

              <p className="text-sm font-semibold leading-relaxed text-neutral-500">
                Toque em um serviço para ver profissionais, datas e horários disponíveis.
              </p>
            </div>

            <div className="relative w-full lg:max-w-sm">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />

              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Procurar serviço..."
                className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 py-3.5 pl-11 pr-4 text-sm font-bold text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/10"
              />
            </div>
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {categories.map((category) => {
              const isActive = activeCategory === category;

              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => onChangeCategory(category)}
                  className={`shrink-0 rounded-full border px-4 py-2.5 text-xs font-black tracking-[-0.01em] transition ${
                    isActive
                      ? 'border-neutral-950 bg-neutral-950 text-white shadow-lg shadow-neutral-950/15'
                      : 'border-neutral-200 bg-white text-neutral-700 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700'
                  }`}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </div>

        <div className="pt-4">
          {visibleServices.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-neutral-300 bg-neutral-50 p-10 text-center">
              <p className="text-sm font-black text-neutral-800">
                Nenhum serviço encontrado.
              </p>

              <p className="mt-1 text-xs font-semibold text-neutral-400">
                Tente buscar por outro nome ou escolha outra categoria.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {visibleServices.map((service) => (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => onSelectService(service)}
                  className="group relative w-full overflow-hidden rounded-3xl border border-neutral-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-xl hover:shadow-orange-950/10 sm:p-5"
                >
                  <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-orange-500 via-orange-600 to-orange-700 opacity-0 transition group-hover:opacity-100" />

                  <div className="flex items-start gap-4">
                    <div className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 ring-1 ring-orange-100 sm:flex">
                      <ArrowUpRight className="h-6 w-6 transition group-hover:rotate-45" />
                    </div>

                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-600">
                            {service.category}
                          </p>

                          <h4 className="mt-1 text-lg font-black leading-tight tracking-[-0.03em] text-neutral-950 sm:text-xl">
                            {service.name}
                          </h4>
                        </div>

                        <div className="shrink-0 rounded-2xl bg-neutral-950 px-3.5 py-2 text-left text-white shadow-lg shadow-neutral-950/10">
                          <span className="block text-[10px] font-black uppercase tracking-widest text-orange-300">
                            A partir de
                          </span>
                          <span className="block text-sm font-black">
                            {formatCurrency(service.price)}
                          </span>
                        </div>
                      </div>

                      <p className="text-sm font-medium leading-relaxed text-neutral-500">
                        {service.description || 'Serviço disponível para agendamento.'}
                      </p>

                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-black text-neutral-700">
                          <Clock className="h-3.5 w-3.5 text-orange-600" />
                          {formatDuration(service.duration)}
                        </span>

                        {service.requireDeposit && (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-black text-orange-700">
                            <WalletCards className="h-3.5 w-3.5" />
                            Sinal de {formatCurrency(service.depositValue || 0)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-orange-600 text-white shadow-lg shadow-orange-600/20 transition group-hover:scale-105 group-hover:bg-orange-700">
                      <ChevronRight className="h-5 w-5" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
