import React from 'react';

import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Package,
  Plus,
  Printer,
  Trash2
} from 'lucide-react';

import { PaymentType } from '../../../types';

interface ReceiptsCheckoutViewProps {
  context: Record<string, any>;
}

export default function ReceiptsCheckoutView({
  context
}: ReceiptsCheckoutViewProps) {
  const {
    canShowCheckout,
    cashAmountPaid,
    cashChange,
    checkoutMode,
    clients,
    defaultAreaCode,
    discountValue,
    extraItems,
    formatCurrency,
    formatCurrencyInput,
    formatDateBr,
    formatManualPhoneInput,
    formatCpfForDisplay,
    formatPhoneForDisplay,
    getAppointmentDate,
    getAppointmentServiceDescription,
    getAppointmentProfessionalName,
    getAppointmentServiceName,
    getAppointmentTime,
    getProductById,
    getProfessionalById,
    getReceiptPaymentLabel,
    getServiceById,
    clientPhoneForLookup,
    handleAddExtraItem,
    handleAddProductItem,
    handleAuthorizePendingReceipt,
    handleBackToSearch,
    handleChangeExtraPrice,
    handleChangeExtraProfessional,
    handleChangeExtraService,
    handleChangeProduct,
    handleChangeProductQuantity,
    handleConfirmReceipt,
    handlePrintDraftReceipt,
    handleRemoveExtra,
    isCheckoutOpen,
    isPendingAuthorizationOpen,
    isSubmittingReceipt,
    manualClientCpf,
    manualClientName,
    manualClientPhone,
    manualMatchedClient,
    normalizeManualPhone,
    normalizePhone,
    notes,
    normalizedDiscount,
    parseCurrencyInput,
    paymentOptions,
    paymentType,
    pendingAuthorizationAmount,
    products,
    professionals,
    receiptItems,
    selectedAppointment,
    services,
    setCashAmountPaid,
    setDiscountValue,
    setIsPendingAuthorizationOpen,
    setManualClientCpf,
    setManualClientName,
    setManualClientPhone,
    setNotes,
    setPaymentType,
    setPendingAuthorizationAmount,
    setSplitCashAmount,
    setSplitCreditAmount,
    setSplitDebitAmount,
    setSplitPixAmount,
    setUseSplitPayment,
    setValidationPopupMessage,
    splitCashAmount,
    splitChange,
    splitCreditAmount,
    splitDebitAmount,
    splitPixAmount,
    splitRemaining,
    structuredAmountPending,
    subtotal,
    total,
    useSplitPayment,
    validationPopupMessage
  } = context;

const renderDraftItem = (item: any) => {
    if (item.itemType === 'product') {
      const product = item.productId
        ? getProductById(products, item.productId)
        : undefined;
      const quantity = Math.max(1, Number(item.quantity) || 1);
      const unitPrice = Number(item.unitPrice) || 0;

      return (
        <div
          key={item.id}
          className="rounded-2xl border border-orange-200 bg-orange-50/40 p-3"
        >
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.5fr_100px_120px_120px_auto] lg:items-end">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-600">
                Produto
              </p>

              <select
                value={item.productId || ''}
                onChange={(event) => handleChangeProduct(item.id, event.target.value)}
                className="mt-1 w-full rounded-xl border border-orange-200 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-orange-500"
              >
                <option value="">Selecione o produto</option>
                {products
                  .filter((productOption) => productOption.active)
                  .map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.code} • {option.description}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                Quantidade
              </p>
              <input
                type="number"
                min={1}
                step={1}
                value={quantity}
                onChange={(event) =>
                  handleChangeProductQuantity(item.id, Number(event.target.value))
                }
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-black outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                Unitário
              </p>
              <p className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-800">
                {formatCurrency(unitPrice)}
              </p>
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                Total
              </p>
              <p className="mt-1 rounded-xl border border-orange-200 bg-white px-3 py-2 text-sm font-black text-orange-700">
                {formatCurrency(item.price)}
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleRemoveExtra(item.id)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-200 bg-white text-red-600 hover:bg-red-50"
              title={`Remover ${product?.description || 'produto'}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      );
    }

    const service = getServiceById(services, item.serviceId);
    const professional = getProfessionalById(professionals, item.professionalId);
    const isEditableItem = item.itemType !== 'appointment';
    const linkedAppointment =
      item.itemType === 'appointment' && selectedAppointment
        ? selectedAppointment
        : null;
    const serviceName = linkedAppointment
      ? getAppointmentServiceName(linkedAppointment, services)
      : service?.name || 'Serviço não localizado';
    const professionalName = linkedAppointment
      ? getAppointmentProfessionalName(linkedAppointment, professionals)
      : professional?.name || 'Profissional não localizado';
    const serviceDescription = linkedAppointment
      ? getAppointmentServiceDescription(linkedAppointment, services)
      : service?.description || '';

    return (
      <div
        key={item.id}
        className="rounded-2xl border border-slate-200 bg-white p-3"
      >
        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr_120px_auto] gap-3 lg:items-end">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
              {item.itemType === 'appointment' ? 'Serviço prestado' : item.itemType === 'manual' ? 'Serviço manual' : 'Serviço extra'}
            </p>

            {isEditableItem ? (
              <select
                value={item.serviceId}
                onChange={(event) => handleChangeExtraService(item.id, event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-[#0f4c5c]"
              >
                <option value="">Selecione o serviço</option>
                {services.filter((serviceOption) => serviceOption.active).map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            ) : (
              <>
                <p className="mt-1 text-base font-black text-slate-950">
                  {serviceName}
                </p>
                {serviceDescription && (
                  <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">
                    {serviceDescription}
                  </p>
                )}
              </>
            )}
          </div>

          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
              Profissional
            </p>

            {isEditableItem ? (
              <select
                value={item.professionalId}
                onChange={(event) => handleChangeExtraProfessional(item.id, event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-[#0f4c5c]"
              >
                <option value="">Selecione o profissional</option>
                {professionals.filter((professionalOption) => professionalOption.active).map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            ) : (
              <p className="mt-1 text-sm font-black text-slate-950">
                {professionalName}
              </p>
            )}
          </div>

          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
              Valor
            </p>

            {isEditableItem ? (
              <input
                type="text"
                inputMode="numeric"
                value={formatCurrencyInput(item.price)}
                onChange={(event) => handleChangeExtraPrice(item.id, parseCurrencyInput(event.target.value))}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-black outline-none focus:border-[#0f4c5c]"
              />
            ) : (
              <p className="mt-1 text-sm font-black text-slate-950">
                {formatCurrency(item.price)}
              </p>
            )}
          </div>

          {isEditableItem && (
            <button
              type="button"
              onClick={() => handleRemoveExtra(item.id)}
              className="h-10 w-10 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 flex items-center justify-center"
              title="Remover serviço extra"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  };

if (isCheckoutOpen) {
    const checkoutExtraItems =
      checkoutMode === 'appointment' ? extraItems : receiptItems;

    return (
      <section className="space-y-2">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="h-1 bg-[#0f4c5c]" />
          <div className="relative flex min-h-[62px] items-center justify-center px-4 py-2.5">
            <button
              type="button"
              onClick={handleBackToSearch}
              className="absolute left-4 flex items-center justify-center gap-1.5 rounded-xl bg-[#0f4c5c] px-3 py-2 text-xs font-black text-white transition hover:bg-[#123945]"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </button>

            <div className="text-center">
              <p className="text-[9px] font-black uppercase tracking-[0.24em] text-[#0f4c5c]">
                AGENDASPEED • CAIXA
              </p>
              <h1 className="text-lg font-black tracking-tight text-neutral-950">
                Fechamento do pagamento
              </h1>
            </div>
          </div>
        </div>

        {checkoutMode === 'appointment' && !selectedAppointment && (
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-center shadow-sm">
            <AlertCircle className="mx-auto mb-2 h-8 w-8 text-neutral-400" />
            <p className="text-sm font-black text-neutral-700">
              Nenhum atendimento selecionado.
            </p>
          </div>
        )}

        {canShowCheckout && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 bg-[#0f4c5c] px-4 py-2.5 text-white">
              <div>
                <h2 className="text-sm font-black uppercase tracking-tight">
                  Resumo do recebimento
                </h2>
                <p className="text-[10px] font-semibold text-white/75">
                  Confira os itens, informe o pagamento e conclua a baixa.
                </p>
              </div>

              <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-black">
                {formatCurrency(total)}
              </span>
            </div>

            <div className="space-y-3 p-3">
              {checkoutMode === 'appointment' && selectedAppointment && (
                <div className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-[1.2fr_1.4fr_1fr_120px]">
                  <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">
                      Cliente
                    </p>
                    <p className="truncate text-sm font-black text-slate-950">
                      {selectedAppointment.clientName || 'Cliente'}
                    </p>
                    <p className="truncate text-[11px] font-semibold text-slate-500">
                      {formatPhoneForDisplay(selectedAppointment.clientPhone || '')}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">
                      Serviço
                    </p>
                    <p className="truncate text-sm font-black text-slate-950">
                      {getAppointmentServiceName(selectedAppointment, services)}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">
                      Profissional
                    </p>
                    <p className="truncate text-sm font-black text-slate-950">
                      {getAppointmentProfessionalName(selectedAppointment, professionals)}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">
                      Atendimento
                    </p>
                    <p className="text-xs font-black text-slate-950">
                      {formatDateBr(getAppointmentDate(selectedAppointment))}
                    </p>
                    <p className="text-xs font-black text-[#0f4c5c]">
                      {getAppointmentTime(selectedAppointment)} • {formatCurrency(selectedAppointment.price)}
                    </p>
                  </div>
                </div>
              )}

              {checkoutMode === 'manual' && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_1fr_1.3fr]">
                    <label>
                      <span className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">
                        WhatsApp
                      </span>
                      <input
                        type="tel"
                        inputMode="numeric"
                        value={manualClientPhone}
                        onChange={(event) => {
                          const nextPhone = formatManualPhoneInput(
                            event.target.value,
                            defaultAreaCode
                          );
                          const normalizedNextPhone = normalizeManualPhone(
                            nextPhone,
                            defaultAreaCode
                          );
                          const matchedClient = clients.find((client) => {
                            return normalizePhone(
                              client.phoneNormalized || client.phone || ''
                            ) === normalizedNextPhone;
                          });

                          setManualClientPhone(nextPhone);

                          if (matchedClient) {
                            setManualClientName(matchedClient.name);
                            setManualClientCpf(
                              formatCpfForDisplay(matchedClient.cpf || '')
                            );
                          }
                        }}
                        onBlur={() => {
                          const normalizedPhone = normalizeManualPhone(
                            manualClientPhone,
                            defaultAreaCode
                          );

                          if (normalizedPhone.length >= 10) {
                            setManualClientPhone(
                              formatPhoneForDisplay(normalizedPhone)
                            );
                          }
                        }}
                        placeholder={
                          defaultAreaCode
                            ? `(DDD opcional: ${defaultAreaCode})`
                            : '(99) 99999-9999'
                        }
                        className="mt-1 h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold outline-none focus:border-[#0f4c5c]"
                      />
                    </label>

                    <label>
                      <span className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">
                        CPF (opcional)
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={manualClientCpf}
                        onChange={(event) => {
                          const nextCpf = formatCpfForDisplay(event.target.value);
                          const normalizedNextCpf = nextCpf.replace(/\D/g, '');
                          const matchedClient = clients.find((client) => {
                            return String(client.cpf || '').replace(/\D/g, '') === normalizedNextCpf;
                          });

                          setManualClientCpf(nextCpf);

                          if (matchedClient && normalizedNextCpf.length === 11) {
                            setManualClientName(matchedClient.name);
                            setManualClientPhone(
                              formatPhoneForDisplay(
                                clientPhoneForLookup(matchedClient)
                              )
                            );
                          }
                        }}
                        placeholder="000.000.000-00"
                        className="mt-1 h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold outline-none focus:border-[#0f4c5c]"
                      />
                    </label>

                    <label>
                      <span className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">
                        Nome do cliente
                      </span>
                      <input
                        value={manualClientName}
                        onChange={(event) => setManualClientName(event.target.value)}
                        placeholder="Nome do cliente"
                        className="mt-1 h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold outline-none focus:border-[#0f4c5c]"
                      />
                    </label>
                  </div>

                  {manualMatchedClient && (
                    <p className="mt-2 text-[11px] font-bold text-emerald-700">
                      Cliente localizado: {manualMatchedClient.name}
                    </p>
                  )}
                </div>
              )}

              {checkoutExtraItems.length > 0 && (
                <div className="space-y-2">
                  {checkoutExtraItems.map(renderDraftItem)}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleAddExtraItem}
                  className="flex h-10 items-center justify-center gap-2 rounded-xl border border-[#0f4c5c]/20 bg-[#0f4c5c]/5 px-4 text-sm font-black text-[#0f4c5c] transition hover:bg-[#0f4c5c]/10"
                >
                  <Plus className="h-4 w-4" />
                  {checkoutMode === 'manual' ? 'Adicionar outro serviço' : 'Adicionar serviço extra'}
                </button>

                <button
                  type="button"
                  onClick={handleAddProductItem}
                  disabled={!products.some((product) => product.active)}
                  className="flex h-10 items-center justify-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 text-sm font-black text-orange-700 transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                >
                  <Package className="h-4 w-4" />
                  Adicionar produto
                </button>
              </div>

              <div className="border-t border-slate-200 pt-3">
                <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.45fr_0.8fr_0.85fr]">
                  <div>
                    <p className="mb-2 text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
                      Forma de pagamento
                    </p>
                    <div className="grid grid-cols-5 gap-2">
                      {paymentOptions().map((option) => (
                        <button
                          type="button"
                          key={option}
                          onClick={() => {
                            setPaymentType(option);
                            setUseSplitPayment(false);
                          }}
                          className={`h-9 rounded-xl border px-2 text-[11px] font-black transition ${
                            !useSplitPayment && paymentType === option
                              ? 'border-[#0f4c5c] bg-[#0f4c5c] text-white'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-[#0f4c5c]/40'
                          }`}
                        >
                          {getReceiptPaymentLabel(option)}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => setUseSplitPayment((current) => !current)}
                      className={`mt-2 h-9 w-full rounded-xl border px-3 text-[11px] font-black transition ${
                        useSplitPayment
                          ? 'border-[#0f4c5c] bg-[#0f4c5c]/10 text-[#0f4c5c]'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-[#0f4c5c]/40'
                      }`}
                    >
                      Pagamento dividido
                    </button>

                    {!useSplitPayment && paymentType === 'dinheiro' && (
                      <div className="mt-2 grid grid-cols-[1fr_auto] items-end gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2">
                        <label>
                          <span className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-500">
                            Valor recebido
                          </span>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={formatCurrencyInput(cashAmountPaid)}
                            onChange={(event) => setCashAmountPaid(parseCurrencyInput(event.target.value))}
                            className="mt-1 h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold outline-none focus:border-[#0f4c5c]"
                          />
                        </label>
                        <div className="min-w-[100px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-right">
                          <p className="text-[9px] font-black uppercase text-slate-400">Troco</p>
                          <p className="text-sm font-black text-[#0f4c5c]">{formatCurrency(cashChange)}</p>
                        </div>
                      </div>
                    )}

                    {useSplitPayment && (
                      <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-2">
                        <div className="grid grid-cols-4 gap-2">
                          {[
                            ['Dinheiro', splitCashAmount, setSplitCashAmount],
                            ['Pix', splitPixAmount, setSplitPixAmount],
                            ['Débito', splitDebitAmount, setSplitDebitAmount],
                            ['Crédito', splitCreditAmount, setSplitCreditAmount]
                          ].map(([label, value, setter]) => (
                            <label key={String(label)}>
                              <span className="text-[9px] font-black uppercase text-slate-500">
                                {String(label)}
                              </span>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={formatCurrencyInput(Number(value))}
                                onChange={(event) =>
                                  (setter as React.Dispatch<React.SetStateAction<number>>)(
                                    parseCurrencyInput(event.target.value)
                                  )
                                }
                                className="mt-1 h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs font-bold outline-none focus:border-[#0f4c5c]"
                              />
                            </label>
                          ))}
                        </div>
                        <div className="mt-2 flex justify-end gap-4 text-[11px] font-black text-slate-600">
                          <span>Restante: {formatCurrency(splitRemaining)}</span>
                          <span className="text-[#0f4c5c]">Troco: {formatCurrency(splitChange)}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-rows-[auto_1fr] gap-2">
                    <label>
                      <span className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
                        Desconto
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={formatCurrencyInput(discountValue)}
                        onChange={(event) => setDiscountValue(parseCurrencyInput(event.target.value))}
                        className="mt-1 h-9 w-full rounded-xl border border-slate-300 px-3 text-sm font-bold outline-none focus:border-[#0f4c5c]"
                      />
                    </label>

                    <label>
                      <span className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
                        Observações
                      </span>
                      <textarea
                        value={notes}
                        onChange={(event) => setNotes(event.target.value)}
                        placeholder="Observação opcional"
                        rows={2}
                        className="mt-1 min-h-[58px] w-full resize-none rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold outline-none focus:border-[#0f4c5c]"
                      />
                    </label>
                  </div>

                  <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                        <span>Subtotal</span>
                        <span>{formatCurrency(subtotal)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                        <span>Desconto</span>
                        <span>- {formatCurrency(normalizedDiscount)}</span>
                      </div>
                      <div className="flex items-center justify-between border-t border-slate-200 pt-2">
                        <span className="text-sm font-black text-slate-950">Total</span>
                        <span className="text-xl font-black text-[#0f4c5c]">{formatCurrency(total)}</span>
                      </div>
                      {structuredAmountPending > 0 && (
                        <div className="flex items-center justify-between text-xs font-black text-amber-700">
                          <span>Pendente</span>
                          <span>{formatCurrency(structuredAmountPending)}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={handlePrintDraftReceipt}
                        className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-[#0f4c5c]/20 bg-white px-3 text-xs font-black text-[#0f4c5c] transition hover:bg-[#0f4c5c]/5"
                      >
                        <Printer className="h-4 w-4" />
                        Imprimir
                      </button>

                      <button
                        type="button"
                        onClick={handleConfirmReceipt}
                        disabled={receiptItems.length === 0 || isSubmittingReceipt}
                        className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#0f4c5c] px-3 text-xs font-black text-white transition hover:bg-[#123945] disabled:bg-neutral-200 disabled:text-neutral-400"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        {isSubmittingReceipt ? 'Salvando...' : 'Baixar'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {validationPopupMessage && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md overflow-hidden rounded-3xl border border-amber-200 bg-white shadow-2xl">
              <div className="h-1.5 bg-amber-500" />
              <div className="p-5 text-left">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                  <AlertCircle className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-black text-neutral-950">
                  Verifique os dados
                </h3>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">
                  {validationPopupMessage}
                </p>
                <div className="mt-5 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setValidationPopupMessage('')}
                    className="rounded-xl bg-[#0f4c5c] px-5 py-3 text-sm font-black text-white transition hover:bg-[#123945]"
                  >
                    Entendi
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {isPendingAuthorizationOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md overflow-hidden rounded-3xl border border-amber-200 bg-white shadow-2xl">
              <div className="h-1.5 bg-amber-500" />
              <div className="p-5 text-left">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                  <AlertCircle className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-black text-neutral-950">
                  Valor inferior ao total
                </h3>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">
                  O valor informado é menor que o total dos serviços e produtos.
                  Restará pendente <strong>{formatCurrency(pendingAuthorizationAmount)}</strong>.
                </p>
                <p className="mt-2 text-sm font-black text-amber-700">
                  Deseja baixar este pagamento com valor pendente?
                </p>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsPendingAuthorizationOpen(false);
                      setPendingAuthorizationAmount(0);
                    }}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                  >
                    Não, corrigir
                  </button>
                  <button
                    type="button"
                    onClick={handleAuthorizePendingReceipt}
                    className="rounded-xl bg-amber-600 px-4 py-3 text-sm font-black text-white transition hover:bg-amber-700"
                  >
                    Sim, autorizar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    );
  }

  return null;
}
