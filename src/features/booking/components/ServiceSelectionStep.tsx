/**
 * Etapa da Vitrine de serviços - AgendaZap.
 *
 * Responsável por:
 * - listar categorias de serviços;
 * - permitir busca por serviço;
 * - listar serviços disponíveis de forma neutra e objetiva;
 * - avançar diretamente para escolha do profissional.
 */

import React, {
  useMemo,
  useState
} from 'react';

import {
  ChevronRight,
  Clock,
  Search
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
    <section className="max-w-3xl mx-auto px-4 py-3 sm:py-4 space-y-4">
      <div className="sticky top-0 z-20 bg-neutral-50/95 backdrop-blur-sm pt-2 pb-3 -mx-4 px-4 space-y-3 border-b border-neutral-200/70">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categories.map((category) => {
            const isActive = activeCategory === category;

            return (
              <button
                key={category}
                type="button"
                onClick={() => onChangeCategory(category)}
                className={`px-4 py-2.5 rounded-full text-xs font-black border transition shrink-0 ${
                  isActive
                    ? 'bg-neutral-950 text-white border-neutral-950'
                    : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-3.5 w-4 h-4 text-neutral-400" />

          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Procurar serviço..."
            className="w-full rounded-2xl border border-neutral-200 bg-white py-3 pl-11 pr-4 text-sm font-semibold text-neutral-800 outline-none focus:border-orange-500"
          />
        </div>
      </div>

      <div className="bg-white border rounded-3xl p-3 sm:p-4 shadow-xs space-y-2">
        <div className="px-1 pb-1">
          <h3 className="text-sm font-black text-neutral-950">
            Serviços oferecidos
          </h3>
        </div>

        {visibleServices.length === 0 ? (
          <div className="border border-dashed rounded-2xl p-8 text-center">
            <p className="text-sm font-bold text-neutral-700">
              Nenhum serviço encontrado.
            </p>

            <p className="text-xs text-neutral-400 mt-1">
              Tente buscar por outro nome ou escolha outra categoria.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {visibleServices.map((service) => (
              <button
                key={service.id}
                type="button"
                onClick={() => onSelectService(service)}
                className="w-full text-left py-4 px-1 flex items-center gap-3 hover:bg-neutral-50 rounded-2xl transition"
              >
                <div className="flex-1 min-w-0 space-y-1">
                  <h4 className="text-[15px] sm:text-base font-black text-neutral-950 leading-snug">
                    {service.name}
                  </h4>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                    <span className="inline-flex items-center gap-1 font-bold">
                      <Clock className="w-3.5 h-3.5 text-orange-600" />
                      {formatDuration(service.duration)}
                    </span>

                    <span className="w-1 h-1 rounded-full bg-neutral-300" />

                    <span className="font-black text-neutral-900">
                      A partir de {formatCurrency(service.price)}
                    </span>
                  </div>

                  <p className="text-xs text-neutral-500 leading-relaxed line-clamp-2">
                    {service.description || 'Serviço disponível para agendamento.'}
                  </p>

                  {service.requireDeposit && (
                    <span className="inline-block text-[10px] font-bold text-orange-700 bg-orange-100 border border-orange-200 rounded-xl px-2 py-1">
                      Exige sinal de {formatCurrency(service.depositValue || 0)}
                    </span>
                  )}
                </div>

                <ChevronRight className="w-6 h-6 text-orange-600 shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
