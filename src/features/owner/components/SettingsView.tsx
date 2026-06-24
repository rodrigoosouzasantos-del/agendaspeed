/**
 * Tela de Configurações do Painel do Dono - AgendaZap.
 *
 * Responsável por:
 * - editar dados principais do estabelecimento;
 * - configurar telefone, endereço e Instagram;
 * - configurar logo e fachada da Vitrine;
 * - configurar mensagem padrão de lembrete pelo WhatsApp;
 * - configurar regras gerais de agendamento;
 * - salvar configurações globais.
 */

import React from 'react';

interface SettingsViewProps {
  configName: string;
  configAddress: string;
  configPhone: string;
  configInstagram: string;
  configLogo: string;
  configCoverImage: string;
  configDefaultTemplate: string;

  bookingMinLeadTimeMinutes: number;
  bookingMinCancelLeadTimeMinutes: number;
  bookingMinRescheduleLeadTimeMinutes: number;
  bookingAllowClientConfirmation: boolean;
  bookingAllowClientCancellation: boolean;
  bookingAllowClientReschedule: boolean;
  bookingSlotIntervalMinutes: number;
  bookingMaxFutureDays: number;
  bookingWorkHoursStart: string;
  bookingWorkHoursEnd: string;
  bookingLunchStart: string;
  bookingLunchEnd: string;

  onChangeConfigName: (value: string) => void;
  onChangeConfigAddress: (value: string) => void;
  onChangeConfigPhone: (value: string) => void;
  onChangeConfigInstagram: (value: string) => void;
  onChangeConfigLogo: (value: string) => void;
  onChangeConfigCoverImage: (value: string) => void;
  onChangeConfigDefaultTemplate: (value: string) => void;

  onChangeBookingMinLeadTimeMinutes: (value: number) => void;
  onChangeBookingMinCancelLeadTimeMinutes: (value: number) => void;
  onChangeBookingMinRescheduleLeadTimeMinutes: (value: number) => void;
  onChangeBookingAllowClientConfirmation: (value: boolean) => void;
  onChangeBookingAllowClientCancellation: (value: boolean) => void;
  onChangeBookingAllowClientReschedule: (value: boolean) => void;
  onChangeBookingSlotIntervalMinutes: (value: number) => void;
  onChangeBookingMaxFutureDays: (value: number) => void;
  onChangeBookingWorkHoursStart: (value: string) => void;
  onChangeBookingWorkHoursEnd: (value: string) => void;
  onChangeBookingLunchStart: (value: string) => void;
  onChangeBookingLunchEnd: (value: string) => void;

  onSubmit: (event: React.FormEvent) => void;
}

function compressImageFile(params: {
  file: File | undefined;
  maxWidth: number;
  maxHeight: number;
  quality: number;
  onLoadImage: (value: string) => void;
}) {
  const {
    file,
    maxWidth,
    maxHeight,
    quality,
    onLoadImage
  } = params;

  if (!file) {
    return;
  }

  const reader = new FileReader();

  reader.onload = () => {
    const image = new Image();

    image.onload = () => {
      const scale = Math.min(
        maxWidth / image.width,
        maxHeight / image.height,
        1
      );

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));

      const context = canvas.getContext('2d');

      if (!context) {
        onLoadImage(String(reader.result || ''));
        return;
      }

      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      const compressedImage = canvas.toDataURL('image/jpeg', quality);

      onLoadImage(compressedImage);
    };

    image.onerror = () => {
      onLoadImage(String(reader.result || ''));
    };

    image.src = String(reader.result || '');
  };

  reader.readAsDataURL(file);
}

function safeNumber(value: string, fallback = 0) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(0, parsed);
}

export default function SettingsView({
  configName,
  configAddress,
  configPhone,
  configInstagram,
  configLogo,
  configCoverImage,
  configDefaultTemplate,

  bookingMinLeadTimeMinutes,
  bookingMinCancelLeadTimeMinutes,
  bookingMinRescheduleLeadTimeMinutes,
  bookingAllowClientConfirmation,
  bookingAllowClientCancellation,
  bookingAllowClientReschedule,
  bookingSlotIntervalMinutes,
  bookingMaxFutureDays,
  bookingWorkHoursStart,
  bookingWorkHoursEnd,
  bookingLunchStart,
  bookingLunchEnd,

  onChangeConfigName,
  onChangeConfigAddress,
  onChangeConfigPhone,
  onChangeConfigInstagram,
  onChangeConfigLogo,
  onChangeConfigCoverImage,
  onChangeConfigDefaultTemplate,

  onChangeBookingMinLeadTimeMinutes,
  onChangeBookingMinCancelLeadTimeMinutes,
  onChangeBookingMinRescheduleLeadTimeMinutes,
  onChangeBookingAllowClientConfirmation,
  onChangeBookingAllowClientCancellation,
  onChangeBookingAllowClientReschedule,
  onChangeBookingSlotIntervalMinutes,
  onChangeBookingMaxFutureDays,
  onChangeBookingWorkHoursStart,
  onChangeBookingWorkHoursEnd,
  onChangeBookingLunchStart,
  onChangeBookingLunchEnd,

  onSubmit
}: SettingsViewProps) {
  return (
    <form
      id="view-configuracoes"
      onSubmit={onSubmit}
      className="space-y-6 text-left animate-none"
    >

      <div>
        <h2 className="text-xl font-extrabold tracking-tight text-neutral-950">
          Configurações Gerais do Estabelecimento
        </h2>

        <p className="text-xs text-neutral-500 mt-0.5">
          Customize as informações de contato do salão, imagens da Vitrine e políticas padrão.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        <div className="bg-white border rounded-3xl p-5 space-y-4 shadow-xs">
          <h3 className="text-xs font-bold text-neutral-950 uppercase tracking-widest font-mono">
            Dados Principais
          </h3>

          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider block">
              Nome do Salão
            </label>

            <input 
              id="input-config-name"
              type="text" 
              value={configName}
              onChange={(event) => onChangeConfigName(event.target.value)}
              className="w-full bg-neutral-50 border rounded-xl py-2.5 px-3.5 text-xs outline-none"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider block">
              Endereço de Localização
            </label>

            <input 
              id="input-config-address"
              type="text" 
              value={configAddress}
              onChange={(event) => onChangeConfigAddress(event.target.value)}
              className="w-full bg-neutral-50 border rounded-xl py-2.5 px-3.5 text-xs outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider block">
              Telefone Comercial WhatsApp
            </label>

            <input 
              id="input-config-phone"
              type="text" 
              value={configPhone}
              onChange={(event) => onChangeConfigPhone(event.target.value)}
              className="w-full bg-neutral-50 border rounded-xl py-2.5 px-3.5 text-xs outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider block">
              Perfil Instagram
            </label>

            <input 
              id="input-config-insta"
              type="text" 
              value={configInstagram}
              onChange={(event) => onChangeConfigInstagram(event.target.value)}
              className="w-full bg-neutral-50 border rounded-xl py-2.5 px-3.5 text-xs outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider block">
                Logo do Salão
              </label>

              <div className="bg-neutral-50 border rounded-2xl p-3 space-y-3">
                <div className="h-24 rounded-xl bg-white border overflow-hidden flex items-center justify-center">
                  {configLogo ? (
                    <img
                      src={configLogo}
                      alt="Logo do salão"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-[10px] text-neutral-400 font-bold uppercase">
                      Sem logo
                    </span>
                  )}
                </div>

                <label
                  htmlFor="input-config-logo"
                  className="block text-center bg-neutral-950 hover:bg-neutral-800 text-white text-xs font-bold px-3 py-2.5 rounded-xl cursor-pointer transition"
                >
                  Escolher logo
                </label>

                <input
                  id="input-config-logo"
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    compressImageFile({
                      file: event.target.files?.[0],
                      maxWidth: 400,
                      maxHeight: 400,
                      quality: 0.82,
                      onLoadImage: onChangeConfigLogo
                    });
                  }}
                  className="hidden"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider block">
                Fachada da Vitrine
              </label>

              <div className="bg-neutral-50 border rounded-2xl p-3 space-y-3">
                <div className="h-24 rounded-xl bg-white border overflow-hidden flex items-center justify-center">
                  {configCoverImage ? (
                    <img
                      src={configCoverImage}
                      alt="Fachada da Vitrine"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-[10px] text-neutral-400 font-bold uppercase">
                      Sem fachada
                    </span>
                  )}
                </div>

                <label
                  htmlFor="input-config-cover"
                  className="block text-center bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold px-3 py-2.5 rounded-xl cursor-pointer transition"
                >
                  Escolher fachada
                </label>

                <input
                  id="input-config-cover"
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    compressImageFile({
                      file: event.target.files?.[0],
                      maxWidth: 1200,
                      maxHeight: 420,
                      quality: 0.78,
                      onLoadImage: onChangeConfigCoverImage
                    });
                  }}
                  className="hidden"
                />
              </div>
            </div>
          </div>

          <p className="text-[10px] text-neutral-400 leading-relaxed">
            As imagens são otimizadas automaticamente antes de salvar. Use uma imagem horizontal para a fachada e uma imagem quadrada para o logo.
          </p>
        </div>

        <div className="bg-white border rounded-3xl p-5 space-y-4 shadow-xs">
          <h3 className="text-xs font-bold text-neutral-950 uppercase tracking-widest font-mono">
            Mensagem de Lembrete Pronta
          </h3>

          <div className="space-y-1.5 text-xs text-neutral-600 leading-normal">
            <p>
              Altere a mensagem enviada com o link rápido de confirmação pelo seu celular ou computador.
            </p>

            <textarea 
              id="textarea-config-template"
              value={configDefaultTemplate}
              onChange={(event) => onChangeConfigDefaultTemplate(event.target.value)}
              rows={4}
              className="w-full bg-neutral-50 border rounded-xl p-3 text-xs outline-none mt-2 font-mono"
            />

            <div className="bg-neutral-100 p-2.5 rounded-xl block border text-[10px] space-y-1 select-none">
              <strong className="block font-bold">
                Variáveis disponíveis para uso:
              </strong>

              <span className="bg-white font-mono px-1 border rounded mr-1">
                {'{cliente}'}
              </span>

              <span className="bg-white font-mono px-1 border rounded mr-1">
                {'{data}'}
              </span>

              <span className="bg-white font-mono px-1 border rounded mr-1">
                {'{hora}'}
              </span>

              <span className="bg-white font-mono px-1 border rounded mr-1">
                {'{profissional}'}
              </span>

              <span className="bg-white font-mono px-1 border rounded mr-1">
                {'{servico}'}
              </span>

              <span className="bg-white font-mono px-1 border rounded mr-1">
                {'{endereco}'}
              </span>

              <span className="bg-white font-mono px-1 border rounded mr-1">
                {'{link_confirmar}'}
              </span>

              <span className="bg-white font-mono px-1 border rounded mr-1">
                {'{link_cancelar}'}
              </span>

              <span className="bg-white font-mono px-1 border rounded mr-1">
                {'{link_remarcar}'}
              </span>
            </div>
          </div>
        </div>

      </div>

      <div className="bg-white border rounded-3xl p-5 space-y-5 shadow-xs">
        <div>
          <h3 className="text-xs font-bold text-neutral-950 uppercase tracking-widest font-mono">
            Regras de Agendamento
          </h3>

          <p className="text-xs text-neutral-500 mt-1">
            Defina como a Vitrine deve liberar horários, confirmação, cancelamento e remarcação para os clientes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider block">
              Dias futuros na Vitrine
            </label>

            <input
              id="input-booking-max-future-days"
              type="number"
              min={1}
              max={90}
              value={bookingMaxFutureDays}
              onChange={(event) => onChangeBookingMaxFutureDays(safeNumber(event.target.value, 14))}
              className="w-full bg-neutral-50 border rounded-xl py-2.5 px-3.5 text-xs outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider block">
              Intervalo padrão
            </label>

            <select
              id="select-booking-slot-interval"
              value={bookingSlotIntervalMinutes}
              onChange={(event) => onChangeBookingSlotIntervalMinutes(Number(event.target.value))}
              className="w-full bg-neutral-50 border rounded-xl py-2.5 px-3.5 text-xs outline-none"
            >
              <option value={15}>15 minutos</option>
              <option value={20}>20 minutos</option>
              <option value={30}>30 minutos</option>
              <option value={40}>40 minutos</option>
              <option value={45}>45 minutos</option>
              <option value={60}>60 minutos</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider block">
              Antecedência para agendar
            </label>

            <input
              id="input-booking-min-lead"
              type="number"
              min={0}
              value={bookingMinLeadTimeMinutes}
              onChange={(event) => onChangeBookingMinLeadTimeMinutes(safeNumber(event.target.value))}
              className="w-full bg-neutral-50 border rounded-xl py-2.5 px-3.5 text-xs outline-none"
            />
            <p className="text-[10px] text-neutral-400">Em minutos.</p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider block">
              Antecedência para cancelar
            </label>

            <input
              id="input-booking-min-cancel"
              type="number"
              min={0}
              value={bookingMinCancelLeadTimeMinutes}
              onChange={(event) => onChangeBookingMinCancelLeadTimeMinutes(safeNumber(event.target.value))}
              className="w-full bg-neutral-50 border rounded-xl py-2.5 px-3.5 text-xs outline-none"
            />
            <p className="text-[10px] text-neutral-400">Em minutos.</p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider block">
              Antecedência para remarcar
            </label>

            <input
              id="input-booking-min-reschedule"
              type="number"
              min={0}
              value={bookingMinRescheduleLeadTimeMinutes}
              onChange={(event) => onChangeBookingMinRescheduleLeadTimeMinutes(safeNumber(event.target.value))}
              className="w-full bg-neutral-50 border rounded-xl py-2.5 px-3.5 text-xs outline-none"
            />
            <p className="text-[10px] text-neutral-400">Em minutos.</p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider block">
              Horário de abertura
            </label>

            <input
              id="input-booking-work-start"
              type="time"
              value={bookingWorkHoursStart}
              onChange={(event) => onChangeBookingWorkHoursStart(event.target.value)}
              className="w-full bg-neutral-50 border rounded-xl py-2.5 px-3.5 text-xs outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider block">
              Horário de fechamento
            </label>

            <input
              id="input-booking-work-end"
              type="time"
              value={bookingWorkHoursEnd}
              onChange={(event) => onChangeBookingWorkHoursEnd(event.target.value)}
              className="w-full bg-neutral-50 border rounded-xl py-2.5 px-3.5 text-xs outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider block">
              Início do almoço
            </label>

            <input
              id="input-booking-lunch-start"
              type="time"
              value={bookingLunchStart}
              onChange={(event) => onChangeBookingLunchStart(event.target.value)}
              className="w-full bg-neutral-50 border rounded-xl py-2.5 px-3.5 text-xs outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider block">
              Fim do almoço
            </label>

            <input
              id="input-booking-lunch-end"
              type="time"
              value={bookingLunchEnd}
              onChange={(event) => onChangeBookingLunchEnd(event.target.value)}
              className="w-full bg-neutral-50 border rounded-xl py-2.5 px-3.5 text-xs outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          <label className="flex items-start gap-3 rounded-2xl border bg-neutral-50 p-4 cursor-pointer">
            <input
              type="checkbox"
              checked={bookingAllowClientConfirmation}
              onChange={(event) => onChangeBookingAllowClientConfirmation(event.target.checked)}
              className="mt-0.5 h-4 w-4 accent-orange-600"
            />

            <span>
              <span className="block text-xs font-bold text-neutral-800 uppercase tracking-wider">
                Cliente pode confirmar presença
              </span>
              <span className="block text-[11px] text-neutral-500 mt-1">
                Ativa o link de confirmação quando enviarmos a mensagem pelo WhatsApp.
              </span>
            </span>
          </label>

          <label className="flex items-start gap-3 rounded-2xl border bg-neutral-50 p-4 cursor-pointer">
            <input
              type="checkbox"
              checked={bookingAllowClientCancellation}
              onChange={(event) => onChangeBookingAllowClientCancellation(event.target.checked)}
              className="mt-0.5 h-4 w-4 accent-orange-600"
            />

            <span>
              <span className="block text-xs font-bold text-neutral-800 uppercase tracking-wider">
                Cliente pode cancelar
              </span>
              <span className="block text-[11px] text-neutral-500 mt-1">
                Respeita a antecedência mínima definida acima.
              </span>
            </span>
          </label>

          <label className="flex items-start gap-3 rounded-2xl border bg-neutral-50 p-4 cursor-pointer">
            <input
              type="checkbox"
              checked={bookingAllowClientReschedule}
              onChange={(event) => onChangeBookingAllowClientReschedule(event.target.checked)}
              className="mt-0.5 h-4 w-4 accent-orange-600"
            />

            <span>
              <span className="block text-xs font-bold text-neutral-800 uppercase tracking-wider">
                Cliente pode remarcar
              </span>
              <span className="block text-[11px] text-neutral-500 mt-1">
                Respeita a antecedência mínima definida acima.
              </span>
            </span>
          </label>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button 
          id="btn-save-config"
          type="submit"
          className="bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold px-6 py-3.5 rounded-xl shadow-md transition cursor-pointer"
        >
          Salvar Alterações Globais
        </button>
      </div>

    </form>
  );
}
