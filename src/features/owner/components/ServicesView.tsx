/**
 * Tela de Serviços do Painel do Dono - AgendaSpeed.
 *
 * Responsável por:
 * - listar os serviços cadastrados;
 * - gerenciar categorias do catálogo;
 * - exibir categoria, valor, duração e descrição;
 * - exibir regra de sinal/pagamento antecipado;
 * - abrir modal de cadastro;
 * - abrir modal de edição.
 */

import React, {
  useMemo,
  useState
} from 'react';

import {
  Clock,
  Edit2,
  Plus,
  Search,
  Tag,
  X
} from 'lucide-react';

import { Service } from '../../../types';

import { formatCurrency } from '../owner.utils';

interface ServicesViewProps {
  services: Service[];
  categories: string[];
  categoryOrders: Record<string, number>;
  onOpenCreateService: () => void;
  onEditService: (service: Service) => void;
  onAddCategory: (category: string) => void;
  onDisableCategory: (category: string) => void;
  onChangeCategoryOrder: (category: string, order: number) => void;
}

function normalizeCategoryName(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

function normalizeSearch(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function getServiceDisplayOrder(service: Service): number {
  const serviceRecord = service as unknown as Record<string, unknown>;
  const displayOrder = Number(serviceRecord.displayOrder);

  return Number.isFinite(displayOrder) && displayOrder > 0
    ? displayOrder
    : 999;
}

export default function ServicesView({
  services,
  categories,
  categoryOrders,
  onOpenCreateService,
  onEditService,
  onAddCategory,
  onDisableCategory,
  onChangeCategoryOrder
}: ServicesViewProps) {
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [categoryDraft, setCategoryDraft] = useState('');
  const [serviceSearch, setServiceSearch] = useState('');

  const normalizedCategories = useMemo(() => {
    return Array.from(
      new Set(
        categories
          .map((category) => normalizeCategoryName(category))
          .filter(Boolean)
      )
    ).sort((firstCategory, secondCategory) => {
      const firstOrder = categoryOrders[firstCategory] ?? 999;
      const secondOrder = categoryOrders[secondCategory] ?? 999;

      if (firstOrder !== secondOrder) {
        return firstOrder - secondOrder;
      }

      return firstCategory.localeCompare(secondCategory, 'pt-BR');
    });
  }, [categories, categoryOrders]);

  const filteredServices = useMemo(() => {
    const normalizedSearch = normalizeSearch(serviceSearch);

    return [...services]
      .filter((service) => {
        if (!normalizedSearch) {
          return true;
        }

        return [
          service.name,
          service.category,
          service.description,
          String(service.price),
          String(service.duration)
        ].some((value) => normalizeSearch(value || '').includes(normalizedSearch));
      })
      .sort((firstService, secondService) => {
        const firstCategory = normalizeCategoryName(firstService.category);
        const secondCategory = normalizeCategoryName(secondService.category);
        const firstCategoryOrder = categoryOrders[firstCategory] ?? 999;
        const secondCategoryOrder = categoryOrders[secondCategory] ?? 999;

        if (firstCategoryOrder !== secondCategoryOrder) {
          return firstCategoryOrder - secondCategoryOrder;
        }

        const firstServiceOrder = getServiceDisplayOrder(firstService);
        const secondServiceOrder = getServiceDisplayOrder(secondService);

        if (firstServiceOrder !== secondServiceOrder) {
          return firstServiceOrder - secondServiceOrder;
        }

        return firstService.name.localeCompare(secondService.name, 'pt-BR');
      });
  }, [services, serviceSearch, categoryOrders]);

  const handleAddCategory = () => {
    const normalizedCategory = normalizeCategoryName(categoryDraft);

    if (!normalizedCategory) {
      return;
    }

    onAddCategory(normalizedCategory);
    setCategoryDraft('');
  };

  return (
    <div id="view-servicos" className="space-y-3 text-left animate-none">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="h-1.5 bg-[#0f4c5c]" />

        <div className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#0f4c5c]">
              AGENDASPEED
            </p>

            <h2 className="text-lg font-black tracking-tight text-neutral-950">
              Serviços
            </h2>
          </div>

          <div className="flex w-full flex-col gap-2 lg:max-w-3xl lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />

              <input
                type="search"
                value={serviceSearch}
                onChange={(event) => setServiceSearch(event.target.value)}
                placeholder="Buscar por serviço, categoria, preço ou duração"
                className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-[#0f4c5c] focus:bg-white"
              />
            </div>

            <div className="flex gap-2">
              <button
                id="btn-manage-service-categories"
                type="button"
                onClick={() => setShowCategoryManager((currentValue) => !currentValue)}
                className={`rounded-xl border px-3 py-2.5 text-xs font-black shadow-sm transition flex items-center justify-center gap-1.5 ${
                  showCategoryManager
                    ? 'border-[#0f4c5c] bg-[#0f4c5c]/5 text-[#0f4c5c]'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-[#0f4c5c]/40 hover:bg-slate-50'
                }`}
              >
                <Tag className="w-4 h-4" />
                Categorias
              </button>

              <button
                id="btn-add-service-trigger"
                type="button"
                onClick={onOpenCreateService}
                className="rounded-xl bg-[#0f4c5c] px-4 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-[#123945] flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Cadastrar Serviço
              </button>
            </div>
          </div>
        </div>
      </div>

      {showCategoryManager && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="bg-[#0f4c5c] px-4 py-3 text-white">
            <h3 className="text-sm font-black uppercase tracking-tight">
              Categorias
            </h3>
            <p className="mt-0.5 text-[11px] font-semibold text-white/80">
              Organize os grupos e a ordem de exibição na vitrine.
            </p>
          </div>

          <div className="space-y-3 p-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                id="input-service-category-name"
                type="text"
                value={categoryDraft}
                onChange={(event) => setCategoryDraft(event.target.value.toUpperCase())}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    handleAddCategory();
                  }
                }}
                placeholder="Ex: SOBRANCELHAS"
                className="h-10 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-black uppercase text-slate-700 outline-none transition focus:border-[#0f4c5c] focus:bg-white"
              />

              <button
                type="button"
                onClick={handleAddCategory}
                className="rounded-xl bg-[#0f4c5c] px-4 py-2.5 text-xs font-black text-white transition hover:bg-[#123945]"
              >
                Adicionar Categoria
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {normalizedCategories.map((category) => {
                const servicesInCategory = services.filter((service) => {
                  return normalizeCategoryName(service.category) === category;
                }).length;

                return (
                  <div
                    key={category}
                    className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="block truncate font-black text-slate-900">
                        {category}
                      </span>

                      <span className="text-[10px] font-bold text-slate-400">
                        {servicesInCategory} serviço(s)
                      </span>
                    </div>

                    <label className="flex items-center gap-1">
                      <span className="text-[9px] font-black uppercase text-slate-400">
                        Ordem
                      </span>

                      <input
                        type="number"
                        min={1}
                        value={categoryOrders[category] ?? 999}
                        onChange={(event) => {
                          onChangeCategoryOrder(category, Number(event.target.value));
                        }}
                        className="w-16 rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-xs font-black text-slate-800 outline-none focus:border-[#0f4c5c]"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => onDisableCategory(category)}
                      className={`h-8 w-8 shrink-0 rounded-xl flex items-center justify-center transition ${
                        servicesInCategory > 0
                          ? 'cursor-not-allowed text-slate-300'
                          : 'text-red-500 hover:bg-red-50'
                      }`}
                      title={
                        servicesInCategory > 0
                          ? 'Categoria com serviços cadastrados'
                          : 'Desativar categoria'
                      }
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {services.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center shadow-sm">
          <p className="text-sm font-black text-neutral-800">
            Nenhum serviço cadastrado.
          </p>

          <p className="mt-1 text-xs font-semibold text-slate-400">
            Clique em “Cadastrar Serviço” para criar os serviços que aparecerão no link público de agendamento.
          </p>
        </div>
      ) : filteredServices.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center shadow-sm">
          <p className="text-sm font-black text-neutral-800">
            Nenhum serviço encontrado.
          </p>

          <p className="mt-1 text-xs font-semibold text-slate-400">
            Ajuste a busca para localizar outro serviço.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filteredServices.map((service) => {
            const serviceOrder = getServiceDisplayOrder(service);
            const categoryName = normalizeCategoryName(service.category);

            return (
              <article
                id={`service-card-${service.id}`}
                key={service.id}
                className={`group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-[#0f4c5c]/35 hover:shadow-md ${
                  !service.active ? 'opacity-55' : ''
                }`}
              >
                <div className="h-1.5 bg-[#0f4c5c]" />

                <div className="p-3">
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                      <span className="rounded-full border border-[#0f4c5c]/15 bg-[#0f4c5c]/5 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.1em] text-[#0f4c5c]">
                        {categoryName || 'SEM CATEGORIA'}
                      </span>

                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.1em] text-slate-500">
                        Ordem {serviceOrder}
                      </span>
                    </div>

                    {service.requireDeposit && (
                      <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.08em] text-amber-700">
                        Sinal {formatCurrency(service.depositValue || 0)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="line-clamp-2 text-base font-black leading-tight text-neutral-950">
                        {service.name}
                      </h3>

                      <p className="mt-2 line-clamp-2 min-h-[36px] text-xs font-semibold leading-relaxed text-slate-500">
                        {service.description || 'Sem descrição cadastrada.'}
                      </p>
                    </div>

                    <div className="shrink-0 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-right">
                      <span className="block text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
                        Valor
                      </span>
                      <strong className="block text-base font-black text-[#0f4c5c]">
                        {formatCurrency(service.price)}
                      </strong>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                    <div className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-bold text-slate-600">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      <span>
                        {service.duration} min
                      </span>
                    </div>

                    <button
                      id={`btn-edit-service-${service.id}`}
                      type="button"
                      onClick={() => onEditService(service)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:border-[#0f4c5c]/40 hover:bg-[#0f4c5c]/5 hover:text-[#0f4c5c] flex items-center gap-1.5"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      Editar
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
