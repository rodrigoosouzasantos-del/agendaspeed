/**
 * Modal de cadastro e edição de produtos - AgendaSpeed.
 *
 * Escopo:
 * - código;
 * - descrição;
 * - valor de custo;
 * - valor de venda;
 * - status ativo/inativo.
 *
 * Não possui controle avançado de estoque.
 */

import React from "react";
import {
  Package,
  Save,
  X,
} from "lucide-react";

import { Product } from "../../../types";
import { formatCurrency } from "../owner.utils";

interface ProductModalProps {
  isOpen: boolean;
  editingProduct: Product | null;
  code: string;
  description: string;
  quantity: number;
  costPrice: number;
  salePrice: number;
  active: boolean;
  isSaving?: boolean;
  onChangeCode: (value: string) => void;
  onChangeDescription: (value: string) => void;
  onChangeQuantity: (value: number) => void;
  onChangeCostPrice: (value: number) => void;
  onChangeSalePrice: (value: number) => void;
  onChangeActive: (value: boolean) => void;
  onClose: () => void;
  onSubmit: (event: React.FormEvent) => void;
}

function parseCurrencyInput(value: string): number {
  const digits = value.replace(/\D/g, "");

  if (!digits) {
    return 0;
  }

  return Number(digits) / 100;
}

function formatCurrencyInput(value: number): string {
  return formatCurrency(Number(value) || 0);
}

export default function ProductModal({
  isOpen,
  editingProduct,
  code,
  description,
  costPrice,
  salePrice,
  active,
  isSaving = false,
  onChangeCode,
  onChangeDescription,
  onChangeCostPrice,
  onChangeSalePrice,
  onChangeActive,
  onClose,
  onSubmit,
}: ProductModalProps) {
  if (!isOpen) {
    return null;
  }

  const title = editingProduct ? "Editar Produto" : "Cadastrar Produto";

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="h-1.5 bg-[#0f4c5c]" />

        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0f4c5c]/10 text-[#0f4c5c]">
              <Package className="h-5 w-5" />
            </span>

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#0f4c5c]">
                AGENDASPEED
              </p>

              <h2 className="text-lg font-black text-neutral-950">
                {title}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            title="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={onSubmit}>
          <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2">
            <label className="space-y-1 sm:col-span-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                Código
              </span>

              <input
                type="text"
                value={code}
                onChange={(event) => onChangeCode(event.target.value.toUpperCase())}
                placeholder="Ex.: 0015"
                autoFocus
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-black uppercase text-slate-800 outline-none transition focus:border-[#0f4c5c] focus:bg-white"
              />
            </label>

            <label className="space-y-1 sm:col-span-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                Descrição do Produto
              </span>

              <input
                type="text"
                value={description}
                onChange={(event) => onChangeDescription(event.target.value)}
                placeholder="Ex.: Pomada Modeladora"
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-800 outline-none transition focus:border-[#0f4c5c] focus:bg-white"
              />
            </label>

            <label className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                Valor de Custo
              </span>

              <input
                type="text"
                inputMode="numeric"
                value={formatCurrencyInput(costPrice)}
                onChange={(event) =>
                  onChangeCostPrice(parseCurrencyInput(event.target.value))
                }
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-black text-slate-800 outline-none transition focus:border-[#0f4c5c] focus:bg-white"
              />
            </label>

            <label className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                Valor de Venda
              </span>

              <input
                type="text"
                inputMode="numeric"
                value={formatCurrencyInput(salePrice)}
                onChange={(event) =>
                  onChangeSalePrice(parseCurrencyInput(event.target.value))
                }
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-black text-slate-800 outline-none transition focus:border-[#0f4c5c] focus:bg-white"
              />
            </label>

            {editingProduct && (
              <label className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 sm:col-span-2">
                <div>
                  <p className="text-sm font-black text-slate-900">
                    Produto ativo
                  </p>

                  <p className="mt-0.5 text-xs font-semibold text-slate-500">
                    Produtos inativos não aparecem para seleção nos recebimentos.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onChangeActive(!active)}
                  className={`relative h-7 w-12 rounded-full transition ${
                    active ? "bg-emerald-500" : "bg-slate-300"
                  }`}
                  aria-pressed={active}
                >
                  <span
                    className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
                      active ? "left-6" : "left-1"
                    }`}
                  />
                </button>
              </label>
            )}

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 sm:col-span-2">
              <p className="text-xs font-semibold leading-relaxed text-slate-500">
                O valor de custo ficará visível apenas no painel administrativo.
                Na tela de venda aparecerão somente código, descrição e valor de venda.
              </p>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 px-5 py-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={
                isSaving ||
                !code.trim() ||
                !description.trim() ||
                salePrice < 0
              }
              className="flex items-center justify-center gap-2 rounded-xl bg-[#0f4c5c] px-5 py-2.5 text-sm font-black text-white transition hover:bg-[#123945] disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <Save className="h-4 w-4" />
              {isSaving ? "Salvando..." : "Salvar Produto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}