/**
 * Modal de Cadastro/Edição de Profissional - AgendaSpeed.
 *
 * Responsável por:
 * - cadastrar novo profissional;
 * - editar profissional existente;
 * - escolher foto sem imagem pré-configurada;
 * - definir comissão simples;
 * - definir horário de trabalho;
 * - definir dias de atendimento;
 * - definir serviços habilitados.
 */

import React from 'react';
import { ImagePlus, X } from 'lucide-react';

import {
  Professional,
  RemunerationType,
  Service
} from '../../../types';

interface ProfessionalModalProps {
  isOpen: boolean;
  editingProfessional: Professional | null;
  services: Service[];

  name: string;
  phone: string;
  email: string;
  role: string;
  avatar: string;
  active: boolean;
  displayOrder: number;
  workDays: number[];
  workHoursStart: string;
  workHoursEnd: string;
  lunchStart: string;
  lunchEnd: string;
  noLunchBreak: boolean;
  defaultAppointmentDuration: number;
  servicesIds: string[];
  remunerationType: RemunerationType;
  remunerationValue: number;

  onChangeName: (value: string) => void;
  onChangePhone: (value: string) => void;
  onChangeEmail: (value: string) => void;
  onChangeRole: (value: string) => void;
  onChangeAvatar: (value: string) => void;
  onChangeActive: (value: boolean) => void;
  onChangeDisplayOrder: (value: number) => void;
  onChangeWorkDays: (value: number[]) => void;
  onChangeWorkHoursStart: (value: string) => void;
  onChangeWorkHoursEnd: (value: string) => void;
  onChangeLunchStart: (value: string) => void;
  onChangeLunchEnd: (value: string) => void;
  onChangeNoLunchBreak: (value: boolean) => void;
  onChangeDefaultAppointmentDuration: (value: number) => void;
  onChangeServicesIds: (value: string[]) => void;
  onChangeRemunerationType: (value: RemunerationType) => void;
  onChangeRemunerationValue: (value: number) => void;

  onClose: () => void;
  onSubmit: (event: React.FormEvent) => void;
}

function compressImageFile(params: {
  file: File | undefined;
  onLoadImage: (value: string) => void;
}) {
  const { file, onLoadImage } = params;

  if (!file) {
    return;
  }

  const reader = new FileReader();

  reader.onload = () => {
    const image = new Image();

    image.onload = () => {
      const maxSize = 400;
      const scale = Math.min(maxSize / image.width, maxSize / image.height, 1);
      const canvas = document.createElement('canvas');

      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));

      const context = canvas.getContext('2d');

      if (!context) {
        onLoadImage(String(reader.result || ''));
        return;
      }

      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      onLoadImage(canvas.toDataURL('image/jpeg', 0.82));
    };

    image.onerror = () => {
      onLoadImage(String(reader.result || ''));
    };

    image.src = String(reader.result || '');
  };

  reader.readAsDataURL(file);
}

export default function ProfessionalModal({
  isOpen,
  editingProfessional,
  services,
  name,
  phone,
  email,
  role,
  avatar,
  active,
  displayOrder,
  workDays,
  workHoursStart,
  workHoursEnd,
  lunchStart,
  lunchEnd,
  noLunchBreak,
  defaultAppointmentDuration,
  servicesIds,
  remunerationType,
  remunerationValue,
  onChangeName,
  onChangePhone,
  onChangeEmail,
  onChangeRole,
  onChangeAvatar,
  onChangeActive,
  onChangeDisplayOrder,
  onChangeWorkDays,
  onChangeWorkHoursStart,
  onChangeWorkHoursEnd,
  onChangeLunchStart,
  onChangeLunchEnd,
  onChangeNoLunchBreak,
  onChangeDefaultAppointmentDuration,
  onChangeServicesIds,
  onChangeRemunerationType,
  onChangeRemunerationValue,
  onClose,
  onSubmit
}: ProfessionalModalProps) {
  if (!isOpen) {
    return null;
  }

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const normalizedRemunerationType = remunerationType === 'commission_fixed'
    ? 'commission_fixed'
    : 'commission_percent';

  const handleToggleWorkDay = (dayIndex: number) => {
    const isWorking = workDays.includes(dayIndex);

    if (isWorking) {
      onChangeWorkDays(workDays.filter((item) => item !== dayIndex));
      return;
    }

    onChangeWorkDays([...workDays, dayIndex]);
  };

  const handleToggleService = (serviceId: string) => {
    const isSelected = servicesIds.includes(serviceId);

    if (isSelected) {
      onChangeServicesIds(servicesIds.filter((item) => item !== serviceId));
      return;
    }

    onChangeServicesIds([...servicesIds, serviceId]);
  };

  return (
    <div
      id="modal-add-prof"
      className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border text-left shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="text-lg font-black text-neutral-950">
            {editingProfessional
              ? `Editar Profissional: ${editingProfessional.name.split(' ')[0]}`
              : 'Cadastrar Novo Profissional'}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-neutral-700 uppercase tracking-wider block">
                Nome Completo
              </label>

              <input
                id="input-prof-name"
                type="text"
                placeholder="Ex: João da Silva"
                value={name}
                onChange={(event) => onChangeName(event.target.value)}
                className="w-full bg-neutral-50 border rounded-xl py-2 px-3 text-xs outline-none focus:border-[#0f4c5c]"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-neutral-700 uppercase tracking-wider block">
                Cargo / Especialidade
              </label>

              <input
                id="input-prof-role"
                type="text"
                placeholder="Ex: Barbeiro, Esteticista, Massagista"
                value={role}
                onChange={(event) => onChangeRole(event.target.value)}
                className="w-full bg-neutral-50 border rounded-xl py-2 px-3 text-xs outline-none focus:border-[#0f4c5c]"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-neutral-700 uppercase tracking-wider block">
                WhatsApp
              </label>

              <input
                id="input-prof-phone"
                type="tel"
                placeholder="11900008888"
                value={phone}
                onChange={(event) => onChangePhone(event.target.value)}
                className="w-full bg-neutral-50 border rounded-xl py-2 px-3 text-xs outline-none focus:border-[#0f4c5c]"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-neutral-700 uppercase tracking-wider block">
                Ordem na Vitrine
              </label>

              <input
                id="input-prof-order"
                type="number"
                min="1"
                placeholder="Ex: 1"
                value={displayOrder}
                onChange={(event) => onChangeDisplayOrder(Number(event.target.value))}
                className="w-full bg-neutral-50 border rounded-xl py-2 px-3 text-xs outline-none focus:border-[#0f4c5c]"
              />
            </div>
          </div>

          <input
            type="hidden"
            value={email}
            onChange={(event) => onChangeEmail(event.target.value)}
          />

          <div className="bg-neutral-50 border rounded-2xl p-3 space-y-3">
            <div className="flex items-center gap-3">
              {avatar ? (
                <img
                  src={avatar}
                  alt="Foto do profissional"
                  className="w-16 h-16 rounded-2xl object-cover border bg-white shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl border border-dashed border-neutral-300 bg-white shrink-0 flex items-center justify-center text-[10px] font-black text-neutral-400 uppercase text-center leading-tight">
                  Sem<br />foto
                </div>
              )}

              <div className="space-y-1 flex-1">
                <strong className="block text-neutral-800 font-bold">
                  Foto do profissional
                </strong>

                <p className="text-[10px] text-neutral-500">
                  Escolha uma imagem do computador ou celular. Não existe foto pré-configurada.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
              <label
                htmlFor="input-prof-avatar-file"
                className="w-full bg-[#0f4c5c] hover:bg-[#123945] text-white font-bold py-2.5 rounded-xl transition text-xs cursor-pointer flex items-center justify-center gap-2"
              >
                <ImagePlus className="w-4 h-4" />
                Escolher foto
              </label>

              {avatar && (
                <button
                  type="button"
                  onClick={() => onChangeAvatar('')}
                  className="rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-xs font-black text-neutral-600 hover:bg-neutral-50"
                >
                  Remover
                </button>
              )}
            </div>

            <input
              id="input-prof-avatar-file"
              type="file"
              accept="image/*"
              onChange={(event) => {
                compressImageFile({
                  file: event.target.files?.[0],
                  onLoadImage: onChangeAvatar
                });
              }}
              className="hidden"
            />
          </div>

          {editingProfessional && (
            <div className="flex items-center justify-between bg-neutral-50 border rounded-2xl p-3">
              <div>
                <strong className="block text-neutral-800 font-bold">
                  Profissional ativo
                </strong>

                <span className="text-[10px] text-neutral-500">
                  Desative apenas se ele não estiver mais atendendo.
                </span>
              </div>

              <input
                type="checkbox"
                checked={active}
                onChange={(event) => onChangeActive(event.target.checked)}
                className="w-4 h-4 text-[#0f4c5c] rounded"
              />
            </div>
          )}

          <div className="bg-[#0f4c5c]/5 p-4 rounded-2xl space-y-3 border border-[#0f4c5c]/15">
            <h4 className="text-[11px] font-bold text-[#0f4c5c] uppercase tracking-widest">
              Remuneração e Comissão
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-neutral-700">
                  Tipo
                </label>

                <select
                  id="select-prof-rem-type"
                  value={normalizedRemunerationType}
                  onChange={(event) => onChangeRemunerationType(event.target.value as RemunerationType)}
                  className="w-full bg-white border rounded-lg p-2 outline-none font-sans focus:border-[#0f4c5c]"
                >
                  <option value="commission_percent">Percentual (%)</option>
                  <option value="commission_fixed">Valor fixo (R$)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-neutral-700">
                  {normalizedRemunerationType === 'commission_fixed'
                    ? 'Valor fixo por atendimento'
                    : 'Percentual de comissão'}
                </label>

                <input
                  type="number"
                  value={remunerationValue}
                  onChange={(event) => onChangeRemunerationValue(Number(event.target.value))}
                  className="w-full bg-white border rounded-lg p-2 outline-none focus:border-[#0f4c5c]"
                />
              </div>
            </div>
          </div>

          <div className="bg-neutral-50 p-4 rounded-2xl border space-y-3">
            <h4 className="text-[11px] font-bold text-neutral-800 uppercase tracking-widest">
              Horários e Escala semanal
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="space-y-1">
                <label className="font-semibold block text-neutral-500">
                  Entrada
                </label>

                <input
                  type="time"
                  value={workHoursStart}
                  onChange={(event) => onChangeWorkHoursStart(event.target.value)}
                  className="bg-white border rounded p-1.5 w-full text-center focus:border-[#0f4c5c]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold block text-neutral-500">
                  Saída
                </label>

                <input
                  type="time"
                  value={workHoursEnd}
                  onChange={(event) => onChangeWorkHoursEnd(event.target.value)}
                  className="bg-white border rounded p-1.5 w-full text-center focus:border-[#0f4c5c]"
                />
              </div>

              <div className="space-y-1">
                <label className={`font-semibold block ${noLunchBreak ? 'text-neutral-400' : 'text-neutral-500'}`}>
                  Almoço Início
                </label>

                <input
                  type="time"
                  value={lunchStart}
                  onChange={(event) => onChangeLunchStart(event.target.value)}
                  disabled={noLunchBreak}
                  className={`border rounded p-1.5 w-full text-center ${
                    noLunchBreak
                      ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                      : 'bg-white focus:border-[#0f4c5c]'
                  }`}
                />
              </div>

              <div className="space-y-1">
                <label className={`font-semibold block ${noLunchBreak ? 'text-neutral-400' : 'text-neutral-500'}`}>
                  Almoço Fim
                </label>

                <input
                  type="time"
                  value={lunchEnd}
                  onChange={(event) => onChangeLunchEnd(event.target.value)}
                  disabled={noLunchBreak}
                  className={`border rounded p-1.5 w-full text-center ${
                    noLunchBreak
                      ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                      : 'bg-white focus:border-[#0f4c5c]'
                  }`}
                />
              </div>
            </div>

            <div className="rounded-2xl border bg-white p-3 space-y-1">
              <label className="font-bold block text-neutral-800">
                Tempo padrão por cliente
              </label>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="5"
                  step="5"
                  value={defaultAppointmentDuration}
                  onChange={(event) => onChangeDefaultAppointmentDuration(Number(event.target.value))}
                  className="bg-white border rounded-lg p-2 w-28 text-center font-bold outline-none focus:border-[#0f4c5c]"
                />

                <span className="text-xs font-semibold text-neutral-500">
                  minutos
                </span>
              </div>

              <p className="text-[10px] text-neutral-500 leading-relaxed">
                Este tempo monta a grade padrão da agenda. A duração do serviço escolhido continua sendo respeitada para verificar se cabe até o fim do expediente.
              </p>
            </div>

            <label className="flex items-start gap-3 rounded-2xl border bg-white p-3 cursor-pointer hover:bg-neutral-50 transition">
              <input
                type="checkbox"
                checked={noLunchBreak}
                onChange={(event) => onChangeNoLunchBreak(event.target.checked)}
                className="mt-0.5 w-4 h-4 text-[#0f4c5c] rounded"
              />

              <span className="space-y-0.5">
                <strong className="block text-neutral-800 font-bold">
                  Sem horário de almoço definido
                </strong>

                <span className="block text-[10px] text-neutral-500 leading-relaxed">
                  Marque quando o profissional atende sem intervalo fixo. Neste caso, a agenda não bloqueará horário de almoço.
                </span>
              </span>
            </label>

            <div className="space-y-1 pt-1">
              <label className="font-bold block text-neutral-700 mb-1">
                Dias da semana em que atende:
              </label>

              <div className="flex flex-wrap gap-1.5">
                {weekDays.map((day, index) => {
                  const isWorking = workDays.includes(index);

                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleToggleWorkDay(index)}
                      className={`px-2 py-1 rounded text-[11px] font-bold border transition cursor-pointer ${
                        isWorking
                          ? 'bg-[#0f4c5c] border-[#0f4c5c] text-white'
                          : 'bg-white hover:bg-neutral-100 text-neutral-600'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-1.5 pt-1">
            <label className="font-bold text-neutral-700 block">
              Serviços Habilitados:
            </label>

            <div className="flex flex-wrap gap-1.5">
              {services.map((service) => {
                const checked = servicesIds.includes(service.id);

                return (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => handleToggleService(service.id)}
                    className={`px-2 py-1.5 rounded-lg border text-[11px] text-left transition font-semibold cursor-pointer ${
                      checked
                        ? 'bg-[#0f4c5c]/5 text-[#0f4c5c] border-[#0f4c5c]/40'
                        : 'bg-white text-neutral-600 hover:border-neutral-350'
                    }`}
                  >
                    {service.name}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            id="btn-prof-form-submit"
            type="submit"
            className="w-full bg-[#0f4c5c] hover:bg-[#123945] text-white font-bold py-3 rounded-xl transition text-sm cursor-pointer"
          >
            {editingProfessional
              ? 'Salvar Alterações de Cadastro'
              : 'Cadastrar Profissional'}
          </button>
        </form>
      </div>
    </div>
  );
}
