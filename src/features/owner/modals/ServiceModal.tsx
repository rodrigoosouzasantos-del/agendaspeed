/**
 * Modal de Cadastro/Edição de Serviço - AgendaZap.
 *
 * Responsável por:
 * - cadastrar novo serviço;
 * - editar serviço existente;
 * - definir categoria cadastrada pelo cliente;
 * - definir duração;
 * - definir ordem de exibição;
 * - definir preço com máscara monetária;
 * - definir regra de sinal/pagamento antecipado;
 * - definir descrição.
 */

import React from 'react';
import { X } from 'lucide-react';

import { Service } from '../../../types';

interface ServiceModalProps {
  isOpen: boolean;
  editingService: Service | null;

  name: string;
  category: string;
  categories: string[];
  duration: number;
  displayOrder: number;
  price: number;
  description: string;
  active: boolean;
  requireDeposit: boolean;
  depositValue: number;

  onChangeName: (value: string) => void;
  onChangeCategory: (value: string) => void;
  onChangeDuration: (value: number) => void;
  onChangeDisplayOrder: (value: number) => void;
  onChangePrice: (value: number) => void;
  onChangeDescription: (value: string) => void;
  onChangeActive: (value: boolean) => void;
  onChangeRequireDeposit: (value: boolean) => void;
  onChangeDepositValue: (value: number) => void;

  onClose: () => void;
  onSubmit: (event: React.FormEvent) => void;
}

function normalizeCategoryName(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

function parseCurrencyInput(value: string): number {
  const onlyDigits = value.replace(/\D/g, '');

  if (!onlyDigits) {
    return 0;
  }

  return Number(onlyDigits) / 100;
}

function formatCurrencyInput(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(Number.isFinite(value) ? value : 0);
}

export default function ServiceModal({
  isOpen,
  editingService,
  name,
  category,
  categories,
  duration,
  displayOrder,
  price,
  description,
  active,
  requireDeposit,
  depositValue,
  onChangeName,
  onChangeCategory,
  onChangeDuration,
  onChangeDisplayOrder,
  onChangePrice,
  onChangeDescription,
  onChangeActive,
  onChangeRequireDeposit,
  onChangeDepositValue,
  onClose,
  onSubmit
}: ServiceModalProps) {
  if (!isOpen) {
    return null;
  }

  const normalizedCategories = categories.map((item) => {
    return normalizeCategoryName(item);
  });

  return (
    <div
      id="modal-add-service"
      className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border text-left shadow-2xl relative space-y-4 max-h-[92vh] overflow-y-auto">

        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="text-lg font-black text-neutral-950">
            {editingService ? 'Editar Serviço' : 'Cadastrar Novo Serviço'}
          </h3>

          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 text-xs">

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-neutral-700 uppercase tracking-wider block">
              Nome do Serviço
            </label>

            <input 
              id="input-service-name"
              type="text" 
              placeholder="Ex: Corte de Cabelo Degradê"
              value={name}
              onChange={(event) => onChangeName(event.target.value)}
              className="w-full bg-neutral-50 border rounded-xl py-2 px-3 text-xs outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1 sm:col-span-1">
              <label className="text-[10px] font-bold text-neutral-700 uppercase tracking-wider block">
                Categoria
              </label>

              <select 
                id="select-service-category"
                value={normalizeCategoryName(category)}
                onChange={(event) => onChangeCategory(normalizeCategoryName(event.target.value))}
                className="w-full bg-neutral-50 border rounded-xl py-2 px-3 text-xs outline-none font-semibold"
                required
              >
                {normalizedCategories.map((item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-neutral-700 uppercase tracking-wider block">
                Duração (min)
              </label>

              <input 
                id="input-service-duration"
                type="number" 
                min={1}
                value={duration}
                onChange={(event) => onChangeDuration(Number(event.target.value))}
                className="w-full bg-neutral-50 border rounded-xl py-2 px-3 text-xs outline-none"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-neutral-700 uppercase tracking-wider block">
                Ordem
              </label>

              <input 
                id="input-service-display-order"
                type="number" 
                min={1}
                value={displayOrder}
                onChange={(event) => onChangeDisplayOrder(Number(event.target.value))}
                className="w-full bg-neutral-50 border rounded-xl py-2 px-3 text-xs outline-none"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-neutral-700 uppercase tracking-wider block">
              Preço de Tabela
            </label>

            <input 
              id="input-service-price"
              type="text" 
              inputMode="numeric"
              value={formatCurrencyInput(price)}
              onChange={(event) => onChangePrice(parseCurrencyInput(event.target.value))}
              className="w-full bg-neutral-50 border rounded-xl py-2 px-3 text-xs outline-none font-bold"
              required
            />
          </div>

          {editingService && (
            <div className="flex items-center justify-between bg-neutral-50 border rounded-2xl p-3">
              <div>
                <strong className="block text-neutral-800 font-bold">
                  Serviço ativo
                </strong>

                <span className="text-[10px] text-neutral-500">
                  Desative se este serviço não deve aparecer para agendamento.
                </span>
              </div>

              <input
                type="checkbox"
                checked={active}
                onChange={(event) => onChangeActive(event.target.checked)}
                className="w-4 h-4 text-orange-600 rounded"
              />
            </div>
          )}

          <div className="bg-orange-50/50 p-4 rounded-2xl border border-orange-100 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <strong className="block text-orange-950 font-bold font-sans">
                  Exigir pagamento antecipado (Sinal)?
                </strong>

                <span className="text-[10px] text-orange-700 select-none block mt-0.5">
                  Evite furos na agenda exigindo Pix de sinal.
                </span>
              </div>

              <input 
                id="input-service-require-dep"
                type="checkbox" 
                checked={requireDeposit}
                onChange={(event) => onChangeRequireDeposit(event.target.checked)}
                className="w-4 h-4 text-orange-600 rounded shrink-0"
              />
            </div>

            {requireDeposit && (
              <div className="space-y-1 pt-1.5 border-t border-orange-200">
                <label className="font-bold text-orange-850">
                  Valor Requerido de Sinal
                </label>

                <input 
                  id="input-service-dep-val"
                  type="text" 
                  inputMode="numeric"
                  value={formatCurrencyInput(depositValue)}
                  onChange={(event) => onChangeDepositValue(parseCurrencyInput(event.target.value))}
                  className="w-full bg-white border p-2 rounded-lg text-xs outline-none font-bold"
                />
              </div>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-neutral-700 uppercase tracking-wider block">
              Descrição do Serviço
            </label>

            <textarea 
              id="textarea-service-desc"
              placeholder="Explique o que inclui o serviço..."
              value={description}
              onChange={(event) => onChangeDescription(event.target.value)}
              rows={2}
              className="w-full bg-neutral-50 border rounded-xl py-2 px-3 text-xs outline-none"
            />
          </div>

          <button 
            id="btn-service-form-submit"
            type="submit"
            className="w-full bg-neutral-950 hover:bg-neutral-800 text-white font-bold py-3 rounded-xl transition text-sm cursor-pointer"
          >
            {editingService ? 'Salvar Serviço' : 'Cadastrar Serviço'}
          </button>

        </form>

      </div>
    </div>
  );
}
