/**
 * Tela de Clientes do Painel do Dono - AgendaSpeed.
 *
 * Responsável por:
 * - exibir carteira limpa de clientes;
 * - buscar cliente por nome ou WhatsApp;
 * - destacar aniversariantes do dia;
 * - abrir WhatsApp com mensagem rápida ou mensagem automática de aniversário;
 * - exibir dados, histórico e métricas dentro do modal do cliente;
 * - imprimir relatório individual ou geral do período selecionado.
 */

import React, {
  useEffect,
  useMemo,
  useState
} from 'react';

import {
  CalendarDays,
  Cake,
  Eye,
  MessageCircle,
  Phone,
  Plus,
  Printer,
  Search,
  Send,
  Trash2,
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
    cpf?: string;
    birthDate?: string;
  }) => void;
  onUpdateClient: (
    clientId: string,
    updates: {
      name: string;
      phone: string;
      cpf?: string;
      birthDate?: string;
    }
  ) => boolean;
  onDeleteClient: (clientId: string) => void;
}

interface ManualClientFormState {
  name: string;
  phone: string;
  cpf: string;
  birthDate: string;
}

interface ClientEditFormState {
  name: string;
  phone: string;
  cpf: string;
  birthDate: string;
}

interface PeriodState {
  startDate: string;
  endDate: string;
}

interface ClientStats {
  presences: number;
  reschedules: number;
  absences: number;
  cancellations: number;
  totalSpent: number;
  appointmentsCount: number;
}

function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

function normalizeSearch(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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

function formatCpfMask(value: string): string {
  const digits = onlyDigits(value).slice(0, 11);

  if (digits.length <= 3) {
    return digits;
  }

  if (digits.length <= 6) {
    return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  }

  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  }

  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
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

function getClientStats(params: {
  client: Client;
  appointments: Appointment[];
  period: PeriodState;
}): ClientStats {
  const periodAppointments = filterAppointmentsByPeriod({
    appointments: getClientAppointments({
      client: params.client,
      appointments: params.appointments
    }),
    period: params.period
  });

  const completedAppointments = periodAppointments.filter((appointment) => {
    return appointment.status === 'completed';
  });

  return {
    presences: completedAppointments.length,
    reschedules: periodAppointments.filter((appointment) => appointment.status === 'rescheduled').length,
    absences: periodAppointments.filter((appointment) => appointment.status === 'absent').length,
    cancellations: periodAppointments.filter((appointment) => appointment.status === 'cancelled').length,
    totalSpent: completedAppointments.reduce((total, appointment) => {
      return total + appointment.price;
    }, 0),
    appointmentsCount: periodAppointments.length
  };
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

function getWhatsAppUrl(phone: string, message?: string): string {
  const digits = onlyDigits(phone);
  const encodedMessage = message ? `&text=${encodeURIComponent(message)}` : '';

  return `https://api.whatsapp.com/send?phone=55${digits}${encodedMessage}`;
}

function getBirthdayMessage(clientName: string): string {
  const firstName = clientName.trim().split(/\s+/)[0] || clientName;

  return `Olá ${firstName}, passando para desejar um feliz aniversário! 🎉 Que seu dia seja muito especial, com muita saúde, alegria e sucesso. Um abraço!`;
}

function isClientBirthdayToday(client: Client, todayDate: Date): boolean {
  if (!client.birthDate || !client.birthDate.includes('-')) {
    return false;
  }

  const [, month, day] = client.birthDate.split('-');
  const todayMonth = String(todayDate.getMonth() + 1).padStart(2, '0');
  const todayDay = String(todayDate.getDate()).padStart(2, '0');

  return month === todayMonth && day === todayDay;
}

function getBirthdayStorageKey(clientId: string, currentYear: number): string {
  return `agendaspeed-birthday-greeted-${currentYear}-${clientId}`;
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

function buildReportHtml(params: {
  clients: Client[];
  appointments: Appointment[];
  services: Service[];
  professionals: Professional[];
  period: PeriodState;
  title: string;
}): string {
  const rows = params.clients.map((client) => {
    const stats = getClientStats({
      client,
      appointments: params.appointments,
      period: params.period
    });
    const latestAppointment = getClientAppointments({
      client,
      appointments: params.appointments
    })[0];
    const latestService = latestAppointment
      ? getServiceName(params.services, latestAppointment.serviceId)
      : 'Sem histórico';

    return `
      <tr>
        <td>${escapeHtml(client.name)}</td>
        <td>${escapeHtml(formatPhoneMask(client.phone))}</td>
        <td>${escapeHtml(client.cpf ? formatCpfMask(client.cpf) : 'Não informado')}</td>
        <td>${escapeHtml(client.birthDate ? formatDateBr(client.birthDate) : 'Não informado')}</td>
        <td>${stats.presences}</td>
        <td>${stats.reschedules}</td>
        <td>${stats.absences}</td>
        <td>${stats.cancellations}</td>
        <td>${escapeHtml(formatCurrency(stats.totalSpent))}</td>
        <td>${escapeHtml(latestService)}</td>
      </tr>
    `;
  }).join('');

  return `
    <!doctype html>
    <html>
      <head>
        <title>${escapeHtml(params.title)}</title>
        <meta charset="utf-8" />
        <style>
          * { box-sizing: border-box; }
          body { font-family: Arial, sans-serif; color: #111827; margin: 24px; }
          h1 { font-size: 20px; margin: 0; }
          p { margin: 6px 0 18px; color: #64748b; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th { text-align: left; background: #0f4c5c; color: white; padding: 8px; }
          td { border-bottom: 1px solid #e2e8f0; padding: 8px; vertical-align: top; }
          .total { margin-top: 16px; font-weight: 700; color: #0f4c5c; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(params.title)}</h1>
        <p>Período: ${escapeHtml(formatDateBr(params.period.startDate))} até ${escapeHtml(formatDateBr(params.period.endDate))}</p>
        <table>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>WhatsApp</th>
              <th>CPF</th>
              <th>Aniversário</th>
              <th>Presenças</th>
              <th>Reagend.</th>
              <th>Faltas</th>
              <th>Cancel.</th>
              <th>Receita</th>
              <th>Último serviço</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="total">Total de clientes no relatório: ${params.clients.length}</div>
        <script>window.onload = () => window.print();</script>
      </body>
    </html>
  `;
}

function printHtml(html: string) {
  const printWindow = window.open('', '_blank', 'width=1100,height=800');

  if (!printWindow) {
    alert('Não foi possível abrir a janela de impressão. Verifique o bloqueador de pop-ups.');
    return;
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

export default function ClientsView({
  clients,
  appointments,
  services,
  professionals,
  clientSearch,
  onChangeClientSearch,
  onAddClient,
  onUpdateClient,
  onDeleteClient
}: ClientsViewProps) {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showManualClientModal, setShowManualClientModal] = useState(false);
  const [showMetrics, setShowMetrics] = useState(false);
  const [isEditingClient, setIsEditingClient] = useState(false);
  const [clientEditForm, setClientEditForm] =
    useState<ClientEditFormState>({
      name: '',
      phone: '',
      cpf: '',
      birthDate: ''
    });
  const [period, setPeriod] = useState<PeriodState>(getDefaultPeriod());
  const [manualClientForm, setManualClientForm] =
    useState<ManualClientFormState>({
      name: '',
      phone: '',
      cpf: '',
      birthDate: ''
    });
  const [currentPage, setCurrentPage] = useState(1);
  const clientsPerPage = 20;
  const currentYear = new Date().getFullYear();
  const todayDate = new Date();

  const [birthdayGreetingKeys, setBirthdayGreetingKeys] = useState<string[]>(() => {
    return clients
      .filter((client) => {
        const storageKey = getBirthdayStorageKey(client.id, currentYear);
        return localStorage.getItem(storageKey) === 'sent';
      })
      .map((client) => getBirthdayStorageKey(client.id, currentYear));
  });

  const filteredClients = useMemo(() => {
    const normalizedSearch = normalizeSearch(clientSearch);

    return [...clients]
      .filter((client) => {
        if (!normalizedSearch) {
          return true;
        }

        return [
          client.name,
          client.phone,
          client.cpf || '',
          client.birthDate || '',
          getClientInternalCode(client)
        ].some((value) => normalizeSearch(value).includes(normalizedSearch));
      })
      .sort((firstClient, secondClient) => {
        const firstBirthday = isClientBirthdayToday(firstClient, todayDate);
        const secondBirthday = isClientBirthdayToday(secondClient, todayDate);

        if (firstBirthday !== secondBirthday) {
          return firstBirthday ? -1 : 1;
        }

        return firstClient.name.localeCompare(secondClient.name, 'pt-BR');
      });
  }, [clients, clientSearch, todayDate]);

  const totalClientPages = Math.max(
    1,
    Math.ceil(filteredClients.length / clientsPerPage),
  );
  const paginatedClients = useMemo(() => {
    const safePage = Math.min(currentPage, totalClientPages);
    const startIndex = (safePage - 1) * clientsPerPage;

    return filteredClients.slice(startIndex, startIndex + clientsPerPage);
  }, [filteredClients, currentPage, totalClientPages]);

  const birthdayClients = useMemo(() => {
    return clients.filter((client) => isClientBirthdayToday(client, todayDate));
  }, [clients, todayDate]);

  useEffect(() => {
    setCurrentPage(1);
  }, [clientSearch]);

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

  const reschedulesInPeriod = useMemo(() => {
    return periodAppointments.filter((appointment) => {
      return appointment.status === 'rescheduled';
    }).length;
  }, [periodAppointments]);

  const handleOpenClientDetails = (client: Client) => {
    setSelectedClient(client);
    setShowMetrics(false);
    setIsEditingClient(false);
    setClientEditForm({
      name: client.name,
      phone: formatPhoneMask(client.phone),
      cpf: formatCpfMask(client.cpf || ''),
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
      cpf: formatCpfMask(selectedClient.cpf || ''),
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
      cpf: formatCpfMask(selectedClient.cpf || ''),
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
      cpf: onlyDigits(clientEditForm.cpf) || undefined,
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
        cpf: onlyDigits(clientEditForm.cpf) || undefined,
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
      cpf: onlyDigits(manualClientForm.cpf) || undefined,
      birthDate: manualClientForm.birthDate || undefined
    });

    setManualClientForm({
      name: '',
      phone: '',
      cpf: '',
      birthDate: ''
    });

    setShowManualClientModal(false);
  };

  const handleBirthdayWhatsAppClick = (client: Client) => {
    const storageKey = getBirthdayStorageKey(client.id, currentYear);

    localStorage.setItem(storageKey, 'sent');

    setBirthdayGreetingKeys((currentKeys) => {
      if (currentKeys.includes(storageKey)) {
        return currentKeys;
      }

      return [...currentKeys, storageKey];
    });
  };

  const handleDeleteClient = (client: Client) => {
    const confirmed = confirm(
      `Deseja excluir definitivamente o cliente ${client.name}?\n\nEssa ação remove o cadastro da carteira. O histórico de agendamentos pode continuar preservado na agenda/financeiro.`,
    );

    if (!confirmed) {
      return;
    }

    onDeleteClient(client.id);
  };

  const handlePrintAllClientsReport = () => {
    printHtml(
      buildReportHtml({
        clients: filteredClients,
        appointments,
        services,
        professionals,
        period,
        title: 'Relatório de clientes'
      })
    );
  };

  const handlePrintSelectedClientReport = () => {
    if (!selectedClient) {
      return;
    }

    printHtml(
      buildReportHtml({
        clients: [selectedClient],
        appointments,
        services,
        professionals,
        period,
        title: `Relatório do cliente ${selectedClient.name}`
      })
    );
  };

  return (
    <div id="view-clientes" className="space-y-3 text-left animate-none">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="h-1.5 bg-[#0f4c5c]" />

        <div className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#0f4c5c]">
              AGENDASPEED
            </p>

            <h2 className="text-lg font-black tracking-tight text-neutral-950">
              Clientes
            </h2>
          </div>

          <div className="flex w-full flex-col gap-2 lg:max-w-3xl lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />

              <input
                id="input-client-search"
                type="search"
                placeholder="Buscar por nome, WhatsApp, CPF ou código"
                value={clientSearch}
                onChange={(event) => onChangeClientSearch(event.target.value)}
                className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-[#0f4c5c] focus:bg-white"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handlePrintAllClientsReport}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-black text-slate-700 shadow-sm transition hover:border-[#0f4c5c]/40 hover:bg-slate-50 flex items-center justify-center gap-1.5"
              >
                <Printer className="h-4 w-4 text-[#0f4c5c]" />
                Relatório
              </button>

              <button
                type="button"
                onClick={() => setShowManualClientModal(true)}
                className="rounded-xl bg-[#0f4c5c] px-4 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-[#123945] flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Cadastrar Cliente
              </button>
            </div>
          </div>
        </div>
      </div>

      {birthdayClients.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-amber-200 bg-amber-50 shadow-sm">
          <div className="flex flex-col gap-3 p-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-amber-600 shadow-sm">
                <Cake className="h-5 w-5" />
              </span>

              <div>
                <h3 className="text-sm font-black text-amber-900">
                  Aniversariantes de hoje
                </h3>
                <p className="text-xs font-semibold text-amber-700">
                  Clique no WhatsApp rápido para abrir a mensagem automática de aniversário.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {birthdayClients.slice(0, 6).map((client) => {
                const storageKey = getBirthdayStorageKey(client.id, currentYear);
                const alreadyGreeted = birthdayGreetingKeys.includes(storageKey);

                return (
                  <a
                    key={client.id}
                    href={getWhatsAppUrl(client.phone, getBirthdayMessage(client.name))}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => handleBirthdayWhatsAppClick(client)}
                    className={`rounded-xl border px-3 py-2 text-xs font-black transition ${
                      alreadyGreeted
                        ? 'border-emerald-200 bg-emerald-100 text-emerald-800'
                        : 'border-amber-200 bg-white text-amber-800 hover:bg-amber-100'
                    }`}
                  >
                    {client.name.split(' ')[0]} {alreadyGreeted ? '✓ felicitado' : '🎂 felicitar'}
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-[1.25fr_1fr_1fr_1fr_210px] border-b border-slate-200 bg-[#0f4c5c] px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-white">
          <div>Nome do Cliente</div>
          <div>WhatsApp</div>
          <div>CPF</div>
          <div>Dados do Cliente</div>
          <div className="text-center">WhatsApp Rápido</div>
        </div>

        <div className="divide-y divide-slate-100">
          {paginatedClients.map((client) => {
            const clientAppointments = getClientAppointments({
              client,
              appointments
            });
            const isBirthday = isClientBirthdayToday(client, todayDate);
            const birthdayStorageKey = getBirthdayStorageKey(client.id, currentYear);
            const birthdayAlreadyGreeted = birthdayGreetingKeys.includes(birthdayStorageKey);

            return (
              <div
                id={`client-row-${client.id}`}
                key={client.id}
                className={`grid grid-cols-1 gap-3 px-4 py-3 transition hover:bg-slate-50 lg:grid-cols-[1.25fr_1fr_1fr_1fr_210px] lg:items-center ${
                  isBirthday ? 'bg-amber-50/80' : 'bg-white'
                }`}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-black text-slate-950">
                      {client.name}
                    </p>

                    {isBirthday && (
                      <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] ${
                        birthdayAlreadyGreeted
                          ? 'border-emerald-200 bg-emerald-100 text-emerald-800'
                          : 'border-amber-200 bg-amber-100 text-amber-800'
                      }`}>
                        {birthdayAlreadyGreeted ? 'Felicitado' : 'Aniversariante'}
                      </span>
                    )}
                  </div>

                </div>

                <div>
                  <p className="text-sm font-bold text-slate-700">
                    {formatPhoneMask(client.phone)}
                  </p>

                  <p className="mt-1 text-[11px] font-semibold text-slate-400">
                    Aniv.: {client.birthDate ? formatDateBr(client.birthDate) : 'não informado'}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-bold text-slate-700">
                    {client.cpf ? formatCpfMask(client.cpf) : 'Não informado'}
                  </p>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => handleOpenClientDetails(client)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:border-[#0f4c5c]/40 hover:bg-[#0f4c5c]/5 hover:text-[#0f4c5c] flex items-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Dados do Cliente
                  </button>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <a
                    href={getWhatsAppUrl(
                      client.phone,
                      isBirthday ? getBirthdayMessage(client.name) : undefined
                    )}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => {
                      if (isBirthday) {
                        handleBirthdayWhatsAppClick(client);
                      }
                    }}
                    className={`rounded-xl px-3 py-2 text-xs font-black transition flex items-center gap-1.5 ${
                      isBirthday
                        ? birthdayAlreadyGreeted
                          ? 'border border-emerald-200 bg-emerald-100 text-emerald-800'
                          : 'border border-amber-200 bg-amber-100 text-amber-800 hover:bg-amber-200'
                        : 'border border-[#0f4c5c]/20 bg-[#0f4c5c] text-white hover:bg-[#123945]'
                    }`}
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    {isBirthday ? 'Aniversário' : 'Mensagem'}
                  </a>

                  <button
                    type="button"
                    onClick={() => handleDeleteClient(client)}
                    className="rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-black text-red-600 transition hover:bg-red-50 flex items-center gap-1.5"
                    title="Excluir cadastro do cliente"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Excluir
                  </button>
                </div>

                {clientAppointments.length === 0 && (
                  <div className="text-[11px] font-semibold text-slate-400 lg:col-span-5">
                    Cliente ainda sem histórico de agendamentos no período carregado.
                  </div>
                )}
              </div>
            );
          })}

          {filteredClients.length === 0 && (
            <div className="p-12 text-center text-sm font-semibold text-slate-400">
              Nenhum cliente correspondente encontrado na busca.
            </div>
          )}
        </div>
      </div>

      {filteredClients.length > clientsPerPage && (
        <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-600 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <span>
            Mostrando {paginatedClients.length} de {filteredClients.length} clientes · Página {Math.min(currentPage, totalClientPages)} de {totalClientPages}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:border-[#0f4c5c]/40 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Anterior
            </button>

            <button
              type="button"
              disabled={currentPage >= totalClientPages}
              onClick={() => setCurrentPage((page) => Math.min(totalClientPages, page + 1))}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:border-[#0f4c5c]/40 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Próxima
            </button>
          </div>
        </div>
      )}

      {selectedClient && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl border bg-white p-5 text-left shadow-2xl sm:p-6">
            <div className="flex items-start justify-between border-b pb-3 gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#0f4c5c]">
                  AGENDASPEED
                </p>
                <h3 className="text-lg font-black text-neutral-950">
                  Dados do Cliente
                </h3>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  {selectedClient.name}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {!isEditingClient && (
                  <button
                    type="button"
                    onClick={handleStartEditingClient}
                    className="rounded-xl bg-[#0f4c5c] px-3 py-2 text-xs font-black text-white transition hover:bg-[#123945]"
                  >
                    Editar
                  </button>
                )}

                <button
                  type="button"
                  onClick={handlePrintSelectedClientReport}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:border-[#0f4c5c]/40 hover:bg-slate-50 flex items-center gap-1.5"
                >
                  <Printer className="h-3.5 w-3.5 text-[#0f4c5c]" />
                  Imprimir
                </button>

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
                className="mt-4 rounded-2xl border bg-slate-50 p-4 space-y-4"
              >
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500">
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
                      className="w-full rounded-xl border bg-white px-3 py-2.5 text-xs outline-none focus:border-[#0f4c5c]"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500">
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
                      className="w-full rounded-xl border bg-white px-3 py-2.5 text-xs outline-none focus:border-[#0f4c5c]"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500">
                      CPF
                    </label>

                    <input
                      type="text"
                      inputMode="numeric"
                      value={clientEditForm.cpf}
                      onChange={(event) => {
                        setClientEditForm((currentForm) => ({
                          ...currentForm,
                          cpf: formatCpfMask(event.target.value)
                        }));
                      }}
                      placeholder="000.000.000-00"
                      className="w-full rounded-xl border bg-white px-3 py-2.5 text-xs outline-none focus:border-[#0f4c5c]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500">
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
                      className="w-full rounded-xl border bg-white px-3 py-2.5 text-xs outline-none focus:border-[#0f4c5c]"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleCancelEditingClient}
                    className="rounded-xl border bg-white px-4 py-2.5 text-xs font-black text-neutral-700 transition hover:bg-neutral-50"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    className="rounded-xl bg-[#0f4c5c] px-4 py-2.5 text-xs font-black text-white transition hover:bg-[#123945]"
                  >
                    Salvar dados
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border bg-slate-50 p-4">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Nome
                  </span>

                  <p className="mt-1 text-sm font-black text-neutral-950">
                    {selectedClient.name}
                  </p>
                </div>

                <div className="rounded-2xl border bg-slate-50 p-4">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    WhatsApp
                  </span>

                  <a
                    href={getWhatsAppUrl(selectedClient.phone)}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center gap-1.5 text-sm font-black text-[#0f4c5c] hover:underline"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    {formatPhoneMask(selectedClient.phone)}
                  </a>
                </div>

                <div className="rounded-2xl border bg-slate-50 p-4">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    CPF
                  </span>

                  <p className="mt-1 text-sm font-black text-neutral-950">
                    {selectedClient.cpf
                      ? formatCpfMask(selectedClient.cpf)
                      : 'Não informado'}
                  </p>
                </div>

                <div className="rounded-2xl border bg-slate-50 p-4">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Aniversário
                  </span>

                  <p className="mt-1 text-sm font-black text-neutral-950">
                    {selectedClient.birthDate
                      ? formatDateBr(selectedClient.birthDate)
                      : 'Não informado'}
                  </p>
                </div>
              </div>
            )}

            <div className="mt-4 rounded-2xl border p-4 space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h4 className="text-sm font-black text-neutral-950">
                    Histórico e métricas
                  </h4>

                  <p className="mt-0.5 text-xs font-semibold text-slate-500">
                    Ajuste o período para consultar presenças, reagendamentos, faltas, cancelamentos e receita.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <label className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
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
                      className="w-full rounded-xl border bg-white px-3 py-2 text-xs font-bold outline-none focus:border-[#0f4c5c]"
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
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
                      className="w-full rounded-xl border bg-white px-3 py-2 text-xs font-bold outline-none focus:border-[#0f4c5c]"
                    />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                <div className="rounded-2xl border bg-white p-4">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Presenças
                  </span>

                  <p className="mt-1 text-xl font-black text-[#0f4c5c]">
                    {completedPeriodAppointments.length}
                  </p>
                </div>

                <div className="rounded-2xl border bg-white p-4">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Reagend.
                  </span>

                  <p className="mt-1 text-xl font-black text-orange-600">
                    {reschedulesInPeriod}
                  </p>
                </div>

                <div className="rounded-2xl border bg-white p-4">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Faltas
                  </span>

                  <p className="mt-1 text-xl font-black text-red-600">
                    {absencesInPeriod}
                  </p>
                </div>

                <div className="rounded-2xl border bg-white p-4">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Cancel.
                  </span>

                  <p className="mt-1 text-xl font-black text-slate-700">
                    {cancellationsInPeriod}
                  </p>
                </div>

                <div className="rounded-2xl border bg-white p-4">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Receita
                  </span>

                  <p className="mt-1 text-xl font-black text-[#0f4c5c]">
                    {formatCurrency(periodTotalSpent)}
                  </p>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border">
                <table className="w-full text-left text-xs">
                  <thead className="border-b bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Serviço</th>
                      <th className="px-4 py-3">Profissional</th>
                      <th className="px-4 py-3">Data</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Valor</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {periodAppointments.slice(0, 12).map((appointment) => (
                      <tr key={appointment.id}>
                        <td className="px-4 py-3 font-bold text-slate-900">
                          {getServiceName(services, appointment.serviceId)}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {getProfessionalName(professionals, appointment.professionalId)}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {formatDateBr(getAppointmentDate(appointment))}
                        </td>
                        <td className="px-4 py-3 font-black uppercase text-slate-500">
                          {appointment.status}
                        </td>
                        <td className="px-4 py-3 text-right font-black text-[#0f4c5c]">
                          {formatCurrency(appointment.price)}
                        </td>
                      </tr>
                    ))}

                    {periodAppointments.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                          Nenhum atendimento encontrado no período.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {showManualClientModal && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl border bg-white p-6 text-left shadow-2xl sm:p-8">
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
              className="mt-4 space-y-4 text-xs"
            >
              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-700">
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
                    className="w-full rounded-xl border bg-slate-50 py-2.5 pl-10 pr-3.5 text-xs outline-none focus:border-[#0f4c5c]"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-700">
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
                    className="w-full rounded-xl border bg-slate-50 py-2.5 pl-10 pr-3.5 text-xs outline-none focus:border-[#0f4c5c]"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-700">
                  CPF (opcional)
                </label>

                <input
                  type="text"
                  inputMode="numeric"
                  value={manualClientForm.cpf}
                  onChange={(event) => {
                    handleChangeManualClientForm({
                      cpf: formatCpfMask(event.target.value)
                    });
                  }}
                  placeholder="000.000.000-00"
                  className="w-full rounded-xl border bg-slate-50 px-3.5 py-2.5 text-xs outline-none focus:border-[#0f4c5c]"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-700">
                  Data de nascimento
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
                    className="w-full rounded-xl border bg-slate-50 py-2.5 pl-10 pr-3.5 text-xs outline-none focus:border-[#0f4c5c]"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-[#0f4c5c] py-3 text-sm font-bold text-white transition hover:bg-[#123945]"
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
