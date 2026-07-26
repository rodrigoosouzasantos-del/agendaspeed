/**
 * Tela de Serviços e Categorias do Painel do Dono - AgendaBless.
 *
 * Regras:
 * - Serviços e categorias são modos separados para evitar poluição visual;
 * - nenhuma ação crítica usa alert/confirm nativo;
 * - desativar categoria desativa também todos os serviços vinculados;
 * - reativar categoria não reativa serviços automaticamente;
 * - exclusão definitiva só é permitida quando não existem serviços vinculados.
 */

import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Edit2,
  Plus,
  Power,
  RotateCcw,
  Search,
  Tag,
  Trash2,
  X
} from 'lucide-react';

import { Service } from '../../../types';
import { formatCurrency } from '../owner.utils';

export interface ServiceActionResult {
  success: boolean;
  title: string;
  message: string;
}

interface ServicesViewProps {
  services: Service[];
  categories: string[];
  categoryOrders: Record<string, number>;
  categoryStatuses: Record<string, boolean>;
  onOpenCreateService: () => void;
  onEditService: (service: Service) => void;
  onAddCategory: (category: string) => Promise<ServiceActionResult>;
  onRenameCategory: (currentName: string, newName: string) => Promise<ServiceActionResult>;
  onToggleCategoryActive: (category: string) => Promise<ServiceActionResult>;
  onToggleServiceActive: (service: Service) => Promise<ServiceActionResult>;
  onDeleteService: (service: Service) => Promise<ServiceActionResult>;
  onDeleteCategory: (category: string) => Promise<ServiceActionResult>;
  onChangeCategoryOrder: (category: string, order: number) => Promise<ServiceActionResult>;
}

type ScreenMode = 'services' | 'categories';

type PendingAction =
  | { type: 'toggle-service'; service: Service }
  | { type: 'delete-service'; service: Service }
  | { type: 'toggle-category'; category: string; active: boolean }
  | { type: 'delete-category'; category: string; hasServices: boolean };

interface FeedbackState {
  success: boolean;
  title: string;
  message: string;
}

function normalizeCategoryName(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toUpperCase();
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
  return Number.isFinite(displayOrder) && displayOrder > 0 ? displayOrder : 999;
}

export default function ServicesView({
  services,
  categories,
  categoryOrders,
  categoryStatuses,
  onOpenCreateService,
  onEditService,
  onAddCategory,
  onRenameCategory,
  onToggleCategoryActive,
  onToggleServiceActive,
  onDeleteService,
  onDeleteCategory,
  onChangeCategoryOrder
}: ServicesViewProps) {
  const [mode, setMode] = useState<ScreenMode>('services');
  const [categoryDraft, setCategoryDraft] = useState('');
  const [serviceSearch, setServiceSearch] = useState('');
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingCategoryDraft, setEditingCategoryDraft] = useState('');
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  const normalizedCategories = useMemo(() => {
    return Array.from(
      new Set(categories.map(normalizeCategoryName).filter(Boolean))
    ).sort((firstCategory, secondCategory) => {
      const firstOrder = categoryOrders[firstCategory] ?? 999;
      const secondOrder = categoryOrders[secondCategory] ?? 999;
      if (firstOrder !== secondOrder) return firstOrder - secondOrder;
      return firstCategory.localeCompare(secondCategory, 'pt-BR');
    });
  }, [categories, categoryOrders]);

  const filteredServices = useMemo(() => {
    const normalizedSearch = normalizeSearch(serviceSearch);
    return [...services]
      .filter((service) => {
        if (!normalizedSearch) return true;
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

  const pendingCopy = useMemo(() => {
    if (!pendingAction) return null;

    if (pendingAction.type === 'toggle-service') {
      return pendingAction.service.active
        ? {
            title: 'Desativar serviço?',
            message: 'O serviço deixará de aparecer na vitrine, mas o histórico será preservado.',
            confirmLabel: 'Desativar serviço',
            danger: false
          }
        : {
            title: 'Ativar serviço?',
            message: 'O serviço voltará a aparecer na vitrine para novos agendamentos.',
            confirmLabel: 'Ativar serviço',
            danger: false
          };
    }

    if (pendingAction.type === 'delete-service') {
      return {
        title: 'Excluir serviço definitivamente?',
        message: 'Esta ação não poderá ser desfeita. Serviços com agendamentos vinculados não serão apagados.',
        confirmLabel: 'Excluir serviço',
        danger: true
      };
    }

    if (pendingAction.type === 'toggle-category') {
      return pendingAction.active
        ? {
            title: 'Desativar categoria?',
            message: 'A categoria e todos os serviços vinculados deixarão de aparecer na vitrine. O histórico será preservado.',
            confirmLabel: 'Desativar categoria',
            danger: false
          }
        : {
            title: 'Ativar categoria?',
            message: 'A categoria voltará ao cadastro. Os serviços continuarão desativados para que você escolha quais deseja disponibilizar.',
            confirmLabel: 'Ativar categoria',
            danger: false
          };
    }

    if (pendingAction.hasServices) {
      return {
        title: 'Esta categoria ainda possui serviços',
        message: 'Para excluí-la definitivamente, exclua os serviços vinculados. Você também pode desativar a categoria e todos eles.',
        confirmLabel: 'Desativar categoria',
        danger: false
      };
    }

    return {
      title: 'Excluir categoria definitivamente?',
      message: 'Esta ação não poderá ser desfeita. A categoria será removida do cadastro.',
      confirmLabel: 'Excluir categoria',
      danger: true
    };
  }, [pendingAction]);

  const showResult = (result: ServiceActionResult) => {
    setFeedback(result);
  };

  const handleAddCategory = async () => {
    const normalizedCategory = normalizeCategoryName(categoryDraft);
    if (!normalizedCategory || isProcessingAction) return;

    setIsProcessingAction(true);
    const result = await onAddCategory(normalizedCategory);
    setIsProcessingAction(false);
    showResult(result);

    if (result.success) setCategoryDraft('');
  };

  const handleSaveCategoryName = async (currentName: string) => {
    const normalizedName = normalizeCategoryName(editingCategoryDraft);
    if (!normalizedName || isProcessingAction) return;

    setIsProcessingAction(true);
    const result = await onRenameCategory(currentName, normalizedName);
    setIsProcessingAction(false);
    showResult(result);

    if (result.success) {
      setEditingCategory(null);
      setEditingCategoryDraft('');
    }
  };

  const handleChangeOrder = async (category: string, order: number) => {
    const result = await onChangeCategoryOrder(category, order);
    if (!result.success) showResult(result);
  };

  const executePendingAction = async () => {
    if (!pendingAction || isProcessingAction) return;

    setIsProcessingAction(true);
    let result: ServiceActionResult;

    if (pendingAction.type === 'toggle-service') {
      result = await onToggleServiceActive(pendingAction.service);
    } else if (pendingAction.type === 'delete-service') {
      result = await onDeleteService(pendingAction.service);
    } else if (pendingAction.type === 'toggle-category') {
      result = await onToggleCategoryActive(pendingAction.category);
    } else if (pendingAction.hasServices) {
      result = await onToggleCategoryActive(pendingAction.category);
    } else {
      result = await onDeleteCategory(pendingAction.category);
    }

    setIsProcessingAction(false);
    setPendingAction(null);
    showResult(result);
  };

  return (
    <div id="view-servicos" className="space-y-3 text-left animate-none">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="h-1.5 bg-[#0f4c5c]" />
        <div className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#0f4c5c]">AgendaBless</p>
            <h2 className="text-lg font-semibold tracking-tight text-neutral-950">
              {mode === 'services' ? 'Serviços' : 'Categorias'}
            </h2>
          </div>

          {mode === 'services' ? (
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
                  type="button"
                  onClick={() => setMode('categories')}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-black text-slate-700 shadow-sm transition hover:border-[#0f4c5c]/40 hover:bg-slate-50"
                >
                  <Tag className="h-4 w-4" /> Categorias
                </button>
                <button
                  type="button"
                  onClick={onOpenCreateService}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-[#0f4c5c] px-4 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-[#123945]"
                >
                  <Plus className="h-4 w-4" /> Cadastrar Serviço
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setMode('services')}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 shadow-sm transition hover:border-[#0f4c5c]/40 hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" /> Voltar para Serviços
            </button>
          )}
        </div>
      </div>

      {mode === 'categories' ? (
        <section className="space-y-3">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="bg-[#0f4c5c] px-4 py-3 text-white">
              <h3 className="text-sm font-black uppercase tracking-tight">Gerenciar categorias</h3>
              <p className="mt-0.5 text-[11px] font-semibold text-white/80">As categorias definem os botões exibidos no carrossel da vitrine.</p>
            </div>
            <div className="flex flex-col gap-2 p-4 sm:flex-row">
              <input
                type="text"
                value={categoryDraft}
                onChange={(event) => setCategoryDraft(event.target.value.toUpperCase())}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void handleAddCategory();
                  }
                }}
                placeholder="Ex: SOBRANCELHAS"
                className="h-11 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-black uppercase text-slate-700 outline-none transition focus:border-[#0f4c5c] focus:bg-white"
              />
              <button
                type="button"
                onClick={() => void handleAddCategory()}
                disabled={!categoryDraft.trim() || isProcessingAction}
                className="rounded-xl bg-[#0f4c5c] px-5 py-3 text-xs font-black text-white transition hover:bg-[#123945] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Adicionar Categoria
              </button>
            </div>
          </div>

          {normalizedCategories.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center shadow-sm">
              <p className="text-sm font-black text-neutral-800">Nenhuma categoria cadastrada.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {normalizedCategories.map((category) => {
                const active = categoryStatuses[category] !== false;
                const hasServices = services.some(
                  (service) => normalizeCategoryName(service.category) === category
                );
                const isEditing = editingCategory === category;

                return (
                  <article
                    key={category}
                    className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${active ? 'border-slate-200' : 'border-slate-200 opacity-70'}`}
                  >
                    <div className={`h-1.5 ${active ? 'bg-[#0f4c5c]' : 'bg-slate-400'}`} />
                    <div className="space-y-4 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          {isEditing ? (
                            <div className="flex gap-2">
                              <input
                                autoFocus
                                type="text"
                                value={editingCategoryDraft}
                                onChange={(event) => setEditingCategoryDraft(event.target.value.toUpperCase())}
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter') {
                                    event.preventDefault();
                                    void handleSaveCategoryName(category);
                                  }
                                  if (event.key === 'Escape') {
                                    setEditingCategory(null);
                                  }
                                }}
                                className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-black uppercase outline-none focus:border-[#0f4c5c]"
                              />
                              <button
                                type="button"
                                onClick={() => void handleSaveCategoryName(category)}
                                className="rounded-xl bg-[#0f4c5c] px-3 text-xs font-black text-white"
                              >
                                Salvar
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingCategory(null)}
                                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <h3 className="truncate text-lg font-black text-[#1A3038]">{category}</h3>
                              <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.1em] ${active ? 'border border-emerald-200 bg-emerald-50 text-emerald-700' : 'border border-slate-200 bg-slate-100 text-slate-500'}`}>
                                {active ? 'Ativa' : 'Desativada'}
                              </span>
                            </>
                          )}
                        </div>

                        <label className="flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                          <span className="text-[9px] font-black uppercase text-slate-400">Ordem</span>
                          <input
                            type="number"
                            min={1}
                            value={categoryOrders[category] ?? 999}
                            onChange={(event) => void handleChangeOrder(category, Number(event.target.value))}
                            className="w-16 bg-transparent text-sm font-black text-slate-800 outline-none"
                          />
                        </label>
                      </div>

                      {!isEditing && (
                        <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-4">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCategory(category);
                              setEditingCategoryDraft(category);
                            }}
                            className="flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-2 py-2.5 text-[10px] font-black text-slate-700 transition hover:border-[#0f4c5c]/40 hover:bg-[#0f4c5c]/5 hover:text-[#0f4c5c]"
                          >
                            <Edit2 className="h-3.5 w-3.5" /> Editar nome
                          </button>
                          <button
                            type="button"
                            onClick={() => setPendingAction({ type: 'toggle-category', category, active })}
                            className={`flex items-center justify-center gap-1 rounded-xl border px-2 py-2.5 text-[10px] font-black transition ${active ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100' : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
                          >
                            {active ? <Power className="h-3.5 w-3.5" /> : <RotateCcw className="h-3.5 w-3.5" />}
                            {active ? 'Desativar' : 'Ativar'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setPendingAction({ type: 'delete-category', category, hasServices })}
                            className="flex items-center justify-center gap-1 rounded-xl border border-red-200 bg-red-50 px-2 py-2.5 text-[10px] font-black text-red-600 transition hover:bg-red-100"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Excluir
                          </button>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      ) : services.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center shadow-sm">
          <p className="text-sm font-black text-neutral-800">Nenhum serviço cadastrado.</p>
          <p className="mt-1 text-xs font-semibold text-slate-400">Clique em “Cadastrar Serviço” para criar os serviços que aparecerão no link público de agendamento.</p>
        </div>
      ) : filteredServices.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center shadow-sm">
          <p className="text-sm font-black text-neutral-800">Nenhum serviço encontrado.</p>
          <p className="mt-1 text-xs font-semibold text-slate-400">Ajuste a busca para localizar outro serviço.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filteredServices.map((service) => {
            const serviceOrder = getServiceDisplayOrder(service);
            const categoryName = normalizeCategoryName(service.category);
            return (
              <article key={service.id} className={`group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-[#0f4c5c]/35 hover:shadow-md ${!service.active ? 'opacity-60' : ''}`}>
                <div className={`h-1.5 ${service.active ? 'bg-[#0f4c5c]' : 'bg-slate-400'}`} />
                <div className="p-3">
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                      <span className="rounded-full border border-[#0f4c5c]/15 bg-[#0f4c5c]/5 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.1em] text-[#0f4c5c]">{categoryName || 'SEM CATEGORIA'}</span>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.1em] text-slate-500">Ordem {serviceOrder}</span>
                      <span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.1em] ${service.active ? 'border border-emerald-200 bg-emerald-50 text-emerald-700' : 'border border-slate-200 bg-slate-100 text-slate-500'}`}>{service.active ? 'Ativo' : 'Desativado'}</span>
                    </div>
                    {service.requireDeposit && (
                      <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.08em] text-amber-700">Sinal {formatCurrency(service.depositValue || 0)}</span>
                    )}
                  </div>

                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="line-clamp-2 text-base font-semibold leading-tight text-neutral-950">{service.name}</h3>
                      <p className="mt-2 line-clamp-2 min-h-[36px] text-xs font-semibold leading-relaxed text-slate-500">{service.description || 'Sem descrição cadastrada.'}</p>
                    </div>
                    <div className="shrink-0 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-right">
                      <span className="block text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">Valor</span>
                      <strong className="block text-base font-black text-[#0f4c5c]">{formatCurrency(service.price)}</strong>
                    </div>
                  </div>

                  <div className="mt-3 border-t border-slate-100 pt-3">
                    <div className="mb-2 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-bold text-slate-600">
                      <Clock className="h-3.5 w-3.5 text-slate-400" /> {service.duration} min
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <button type="button" onClick={() => onEditService(service)} className="flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-2 py-2 text-[10px] font-black text-slate-700 transition hover:border-[#0f4c5c]/40 hover:bg-[#0f4c5c]/5 hover:text-[#0f4c5c]">
                        <Edit2 className="h-3.5 w-3.5" /> Editar
                      </button>
                      <button type="button" onClick={() => setPendingAction({ type: 'toggle-service', service })} className={`flex items-center justify-center gap-1 rounded-xl border px-2 py-2 text-[10px] font-black transition ${service.active ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100' : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>
                        {service.active ? <Power className="h-3.5 w-3.5" /> : <RotateCcw className="h-3.5 w-3.5" />}
                        {service.active ? 'Desativar' : 'Ativar'}
                      </button>
                      <button type="button" onClick={() => setPendingAction({ type: 'delete-service', service })} className="flex items-center justify-center gap-1 rounded-xl border border-red-200 bg-red-50 px-2 py-2 text-[10px] font-black text-red-600 transition hover:bg-red-100">
                        <Trash2 className="h-3.5 w-3.5" /> Excluir
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {pendingAction && pendingCopy && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-4">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${pendingCopy.danger ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700'}`}>
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-[#1A3038]">{pendingCopy.title}</h3>
                <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">{pendingCopy.message}</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" disabled={isProcessingAction} onClick={() => setPendingAction(null)} className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:opacity-60">Cancelar</button>
              <button type="button" disabled={isProcessingAction} onClick={() => void executePendingAction()} className={`rounded-2xl px-4 py-2.5 text-sm font-black text-white transition disabled:opacity-60 ${pendingCopy.danger ? 'bg-red-600 hover:bg-red-700' : 'bg-[#0f4c5c] hover:bg-[#123945]'}`}>{isProcessingAction ? 'Processando...' : pendingCopy.confirmLabel}</button>
            </div>
          </div>
        </div>
      )}

      {feedback && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-4">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${feedback.success ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                {feedback.success ? <CheckCircle2 className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
              </div>
              <div>
                <h3 className="text-lg font-black text-[#1A3038]">{feedback.title}</h3>
                <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">{feedback.message}</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button type="button" onClick={() => setFeedback(null)} className="rounded-2xl bg-[#0f4c5c] px-5 py-2.5 text-sm font-black text-white transition hover:bg-[#123945]">Entendi</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
