import React from 'react';

import { X } from 'lucide-react';

import { ManualAppointmentModalProps } from '../professional.types';

import { formatCurrency } from '../professional.utils';

export default function ManualAppointmentModal({
  myServices,
  formState,
  onChangeFormState,
  onClose,
  onSubmit
}: ManualAppointmentModalProps) {
  return (
    <div
      id="add-manual-appt-modal-overlay"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border shadow-2xl relative space-y-4 text-left">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="text-lg font-black text-neutral-900">
            Agendar Novo Cliente
          </h3>

          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form
          onSubmit={onSubmit}
          className="space-y-4"
        >
          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider block">
              Nome do Cliente
            </label>

            <input
              type="text"
              placeholder="Ex: Amanda Silva"
              value={formState.clientName}
              onChange={(event) => {
                onChangeFormState({
                  clientName: event.target.value
                });
              }}
              className="w-full bg-neutral-50 border rounded-xl py-2.5 px-3.5 text-xs outline-none transition"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider block">
              Telefone WhatsApp
            </label>

            <input
              type="tel"
              placeholder="Ex: 11999998888"
              value={formState.clientPhone}
              onChange={(event) => {
                onChangeFormState({
                  clientPhone: event.target.value
                });
              }}
              className="w-full bg-neutral-50 border rounded-xl py-2.5 px-3.5 text-xs outline-none transition"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider block">
              Serviço de Atendimento
            </label>

            <select
              value={formState.serviceId}
              onChange={(event) => {
                onChangeFormState({
                  serviceId: event.target.value
                });
              }}
              className="w-full bg-neutral-50 border rounded-xl py-2.5 px-3 text-xs outline-none"
              required
            >
              <option value="">
                Selecione um serviço...
              </option>

              {myServices.map((service) => (
                <option
                  key={service.id}
                  value={service.id}
                >
                  {service.name} ({formatCurrency(service.price)})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider block">
                Data
              </label>

              <input
                type="date"
                value={formState.date}
                onChange={(event) => {
                  onChangeFormState({
                    date: event.target.value
                  });
                }}
                className="w-full bg-neutral-50 border rounded-xl py-2 px-3 text-xs outline-none"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider block">
                Horário
              </label>

              <input
                type="time"
                value={formState.time}
                onChange={(event) => {
                  onChangeFormState({
                    time: event.target.value
                  });
                }}
                className="w-full bg-neutral-50 border rounded-xl py-2 px-3 text-xs outline-none"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider block">
              Observações
            </label>

            <textarea
              placeholder="Se houver observações..."
              value={formState.notes}
              onChange={(event) => {
                onChangeFormState({
                  notes: event.target.value
                });
              }}
              rows={2}
              className="w-full bg-neutral-50 border rounded-xl py-2 px-3 text-xs outline-none"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold py-3 rounded-xl transition"
          >
            Confirmar Agendamento Manual
          </button>
        </form>
      </div>
    </div>
  );
}