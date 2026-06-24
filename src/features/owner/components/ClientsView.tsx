/**
 * Tela de Clientes do Painel do Dono - AgendaZap.
 *
 * Responsável por:
 * - exibir carteira limpa de clientes;
 * - buscar cliente por nome ou WhatsApp;
 * - permitir cadastro manual de cliente;
 * - abrir WhatsApp do cliente;
 * - exibir dados, histórico e métricas dentro do modal do cliente.
 */

import React, {
  useMemo,
  useState
} from 'react';

import {
  CalendarDays,
  Eye,
  Phone,
  Plus,
  Search,
  User,
  X
} from 'lucide-react';

import {
  Appointment,
  Client,
  Professional,
  Service
} from '../../../types';

import { formatCurrency } from '../owner.utils';

interface ClientsViewProps {
  clients: Client[];
  appointments: Appointment[];
  services: Service[];
  professionals: Professional[];
  clientSearch: string;
  onChangeClientSearch: (value: string) => void;
  onAddClient: (client: {
    name: string;
    phone: string;
    birthDate?: string;
  }) => void;
  onUpdateClient: (
    clientId: string,
    updates: {
      name: string;
      phone: string;
      birthDate?: string;
    }
  ) => boolean;
}

interface ManualClientFormState {
  name: string;
  phone: string;
  birthDate: string;
}

interface ClientEditFormState {
  name: string;
  phone: string;
  birthDate: string;
}

interface PeriodState {
  startDate: string;
  endDate: string;
}

function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

function formatPhoneMask(value: string): string {
  const digits = onlyDigits(value).slice(0, 11);

  if (digits.length <= 2) {
    return digits;
  }

  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }

  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function formatDateBr(dateStr: string): string {
  if (!dateStr || !dateStr.includes('-')) {
    return 'Não informado';
  }

  return dateStr.split('-').reverse().join('/');
}

function getAppointmentDate(appointment: Appointment): string {
  return appointment.dateTime.split('T')[0] || '';
}

function getLocalDateStr(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getDefaultPeriod(): PeriodState {
  const today = new Date();
  const startDate = new Date(today);
  startDate.setMonth(today.getMonth() - 12);

  return {
    startDate: getLocalDateStr(startDate),
    endDate: getLocalDateStr(today)
  };
}

function getClientAppointments(params: {
  client: Client;
  appointments: Appointment[];
}): Appointment[] {
  const { client, appointments } = params;
  const clientPhone = onlyDigits(client.phone);

  return appointments
    .filter((appointment) => {
      return onlyDigits(appointment.clientPhone) === clientPhone;
    })
    .sort((first, second) => {
      return second.dateTime.localeCompare(first.dateTime);
    });
}

function filterAppointmentsByPeriod(params: {
  appointments: Appointment[];
  period: PeriodState;
}): Appointment[] {
  const { appointments, period } = params;

  return appointments.filter((appointment) => {
    const appointmentDate = getAppointmentDate(appointment);

    return (
      appointmentDate >= period.startDate &&
      appointmentDate <= period.endDate
    );
  });
}

function getServiceName(
  services: Service[],
  serviceId: string
): string {
  const service = services.find((item) => item.id === serviceId);

  return service?.name || 'Serviço não localizado';
}

function getProfessionalName(
  professionals: Professional[],
  professionalId: string
): string {
  const professional = professionals.find((item) => item.id === professionalId);

  return professional?.name || 'Profissional não localizado';
}

function getWhatsAppUrl(phone: string): string {
  return `https://api.whatsapp.com/send?phone=55${onlyDigits(phone)}`;
}

function getClientInternalCode(client: Client): string {
  const clientRecord = client as unknown as Record<string, unknown>;
  const savedInternalCode = String(clientRecord.internalCode || '');

  if (savedInternalCode) {
    return savedInternalCode;
  }

  const idNumbers = client.id.replace(/\D/g, '');
  const fallbackNumber = idNumbers
    ? idNumbers.slice(-6).padStart(6, '0')
    : onlyDigits(client.phone).slice(-6).padStart(6, '0');

  return `CLI-${fallbackNumber}`;
}

export default function ClientsView({
  clients,
  appointments,
  services,
  professionals,
  clientSearch,
  onChangeClientSearch,
  onAddClient,
  onUpdateClient
}: ClientsViewProps) {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showManualClientModal, setShowManualClientModal] = useState(false);
  const [showMetrics, setShowMetrics] = useState(false);
  const [isEditingClient, setIsEditingClient] = useState(false);
  const [clientEditForm, setClientEditForm] =
    useState<ClientEditFormState>({
      name: '',
      phone: '',
      birthDate: ''
    });
  const [period, setPeriod] = useState<PeriodState>(getDefaultPeriod());
  const [manualClientForm, setManualClientForm] =
    useState<ManualClientFormState>({
      name: '',
      phone: '',
      birthDate: ''
    });

  const selectedClientAppointments = useMemo(() => {
    if (!selectedClient) {
      return [];
    }

    return getClientAppointments({
      client: selectedClient,
      appointments
    });
  }, [
    selectedClient,
    appointments
  ]);

  const periodAppointments = useMemo(() => {
    return filterAppointmentsByPeriod({
      appointments: selectedClientAppointments,
      period
    });
  }, [
    selectedClientAppointments,
    period
  ]);

  const completedPeriodAppointments = useMemo(() => {
    return periodAppointments.filter((appointment) => {
      return appointment.status === 'completed';
    });
  }, [periodAppointments]);

  const latestCompletedAppointment = useMemo(() => {
    return selectedClientAppointments.find((appointment) => {
      return appointment.status === 'completed';
    }) || null;
  }, [selectedClientAppointments]);

  const periodTotalSpent = useMemo(() => {
    return completedPeriodAppointments.reduce((total, appointment) => {
      return total + appointment.price;
    }, 0);
  }, [completedPeriodAppointments]);

  const absencesInPeriod = useMemo(() => {
    return periodAppointments.filter((appointment) => {
      return appointment.status === 'absent';
    }).length;
  }, [periodAppointments]);

  const cancellationsInPeriod = useMemo(() => {
    return periodAppointments.filter((appointment) => {
      return appointment.status === 'cancelled';
    }).length;
  }, [periodAppointments]);

  const handleOpenClientDetails = (client: Client) => {
    setSelectedClient(client);
    setShowMetrics(false);
    setIsEditingClient(false);
    setClientEditForm({
      name: client.name,
      phone: formatPhoneMask(client.phone),
      birthDate: client.birthDate || ''
    });
    setPeriod(getDefaultPeriod());
  };

  const handleCloseClientDetails = () => {
    setSelectedClient(null);
    setShowMetrics(false);
    setIsEditingClient(false);
  };

  const handleStartEditingClient = () => {
    if (!selectedClient) {
      return;
    }

    setClientEditForm({
      name: selectedClient.name,
      phone: formatPhoneMask(selectedClient.phone),
      birthDate: selectedClient.birthDate || ''
    });
    setIsEditingClient(true);
  };

  const handleCancelEditingClient = () => {
    if (!selectedClient) {
      return;
    }

    setClientEditForm({
      name: selectedClient.name,
      phone: formatPhoneMask(selectedClient.phone),
      birthDate: selectedClient.birthDate || ''
    });
    setIsEditingClient(false);
  };

  const handleSubmitClientEdit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedClient) {
      return;
    }

    if (!clientEditForm.name.trim() || !clientEditForm.phone.trim()) {
      return;
    }

    const wasUpdated = onUpdateClient(selectedClient.id, {
      name: clientEditForm.name.trim(),
      phone: clientEditForm.phone.trim(),
      birthDate: clientEditForm.birthDate || undefined
    });

    if (!wasUpdated) {
      return;
    }

    setSelectedClient((currentClient) => {
      if (!currentClient) {
        return currentClient;
      }

      return {
        ...currentClient,
        name: clientEditForm.name.trim(),
        phone: clientEditForm.phone.trim(),
        birthDate: clientEditForm.birthDate || undefined
      };
    });

    setIsEditingClient(false);
  };

  const handleChangeManualClientForm = (
    updates: Partial<ManualClientFormState>
  ) => {
    setManualClientForm((currentState) => ({
      ...currentState,
      ...updates
    }));
  };

  const handleSubmitManualClient = (event: React.FormEvent) => {
    event.preventDefault();

    if (!manualClientForm.name.trim() || !manualClientForm.phone.trim()) {
      return;
    }

    onAddClient({
      name: manualClientForm.name.trim(),
      phone: manualClientForm.phone.trim(),
      birthDate: manualClientForm.birthDate || undefined
    });

    setManualClientForm({
      name: '',
      phone: '',
      birthDate: ''
    });

    setShowManualClientModal(false);
  };

  return (
    <div id="view-clientes" className="space-y-6 text-left animate-none">

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-neutral-950">
            Carteira de Clientes
          </h2>

          <p className="text-xs text-neutral-500 mt-0.5">
            Consulte clientes, abra o WhatsApp rapidamente e acompanhe dados detalhados em uma tela limpa.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowManualClientModal(true)}
          className="bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold px-4 py-3 rounded-xl shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Cadastrar Cliente
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-3 w-4 h-4 text-zinc-400" />

        <input 
          id="input-client-search"
          type="text" 
          placeholder="Buscar por nome ou número do WhatsApp..."
          value={clientSearch}
          onChange={(event) => onChangeClientSearch(event.target.value)}
          className="w-full bg-white border rounded-xl py-2.5 pl-10 pr-4 text-xs outline-none focus:border-orange-500 shadow-xs"
        />
      </div>

      <div className="overflow-x-auto border rounded-3xl bg-white shadow-xs">
        <table className="w-full text-xs text-left">
          <thead className="bg-neutral-100 border-b text-neutral-600 font-bold uppercase tracking-wider text-[10px]">
            <tr>
              <th className="py-3.5 px-4 font-mono">
                Nome do Cliente
              </th>

              <th className="py-3.5 px-4 font-mono">
                WhatsApp
              </th>

              <th className="py-3.5 px-4 font-mono text-center">
                Dados do Cliente
              </th>

              <th className="py-3.5 px-4 font-mono text-center">
                WhatsApp Rápido
              </th>
            </tr>
          </thead>

          <tbody className="divide-y">
            {clients.map((client) => (
              <tr
                id={`client-row-${client.id}`}
                key={client.id}
                className="hover:bg-neutral-50/50 transition"
              >
                <td className="py-3.5 px-4 font-extrabold text-neutral-950">
                  {client.name}
                </td>

                <td className="py-3.5 px-4 font-mono font-medium text-neutral-600">
                  {formatPhoneMask(client.phone)}
                </td>

                <td className="py-3.5 px-4 text-center">
                  <button
                    type="button"
                    onClick={() => handleOpenClientDetails(client)}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-50 hover:bg-neutral-100 border text-neutral-700 text-xs font-bold transition"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Dados do Cliente
                  </button>
                </td>

                <td className="py-3.5 px-4 text-center">
                  <a 
                    href={getWhatsAppUrl(client.phone)}
                    target="_blank" 
                    rel="noreferrer" 
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 text-emerald-700 text-xs font-bold transition"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    Mensagem
                  </a>
                </td>
              </tr>
            ))}

            {clients.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="py-12 text-center text-neutral-400"
                >
                  Nenhum cliente correspondente encontrado na busca.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedClient && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-4xl w-full border text-left shadow-2xl relative space-y-5 max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b pb-3 gap-3">
              <div>
                <h3 className="text-lg font-black text-neutral-950">
                  Dados do Cliente
                </h3>

                <p className="text-xs text-neutral-500 mt-1">
                  {selectedClient.name}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {!isEditingClient && (
                  <button
                    type="button"
                    onClick={handleStartEditingClient}
                    className="px-3 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-black transition"
                  >
                    Editar
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleCloseClientDetails}
                  className="text-zinc-400 hover:text-zinc-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {isEditingClient ? (
              <form
                onSubmit={handleSubmitClientEdit}
                className="bg-neutral-50 border rounded-3xl p-4 space-y-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-neutral-500 uppercase tracking-wider block">
                      Nome
                    </label>

                    <input
                      type="text"
                      value={clientEditForm.name}
                      onChange={(event) => {
                        setClientEditForm((currentForm) => ({
                          ...currentForm,
                          name: event.target.value
                        }));
                      }}
                      className="w-full bg-white border rounded-xl py-2.5 px-3 text-xs outline-none focus:border-orange-500"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-neutral-500 uppercase tracking-wider block">
                      WhatsApp
                    </label>

                    <input
                      type="tel"
                      value={clientEditForm.phone}
                      onChange={(event) => {
                        setClientEditForm((currentForm) => ({
                          ...currentForm,
                          phone: formatPhoneMask(event.target.value)
                        }));
                      }}
                      placeholder="(99) 99999-9999"
                      className="w-full bg-white border rounded-xl py-2.5 px-3 text-xs outline-none focus:border-orange-500"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-neutral-500 uppercase tracking-wider block">
                      Aniversário
                    </label>

                    <input
                      type="date"
                      value={clientEditForm.birthDate}
                      onChange={(event) => {
                        setClientEditForm((currentForm) => ({
                          ...currentForm,
                          birthDate: event.target.value
                        }));
                      }}
                      className="w-full bg-white border rounded-xl py-2.5 px-3 text-xs outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleCancelEditingClient}
                    className="px-4 py-2.5 rounded-xl border bg-white text-neutral-700 text-xs font-black hover:bg-neutral-50 transition"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    className="px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-black transition"
                  >
                    Salvar dados
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-neutral-50 border rounded-2xl p-4">
                  <span className="text-[10px] font-black text-neutral-500 uppercase tracking-wider">
                    Nome
                  </span>

                  <p className="text-sm font-black text-neutral-950 mt-1">
                    {selectedClient.name}
                  </p>
                </div>

                <div className="bg-neutral-50 border rounded-2xl p-4">
                  <span className="text-[10px] font-black text-neutral-500 uppercase tracking-wider">
                    WhatsApp
                  </span>

                  <a
                    href={getWhatsAppUrl(selectedClient.phone)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-black text-emerald-700 mt-1 inline-flex items-center gap-1.5 hover:underline"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    {formatPhoneMask(selectedClient.phone)}
                  </a>
                </div>

                <div className="bg-neutral-50 border rounded-2xl p-4">
                  <span className="text-[10px] font-black text-neutral-500 uppercase tracking-wider">
                    Aniversário
                  </span>

                  <p className="text-sm font-black text-neutral-950 mt-1">
                    {selectedClient.birthDate
                      ? formatDateBr(selectedClient.birthDate)
                      : 'Não informado'}
                  </p>
                </div>
              </div>
            )}

            <div className="border rounded-3xl p-4 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h4 className="text-sm font-black text-neutral-950">
                  Histórico de Consumo
                </h4>

                <button
                  type="button"
                  onClick={() => setShowMetrics((currentValue) => !currentValue)}
                  className="px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-black transition"
                >
                  Métricas
                </button>
              </div>

              <div className="overflow-x-auto border rounded-2xl">
                <table className="w-full text-xs text-left">
                  <thead className="bg-neutral-100 border-b text-neutral-600 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">
                        Último serviço
                      </th>

                      <th className="py-3 px-4">
                        Profissional
                      </th>

                      <th className="py-3 px-4">
                        Data
                      </th>

                      <th className="py-3 px-4 text-right">
                        Total gasto no período
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    <tr>
                      <td className="py-3.5 px-4 font-bold text-neutral-900">
                        {latestCompletedAppointment
                          ? getServiceName(services, latestCompletedAppointment.serviceId)
                          : 'Nenhum serviço concluído'}
                      </td>

                      <td className="py-3.5 px-4 text-neutral-600">
                        {latestCompletedAppointment
                          ? getProfessionalName(professionals, latestCompletedAppointment.professionalId)
                          : 'Não informado'}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-neutral-700">
                        {latestCompletedAppointment
                          ? formatDateBr(getAppointmentDate(latestCompletedAppointment))
                          : 'Não informado'}
                      </td>

                      <td className="py-3.5 px-4 text-right font-black text-neutral-950 font-mono">
                        {formatCurrency(periodTotalSpent)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {showMetrics && (
                <div className="bg-neutral-50 border rounded-2xl p-4 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                    <div>
                      <h5 className="text-sm font-black text-neutral-950">
                        Métricas
                      </h5>

                      <p className="text-xs text-neutral-500 mt-0.5">
                        Padrão: últimos 12 meses. Ajuste as datas se quiser outro período.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <label className="space-y-1">
                        <span className="text-[10px] font-black text-neutral-500 uppercase tracking-wider">
                          Data inicial
                        </span>

                        <input
                          type="date"
                          value={period.startDate}
                          onChange={(event) => {
                            setPeriod((currentPeriod) => ({
                              ...currentPeriod,
                              startDate: event.target.value
                            }));
                          }}
                          className="w-full rounded-xl border bg-white px-3 py-2 text-xs font-bold outline-none focus:border-orange-500"
                        />
                      </label>

                      <label className="space-y-1">
                        <span className="text-[10px] font-black text-neutral-500 uppercase tracking-wider">
                          Data final
                        </span>

                        <input
                          type="date"
                          value={period.endDate}
                          onChange={(event) => {
                            setPeriod((currentPeriod) => ({
                              ...currentPeriod,
                              endDate: event.target.value
                            }));
                          }}
                          className="w-full rounded-xl border bg-white px-3 py-2 text-xs font-bold outline-none focus:border-orange-500"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="bg-white border rounded-2xl p-4">
                      <span className="text-[10px] font-black text-neutral-500 uppercase tracking-wider">
                        Presenças
                      </span>

                      <p className="text-xl font-black text-neutral-950 mt-1">
                        {completedPeriodAppointments.length}
                      </p>
                    </div>

                    <div className="bg-white border rounded-2xl p-4">
                      <span className="text-[10px] font-black text-neutral-500 uppercase tracking-wider">
                        Faltas
                      </span>

                      <p className="text-xl font-black text-red-600 mt-1">
                        {absencesInPeriod}
                      </p>
                    </div>

                    <div className="bg-white border rounded-2xl p-4">
                      <span className="text-[10px] font-black text-neutral-500 uppercase tracking-wider">
                        Cancelamentos
                      </span>

                      <p className="text-xl font-black text-neutral-950 mt-1">
                        {cancellationsInPeriod}
                      </p>
                    </div>

                    <div className="bg-white border rounded-2xl p-4">
                      <span className="text-[10px] font-black text-neutral-500 uppercase tracking-wider">
                        Gasto total
                      </span>

                      <p className="text-xl font-black text-neutral-950 mt-1">
                        {formatCurrency(periodTotalSpent)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showManualClientModal && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border text-left shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-black text-neutral-950">
                Cadastrar Cliente
              </h3>

              <button
                type="button"
                onClick={() => setShowManualClientModal(false)}
                className="text-zinc-400 hover:text-zinc-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleSubmitManualClient}
              className="space-y-4 text-xs"
            >
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-700 uppercase tracking-wider block">
                  Nome do Cliente
                </label>

                <div className="relative">
                  <User className="absolute left-3.5 top-3 w-4 h-4 text-zinc-400" />

                  <input
                    type="text"
                    value={manualClientForm.name}
                    onChange={(event) => {
                      handleChangeManualClientForm({
                        name: event.target.value
                      });
                    }}
                    className="w-full bg-neutral-50 border rounded-xl py-2.5 pl-10 pr-3.5 text-xs outline-none"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-700 uppercase tracking-wider block">
                  WhatsApp
                </label>

                <div className="relative">
                  <Phone className="absolute left-3.5 top-3 w-4 h-4 text-zinc-400" />

                  <input
                    type="tel"
                    value={manualClientForm.phone}
                    onChange={(event) => {
                      handleChangeManualClientForm({
                        phone: formatPhoneMask(event.target.value)
                      });
                    }}
                    placeholder="(99) 99999-9999"
                    className="w-full bg-neutral-50 border rounded-xl py-2.5 pl-10 pr-3.5 text-xs outline-none"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-700 uppercase tracking-wider block">
                  Aniversário
                </label>

                <div className="relative">
                  <CalendarDays className="absolute left-3.5 top-3 w-4 h-4 text-zinc-400" />

                  <input
                    type="date"
                    value={manualClientForm.birthDate}
                    onChange={(event) => {
                      handleChangeManualClientForm({
                        birthDate: event.target.value
                      });
                    }}
                    className="w-full bg-neutral-50 border rounded-xl py-2.5 pl-10 pr-3.5 text-xs outline-none"
                  />
                </div>
              </div>

              <button 
                type="submit"
                className="w-full bg-neutral-950 hover:bg-neutral-800 text-white font-bold py-3 rounded-xl transition text-sm cursor-pointer"
              >
                Salvar Cliente
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
