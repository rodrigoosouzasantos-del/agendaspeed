/**
 * Tela de Produtos do Painel do Dono - AgendaBless.
 *
 * Escopo enxuto:
 * - cadastrar produtos usados apenas como complemento dos recebimentos;
 * - exibir código, descrição, custo e valor de venda;
 * - manter custo visível somente no painel administrativo;
 * - permitir busca, edição, ativação, desativação e exclusão;
 * - não implementar estoque avançado, fornecedores ou movimentações.
 */

import React, { useMemo, useState } from "react";
import {
  Edit2,
  Package,
  Plus,
  Power,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";

import { Product } from "../../../types";
import { formatCurrency } from "../owner.utils";

interface ProductsViewProps {
  products: Product[];
  onOpenCreateProduct: () => void;
  onEditProduct: (product: Product) => void;
  onToggleProductActive: (product: Product) => void;
  onDeleteProduct: (product: Product) => void;
}

function normalizeSearch(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export default function ProductsView({
  products,
  onOpenCreateProduct,
  onEditProduct,
  onToggleProductActive,
  onDeleteProduct,
}: ProductsViewProps) {
  const [productSearch, setProductSearch] = useState("");

  const filteredProducts = useMemo(() => {
    const normalizedSearch = normalizeSearch(productSearch);

    return [...products]
      .filter((product) => {
        if (!normalizedSearch) {
          return true;
        }

        return [
          product.code,
          product.description,
          String(product.costPrice),
          String(product.salePrice),
        ].some((value) => normalizeSearch(value || "").includes(normalizedSearch));
      })
      .sort((firstProduct, secondProduct) => {
        const codeComparison = firstProduct.code.localeCompare(
          secondProduct.code,
          "pt-BR",
          { numeric: true },
        );

        if (codeComparison !== 0) {
          return codeComparison;
        }

        return firstProduct.description.localeCompare(
          secondProduct.description,
          "pt-BR",
        );
      });
  }, [productSearch, products]);

  return (
    <div id="view-produtos" className="space-y-3 text-left animate-none">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="h-1.5 bg-[#0f4c5c]" />

        <div className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-[#0f4c5c]">
              AgendaBless
            </p>

            <h2 className="text-lg font-medium tracking-tight text-neutral-950">
              Produtos
            </h2>

            <p className="mt-0.5 text-xs font-normal text-slate-500">
              Cadastro simples para vendas adicionais nos recebimentos.
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 lg:max-w-3xl lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />

              <input
                type="search"
                value={productSearch}
                onChange={(event) => setProductSearch(event.target.value)}
                placeholder="Buscar por código, descrição ou valor"
                className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm font-normal text-slate-700 outline-none transition focus:border-[#0f4c5c] focus:bg-white"
              />
            </div>

            <button
              type="button"
              onClick={onOpenCreateProduct}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-[#0f4c5c] px-4 py-2.5 text-xs font-medium text-white shadow-sm transition hover:bg-[#123945]"
            >
              <Plus className="h-4 w-4" />
              Cadastrar Produto
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="border-b bg-[#0f4c5c] text-[10px] font-medium uppercase tracking-wider text-white">
              <tr>
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Descrição</th>
                <th className="px-4 py-3 text-right">Custo</th>
                <th className="px-4 py-3 text-right">Venda</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((product) => (
                <tr
                  key={product.id}
                  className={`transition hover:bg-slate-50 ${
                    !product.active ? "opacity-60" : ""
                  }`}
                >
                  <td className="px-4 py-3.5 font-medium text-[#0f4c5c]">
                    {product.code}
                  </td>

                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-[#0f4c5c]">
                        <Package className="h-4 w-4" />
                      </span>

                      <span className="font-medium text-slate-900">
                        {product.description}
                      </span>
                    </div>
                  </td>

                  <td className="px-4 py-3.5 text-right font-normal text-slate-600">
                    {formatCurrency(product.costPrice)}
                  </td>

                  <td className="px-4 py-3.5 text-right font-medium text-[#0f4c5c]">
                    {formatCurrency(product.salePrice)}
                  </td>

                  <td className="px-4 py-3.5 text-center">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-[9px] font-medium uppercase tracking-[0.08em] ${
                        product.active
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-slate-100 text-slate-500"
                      }`}
                    >
                      {product.active ? "Ativo" : "Inativo"}
                    </span>
                  </td>

                  <td className="px-4 py-3.5">
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => onEditProduct(product)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-[#0f4c5c]/40 hover:bg-[#0f4c5c]/5 hover:text-[#0f4c5c]"
                        title="Editar produto"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onToggleProductActive(product)}
                        className={`flex h-9 w-9 items-center justify-center rounded-xl border bg-white transition ${
                          product.active
                            ? "border-amber-200 text-amber-700 hover:bg-amber-50"
                            : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                        }`}
                        title={product.active ? "Desativar produto" : "Ativar produto"}
                      >
                        {product.active ? (
                          <Power className="h-4 w-4" />
                        ) : (
                          <RotateCcw className="h-4 w-4" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => onDeleteProduct(product)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-red-200 bg-white text-red-600 transition hover:bg-red-50"
                        title="Excluir produto"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <Package className="mx-auto h-9 w-9 text-slate-300" />

                    <p className="mt-3 text-sm font-normal text-slate-700">
                      Nenhum produto encontrado.
                    </p>

                    <p className="mt-1 text-xs font-normal text-slate-400">
                      Cadastre produtos simples para adicioná-los aos recebimentos.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-xs font-normal leading-relaxed text-slate-500">
          Os produtos são usados apenas como complementos nos recebimentos. Esta versão
          não possui controle de estoque, fornecedores, lotes ou inventário.
        </p>
      </div>
    </div>
  );
}
