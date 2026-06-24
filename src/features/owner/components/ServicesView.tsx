/**
 * Tela de Serviços do Painel do Dono - AgendaZap.
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

  const handleAddCategory = () => {
    const normalizedCategory = normalizeCategoryName(categoryDraft);

    if (!normalizedCategory) {
      return;
    }

    onAddCategory(normalizedCategory);
    setCategoryDraft('');
  };

  return (
    <div id="view-servicos" className="space-y-6 text-left animate-none">

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-neutral-950">
            Catálogo de Serviços
          </h2>

          <p className="text-xs text-neutral-500 mt-0.5">
            Cadastre categorias, serviços, ordem de exibição, durações, preços e regras de sinal.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <button 
            id="btn-manage-service-categories"
            type="button"
            onClick={() => setShowCategoryManager((currentValue) => !currentValue)}
            className="bg-white hover:bg-neutral-50 text-neutral-800 border text-xs font-bold px-4 py-3 rounded-xl shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Tag className="w-4 h-4" />
            Categorias
          </button>

          <button 
            id="btn-add-service-trigger"
            type="button"
            onClick={onOpenCreateService}
            className="bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold px-4 py-3 rounded-xl shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Cadastrar Serviço
          </button>
        </div>
      </div>

      {showCategoryManager && (
        <div className="bg-white border rounded-3xl p-5 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-black text-neutral-950">
              Gerenciar Categorias
            </h3>

            <p className="text-xs text-neutral-500 mt-1">
              Cadastre as categorias usadas no seu salão e defina a ordem em que aparecem na Vitrine.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
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
              className="flex-1 bg-neutral-50 border rounded-xl py-2.5 px-3.5 text-xs outline-none uppercase font-bold"
            />

            <button
              type="button"
              onClick={handleAddCategory}
              className="bg-neutral-950 hover:bg-neutral-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition"
            >
              Adicionar Categoria
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {normalizedCategories.map((category) => {
              const servicesInCategory = services.filter((service) => {
                return normalizeCategoryName(service.category) === category;
              }).length;

              return (
                <div
                  key={category}
                  className="flex items-center gap-2 rounded-2xl border bg-neutral-50 px-3 py-2 text-xs"
                >
                  <div className="flex-1 min-w-0">
                    <span className="font-black text-neutral-800 block truncate">
                      {category}
                    </span>

                    <span className="text-[10px] text-neutral-400 font-bold">
                      {servicesInCategory} serviço(s)
                    </span>
                  </div>

                  <label className="flex items-center gap-1">
                    <span className="text-[9px] font-black text-neutral-400 uppercase">
                      Ordem
                    </span>

                    <input
                      type="number"
                      min={1}
                      value={categoryOrders[category] ?? 999}
                      onChange={(event) => {
                        onChangeCategoryOrder(category, Number(event.target.value));
                      }}
                      className="w-16 rounded-xl border bg-white px-2 py-1.5 text-xs font-black text-neutral-800 outline-none"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => onDisableCategory(category)}
                    className={`w-7 h-7 rounded-xl flex items-center justify-center transition shrink-0 ${
                      servicesInCategory > 0
                        ? 'text-neutral-300 cursor-not-allowed'
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
      )}

      {services.length === 0 ? (
        <div className="bg-white border rounded-2xl p-12 text-center text-neutral-500 space-y-3">
          <p className="text-sm font-semibold text-neutral-800">
            Nenhum serviço cadastrado.
          </p>

          <p className="text-xs text-neutral-400">
            Clique em “Cadastrar Serviço” para criar os serviços que aparecerão no link público de agendamento.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {services.map((service) => (
            <div
              id={`service-card-${service.id}`}
              key={service.id}
              className={`bg-white border rounded-3xl p-5 shadow-xs flex flex-col justify-between ${
                !service.active ? 'opacity-55' : ''
              }`}
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] uppercase font-bold text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-md font-mono">
                      {normalizeCategoryName(service.category)}
                    </span>

                    <span className="text-[9px] uppercase font-bold text-orange-700 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-md font-mono">
                      Ordem {getServiceDisplayOrder(service)}
                    </span>
                  </div>

                  {service.requireDeposit && (
                    <span className="text-[9px] uppercase font-bold text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-md">
                      Sinal: {formatCurrency(service.depositValue || 0)}
                    </span>
                  )}
                </div>

                <div className="flex justify-between items-start gap-3">
                  <h3 className="text-base font-extrabold text-neutral-900 leading-snug">
                    {service.name}
                  </h3>

                  <span className="text-base font-black text-neutral-950 shrink-0">
                    {formatCurrency(service.price)}
                  </span>
                </div>

                <p className="text-xs text-neutral-500 line-clamp-2 leading-relaxed">
                  {service.description || 'Sem descrição cadastrada.'}
                </p>
              </div>

              <div className="flex items-center justify-between border-t pt-3.5 mt-4 border-neutral-100">

                <div className="flex items-center gap-1 text-xs text-neutral-500 font-mono font-medium">
                  <Clock className="w-3.5 h-3.5 text-zinc-400" />

                  <span>
                    Duração: <strong>{service.duration} min</strong>
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button 
                    id={`btn-edit-service-${service.id}`}
                    type="button"
                    onClick={() => onEditService(service)}
                    className="px-3 py-1.5 bg-neutral-50 hover:bg-neutral-100 border text-neutral-600 rounded-xl text-xs transition flex items-center gap-1 cursor-pointer font-bold"
                  >
                    <Edit2 className="w-3 h-3" />
                    Editar
                  </button>
                </div>

              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
