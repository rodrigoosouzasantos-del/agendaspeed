/**
 * Tela de Recebimentos - AgendaZap.
 *
 * Fluxo operacional do caixa:
 * - buscar cliente por WhatsApp;
 * - localizar atendimentos pendentes de recebimento;
 * - baixar atendimento para concluído;
 * - abrir uma segunda tela para fechamento definitivo;
 * - incluir serviços extras vinculados a profissionais;
 * - imprimir filipeta térmica do recebimento ou resumo do dia;
 * - alimentar financeiro e comissões por profissional.
 */

import React, {
  useMemo,
  useState
} from 'react';

import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  MinusCircle,
  Plus,
  Printer,
  Search,
  Trash2,
  WalletCards
} from 'lucide-react';

import {
  Appointment,
  CashExpense,
  Client,
  PaymentType,
  Professional,
  Receipt,
  Service
} from '../../../types';

import {
  formatCurrency,
  formatDateBr,
  getAppointmentDate,
  getAppointmentTime,
  getPaymentLabel,
  normalizePhone
} from '../owner.utils';

interface ReceiptDraftItem {
  id: string;
  appointmentId?: string;
  serviceId: string;
  professionalId: string;
  price: number;
  itemType: 'appointment' | 'extra' | 'manual';
}

interface ExpensePayload {
  description: string;
  amount: number;
  paymentType: PaymentType;
  notes?: string;
}

interface ReceiptPayload {
  clientId?: string;
  clientName: string;
  clientPhone: string;
  appointmentId?: string;
  items: ReceiptDraftItem[];
  paymentType: PaymentType;
  discountValue: number;
  notes?: string;
}

interface ReceiptsViewProps {
  clients: Client[];
  appointments: Appointment[];
  services: Service[];
  professionals: Professional[];
  receipts: Receipt[];
  cashExpenses: CashExpense[];
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyInstagram?: string;
  onMarkAppointmentCompleted: (appointmentId: string) => void;
  onConfirmReceipt: (payload: ReceiptPayload) => void;
  onConfirmExpense: (payload: ExpensePayload) => void;
}

function paymentOptions(): PaymentType[] {
  return ['pix', 'dinheiro', 'debito', 'credito', 'cortesia'];
}

function expensePaymentOptions(): PaymentType[] {
  return ['pix', 'dinheiro', 'debito', 'credito'];
}

function formatPhoneForDisplay(value: string): string {
  const digits = normalizePhone(value);

  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return value;
}

function getAppointmentLabel(appointment: Appointment): string {
  return `${formatDateBr(getAppointmentDate(appointment))} às ${getAppointmentTime(appointment)}`;
}

function getServiceById(services: Service[], serviceId: string): Service | undefined {
  return services.find((service) => service.id === serviceId);
}

function getProfessionalById(
  professionals: Professional[],
  professionalId: string
): Professional | undefined {
  return professionals.find((professional) => professional.id === professionalId);
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatCurrencyInput(value: number): string {
  return `R$ ${(Number(value) || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

function parseCurrencyInput(value: string): number {
  const digits = value.replace(/\D/g, '');

  if (!digits) {
    return 0;
  }

  return Number(digits) / 100;
}

function openThermalPrint(title: string, body: string): void {
  const printWindow = window.open('', '_blank', 'width=380,height=620');

  if (!printWindow) {
    alert('O navegador bloqueou a impressão. Libere pop-ups para imprimir a filipeta.');
    return;
  }

  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>${escapeHtml(title)}</title>
        <style>
          @page { size: 80mm auto; margin: 0; }
          * { box-sizing: border-box; }
          html, body {
            margin: 0;
            padding: 0;
            background: #fff;
          }
          body {
            width: 76mm;
            padding: 5mm 4mm 4mm 4mm;
            font-family: Arial, Helvetica, sans-serif;
            color: #000;
            font-size: 12px;
            line-height: 1.22;
            overflow-wrap: break-word;
          }
          .center { text-align: center; }
          .title { font-size: 15px; font-weight: 800; margin-bottom: 2px; }
          .salon-title { font-size: 16px; font-weight: 900; text-transform: uppercase; margin-bottom: 2px; }
          .muted { font-size: 10px; color: #333; }
          .line { border-top: 1px dashed #000; margin: 8px 0; }
          .row { display: flex; justify-content: space-between; gap: 8px; margin: 3px 0; }
          .row span:last-child { text-align: right; white-space: nowrap; }
          .strong { font-weight: 800; }
          .small { font-size: 10px; }
          .item { margin: 6px 0; }
          .total { font-size: 15px; font-weight: 900; }
        </style>
      </head>
      <body>${body}</body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 250);
}

export default function ReceiptsView({
  clients,
  appointments,
  services,
  professionals,
  receipts,
  cashExpenses,
  companyName = '',
  companyAddress = '',
  companyPhone = '',
  companyInstagram = '',
  onMarkAppointmentCompleted,
  onConfirmReceipt,
  onConfirmExpense
}: ReceiptsViewProps) {
  const [phoneSearch, setPhoneSearch] = useState('');
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [locallyCompletedIds, setLocallyCompletedIds] = useState<string[]>([]);
  const [extraItems, setExtraItems] = useState<ReceiptDraftItem[]>([]);
  const [paymentType, setPaymentType] = useState<PaymentType>('pix');
  const [discountValue, setDiscountValue] = useState(0);
  const [notes, setNotes] = useState('');
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutMode, setCheckoutMode] = useState<'appointment' | 'manual' | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isExpenseOpen, setIsExpenseOpen] = useState(false);
  const [manualClientPhone, setManualClientPhone] = useState('');
  const [manualClientName, setManualClientName] = useState('');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseAmount, setExpenseAmount] = useState(0);
  const [expensePaymentType, setExpensePaymentType] = useState<PaymentType>('dinheiro');
  const [expenseNotes, setExpenseNotes] = useState('');
  const [printAfterConfirmHtml, setPrintAfterConfirmHtml] = useState<string | null>(null);
  const [printAfterConfirmTitle, setPrintAfterConfirmTitle] = useState('Comprovante de recebimento');

  const phoneKey = normalizePhone(phoneSearch);
  const currentDayKey = todayKey();

  const selectedClient = useMemo(() => {
    if (phoneKey.length < 8) {
      return null;
    }

    return clients.find((client) => {
      const clientPhones = [
        client.phone,
        client.phoneNormalized || '',
        ...(client.phoneHistory || [])
      ].map(normalizePhone);

      return clientPhones.some((phone) => phone.includes(phoneKey) || phoneKey.includes(phone));
    }) || null;
  }, [clients, phoneKey]);

  const clientAppointments = useMemo(() => {
    if (phoneKey.length < 8) {
      return [];
    }

    const alreadyReceivedAppointmentIds = new Set(
      receipts
        .filter((receipt) => receipt.status === 'paid')
        .map((receipt) => receipt.appointmentId)
        .filter(Boolean)
    );

    return appointments
      .filter((appointment) => {
        const appointmentPhone = normalizePhone(appointment.clientPhone);

        return (
          !alreadyReceivedAppointmentIds.has(appointment.id) &&
          (appointmentPhone.includes(phoneKey) || phoneKey.includes(appointmentPhone)) &&
          appointment.status !== 'cancelled' &&
          appointment.status !== 'absent'
        );
      })
      .sort((a, b) => b.dateTime.localeCompare(a.dateTime));
  }, [appointments, phoneKey, receipts]);

  const selectedAppointment = useMemo(() => {
    if (!selectedAppointmentId) {
      return null;
    }

    return clientAppointments.find((appointment) => appointment.id === selectedAppointmentId) || null;
  }, [clientAppointments, selectedAppointmentId]);

  const selectedAppointmentIsCompleted = Boolean(
    selectedAppointment &&
    (
      selectedAppointment.status === 'completed' ||
      locallyCompletedIds.includes(selectedAppointment.id)
    )
  );

  const appointmentItem = useMemo<ReceiptDraftItem | null>(() => {
    if (!selectedAppointment || !selectedAppointmentIsCompleted) {
      return null;
    }

    return {
      id: `receipt-item-${selectedAppointment.id}`,
      appointmentId: selectedAppointment.id,
      serviceId: selectedAppointment.serviceId,
      professionalId: selectedAppointment.professionalId,
      price: selectedAppointment.price,
      itemType: 'appointment'
    };
  }, [selectedAppointment, selectedAppointmentIsCompleted]);

  const receiptItems = useMemo(() => {
    return [
      ...(appointmentItem ? [appointmentItem] : []),
      ...extraItems
    ];
  }, [appointmentItem, extraItems]);

  const subtotal = useMemo(() => {
    return receiptItems.reduce((sum, item) => sum + Number(item.price || 0), 0);
  }, [receiptItems]);

  const normalizedDiscount = Math.max(0, Math.min(Number(discountValue) || 0, subtotal));
  const total = Math.max(0, subtotal - normalizedDiscount);

  const todayReceipts = useMemo(() => {
    return receipts
      .filter((receipt) => receipt.status === 'paid' && receipt.paidAt.slice(0, 10) === currentDayKey)
      .sort((a, b) => b.paidAt.localeCompare(a.paidAt));
  }, [receipts, currentDayKey]);

  const todayTotalsByPayment = useMemo(() => {
    return paymentOptions().map((option) => {
      const totalByOption = todayReceipts
        .filter((receipt) => receipt.paymentType === option)
        .reduce((sum, receipt) => sum + receipt.totalAmount, 0);

      return {
        paymentType: option,
        total: totalByOption
      };
    });
  }, [todayReceipts]);

  const totalReceivedToday = todayReceipts.reduce((sum, receipt) => sum + receipt.totalAmount, 0);

  const todayExpenses = useMemo(() => {
    return cashExpenses
      .filter((expense) => expense.status === 'paid' && expense.paidAt.slice(0, 10) === currentDayKey)
      .sort((a, b) => b.paidAt.localeCompare(a.paidAt));
  }, [cashExpenses, currentDayKey]);

  const totalExpensesToday = todayExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const dailyBalance = totalReceivedToday - totalExpensesToday;

  const resetCheckoutDraft = () => {
    setExtraItems([]);
    setDiscountValue(0);
    setNotes('');
    setPaymentType('pix');
  };

  const handleMarkCompleted = (appointmentId: string) => {
    onMarkAppointmentCompleted(appointmentId);
    setLocallyCompletedIds((currentIds) => Array.from(new Set([...currentIds, appointmentId])));
  };

  const createDefaultManualItem = (): ReceiptDraftItem | null => {
    const firstActiveService = services.find((service) => service.active) || services[0];
    const firstProfessional = professionals.find((professional) => professional.active) || professionals[0];

    if (!firstActiveService || !firstProfessional) {
      return null;
    }

    return {
      id: `manual-${Date.now()}`,
      serviceId: firstActiveService.id,
      professionalId: firstProfessional.id,
      price: firstActiveService.price,
      itemType: 'manual'
    };
  };

  const handleOpenCheckout = (appointmentId: string) => {
    setSelectedAppointmentId(appointmentId);
    setCheckoutMode('appointment');
    resetCheckoutDraft();
    setIsCheckoutOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenManualReceipt = () => {
    const defaultItem = createDefaultManualItem();

    if (!defaultItem) {
      alert('Cadastre pelo menos um serviço e um profissional ativo para lançar pagamento manual.');
      return;
    }

    setSelectedAppointmentId(null);
    setCheckoutMode('manual');
    setManualClientPhone(phoneSearch);
    setManualClientName(selectedClient?.name || '');
    resetCheckoutDraft();
    setExtraItems([defaultItem]);
    setIsCheckoutOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenExpense = () => {
    setIsExpenseOpen(true);
    setExpenseDescription('');
    setExpenseAmount(0);
    setExpensePaymentType('dinheiro');
    setExpenseNotes('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToSearch = () => {
    setIsCheckoutOpen(false);
    setIsExpenseOpen(false);
    setCheckoutMode(null);
    setSelectedAppointmentId(null);
    setManualClientPhone('');
    setManualClientName('');
    resetCheckoutDraft();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddExtraItem = () => {
    const firstActiveService = services.find((service) => service.active) || services[0];
    const firstProfessional = professionals.find((professional) => professional.active) || professionals[0];

    if (!firstActiveService || !firstProfessional) {
      alert('Cadastre pelo menos um serviço e um profissional ativo para adicionar extras.');
      return;
    }

    setExtraItems((currentItems) => [
      ...currentItems,
      {
        id: `extra-${Date.now()}`,
        serviceId: firstActiveService.id,
        professionalId: firstProfessional.id,
        price: firstActiveService.price,
        itemType: checkoutMode === 'manual' ? 'manual' : 'extra'
      }
    ]);
  };

  const handleChangeExtraService = (itemId: string, serviceId: string) => {
    const selectedService = getServiceById(services, serviceId);

    setExtraItems((currentItems) => currentItems.map((item) => {
      if (item.id !== itemId) {
        return item;
      }

      return {
        ...item,
        serviceId,
        price: selectedService?.price ?? item.price
      };
    }));
  };

  const handleChangeExtraProfessional = (itemId: string, professionalId: string) => {
    setExtraItems((currentItems) => currentItems.map((item) => {
      if (item.id !== itemId) {
        return item;
      }

      return {
        ...item,
        professionalId
      };
    }));
  };

  const handleChangeExtraPrice = (itemId: string, price: number) => {
    setExtraItems((currentItems) => currentItems.map((item) => {
      if (item.id !== itemId) {
        return item;
      }

      return {
        ...item,
        price: Number(price) || 0
      };
    }));
  };

  const handleRemoveExtra = (itemId: string) => {
    setExtraItems((currentItems) => currentItems.filter((item) => item.id !== itemId));
  };

  const buildBusinessPrintHeader = () => {
    const instagramLine = companyInstagram?.trim()
      ? `<div class="muted">${escapeHtml(companyInstagram.trim())}</div>`
      : '';
    const addressLine = companyAddress?.trim()
      ? `<div class="muted">${escapeHtml(companyAddress.trim())}</div>`
      : '';
    const phoneLine = companyPhone?.trim()
      ? `<div class="muted">Telefone: ${escapeHtml(companyPhone.trim())}</div>`
      : '';

    return `
      <div class="center">
        <div class="salon-title">${escapeHtml(companyName?.trim() || 'SALÃO')}</div>
        ${addressLine}
        ${phoneLine}
        ${instagramLine}
      </div>
      <div class="line"></div>
    `;
  };

  const buildDraftReceiptPrintHtml = () => {
    const clientName = selectedClient?.name || selectedAppointment?.clientName || manualClientName || 'Cliente';
    const clientPhone = selectedClient?.phone || selectedAppointment?.clientPhone || manualClientPhone || '';
    const appointmentDate = selectedAppointment ? getAppointmentLabel(selectedAppointment) : '';
    const itemsHtml = receiptItems.map((item) => {
      const service = getServiceById(services, item.serviceId);
      const professional = getProfessionalById(professionals, item.professionalId);

      return `
        <div class="item">
          <div class="strong">${escapeHtml(service?.name || 'Serviço')}</div>
          <div class="small">Prof.: ${escapeHtml(professional?.name || 'Profissional')}</div>
          <div class="row"><span>${item.itemType === 'appointment' ? 'Agendado' : item.itemType === 'manual' ? 'Manual' : 'Extra'}</span><span>${formatCurrency(item.price)}</span></div>
        </div>
      `;
    }).join('');

    return `
      ${buildBusinessPrintHeader()}
      <div class="center">
        <div class="title">COMPROVANTE DE SERVIÇOS</div>
        <div class="muted">AgendaZap</div>
      </div>
      <div class="line"></div>
      <div><span class="strong">Cliente:</span> ${escapeHtml(clientName)}</div>
      <div><span class="strong">WhatsApp:</span> ${escapeHtml(formatPhoneForDisplay(clientPhone))}</div>
      ${appointmentDate ? `<div><span class="strong">Atendimento:</span> ${escapeHtml(appointmentDate)}</div>` : ''}
      <div class="line"></div>
      ${itemsHtml}
      <div class="line"></div>
      <div class="row"><span>Subtotal</span><span>${formatCurrency(subtotal)}</span></div>
      <div class="row"><span>Desconto</span><span>${formatCurrency(normalizedDiscount)}</span></div>
      <div class="row total"><span>Total</span><span>${formatCurrency(total)}</span></div>
      <div class="row"><span>Pagamento</span><span>${escapeHtml(getPaymentLabel(paymentType))}</span></div>
      ${notes ? `<div class="line"></div><div class="small">Obs.: ${escapeHtml(notes)}</div>` : ''}
      <div class="line"></div>
      <div class="center small">Obrigado pela preferência!</div>
    `;
  };

  const handlePrintDraftReceipt = () => {
    if (receiptItems.length === 0) {
      alert('Inclua pelo menos um serviço para imprimir.');
      return;
    }

    openThermalPrint('Comprovante de recebimento', buildDraftReceiptPrintHtml());
  };

  const handlePrintReceipt = (receipt: Receipt) => {
    const itemsHtml = receipt.items.map((item) => `
      <div class="item">
        <div class="strong">${escapeHtml(item.serviceName)}</div>
        <div class="small">Prof.: ${escapeHtml(item.professionalName)}</div>
        <div class="row"><span>${item.itemType === 'appointment' ? 'Agendado' : item.itemType === 'manual' ? 'Manual' : 'Extra'}</span><span>${formatCurrency(item.price)}</span></div>
      </div>
    `).join('');

    const body = `
      ${buildBusinessPrintHeader()}
      <div class="center">
        <div class="title">RECEBIMENTO</div>
        <div class="muted">${new Date(receipt.paidAt).toLocaleString('pt-BR')}</div>
      </div>
      <div class="line"></div>
      <div><span class="strong">Cliente:</span> ${escapeHtml(receipt.clientName)}</div>
      <div><span class="strong">WhatsApp:</span> ${escapeHtml(formatPhoneForDisplay(receipt.clientPhone))}</div>
      <div class="line"></div>
      ${itemsHtml}
      <div class="line"></div>
      <div class="row"><span>Subtotal</span><span>${formatCurrency(receipt.subtotal)}</span></div>
      <div class="row"><span>Desconto</span><span>${formatCurrency(receipt.discountValue)}</span></div>
      <div class="row total"><span>Total</span><span>${formatCurrency(receipt.totalAmount)}</span></div>
      <div class="row"><span>Pagamento</span><span>${escapeHtml(getPaymentLabel(receipt.paymentType))}</span></div>
      ${receipt.notes ? `<div class="line"></div><div class="small">Obs.: ${escapeHtml(receipt.notes)}</div>` : ''}
      <div class="line"></div>
      <div class="center small">Obrigado pela preferência!</div>
    `;

    openThermalPrint('Comprovante de recebimento', body);
  };

  const handlePrintDailySummary = () => {
    if (todayReceipts.length === 0 && todayExpenses.length === 0) {
      alert('Ainda não há movimentações no dia para imprimir.');
      return;
    }

    const paymentRows = todayTotalsByPayment
      .filter((item) => item.total > 0)
      .map((item) => `
        <div class="row"><span>${escapeHtml(getPaymentLabel(item.paymentType))}</span><span>${formatCurrency(item.total)}</span></div>
      `).join('');

    const receiptRows = todayReceipts.map((receipt) => `
      <div class="item">
        <div class="strong">${escapeHtml(receipt.clientName)}</div>
        <div class="row"><span>${escapeHtml(getPaymentLabel(receipt.paymentType))}</span><span>${formatCurrency(receipt.totalAmount)}</span></div>
      </div>
    `).join('');

    const expenseRows = todayExpenses.map((expense) => `
      <div class="item">
        <div class="strong">${escapeHtml(expense.description)}</div>
        <div class="row"><span>${escapeHtml(getPaymentLabel(expense.paymentType))}</span><span>- ${formatCurrency(expense.amount)}</span></div>
      </div>
    `).join('');

    const body = `
      ${buildBusinessPrintHeader()}
      <div class="center">
        <div class="title">RESUMO DO DIA</div>
        <div class="muted">${new Date().toLocaleDateString('pt-BR')}</div>
      </div>
      <div class="line"></div>
      <div class="strong">Por forma de pagamento</div>
      ${paymentRows}
      <div class="line"></div>
      <div class="row"><span>Recebimentos</span><span>${formatCurrency(totalReceivedToday)}</span></div>
      <div class="row"><span>Despesas</span><span>- ${formatCurrency(totalExpensesToday)}</span></div>
      <div class="row total"><span>Saldo</span><span>${formatCurrency(dailyBalance)}</span></div>
      <div class="line"></div>
      <div class="strong">Recebimentos</div>
      ${receiptRows || '<div class="small">Nenhum recebimento.</div>'}
      <div class="line"></div>
      <div class="strong">Despesas</div>
      ${expenseRows || '<div class="small">Nenhuma despesa.</div>'}
      <div class="line"></div>
      <div class="center small">Fim do resumo</div>
    `;

    openThermalPrint('Resumo de recebimentos do dia', body);
  };

  const handleConfirmReceipt = () => {
    const isManualReceipt = checkoutMode === 'manual';

    if (!isManualReceipt && (!selectedAppointment || !selectedAppointmentIsCompleted)) {
      alert('Para receber, primeiro o atendimento precisa estar concluído.');
      return;
    }

    if (receiptItems.length === 0) {
      alert('Inclua pelo menos um serviço no recebimento.');
      return;
    }

    const clientName = isManualReceipt
      ? manualClientName.trim() || selectedClient?.name || 'Cliente balcão'
      : selectedClient?.name || selectedAppointment?.clientName || 'Cliente';
    const clientPhone = isManualReceipt
      ? manualClientPhone.trim() || phoneSearch
      : selectedClient?.phone || selectedAppointment?.clientPhone || phoneSearch;

    if (!normalizePhone(clientPhone)) {
      alert('Informe o WhatsApp do cliente para concluir o recebimento.');
      return;
    }

    const receiptPrintHtml = buildDraftReceiptPrintHtml();

    onConfirmReceipt({
      clientId: selectedClient?.id,
      clientName,
      clientPhone,
      appointmentId: selectedAppointment?.id,
      items: receiptItems,
      paymentType,
      discountValue: normalizedDiscount,
      notes
    });

    setPrintAfterConfirmTitle('Comprovante de recebimento');
    setPrintAfterConfirmHtml(receiptPrintHtml);
    setPhoneSearch('');
    setSelectedAppointmentId(null);
    setCheckoutMode(null);
    setIsCheckoutOpen(false);
    setManualClientPhone('');
    setManualClientName('');
    resetCheckoutDraft();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrintConfirmedReceipt = () => {
    if (printAfterConfirmHtml) {
      openThermalPrint(printAfterConfirmTitle, printAfterConfirmHtml);
    }

    setPrintAfterConfirmHtml(null);
  };

  const handleSkipConfirmedReceiptPrint = () => {
    setPrintAfterConfirmHtml(null);
  };

  const handleConfirmExpense = () => {
    if (!expenseDescription.trim()) {
      alert('Informe a descrição da despesa.');
      return;
    }

    if ((Number(expenseAmount) || 0) <= 0) {
      alert('Informe o valor da despesa.');
      return;
    }

    onConfirmExpense({
      description: expenseDescription.trim(),
      amount: Number(expenseAmount) || 0,
      paymentType: expensePaymentType,
      notes: expenseNotes
    });

    alert('Despesa lançada com sucesso.');
    handleBackToSearch();
  };

  const renderDraftItem = (item: ReceiptDraftItem) => {
    const service = getServiceById(services, item.serviceId);
    const professional = getProfessionalById(professionals, item.professionalId);
    const isEditableItem = item.itemType !== 'appointment';

    return (
      <div
        key={item.id}
        className="rounded-2xl border border-neutral-200 bg-white p-3"
      >
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_140px_auto] gap-3 lg:items-end">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-400">
              {item.itemType === 'appointment' ? 'Serviço agendado' : item.itemType === 'manual' ? 'Serviço manual' : 'Serviço extra'}
            </p>

            {isEditableItem ? (
              <select
                value={item.serviceId}
                onChange={(event) => handleChangeExtraService(item.id, event.target.value)}
                className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-orange-500"
              >
                {services.filter((serviceOption) => serviceOption.active).map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            ) : (
              <p className="mt-1 text-sm font-black text-neutral-950">
                {service?.name || 'Serviço'}
              </p>
            )}
          </div>

          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-400">
              Profissional
            </p>

            {isEditableItem ? (
              <select
                value={item.professionalId}
                onChange={(event) => handleChangeExtraProfessional(item.id, event.target.value)}
                className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-orange-500"
              >
                {professionals.filter((professionalOption) => professionalOption.active).map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            ) : (
              <p className="mt-1 text-sm font-black text-neutral-950">
                {professional?.name || 'Profissional'}
              </p>
            )}
          </div>

          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-400">
              Valor
            </p>

            {isEditableItem ? (
              <input
                type="text"
                inputMode="numeric"
                value={formatCurrencyInput(item.price)}
                onChange={(event) => handleChangeExtraPrice(item.id, parseCurrencyInput(event.target.value))}
                className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm font-black outline-none focus:border-orange-500"
              />
            ) : (
              <p className="mt-1 text-sm font-black text-neutral-950">
                {formatCurrency(item.price)}
              </p>
            )}
          </div>

          {isEditableItem && (
            <button
              type="button"
              onClick={() => handleRemoveExtra(item.id)}
              className="h-10 w-10 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 flex items-center justify-center"
              title="Remover serviço extra"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderHistory = () => (
    <div className="rounded-3xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setIsHistoryOpen((current) => !current)}
        className="w-full p-4 flex items-center justify-between gap-3 text-left hover:bg-neutral-50 transition"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
            {isHistoryOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-black text-neutral-950">
              Histórico de recebimentos do dia
            </h2>
            <p className="text-xs font-semibold text-neutral-500">
              Fica fechado para não poluir a tela. Clique para abrir o resumo do caixa.
            </p>
          </div>
        </div>

        <span className="rounded-full bg-neutral-100 border border-neutral-200 px-3 py-1 text-xs font-black text-neutral-700 shrink-0">
          {todayReceipts.length} recebimento(s)
        </span>
      </button>

      {isHistoryOpen && (
        <div className="border-t border-neutral-200">
          <div className="p-4 flex justify-end">
            <button
              type="button"
              onClick={handlePrintDailySummary}
              className="rounded-xl bg-orange-600 px-4 py-2.5 text-xs font-black text-white hover:bg-orange-700 transition flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Imprimir resumo do dia
            </button>
          </div>

          <div className="px-4 pb-4 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2 border-b border-neutral-100">
            <div className="rounded-2xl bg-neutral-950 text-white p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/60">
                Recebido
              </p>
              <p className="text-lg font-black mt-1">
                {formatCurrency(totalReceivedToday)}
              </p>
            </div>

            <div className="rounded-2xl bg-red-50 border border-red-100 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-red-400">
                Despesas
              </p>
              <p className="text-sm font-black text-red-700 mt-1">
                {formatCurrency(totalExpensesToday)}
              </p>
            </div>

            <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-500">
                Saldo
              </p>
              <p className="text-sm font-black text-emerald-700 mt-1">
                {formatCurrency(dailyBalance)}
              </p>
            </div>

            {todayTotalsByPayment.map((item) => (
              <div key={item.paymentType} className="rounded-2xl bg-neutral-50 border border-neutral-200 p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-neutral-400">
                  {getPaymentLabel(item.paymentType)}
                </p>
                <p className="text-sm font-black text-neutral-950 mt-1">
                  {formatCurrency(item.total)}
                </p>
              </div>
            ))}
          </div>

          <div className="p-4 space-y-2">
            {todayReceipts.length === 0 && todayExpenses.length === 0 && (
              <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-6 text-center">
                <p className="text-sm font-black text-neutral-700">
                  Nenhuma movimentação confirmada hoje.
                </p>
              </div>
            )}

            {todayReceipts.map((receipt) => (
              <div
                key={receipt.id}
                className="rounded-2xl border border-neutral-200 bg-white p-3 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3"
              >
                <div>
                  <p className="text-sm font-black text-neutral-950">
                    {receipt.clientName}
                  </p>
                  <p className="text-xs font-bold text-neutral-500">
                    {new Date(receipt.paidAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    {' '}• {getPaymentLabel(receipt.paymentType)} • {receipt.items.length} serviço(s)
                  </p>
                </div>

                <div className="flex flex-row gap-2 items-center justify-end">
                  <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-black text-emerald-700 text-center">
                    {formatCurrency(receipt.totalAmount)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handlePrintReceipt(receipt)}
                    className="h-9 w-9 rounded-xl border border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 transition flex items-center justify-center"
                    title="Imprimir"
                    aria-label="Imprimir recebimento"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {todayExpenses.map((expense) => (
              <div
                key={expense.id}
                className="rounded-2xl border border-red-100 bg-red-50 p-3 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3"
              >
                <div>
                  <p className="text-sm font-black text-red-800">
                    {expense.description}
                  </p>
                  <p className="text-xs font-bold text-red-500">
                    {new Date(expense.paidAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    {' '}• Despesa • {getPaymentLabel(expense.paymentType)}
                  </p>
                </div>

                <span className="rounded-full bg-white border border-red-200 px-3 py-1 text-xs font-black text-red-700 text-center">
                  - {formatCurrency(expense.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const canShowCheckout = checkoutMode === 'manual' || Boolean(selectedAppointment && selectedAppointmentIsCompleted);

  if (isExpenseOpen) {
    return (
      <section className="space-y-4">
        <div className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <button
            type="button"
            onClick={handleBackToSearch}
            className="rounded-xl bg-orange-600 px-4 py-2.5 text-xs font-black text-white hover:bg-orange-700 transition flex items-center justify-center gap-2 w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>

          <div className="text-left lg:text-right">
            <h1 className="text-2xl font-black tracking-tight text-neutral-950">
              Lançar despesa extra
            </h1>
            <p className="text-sm text-neutral-500 font-medium">
              Use para saída de caixa: compra rápida, vale, material ou despesa do dia.
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-neutral-200 bg-white shadow-sm overflow-hidden max-w-3xl">
          <div className="p-4 border-b border-neutral-200">
            <h2 className="text-lg font-black text-neutral-950">
              Dados da despesa
            </h2>
            <p className="text-xs font-semibold text-neutral-500">
              Despesa reduz o saldo do caixa do dia, mas não entra como recebimento.
            </p>
          </div>

          <div className="p-4 space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500">
                Descrição
              </label>
              <input
                value={expenseDescription}
                onChange={(event) => setExpenseDescription(event.target.value)}
                placeholder="Ex.: compra de toalhas, vale, material"
                className="mt-2 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm font-bold outline-none focus:border-orange-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500">
                  Valor
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatCurrencyInput(expenseAmount)}
                  onChange={(event) => setExpenseAmount(parseCurrencyInput(event.target.value))}
                  className="mt-2 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm font-black outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500 mb-2">
                  Forma de pagamento
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {expensePaymentOptions().map((option) => (
                    <button
                      type="button"
                      key={option}
                      onClick={() => setExpensePaymentType(option)}
                      className={`rounded-xl border px-3 py-2 text-xs font-black transition ${
                        expensePaymentType === option
                          ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : 'border-neutral-200 bg-white text-neutral-600 hover:border-orange-200'
                      }`}
                    >
                      {getPaymentLabel(option)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500">
                Observações
              </label>
              <textarea
                value={expenseNotes}
                onChange={(event) => setExpenseNotes(event.target.value)}
                rows={3}
                placeholder="Observação opcional."
                className="mt-2 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm font-semibold outline-none focus:border-orange-500 resize-none"
              />
            </div>

            <div className="rounded-2xl border border-red-100 bg-red-50 p-4 flex items-center justify-between gap-3">
              <span className="text-sm font-black text-red-700">Saída do caixa</span>
              <span className="text-xl font-black text-red-700">- {formatCurrency(Number(expenseAmount) || 0)}</span>
            </div>

            <button
              type="button"
              onClick={handleConfirmExpense}
              className="w-full rounded-2xl bg-orange-600 px-4 py-3 text-sm font-black text-white hover:bg-orange-700 transition flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Confirmar despesa
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (isCheckoutOpen) {
    return (
      <section className="space-y-4">
        <div className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <button
            type="button"
            onClick={handleBackToSearch}
            className="rounded-xl bg-orange-600 px-4 py-2.5 text-xs font-black text-white hover:bg-orange-700 transition flex items-center justify-center gap-2 w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>

          <div className="text-left lg:text-right">
            <h1 className="text-2xl font-black tracking-tight text-neutral-950">
              Fechamento do pagamento
            </h1>
            <p className="text-sm text-neutral-500 font-medium">
              Baixa definitiva, extras, forma de pagamento e impressão.
            </p>
          </div>
        </div>

        {checkoutMode === 'appointment' && !selectedAppointment && (
          <div className="rounded-3xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
            <AlertCircle className="w-9 h-9 mx-auto text-neutral-400 mb-2" />
            <p className="text-sm font-black text-neutral-700">
              Nenhum atendimento selecionado.
            </p>
          </div>
        )}

        {checkoutMode === 'appointment' && selectedAppointment && !selectedAppointmentIsCompleted && (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8 text-center shadow-sm">
            <p className="text-sm font-black text-amber-700">
              Este atendimento precisa ser baixado como concluído antes do recebimento.
            </p>
          </div>
        )}

        {canShowCheckout && (
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-4">
            <div className="rounded-3xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
              <div className="p-4 border-b border-neutral-200">
                <h2 className="text-lg font-black text-neutral-950">
                  Serviços do recebimento
                </h2>
                <p className="text-xs font-semibold text-neutral-500">
                  Confira os serviços realizados. Em pagamento manual, escolha serviço e profissional.
                </p>
              </div>

              <div className="p-4 space-y-3">
                {receiptItems.map(renderDraftItem)}

                <button
                  type="button"
                  onClick={handleAddExtraItem}
                  className="w-full rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-black text-orange-700 hover:bg-orange-100 transition flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  {checkoutMode === 'manual' ? 'Adicionar outro serviço' : 'Adicionar serviço extra'}
                </button>
              </div>
            </div>

            <aside className="rounded-3xl border border-neutral-200 bg-white shadow-sm overflow-hidden h-fit">
              <div className="p-4 border-b border-neutral-200">
                <h2 className="text-lg font-black text-neutral-950">
                  Baixa definitiva
                </h2>
                <p className="text-xs font-semibold text-neutral-500">
                  Confirmou aqui, entra no caixa e no financeiro.
                </p>
              </div>

              <div className="p-4 space-y-4">
                <div className="rounded-2xl bg-neutral-50 border border-neutral-200 p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-400">
                    Cliente
                  </p>
                  {checkoutMode === 'manual' ? (
                    <div className="mt-2 grid grid-cols-1 gap-2">
                      <input
                        value={manualClientPhone}
                        onChange={(event) => setManualClientPhone(event.target.value)}
                        placeholder="WhatsApp do cliente"
                        className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm font-bold outline-none focus:border-orange-500"
                      />
                      <input
                        value={manualClientName}
                        onChange={(event) => setManualClientName(event.target.value)}
                        placeholder="Nome do cliente"
                        className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm font-bold outline-none focus:border-orange-500"
                      />
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-black text-neutral-950 mt-1">
                        {selectedClient?.name || selectedAppointment?.clientName}
                      </p>
                      <p className="text-xs font-bold text-neutral-500">
                        {formatPhoneForDisplay(selectedClient?.phone || selectedAppointment?.clientPhone || '')}
                      </p>
                    </>
                  )}
                </div>

                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500 mb-2">
                    Forma de pagamento
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {paymentOptions().map((option) => (
                      <button
                        type="button"
                        key={option}
                        onClick={() => setPaymentType(option)}
                        className={`rounded-xl border px-3 py-2 text-xs font-black transition ${
                          paymentType === option
                            ? 'border-orange-500 bg-orange-50 text-orange-700'
                            : 'border-neutral-200 bg-white text-neutral-600 hover:border-orange-200'
                        }`}
                      >
                        {getPaymentLabel(option)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500">
                    Desconto
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatCurrencyInput(discountValue)}
                    onChange={(event) => setDiscountValue(parseCurrencyInput(event.target.value))}
                    className="mt-2 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm font-bold outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.18em] text-neutral-500">
                    Observações do caixa
                  </label>
                  <textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Ex.: cliente pagou parte em pix e parte em dinheiro."
                    rows={3}
                    className="mt-2 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm font-semibold outline-none focus:border-orange-500 resize-none"
                  />
                </div>

                <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 space-y-2">
                  <div className="flex items-center justify-between text-sm font-bold text-neutral-600">
                    <span>Subtotal</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm font-bold text-neutral-600">
                    <span>Desconto</span>
                    <span>- {formatCurrency(normalizedDiscount)}</span>
                  </div>
                  <div className="pt-2 border-t border-neutral-200 flex items-center justify-between">
                    <span className="text-sm font-black text-neutral-950">Total</span>
                    <span className="text-xl font-black text-neutral-950">{formatCurrency(total)}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handlePrintDraftReceipt}
                  className="w-full rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-black text-orange-700 hover:bg-orange-100 transition flex items-center justify-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir
                </button>

                <button
                  type="button"
                  onClick={handleConfirmReceipt}
                  disabled={receiptItems.length === 0}
                  className="w-full rounded-2xl bg-orange-600 px-4 py-3 text-sm font-black text-white hover:bg-orange-700 disabled:bg-neutral-200 disabled:text-neutral-400 transition flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Confirmar recebimento
                </button>
              </div>
            </aside>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mb-3">
              <WalletCards className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-neutral-950">
              Recebimentos
            </h1>
            <p className="text-sm text-neutral-500 font-medium">
              Encontre atendimentos, lance pagamento manual ou registre uma despesa do caixa.
            </p>
          </div>

          <div className="w-full lg:max-w-md space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={handleOpenManualReceipt}
                className="flex-1 rounded-xl bg-orange-600 px-4 py-2.5 text-xs font-black text-white hover:bg-orange-700 transition flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Incluir pagamento manual
              </button>

              <button
                type="button"
                onClick={handleOpenExpense}
                className="flex-1 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-black text-red-700 hover:bg-red-100 transition flex items-center justify-center gap-2"
              >
                <MinusCircle className="w-4 h-4" />
                Incluir despesa
              </button>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">
                WhatsApp do cliente
              </label>
              <div className="mt-2 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  value={phoneSearch}
                  onChange={(event) => {
                    setPhoneSearch(event.target.value);
                    setSelectedAppointmentId(null);
                    resetCheckoutDraft();
                  }}
                  placeholder="Digite o WhatsApp para buscar"
                  className="w-full rounded-2xl border border-neutral-300 bg-white pl-10 pr-4 py-3 text-sm font-bold outline-none focus:border-orange-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {phoneKey.length >= 8 && (
        <div className="rounded-3xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
          <div className="p-4 border-b border-neutral-200 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-neutral-950">
                Atendimentos encontrados
              </h2>
              <p className="text-xs font-semibold text-neutral-500">
                Baixe o atendimento quando terminar. Depois clique em fechamento.
              </p>
            </div>

            {selectedClient && (
              <div className="rounded-2xl bg-neutral-50 border border-neutral-200 px-4 py-2 text-right">
                <p className="text-xs font-black text-neutral-950">
                  {selectedClient.name}
                </p>
                <p className="text-[11px] font-bold text-neutral-500">
                  {formatPhoneForDisplay(selectedClient.phone)}
                </p>
              </div>
            )}
          </div>

          <div className="p-4 space-y-3">
            {clientAppointments.length === 0 && (
              <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-6 text-center">
                <AlertCircle className="w-8 h-8 mx-auto text-neutral-400 mb-2" />
                <p className="text-sm font-black text-neutral-700">
                  Nenhum atendimento pendente de recebimento para este WhatsApp.
                </p>
                <p className="text-xs font-semibold text-neutral-500 mt-1">
                  Confira se o WhatsApp foi digitado corretamente ou se este cliente já foi recebido.
                </p>
              </div>
            )}

            {clientAppointments.map((appointment) => {
              const service = getServiceById(services, appointment.serviceId);
              const professional = getProfessionalById(professionals, appointment.professionalId);
              const isCompleted = appointment.status === 'completed' || locallyCompletedIds.includes(appointment.id);

              return (
                <div
                  key={appointment.id}
                  className="rounded-2xl border border-neutral-200 bg-white p-4 transition hover:border-orange-200"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-black text-neutral-950">
                        {service?.name || 'Serviço'}
                      </p>
                      <p className="text-xs font-bold text-neutral-500 mt-1">
                        {professional?.name || 'Profissional'} • {getAppointmentLabel(appointment)}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <span className={`px-3 py-1 rounded-full text-[11px] font-black ${
                          isCompleted
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {isCompleted ? 'Concluído' : 'Aguardando baixa'}
                        </span>
                        <span className="px-3 py-1 rounded-full text-[11px] font-black bg-neutral-100 text-neutral-700 border border-neutral-200">
                          {formatCurrency(appointment.price)}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                      {!isCompleted && (
                        <button
                          type="button"
                          onClick={() => handleMarkCompleted(appointment.id)}
                          className="rounded-xl bg-orange-600 px-4 py-2.5 text-xs font-black text-white hover:bg-orange-700 transition"
                        >
                          Baixar atendimento
                        </button>
                      )}

                      {isCompleted && (
                        <button
                          type="button"
                          onClick={() => handleOpenCheckout(appointment.id)}
                          className="rounded-xl bg-neutral-950 px-4 py-2.5 text-xs font-black text-white hover:bg-neutral-800 transition"
                        >
                          Fechamento
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {renderHistory()}

      {printAfterConfirmHtml && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl border border-neutral-200 bg-white p-5 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-black text-neutral-950 text-center">
              Recebimento confirmado
            </h3>
            <p className="text-sm font-semibold text-neutral-500 text-center mt-2">
              Deseja imprimir o comprovante agora?
            </p>

            <div className="grid grid-cols-2 gap-3 mt-5">
              <button
                type="button"
                onClick={handlePrintConfirmedReceipt}
                className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white hover:bg-emerald-700 transition flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                Sim
              </button>
              <button
                type="button"
                onClick={handleSkipConfirmedReceiptPrint}
                className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-black text-white hover:bg-red-700 transition"
              >
                Não
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export type {
  ReceiptDraftItem,
  ReceiptPayload
};
