/**
 * Tela Financeira do Painel do Dono - AgendaSpeed.
 *
 * Responsável por:
 * - analisar faturamento do período;
 * - analisar comissões da equipe;
 * - emitir relatório de livro caixa apenas com dinheiro;
 * - manter visual padronizado em azul petróleo.
 */

import React, {
  useEffect,
  useMemo,
  useState
} from 'react';

import {
  ArrowLeft,
  ArrowUpDown,
  BarChart3,
  CheckCircle2,
  Coins,
  FileText,
  Filter,
  History,
  Pencil,
  Plus,
  Printer,
  Trash2,
  WalletCards
} from 'lucide-react';

import {
  Appointment,
  CashExpense,
  PaymentType,
  Professional,
  Receipt,
  Service
} from '../../../types';

import {
  calculateProfessionalCommission,
  calculateProfessionalGrossRevenue,
  countProfessionalCompletedAppointments,
  formatCurrency,
  getPaymentLabel,
  getRemunerationLabel
} from '../owner.utils';

type FinanceInternalTab =
  | 'faturamento'
  | 'comissoes'
  | 'movimentacao'
  | 'livroCaixa'
  | 'despesas';

export interface CommissionPaymentPayload {
  professionalId: string;
  professionalName: string;
  periodStart: string;
  periodEnd: string;
  calculatedCommission: number;
  extraValue: number;
  discountValue: number;
  amountPaid: number;
  paymentType: PaymentType;
  paidAt: string;
  notes?: string;
}

export interface CommissionPaymentRecord {
  id: string;
  professionalId: string;
  professionalName: string;
  periodStart: string;
  periodEnd: string;
  calculatedCommission: number;
  extraValue: number;
  discountValue: number;
  amountPaid: number;
  paymentType: PaymentType;
  paidAt: string;
  notes?: string;
  createdAt?: string;
}

export interface ExpenseTemplateRecord {
  id: string;
  description: string;
  expectedAmount: number;
  dueDay?: number;
  isMonthly: boolean;
  active: boolean;
  notes?: string;
}

export interface ExpensePaymentRecord {
  id: string;
  expenseTemplateId?: string;
  description: string;
  competenceMonth: string;
  dueDate?: string;
  expectedAmount: number;
  interestValue: number;
  fineValue: number;
  discountValue: number;
  amountPaid: number;
  paymentType: PaymentType;
  status: 'pending' | 'paid' | 'cancelled';
  paidAt?: string;
  notes?: string;
}

export interface ExpenseTemplatePayload {
  id?: string;
  description: string;
  expectedAmount: number;
  dueDay?: number;
  isMonthly: boolean;
  notes?: string;
}

export interface ExpensePaymentPayload {
  expenseTemplateId: string;
  description: string;
  competenceMonth: string;
  dueDate?: string;
  expectedAmount: number;
  interestValue: number;
  fineValue: number;
  discountValue: number;
  amountPaid: number;
  paymentType: PaymentType;
  paidAt: string;
  notes?: string;
}

interface FinanceViewProps {
  professionals: Professional[];
  services: Service[];
  completedAppointments: Appointment[];
  receipts?: Receipt[];
  cashExpenses: CashExpense[];
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  commissionPayments?: CommissionPaymentRecord[];
  expenseTemplates?: ExpenseTemplateRecord[];
  expensePayments?: ExpensePaymentRecord[];
  onPayCommission?: (
    payload: CommissionPaymentPayload
  ) => void | Promise<void>;
  onUpdateCommissionPaidAt?: (
    paymentId: string,
    paidAt: string
  ) => void | Promise<void>;
  onSaveExpenseTemplate?: (
    payload: ExpenseTemplatePayload
  ) => void | Promise<void>;
  onDeleteExpenseTemplate?: (
    expenseTemplateId: string
  ) => void | Promise<void>;
  onPayExpense?: (
    payload: ExpensePaymentPayload
  ) => void | Promise<void>;
}

interface FinancePeriod {
  startDate: string;
  endDate: string;
}

interface CashBookRow {
  date: string;
  type: 'recebimento' | 'despesa';
  description: string;
  value: number;
}

interface FinancialMovementRow {
  id: string;
  date: string;
  type: 'recebimento' | 'despesa' | 'cortesia';
  description: string;
  paymentType: PaymentType;
  entryValue: number;
  exitValue: number;
}

interface CommissionRow {
  professional: Professional;
  completedCount: number;
  totalProduced: number;
  commissionValue: number;
}

function padDatePart(value: number): string {
  return String(value).padStart(2, '0');
}

function formatLocalDateStr(date: Date): string {
  const year = date.getFullYear();
  const month = padDatePart(date.getMonth() + 1);
  const day = padDatePart(date.getDate());

  return `${year}-${month}-${day}`;
}

function getCurrentMonthPeriod(): FinancePeriod {
  const today = new Date();
  const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
  const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  return {
    startDate: formatLocalDateStr(startDate),
    endDate: formatLocalDateStr(endDate)
  };
}

function formatDateBr(dateStr: string): string {
  if (!dateStr || !dateStr.includes('-')) {
    return dateStr;
  }

  return dateStr.split('-').reverse().join('/');
}

function getInclusivePeriodDays(period: FinancePeriod): number {
  if (!period.startDate || !period.endDate) {
    return 0;
  }

  const startDate = new Date(`${period.startDate}T00:00:00Z`);
  const endDate = new Date(`${period.endDate}T00:00:00Z`);

  if (
    Number.isNaN(startDate.getTime()) ||
    Number.isNaN(endDate.getTime()) ||
    endDate < startDate
  ) {
    return 0;
  }

  return Math.floor(
    (endDate.getTime() - startDate.getTime()) / 86400000
  ) + 1;
}

function formatEmissionDate(): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date());
}

function getAppointmentDateStr(dateTime: string): string {
  if (!dateTime || !dateTime.includes('T')) {
    return '';
  }

  return dateTime.split('T')[0];
}

function getCashBookStorageKey(period: FinancePeriod): string {
  const monthKey = period.startDate.slice(0, 7) || 'geral';

  return `agendaspeed-cashbook-initial-balance-${monthKey}`;
}

function parseCurrencyInput(value: string): number {
  const onlyNumbers = value.replace(/\D/g, '');

  if (!onlyNumbers) {
    return 0;
  }

  return Number(onlyNumbers) / 100;
}

function formatCurrencyInput(value: number): string {
  return formatCurrency(Number(value) || 0);
}

function calculateRoundedPercentage(
  value: number,
  total: number
): number {
  const normalizedValue = Number(value) || 0;
  const normalizedTotal = Number(total) || 0;

  if (normalizedTotal <= 0 || normalizedValue <= 0) {
    return 0;
  }

  return Math.round((normalizedValue / normalizedTotal) * 100);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getServiceName(
  services: Service[],
  serviceId: string
): string {
  const service = services.find((item) => item.id === serviceId);

  return service?.name || 'Serviço personalizado';
}

function buildEstablishmentPrintHeader(params: {
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  reportTitle: string;
  period: FinancePeriod;
}) {
  const {
    companyName,
    companyAddress,
    companyPhone,
    reportTitle,
    period
  } = params;

  return `
    <div class="header">
      <h1>${escapeHtml(companyName || 'AgendaSpeed')}</h1>
      ${companyAddress ? `<p>Endereço: ${escapeHtml(companyAddress)}</p>` : ''}
      ${companyPhone ? `<p>Telefone: ${escapeHtml(companyPhone)}</p>` : ''}
      <h2>${escapeHtml(reportTitle)}</h2>
      <p>Período: ${formatDateBr(period.startDate)} a ${formatDateBr(period.endDate)}</p>
      <p>Data da emissão: ${formatEmissionDate()}</p>
    </div>
  `;
}

function buildPrintWindow(params: {
  title: string;
  body: string;
  thermal?: boolean;
}) {
  const { title, body, thermal = false } = params;

  const printWindow = window.open('', '_blank');

  if (!printWindow) {
    alert('Não foi possível abrir a janela de impressão. Verifique o bloqueador de pop-ups.');
    return;
  }

  const width = thermal ? '80mm' : '210mm';
  const fontSize = thermal ? '11px' : '12px';
  const pageSize = thermal ? '80mm auto' : 'A4';
  const margin = thermal ? '4mm' : '14mm';

  const html = `
    <!doctype html>
    <html>
      <head>
        <title>${escapeHtml(title)}</title>
        <meta charset="utf-8" />
        <style>
          @page {
            size: ${pageSize};
            margin: ${margin};
          }

          * {
            box-sizing: border-box;
          }

          body {
            width: ${width};
            margin: 0 auto;
            padding-top: 12mm;
            font-family: Arial, sans-serif;
            color: #111827;
            font-size: ${fontSize};
            background: #fff;
          }

          h1, h2, h3, p {
            margin: 0;
          }

          h1 {
            font-size: 18px;
            text-align: center;
            text-transform: uppercase;
          }

          h2 {
            margin-top: 12px;
            font-size: 15px;
            text-align: center;
            text-transform: uppercase;
          }

          p {
            font-size: 11px;
            color: #475569;
            text-align: center;
            margin-top: 3px;
          }

          .header {
            border-bottom: 2px solid #0f4c5c;
            padding-bottom: 10px;
            margin-bottom: 12px;
          }

          table {
            width: 100%;
            border-collapse: collapse;
          }

          th, td {
            border-bottom: 1px solid #e2e8f0;
            padding: 8px 5px;
            text-align: left;
            vertical-align: top;
          }

          th {
            font-size: 10px;
            text-transform: uppercase;
            background: #0f4c5c;
            color: #fff;
          }

          .right {
            text-align: right;
          }

          .negative {
            color: #b91c1c;
            font-weight: 700;
          }

          .positive {
            color: #0f4c5c;
            font-weight: 700;
          }

          .summary {
            margin-top: 12px;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            overflow: hidden;
          }

          .summary-row {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            padding: 8px 10px;
            border-bottom: 1px solid #e2e8f0;
            font-weight: 700;
          }

          .summary-row:last-child {
            border-bottom: none;
            background: #f8fafc;
            color: #0f4c5c;
            font-size: 14px;
          }
        </style>
      </head>

      <body>
        ${body}
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  printWindow.focus();

  window.setTimeout(() => {
    printWindow.print();
  }, 350);
}

function PanelCard({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="bg-[#0f4c5c] px-4 py-3 text-white">
        <h3 className="text-sm font-black uppercase tracking-tight">
          {title}
        </h3>
      </div>

      {children}
    </div>
  );
}

export default function FinanceView({
  professionals,
  services,
  completedAppointments,
  receipts = [],
  cashExpenses,
  companyName,
  companyAddress,
  companyPhone,
  commissionPayments = [],
  expenseTemplates = [],
  expensePayments = [],
  onPayCommission,
  onUpdateCommissionPaidAt,
  onSaveExpenseTemplate,
  onDeleteExpenseTemplate,
  onPayExpense
}: FinanceViewProps) {
  const initialPeriod = useMemo(() => {
    return getCurrentMonthPeriod();
  }, []);

  const [activeFinanceTab, setActiveFinanceTab] =
    useState<FinanceInternalTab | null>(null);

  const [period, setPeriod] =
    useState<FinancePeriod>(initialPeriod);

  const [draftPeriod, setDraftPeriod] =
    useState<FinancePeriod>(initialPeriod);

  const [initialCashBalance, setInitialCashBalance] = useState<number>(() => {
    const storedValue = localStorage.getItem(getCashBookStorageKey(initialPeriod));

    return storedValue ? Number(storedValue) || 0 : 0;
  });

  const [selectedCommissionRow, setSelectedCommissionRow] =
    useState<CommissionRow | null>(null);
  const [commissionPaidAt, setCommissionPaidAt] = useState(
    formatLocalDateStr(new Date())
  );
  const [commissionPaymentType, setCommissionPaymentType] =
    useState<PaymentType>('dinheiro');
  const [commissionExtraValue, setCommissionExtraValue] = useState(0);
  const [commissionDiscountValue, setCommissionDiscountValue] = useState(0);
  const [commissionNotes, setCommissionNotes] = useState('');
  const [isSavingCommissionPayment, setIsSavingCommissionPayment] =
    useState(false);
  const [commissionFeedback, setCommissionFeedback] = useState<{
    title: string;
    message: string;
  } | null>(null);
  const [pendingCommissionPrintHtml, setPendingCommissionPrintHtml] =
    useState('');

  const [showCommissionHistory, setShowCommissionHistory] = useState(false);
  const [editingPaidCommission, setEditingPaidCommission] =
    useState<CommissionPaymentRecord | null>(null);
  const [editedCommissionPaidAt, setEditedCommissionPaidAt] = useState('');
  const [isUpdatingCommissionPaidAt, setIsUpdatingCommissionPaidAt] =
    useState(false);

  const [editingExpenseTemplate, setEditingExpenseTemplate] =
    useState<ExpenseTemplateRecord | null>(null);
  const [showExpenseTemplateModal, setShowExpenseTemplateModal] =
    useState(false);
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseExpectedAmount, setExpenseExpectedAmount] = useState(0);
  const [expenseDueDay, setExpenseDueDay] = useState('');
  const [expenseIsMonthly, setExpenseIsMonthly] = useState(true);
  const [expenseTemplateNotes, setExpenseTemplateNotes] = useState('');
  const [isSavingExpenseTemplate, setIsSavingExpenseTemplate] =
    useState(false);
  const [expenseTemplateToDelete, setExpenseTemplateToDelete] =
    useState<ExpenseTemplateRecord | null>(null);
  const [isDeletingExpenseTemplate, setIsDeletingExpenseTemplate] =
    useState(false);
  const [expenseToPay, setExpenseToPay] =
    useState<ExpenseTemplateRecord | null>(null);
  const [expensePaidAt, setExpensePaidAt] = useState(
    formatLocalDateStr(new Date())
  );
  const [expensePaymentType, setExpensePaymentType] =
    useState<PaymentType>('dinheiro');
  const [expenseInterestValue, setExpenseInterestValue] = useState(0);
  const [expenseFineValue, setExpenseFineValue] = useState(0);
  const [expenseDiscountValue, setExpenseDiscountValue] = useState(0);
  const [expensePaymentNotes, setExpensePaymentNotes] = useState('');
  const [isPayingExpense, setIsPayingExpense] = useState(false);
  const [expenseFeedback, setExpenseFeedback] = useState<{
    title: string;
    message: string;
  } | null>(null);

  const draftPeriodDays = getInclusivePeriodDays(draftPeriod);
  const periodDays = getInclusivePeriodDays(period);

  const isInvalidDraftPeriod =
    Boolean(draftPeriod.startDate && draftPeriod.endDate) &&
    draftPeriod.startDate > draftPeriod.endDate;

  const isDraftPeriodTooLong =
    Boolean(draftPeriod.startDate && draftPeriod.endDate) &&
    draftPeriodDays > 31;

  const isInvalidPeriod =
    Boolean(period.startDate && period.endDate) &&
    period.startDate > period.endDate;

  const isPeriodTooLong =
    Boolean(period.startDate && period.endDate) &&
    periodDays > 31;

  const filteredAppointments = useMemo(() => {
    if (isInvalidPeriod || isPeriodTooLong) {
      return [];
    }

    return completedAppointments.filter((appointment) => {
      const appointmentDate = getAppointmentDateStr(appointment.dateTime);

      if (!appointmentDate) {
        return false;
      }

      return (
        appointmentDate >= period.startDate &&
        appointmentDate <= period.endDate
      );
    });
  }, [
    completedAppointments,
    isInvalidPeriod,
    isPeriodTooLong,
    period
  ]);

  const filteredCashExpenses = useMemo(() => {
    if (isInvalidPeriod || isPeriodTooLong) {
      return [];
    }

    return cashExpenses.filter((expense) => {
      const expenseDate = getAppointmentDateStr(expense.paidAt) || expense.paidAt.slice(0, 10);

      return (
        expense.status === 'paid' &&
        expenseDate >= period.startDate &&
        expenseDate <= period.endDate
      );
    });
  }, [
    cashExpenses,
    isInvalidPeriod,
    isPeriodTooLong,
    period
  ]);

  const totalRevenue = useMemo(() => {
    return filteredAppointments.reduce((sum, appointment) => {
      return sum + appointment.price;
    }, 0);
  }, [filteredAppointments]);

  const totalCommissions = useMemo(() => {
    return filteredAppointments.reduce((sum, appointment) => {
      return sum + appointment.commissionValue;
    }, 0);
  }, [filteredAppointments]);

  const serviceRevenueRows = useMemo(() => {
    const map = new Map<string, {
      serviceId: string;
      serviceName: string;
      quantity: number;
      unitValue: number;
      total: number;
    }>();

    filteredAppointments.forEach((appointment) => {
      const current = map.get(appointment.serviceId);
      const service = services.find((item) => item.id === appointment.serviceId);

      if (current) {
        current.quantity += 1;
        current.total += appointment.price;
        current.unitValue = current.total / current.quantity;
        return;
      }

      map.set(appointment.serviceId, {
        serviceId: appointment.serviceId,
        serviceName: service?.name || 'Serviço personalizado',
        quantity: 1,
        unitValue: service?.price || appointment.price,
        total: appointment.price
      });
    });

    return Array.from(map.values())
      .map((row) => ({
        ...row,
        percentage: calculateRoundedPercentage(row.total, totalRevenue)
      }))
      .sort((a, b) => {
        if (b.total !== a.total) {
          return b.total - a.total;
        }

        return a.serviceName.localeCompare(b.serviceName);
      });
  }, [
    filteredAppointments,
    services,
    totalRevenue
  ]);

  const paymentRevenueRows = useMemo(() => {
    const paymentTypes = [
      'pix',
      'dinheiro',
      'credito',
      'debito',
      'cortesia'
    ];

    return paymentTypes.map((paymentType) => {
      const total = filteredAppointments
        .filter((appointment) => appointment.paymentType === paymentType)
        .reduce((sum, appointment) => sum + appointment.price, 0);

      return {
        paymentType,
        total,
        percentage: calculateRoundedPercentage(total, totalRevenue)
      };
    });
  }, [filteredAppointments, totalRevenue]);

  const professionalRevenueRows = useMemo(() => {
    return professionals
      .map((professional) => {
        const total = filteredAppointments
          .filter((appointment) => appointment.professionalId === professional.id)
          .reduce((sum, appointment) => sum + appointment.price, 0);

        return {
          professional,
          total,
          percentage: calculateRoundedPercentage(total, totalRevenue)
        };
      })
      .sort((a, b) => {
        if (b.total !== a.total) {
          return b.total - a.total;
        }

        return a.professional.name.localeCompare(b.professional.name);
      });
  }, [
    filteredAppointments,
    professionals
  ]);

  const filteredReceipts = useMemo(() => {
    if (isInvalidPeriod || isPeriodTooLong) {
      return [];
    }

    return receipts.filter((receipt) => {
      const receiptDate = receipt.paidAt.slice(0, 10);

      return (
        receipt.status !== 'cancelled' &&
        receiptDate >= period.startDate &&
        receiptDate <= period.endDate
      );
    });
  }, [
    isInvalidPeriod,
    isPeriodTooLong,
    period,
    receipts
  ]);

  const productRevenueRows = useMemo(() => {
    const productMap = new Map<string, {
      productId: string;
      code: string;
      description: string;
      quantity: number;
      total: number;
      unitValue: number;
    }>();

    filteredReceipts.forEach((receipt) => {
      receipt.items
        .filter((item) => item.itemType === 'product')
        .forEach((item) => {
          const productId = item.productId || item.itemDescription || item.id;
          const quantity = Math.max(1, Number(item.quantity) || 1);
          const total = Number(item.price) || 0;
          const current = productMap.get(productId);

          if (current) {
            current.quantity += quantity;
            current.total += total;
            current.unitValue =
              current.quantity > 0 ? current.total / current.quantity : 0;
            return;
          }

          productMap.set(productId, {
            productId,
            code: '',
            description:
              item.itemDescription ||
              item.serviceName ||
              'Produto',
            quantity,
            total,
            unitValue:
              Number(item.unitPrice) ||
              (quantity > 0 ? total / quantity : 0)
          });
        });
    });

    const totalProductsRevenue = Array.from(productMap.values()).reduce(
      (sum, row) => sum + row.total,
      0
    );

    return Array.from(productMap.values())
      .map((row) => ({
        ...row,
        percentage: calculateRoundedPercentage(
          row.total,
          totalProductsRevenue
        )
      }))
      .sort((a, b) => {
        if (b.total !== a.total) {
          return b.total - a.total;
        }

        return a.description.localeCompare(b.description);
      });
  }, [filteredReceipts]);

  const totalProductsRevenue = useMemo(() => {
    return productRevenueRows.reduce((sum, row) => sum + row.total, 0);
  }, [productRevenueRows]);

  const totalGrossRevenue = totalRevenue + totalProductsRevenue;

  const commissionRows = useMemo<CommissionRow[]>(() => {
    return professionals
      .map((professional) => {
        const completedCount = countProfessionalCompletedAppointments({
          professionalId: professional.id,
          completedAppointments: filteredAppointments
        });

        const totalProduced = calculateProfessionalGrossRevenue({
          professionalId: professional.id,
          completedAppointments: filteredAppointments
        });

        const commissionValue = calculateProfessionalCommission({
          professional,
          services,
          completedAppointments: filteredAppointments
        });

        return {
          professional,
          completedCount,
          totalProduced,
          commissionValue
        };
      })
      .sort((a, b) => {
        return a.professional.name.localeCompare(b.professional.name);
      });
  }, [
    filteredAppointments,
    professionals,
    services
  ]);

  const filteredCommissionPayments = useMemo(() => {
    return commissionPayments
      .filter((payment) => {
        return (
          payment.periodStart >= period.startDate &&
          payment.periodEnd <= period.endDate
        );
      })
      .sort((firstPayment, secondPayment) => {
        return secondPayment.paidAt.localeCompare(firstPayment.paidAt);
      });
  }, [commissionPayments, period]);

  const commissionPaymentByProfessionalId = useMemo(() => {
    const paymentMap = new Map<string, CommissionPaymentRecord>();

    commissionPayments.forEach((payment) => {
      const overlapsSelectedPeriod =
        payment.periodStart <= period.endDate &&
        payment.periodEnd >= period.startDate;

      if (overlapsSelectedPeriod && !paymentMap.has(payment.professionalId)) {
        paymentMap.set(payment.professionalId, payment);
      }
    });

    return paymentMap;
  }, [commissionPayments, period]);

  const commissionAmountToPay = selectedCommissionRow
    ? Math.max(
        0,
        selectedCommissionRow.commissionValue +
          commissionExtraValue -
          commissionDiscountValue
      )
    : 0;

  const resetCommissionPaymentForm = () => {
    setSelectedCommissionRow(null);
    setCommissionPaidAt(formatLocalDateStr(new Date()));
    setCommissionPaymentType('dinheiro');
    setCommissionExtraValue(0);
    setCommissionDiscountValue(0);
    setCommissionNotes('');
  };

  const handleOpenCommissionPayment = (row: CommissionRow) => {
    setSelectedCommissionRow(row);
    setCommissionPaidAt(formatLocalDateStr(new Date()));
    setCommissionPaymentType('dinheiro');
    setCommissionExtraValue(0);
    setCommissionDiscountValue(0);
    setCommissionNotes('');
  };

  const handleOpenPaidCommission = (
    payment: CommissionPaymentRecord
  ) => {
    setEditingPaidCommission(payment);
    setEditedCommissionPaidAt(payment.paidAt);
  };

  const handleConfirmCommissionPaidAtUpdate = async () => {
    if (
      !editingPaidCommission ||
      !editedCommissionPaidAt ||
      isUpdatingCommissionPaidAt
    ) {
      return;
    }

    if (!onUpdateCommissionPaidAt) {
      setCommissionFeedback({
        title: 'Integração pendente',
        message:
          'A alteração da data ainda precisa ser conectada ao Supabase pelo painel do dono.'
      });
      return;
    }

    setIsUpdatingCommissionPaidAt(true);

    try {
      await onUpdateCommissionPaidAt(
        editingPaidCommission.id,
        editedCommissionPaidAt
      );

      setEditingPaidCommission(null);
      setEditedCommissionPaidAt('');
      setCommissionFeedback({
        title: 'Data atualizada',
        message: 'A data do pagamento da comissão foi atualizada com sucesso.'
      });
    } catch (error) {
      setCommissionFeedback({
        title: 'Data não atualizada',
        message:
          error instanceof Error
            ? error.message
            : 'Não foi possível atualizar a data do pagamento.'
      });
    } finally {
      setIsUpdatingCommissionPaidAt(false);
    }
  };

  const buildCommissionPaymentPrintHtml = (
    row: CommissionRow,
    payload: CommissionPaymentPayload
  ) => {
    return `
      ${buildEstablishmentPrintHeader({
        companyName,
        companyAddress,
        companyPhone,
        reportTitle: 'Comprovante de Pagamento de Comissão',
        period: {
          startDate: payload.periodStart,
          endDate: payload.periodEnd
        }
      })}

      <table>
        <tbody>
          <tr>
            <th>Profissional</th>
            <td>${escapeHtml(row.professional.name)}</td>
          </tr>
          <tr>
            <th>Data do pagamento</th>
            <td>${formatDateBr(payload.paidAt)}</td>
          </tr>
          <tr>
            <th>Forma de pagamento</th>
            <td>${escapeHtml(getPaymentLabel(payload.paymentType))}</td>
          </tr>
          <tr>
            <th>Atendimentos</th>
            <td>${row.completedCount}</td>
          </tr>
          <tr>
            <th>Produção</th>
            <td>${formatCurrency(row.totalProduced)}</td>
          </tr>
          <tr>
            <th>Comissão calculada</th>
            <td>${formatCurrency(payload.calculatedCommission)}</td>
          </tr>
          <tr>
            <th>Extra</th>
            <td>${formatCurrency(payload.extraValue)}</td>
          </tr>
          <tr>
            <th>Desconto</th>
            <td>${formatCurrency(payload.discountValue)}</td>
          </tr>
          <tr>
            <th>Total pago</th>
            <td><strong>${formatCurrency(payload.amountPaid)}</strong></td>
          </tr>
          ${
            payload.notes
              ? `<tr><th>Observações</th><td>${escapeHtml(payload.notes)}</td></tr>`
              : ''
          }
        </tbody>
      </table>

      <div class="summary">
        <div class="summary-row">
          <span>Recebi o valor acima informado.</span>
        </div>
        <div class="summary-row">
          <span>Assinatura: ______________________________</span>
        </div>
      </div>
    `;
  };

  const handleConfirmCommissionPayment = async () => {
    if (!selectedCommissionRow || isSavingCommissionPayment) {
      return;
    }

    if (!commissionPaidAt) {
      setCommissionFeedback({
        title: 'Data obrigatória',
        message: 'Informe a data do pagamento da comissão.'
      });
      return;
    }

    if (commissionAmountToPay <= 0) {
      setCommissionFeedback({
        title: 'Valor inválido',
        message: 'O valor final da comissão precisa ser maior que zero.'
      });
      return;
    }

    if (!onPayCommission) {
      setCommissionFeedback({
        title: 'Integração pendente',
        message:
          'O formulário está pronto, mas ainda precisa ser conectado ao Supabase pelo painel do dono.'
      });
      return;
    }

    const payload: CommissionPaymentPayload = {
      professionalId: selectedCommissionRow.professional.id,
      professionalName: selectedCommissionRow.professional.name,
      periodStart: period.startDate,
      periodEnd: period.endDate,
      calculatedCommission: selectedCommissionRow.commissionValue,
      extraValue: commissionExtraValue,
      discountValue: commissionDiscountValue,
      amountPaid: commissionAmountToPay,
      paymentType: commissionPaymentType,
      paidAt: commissionPaidAt,
      notes: commissionNotes.trim() || undefined
    };

    setIsSavingCommissionPayment(true);

    try {
      await onPayCommission(payload);

      setPendingCommissionPrintHtml(
        buildCommissionPaymentPrintHtml(selectedCommissionRow, payload)
      );
      resetCommissionPaymentForm();
      setCommissionFeedback({
        title: 'Comissão paga',
        message:
          'O pagamento foi registrado com sucesso. Você já pode imprimir o comprovante.'
      });
    } catch (error) {
      setCommissionFeedback({
        title: 'Pagamento não concluído',
        message:
          error instanceof Error
            ? error.message
            : 'Não foi possível registrar o pagamento da comissão.'
      });
    } finally {
      setIsSavingCommissionPayment(false);
    }
  };

  const handlePrintSavedCommissionPayment = () => {
    if (!pendingCommissionPrintHtml) {
      return;
    }

    buildPrintWindow({
      title: 'Comprovante de Comissão',
      thermal: true,
      body: pendingCommissionPrintHtml
    });

    setPendingCommissionPrintHtml('');
    setCommissionFeedback(null);
  };

  const competenceMonth = `${period.startDate.slice(0, 7)}-01`;

  const expensePaymentByTemplateId = useMemo(() => {
    const paymentMap = new Map<string, ExpensePaymentRecord>();

    expensePayments.forEach((payment) => {
      if (
        payment.expenseTemplateId &&
        payment.competenceMonth === competenceMonth &&
        payment.status !== 'cancelled'
      ) {
        paymentMap.set(payment.expenseTemplateId, payment);
      }
    });

    return paymentMap;
  }, [competenceMonth, expensePayments]);

  const expenseRows = useMemo(() => {
    return expenseTemplates
      .filter((template) => template.active)
      .map((template) => {
        const payment = expensePaymentByTemplateId.get(template.id);
        const dueDate = template.dueDay
          ? `${competenceMonth.slice(0, 8)}${String(template.dueDay).padStart(2, '0')}`
          : '';

        return {
          template,
          payment,
          dueDate
        };
      })
      .sort((firstRow, secondRow) => {
        const firstDueDay = firstRow.template.dueDay || 32;
        const secondDueDay = secondRow.template.dueDay || 32;

        if (firstDueDay !== secondDueDay) {
          return firstDueDay - secondDueDay;
        }

        return firstRow.template.description.localeCompare(
          secondRow.template.description,
          'pt-BR'
        );
      });
  }, [
    competenceMonth,
    expensePaymentByTemplateId,
    expenseTemplates
  ]);

  const expensePaymentTotal = expenseToPay
    ? Math.max(
        0,
        expenseToPay.expectedAmount +
          expenseInterestValue +
          expenseFineValue -
          expenseDiscountValue
      )
    : 0;

  const resetExpenseTemplateForm = () => {
    setEditingExpenseTemplate(null);
    setShowExpenseTemplateModal(false);
    setExpenseDescription('');
    setExpenseExpectedAmount(0);
    setExpenseDueDay('');
    setExpenseIsMonthly(true);
    setExpenseTemplateNotes('');
  };

  const handleOpenNewExpenseTemplate = () => {
    resetExpenseTemplateForm();
    setShowExpenseTemplateModal(true);
  };

  const handleOpenEditExpenseTemplate = (
    template: ExpenseTemplateRecord
  ) => {
    setEditingExpenseTemplate(template);
    setExpenseDescription(template.description);
    setExpenseExpectedAmount(template.expectedAmount);
    setExpenseDueDay(
      template.dueDay ? String(template.dueDay) : ''
    );
    setExpenseIsMonthly(template.isMonthly);
    setExpenseTemplateNotes(template.notes || '');
    setShowExpenseTemplateModal(true);
  };

  const handleSaveExpenseTemplate = async () => {
    if (isSavingExpenseTemplate) {
      return;
    }

    const normalizedDescription = expenseDescription.trim();

    if (!normalizedDescription) {
      setExpenseFeedback({
        title: 'Descrição obrigatória',
        message: 'Informe o nome da despesa.'
      });
      return;
    }

    if (expenseExpectedAmount < 0) {
      setExpenseFeedback({
        title: 'Valor inválido',
        message: 'O valor previsto da despesa não pode ser negativo.'
      });
      return;
    }

    const normalizedDueDay = expenseDueDay
      ? Number(expenseDueDay)
      : undefined;

    if (
      normalizedDueDay !== undefined &&
      (normalizedDueDay < 1 || normalizedDueDay > 31)
    ) {
      setExpenseFeedback({
        title: 'Vencimento inválido',
        message: 'O dia do vencimento deve estar entre 1 e 31.'
      });
      return;
    }

    if (!onSaveExpenseTemplate) {
      setExpenseFeedback({
        title: 'Integração pendente',
        message:
          'O formulário está pronto, mas ainda precisa ser conectado ao Supabase pelo painel do dono.'
      });
      return;
    }

    setIsSavingExpenseTemplate(true);

    try {
      await onSaveExpenseTemplate({
        id: editingExpenseTemplate?.id,
        description: normalizedDescription,
        expectedAmount: expenseExpectedAmount,
        dueDay: normalizedDueDay,
        isMonthly: expenseIsMonthly,
        notes: expenseTemplateNotes.trim() || undefined
      });

      resetExpenseTemplateForm();
      setExpenseFeedback({
        title: editingExpenseTemplate
          ? 'Despesa alterada'
          : 'Despesa incluída',
        message: 'O cadastro da despesa foi salvo com sucesso.'
      });
    } catch (error) {
      setExpenseFeedback({
        title: 'Despesa não salva',
        message:
          error instanceof Error
            ? error.message
            : 'Não foi possível salvar a despesa.'
      });
    } finally {
      setIsSavingExpenseTemplate(false);
    }
  };

  const handleConfirmDeleteExpenseTemplate = async () => {
    if (
      !expenseTemplateToDelete ||
      isDeletingExpenseTemplate
    ) {
      return;
    }

    if (!onDeleteExpenseTemplate) {
      setExpenseFeedback({
        title: 'Integração pendente',
        message:
          'A exclusão ainda precisa ser conectada ao Supabase pelo painel do dono.'
      });
      return;
    }

    setIsDeletingExpenseTemplate(true);

    try {
      await onDeleteExpenseTemplate(expenseTemplateToDelete.id);
      setExpenseTemplateToDelete(null);
      setExpenseFeedback({
        title: 'Despesa excluída',
        message: 'O cadastro foi removido com sucesso.'
      });
    } catch (error) {
      setExpenseFeedback({
        title: 'Despesa não excluída',
        message:
          error instanceof Error
            ? error.message
            : 'Não foi possível excluir a despesa.'
      });
    } finally {
      setIsDeletingExpenseTemplate(false);
    }
  };

  const resetExpensePaymentForm = () => {
    setExpenseToPay(null);
    setExpensePaidAt(formatLocalDateStr(new Date()));
    setExpensePaymentType('dinheiro');
    setExpenseInterestValue(0);
    setExpenseFineValue(0);
    setExpenseDiscountValue(0);
    setExpensePaymentNotes('');
  };

  const handleOpenExpensePayment = (
    template: ExpenseTemplateRecord
  ) => {
    setExpenseToPay(template);
    setExpensePaidAt(formatLocalDateStr(new Date()));
    setExpensePaymentType('dinheiro');
    setExpenseInterestValue(0);
    setExpenseFineValue(0);
    setExpenseDiscountValue(0);
    setExpensePaymentNotes('');
  };

  const handleConfirmExpensePayment = async () => {
    if (!expenseToPay || isPayingExpense) {
      return;
    }

    if (!expensePaidAt) {
      setExpenseFeedback({
        title: 'Data obrigatória',
        message: 'Informe a data do pagamento.'
      });
      return;
    }

    if (expensePaymentTotal <= 0) {
      setExpenseFeedback({
        title: 'Valor inválido',
        message: 'O valor final da despesa precisa ser maior que zero.'
      });
      return;
    }

    if (!onPayExpense) {
      setExpenseFeedback({
        title: 'Integração pendente',
        message:
          'O pagamento está pronto, mas ainda precisa ser conectado ao Supabase pelo painel do dono.'
      });
      return;
    }

    const dueDate = expenseToPay.dueDay
      ? `${competenceMonth.slice(0, 8)}${String(
          Math.min(expenseToPay.dueDay, 28)
        ).padStart(2, '0')}`
      : undefined;

    setIsPayingExpense(true);

    try {
      await onPayExpense({
        expenseTemplateId: expenseToPay.id,
        description: expenseToPay.description,
        competenceMonth,
        dueDate,
        expectedAmount: expenseToPay.expectedAmount,
        interestValue: expenseInterestValue,
        fineValue: expenseFineValue,
        discountValue: expenseDiscountValue,
        amountPaid: expensePaymentTotal,
        paymentType: expensePaymentType,
        paidAt: expensePaidAt,
        notes: expensePaymentNotes.trim() || undefined
      });

      resetExpensePaymentForm();
      setExpenseFeedback({
        title: 'Despesa paga',
        message:
          'O pagamento foi registrado e passará a alimentar os relatórios financeiros.'
      });
    } catch (error) {
      setExpenseFeedback({
        title: 'Pagamento não concluído',
        message:
          error instanceof Error
            ? error.message
            : 'Não foi possível registrar o pagamento da despesa.'
      });
    } finally {
      setIsPayingExpense(false);
    }
  };

  const financialMovementRows = useMemo<FinancialMovementRow[]>(() => {
    const receiptRows: FinancialMovementRow[] = filteredReceipts.flatMap<
      FinancialMovementRow
    >((receipt) => {
      const receiptDate = receipt.paidAt.slice(0, 10);
      const description =
        receipt.items
          .map((item) => item.itemDescription || item.serviceName)
          .filter(Boolean)
          .join(' + ') ||
        receipt.clientName ||
        'Recebimento';

      if (receipt.paymentType === 'cortesia') {
        return [{
          id: `${receipt.id}-cortesia`,
          date: receiptDate,
          type: 'cortesia',
          description,
          paymentType: 'cortesia',
          entryValue: 0,
          exitValue: 0
        } satisfies FinancialMovementRow];
      }

      if (receipt.status !== 'paid') {
        return [];
      }

      if (Array.isArray(receipt.payments) && receipt.payments.length > 0) {
        return receipt.payments
          .filter((payment) => payment.paymentType !== 'pendente')
          .map<FinancialMovementRow>((payment) => ({
            id: `${receipt.id}-${payment.id}`,
            date: receiptDate,
            type: 'recebimento',
            description,
            paymentType: payment.paymentType,
            entryValue: Number(payment.amount) || 0,
            exitValue: 0
          }));
      }

      return [{
        id: `${receipt.id}-${receipt.paymentType}`,
        date: receiptDate,
        type: 'recebimento',
        description,
        paymentType: receipt.paymentType,
        entryValue: Number(receipt.amountPaid ?? receipt.totalAmount) || 0,
        exitValue: 0
      } satisfies FinancialMovementRow];
    });

    const expenseRows: FinancialMovementRow[] =
      filteredCashExpenses.map<FinancialMovementRow>((expense) => ({
        id: expense.id,
        date:
          getAppointmentDateStr(expense.paidAt) ||
          expense.paidAt.slice(0, 10),
        type: 'despesa',
        description: expense.description || 'Despesa manual',
        paymentType: expense.paymentType,
        entryValue: 0,
        exitValue: Math.abs(Number(expense.amount) || 0)
      }));

    return [
      ...receiptRows,
      ...expenseRows
    ].sort((firstRow, secondRow) => {
      if (firstRow.date !== secondRow.date) {
        return firstRow.date.localeCompare(secondRow.date);
      }

      return firstRow.description.localeCompare(
        secondRow.description,
        'pt-BR'
      );
    });
  }, [
    filteredCashExpenses,
    filteredReceipts
  ]);

  const financialMovementIncomeTotal = useMemo(() => {
    return financialMovementRows.reduce(
      (sum, row) => sum + row.entryValue,
      0
    );
  }, [financialMovementRows]);

  const financialMovementExpenseTotal = useMemo(() => {
    return financialMovementRows.reduce(
      (sum, row) => sum + row.exitValue,
      0
    );
  }, [financialMovementRows]);

  const financialMovementBalance =
    financialMovementIncomeTotal - financialMovementExpenseTotal;

  const financialMovementPaymentTotals = useMemo(() => {
    const paymentTypes: PaymentType[] = [
      'dinheiro',
      'pix',
      'debito',
      'credito',
      'cortesia'
    ];

    return paymentTypes.map((paymentType) => ({
      paymentType,
      total: financialMovementRows
        .filter((row) => row.paymentType === paymentType)
        .reduce((sum, row) => sum + row.entryValue, 0)
    }));
  }, [financialMovementRows]);

  const cashBookRows = useMemo<CashBookRow[]>(() => {
    const cashAppointmentRows = filteredAppointments
      .filter((appointment) => appointment.paymentType === 'dinheiro')
      .map((appointment) => ({
        date: getAppointmentDateStr(appointment.dateTime),
        type: 'recebimento' as const,
        description: getServiceName(services, appointment.serviceId),
        value: Number(appointment.price) || 0
      }));

    const cashExpenseRows = filteredCashExpenses
      .filter((expense) => expense.paymentType === 'dinheiro')
      .map((expense) => ({
        date: getAppointmentDateStr(expense.paidAt) || expense.paidAt.slice(0, 10),
        type: 'despesa' as const,
        description: expense.description || 'Despesa manual',
        value: -Math.abs(Number(expense.amount) || 0)
      }));

    return [
      ...cashAppointmentRows,
      ...cashExpenseRows
    ].sort((firstRow, secondRow) => {
      return firstRow.date.localeCompare(secondRow.date);
    });
  }, [
    filteredAppointments,
    filteredCashExpenses,
    services
  ]);

  const cashBookIncomeTotal = useMemo(() => {
    return cashBookRows
      .filter((row) => row.type === 'recebimento')
      .reduce((sum, row) => sum + row.value, 0);
  }, [cashBookRows]);

  const cashBookExpenseTotal = useMemo(() => {
    return cashBookRows
      .filter((row) => row.type === 'despesa')
      .reduce((sum, row) => sum + Math.abs(row.value), 0);
  }, [cashBookRows]);

  const cashBookFinalBalance =
    initialCashBalance + cashBookIncomeTotal - cashBookExpenseTotal;

  const handleChangeStartDate = (startDate: string) => {
    setDraftPeriod((currentPeriod) => ({
      ...currentPeriod,
      startDate
    }));
  };

  const handleChangeEndDate = (endDate: string) => {
    setDraftPeriod((currentPeriod) => ({
      ...currentPeriod,
      endDate
    }));
  };

  const handleApplyPeriodFilter = () => {
    if (isInvalidDraftPeriod || isDraftPeriodTooLong) {
      return;
    }

    setPeriod(draftPeriod);

    const nextStoredValue =
      localStorage.getItem(getCashBookStorageKey(draftPeriod));

    setInitialCashBalance(nextStoredValue ? Number(nextStoredValue) || 0 : 0);
  };

  const handleChangeInitialCashBalance = (value: string) => {
    const parsedValue = parseCurrencyInput(value);

    setInitialCashBalance(parsedValue);
    localStorage.setItem(getCashBookStorageKey(period), String(parsedValue));
  };

  const handlePrintCommissionsA4 = () => {
    const rowsHtml = commissionRows.map((row) => {
      return `
        <tr>
          <td>${escapeHtml(row.professional.name)}</td>
          <td>${escapeHtml(getRemunerationLabel(row.professional))}</td>
          <td class="right">${row.completedCount}</td>
          <td class="right">${formatCurrency(row.totalProduced)}</td>
          <td class="right">${formatCurrency(row.commissionValue)}</td>
        </tr>
      `;
    }).join('');

    buildPrintWindow({
      title: 'Relatório de Comissões',
      body: `
        ${buildEstablishmentPrintHeader({
          companyName,
          companyAddress,
          companyPhone,
          reportTitle: 'Comissões',
          period
        })}

        <table>
          <thead>
            <tr>
              <th>Colaborador</th>
              <th>Remuneração</th>
              <th class="right">Atendimento</th>
              <th class="right">Faturamento</th>
              <th class="right">Comissão</th>
            </tr>
          </thead>

          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      `
    });
  };

  const handlePrintCommissionsThermal = () => {
    const rowsHtml = commissionRows.map((row) => {
      return `
        <div style="border-bottom:1px dashed #999;padding:7px 0;">
          <strong>${escapeHtml(row.professional.name)}</strong><br />
          Atend.: ${row.completedCount}<br />
          Prod.: ${formatCurrency(row.totalProduced)}<br />
          Comissão: ${formatCurrency(row.commissionValue)}
        </div>
      `;
    }).join('');

    buildPrintWindow({
      title: 'Filipeta de Comissões',
      thermal: true,
      body: `
        ${buildEstablishmentPrintHeader({
          companyName,
          companyAddress,
          companyPhone,
          reportTitle: 'Comissões',
          period
        })}

        ${rowsHtml}
      `
    });
  };

  const handlePrintProfessionalCommission = (
    row: {
      professional: Professional;
      completedCount: number;
      totalProduced: number;
      commissionValue: number;
    }
  ) => {
    buildPrintWindow({
      title: `Fechamento - ${row.professional.name}`,
      body: `
        ${buildEstablishmentPrintHeader({
          companyName,
          companyAddress,
          companyPhone,
          reportTitle: 'Fechamento de Comissão',
          period
        })}

        <table>
          <tbody>
            <tr>
              <th>Profissional</th>
              <td>${escapeHtml(row.professional.name)}</td>
            </tr>
            <tr>
              <th>Remuneração</th>
              <td>${escapeHtml(getRemunerationLabel(row.professional))}</td>
            </tr>
            <tr>
              <th>Atendimento</th>
              <td>${row.completedCount}</td>
            </tr>
            <tr>
              <th>Faturamento</th>
              <td>${formatCurrency(row.totalProduced)}</td>
            </tr>
            <tr>
              <th>Comissão devida</th>
              <td>${formatCurrency(row.commissionValue)}</td>
            </tr>
          </tbody>
        </table>

        <div class="summary">
          <div class="summary-row">
            <span>Recebi o valor de comissão acima informado.</span>
          </div>
          <div class="summary-row">
            <span>Assinatura: ______________________________</span>
          </div>
          <div class="summary-row">
            <span>Data: ____/____/________</span>
          </div>
        </div>
      `
    });
  };

  const handlePrintCommissionHistory = () => {
    const rowsHtml = filteredCommissionPayments.map((payment) => {
      return `
        <tr>
          <td>${formatDateBr(payment.paidAt)}</td>
          <td>${escapeHtml(payment.professionalName)}</td>
          <td>${formatDateBr(payment.periodStart)} a ${formatDateBr(payment.periodEnd)}</td>
          <td class="right">${formatCurrency(payment.calculatedCommission)}</td>
          <td class="right">${formatCurrency(payment.extraValue)}</td>
          <td class="right">${formatCurrency(payment.discountValue)}</td>
          <td class="right">${formatCurrency(payment.amountPaid)}</td>
          <td>${escapeHtml(getPaymentLabel(payment.paymentType))}</td>
        </tr>
      `;
    }).join('');

    const totalCalculated = filteredCommissionPayments.reduce(
      (sum, payment) => sum + payment.calculatedCommission,
      0
    );
    const totalExtra = filteredCommissionPayments.reduce(
      (sum, payment) => sum + payment.extraValue,
      0
    );
    const totalDiscount = filteredCommissionPayments.reduce(
      (sum, payment) => sum + payment.discountValue,
      0
    );
    const totalPaid = filteredCommissionPayments.reduce(
      (sum, payment) => sum + payment.amountPaid,
      0
    );

    buildPrintWindow({
      title: 'Histórico de Comissões',
      body: `
        ${buildEstablishmentPrintHeader({
          companyName,
          companyAddress,
          companyPhone,
          reportTitle: 'Histórico de Comissões Pagas',
          period
        })}

        <table>
          <thead>
            <tr>
              <th>Pagamento</th>
              <th>Profissional</th>
              <th>Período</th>
              <th class="right">Comissão</th>
              <th class="right">Extra</th>
              <th class="right">Desconto</th>
              <th class="right">Total pago</th>
              <th>Forma</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="8" style="text-align:center;color:#64748b;">Nenhuma comissão paga no período.</td></tr>'}
          </tbody>
        </table>

        <div class="summary">
          <div class="summary-row">
            <span>Comissões calculadas</span>
            <span>${formatCurrency(totalCalculated)}</span>
          </div>
          <div class="summary-row">
            <span>Extras</span>
            <span>${formatCurrency(totalExtra)}</span>
          </div>
          <div class="summary-row">
            <span>Descontos</span>
            <span>${formatCurrency(totalDiscount)}</span>
          </div>
          <div class="summary-row">
            <span>Total pago</span>
            <span>${formatCurrency(totalPaid)}</span>
          </div>
        </div>
      `
    });
  };

  const handlePrintCommissionPaymentIndividual = (
    payment: CommissionPaymentRecord
  ) => {
    buildPrintWindow({
      title: `Comissão - ${payment.professionalName}`,
      thermal: true,
      body: `
        ${buildEstablishmentPrintHeader({
          companyName,
          companyAddress,
          companyPhone,
          reportTitle: 'Comprovante Individual de Comissão',
          period: {
            startDate: payment.periodStart,
            endDate: payment.periodEnd
          }
        })}

        <table>
          <tbody>
            <tr>
              <th>Profissional</th>
              <td>${escapeHtml(payment.professionalName)}</td>
            </tr>
            <tr>
              <th>Data do pagamento</th>
              <td>${formatDateBr(payment.paidAt)}</td>
            </tr>
            <tr>
              <th>Forma</th>
              <td>${escapeHtml(getPaymentLabel(payment.paymentType))}</td>
            </tr>
            <tr>
              <th>Comissão</th>
              <td>${formatCurrency(payment.calculatedCommission)}</td>
            </tr>
            <tr>
              <th>Extra</th>
              <td>${formatCurrency(payment.extraValue)}</td>
            </tr>
            <tr>
              <th>Desconto</th>
              <td>${formatCurrency(payment.discountValue)}</td>
            </tr>
            <tr>
              <th>Total pago</th>
              <td><strong>${formatCurrency(payment.amountPaid)}</strong></td>
            </tr>
          </tbody>
        </table>
      `
    });
  };

  const handlePrintRevenueReport = () => {
    const serviceRowsHtml = serviceRevenueRows.map((row) => {
      return `
        <tr>
          <td>${escapeHtml(row.serviceName)}</td>
          <td class="right">${row.quantity}</td>
          <td class="right">${formatCurrency(row.unitValue)}</td>
          <td class="right">${formatCurrency(row.total)}</td>
          <td class="right">${row.percentage}%</td>
        </tr>
      `;
    }).join('');

    const paymentRowsHtml = paymentRevenueRows.map((row) => {
      return `
        <tr>
          <td>${escapeHtml(getPaymentLabel(row.paymentType))}</td>
          <td class="right">${formatCurrency(row.total)}</td>
          <td class="right">${row.percentage}%</td>
        </tr>
      `;
    }).join('');

    const professionalRowsHtml = professionalRevenueRows.map((row) => {
      return `
        <tr>
          <td>${escapeHtml(row.professional.name)}</td>
          <td class="right">${formatCurrency(row.total)}</td>
          <td class="right">${row.percentage}%</td>
        </tr>
      `;
    }).join('');

    const productRowsHtml = productRevenueRows.map((row) => {
      return `
        <tr>
          <td>${escapeHtml(row.description)}</td>
          <td class="right">${row.quantity}</td>
          <td class="right">${formatCurrency(row.unitValue)}</td>
          <td class="right">${formatCurrency(row.total)}</td>
          <td class="right">${row.percentage}%</td>
        </tr>
      `;
    }).join('');

    buildPrintWindow({
      title: 'Relatório de Faturamento',
      body: `
        ${buildEstablishmentPrintHeader({
          companyName,
          companyAddress,
          companyPhone,
          reportTitle: 'Relatório de Faturamento',
          period
        })}

        <h2>Faturamento por tipo de serviço</h2>
        <table>
          <thead>
            <tr>
              <th>Serviço</th>
              <th class="right">Atendimento</th>
              <th class="right">Valor individual</th>
              <th class="right">Total</th>
              <th class="right">%</th>
            </tr>
          </thead>
          <tbody>
            ${serviceRowsHtml || '<tr><td colspan="5" style="text-align:center;color:#64748b;">Nenhum atendimento finalizado no período.</td></tr>'}
            <tr>
              <td colspan="3" class="right"><strong>Total de serviços</strong></td>
              <td class="right"><strong>${formatCurrency(totalRevenue)}</strong></td>
              <td class="right"><strong>${totalRevenue > 0 ? '100%' : '0%'}</strong></td>
            </tr>
          </tbody>
        </table>

        <br />

        <h2>Recebimento por forma de pagamento</h2>
        <table>
          <thead>
            <tr>
              <th>Forma</th>
              <th class="right">Valor</th>
              <th class="right">%</th>
            </tr>
          </thead>
          <tbody>
            ${paymentRowsHtml}
            <tr>
              <td class="right"><strong>Total por formas de pagamento</strong></td>
              <td class="right"><strong>${formatCurrency(totalRevenue)}</strong></td>
              <td class="right"><strong>${totalRevenue > 0 ? '100%' : '0%'}</strong></td>
            </tr>
          </tbody>
        </table>

        <br />

        <h2>Produzido por colaborador</h2>
        <table>
          <thead>
            <tr>
              <th>Colaborador</th>
              <th class="right">Valor</th>
              <th class="right">%</th>
            </tr>
          </thead>
          <tbody>
            ${professionalRowsHtml}
            <tr>
              <td class="right"><strong>Total produzido por colaboradores</strong></td>
              <td class="right"><strong>${formatCurrency(totalRevenue)}</strong></td>
              <td class="right"><strong>${totalRevenue > 0 ? '100%' : '0%'}</strong></td>
            </tr>
          </tbody>
        </table>

        <br />

        <h2>Vendas por produto</h2>
        <table>
          <thead>
            <tr>
              <th>Produto</th>
              <th class="right">Quantidade</th>
              <th class="right">Valor médio</th>
              <th class="right">Total</th>
              <th class="right">%</th>
            </tr>
          </thead>
          <tbody>
            ${productRowsHtml || '<tr><td colspan="5" style="text-align:center;color:#64748b;">Nenhum produto vendido no período.</td></tr>'}
            <tr>
              <td colspan="3" class="right"><strong>Total vendido em produtos</strong></td>
              <td class="right"><strong>${formatCurrency(totalProductsRevenue)}</strong></td>
              <td class="right"><strong>${totalProductsRevenue > 0 ? '100%' : '0%'}</strong></td>
            </tr>
          </tbody>
        </table>

        <div class="summary">
          <div class="summary-row">
            <span>Faturamento com serviços</span>
            <span>${formatCurrency(totalRevenue)}</span>
          </div>
          <div class="summary-row">
            <span>Vendas de produtos</span>
            <span>${formatCurrency(totalProductsRevenue)}</span>
          </div>
          <div class="summary-row">
            <span>Faturamento bruto total</span>
            <span>${formatCurrency(totalGrossRevenue)}</span>
          </div>
          <div class="summary-row">
            <span>Comissões</span>
            <span>${formatCurrency(totalCommissions)}</span>
          </div>
          <div class="summary-row">
            <span>Líquido estimado</span>
            <span>${formatCurrency(totalGrossRevenue - totalCommissions)}</span>
          </div>
        </div>
      `
    });
  };

  const handlePrintFinancialMovement = () => {
    const rowsHtml = financialMovementRows.map((row) => {
      return `
        <tr>
          <td>${formatDateBr(row.date)}</td>
          <td>${
            row.type === 'despesa'
              ? 'Saída'
              : row.type === 'cortesia'
                ? 'Cortesia'
                : 'Entrada'
          }</td>
          <td>${escapeHtml(row.description)}</td>
          <td>${escapeHtml(getPaymentLabel(row.paymentType))}</td>
          <td class="right positive">${
            row.entryValue > 0 ? formatCurrency(row.entryValue) : '-'
          }</td>
          <td class="right negative">${
            row.exitValue > 0 ? formatCurrency(row.exitValue) : '-'
          }</td>
        </tr>
      `;
    }).join('');

    const paymentTotalsHtml = financialMovementPaymentTotals.map((row) => {
      return `
        <div class="summary-row">
          <span>${escapeHtml(getPaymentLabel(row.paymentType))}</span>
          <span>${formatCurrency(row.total)}</span>
        </div>
      `;
    }).join('');

    buildPrintWindow({
      title: 'Movimentação Financeira',
      body: `
        ${buildEstablishmentPrintHeader({
          companyName,
          companyAddress,
          companyPhone,
          reportTitle: 'Movimentação Financeira',
          period
        })}

        <div class="summary">
          <div class="summary-row">
            <span>Total de entradas</span>
            <span>${formatCurrency(financialMovementIncomeTotal)}</span>
          </div>
          <div class="summary-row">
            <span>Total de saídas</span>
            <span>${formatCurrency(financialMovementExpenseTotal)}</span>
          </div>
          <div class="summary-row">
            <span>Saldo do período</span>
            <span>${formatCurrency(financialMovementBalance)}</span>
          </div>
        </div>

        <br />

        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Tipo</th>
              <th>Descrição</th>
              <th>Forma</th>
              <th class="right">Entrada</th>
              <th class="right">Saída</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="6" style="text-align:center;color:#64748b;">Nenhuma movimentação no período.</td></tr>'}
          </tbody>
        </table>

        <h2>Entradas por forma de pagamento</h2>
        <div class="summary">
          ${paymentTotalsHtml}
        </div>
      `
    });
  };

  const handlePrintCashBook = () => {
    const rowsHtml = cashBookRows.map((row) => {
      const formattedValue =
        row.type === 'despesa'
          ? `-${formatCurrency(Math.abs(row.value)).replace('R$', '').trim()}`
          : formatCurrency(row.value);

      return `
        <tr>
          <td>${formatDateBr(row.date)}</td>
          <td>${row.type === 'despesa' ? 'Despesa' : 'Recebimento'}</td>
          <td>${escapeHtml(row.description)}</td>
          <td class="right ${row.type === 'despesa' ? 'negative' : 'positive'}">${formattedValue}</td>
        </tr>
      `;
    }).join('');

    buildPrintWindow({
      title: 'Livro Caixa',
      body: `
        ${buildEstablishmentPrintHeader({
          companyName,
          companyAddress,
          companyPhone,
          reportTitle: 'Livro Caixa - Dinheiro',
          period
        })}

        <div class="summary">
          <div class="summary-row">
            <span>Saldo inicial</span>
            <span>${formatCurrency(initialCashBalance)}</span>
          </div>
          <div class="summary-row">
            <span>Entradas em dinheiro</span>
            <span>${formatCurrency(cashBookIncomeTotal)}</span>
          </div>
          <div class="summary-row">
            <span>Saídas em dinheiro</span>
            <span class="negative">-${formatCurrency(cashBookExpenseTotal).replace('R$', '').trim()}</span>
          </div>
          <div class="summary-row">
            <span>Saldo final</span>
            <span>${formatCurrency(cashBookFinalBalance)}</span>
          </div>
        </div>

        <br />

        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Tipo</th>
              <th>Descrição do Serviço</th>
              <th class="right">Valor</th>
            </tr>
          </thead>

          <tbody>
            ${rowsHtml || '<tr><td colspan="4" style="text-align:center;color:#64748b;">Nenhuma movimentação em dinheiro no período.</td></tr>'}
          </tbody>
        </table>
      `
    });
  };

  const renderFinanceOption = (params: {
    tab: FinanceInternalTab;
    title: string;
    description: string;
    icon: React.ReactNode;
  }) => {
    const { tab, title, description, icon } = params;

    return (
      <button
        type="button"
        onClick={() => setActiveFinanceTab(tab)}
        className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-[#0f4c5c]/40 hover:shadow-md"
      >
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#0f4c5c]/10 text-[#0f4c5c]">
            {icon}
          </span>

          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#0f4c5c]">
              Relatório
            </p>

            <h3 className="mt-1 text-base font-black text-neutral-950">
              {title}
            </h3>

            <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">
              {description}
            </p>
          </div>
        </div>
      </button>
    );
  };

  const renderTableHeader = (title: string) => (
    <div className="bg-[#0f4c5c] px-4 py-3 text-white">
      <h3 className="text-sm font-black uppercase tracking-tight">
        {title}
      </h3>
    </div>
  );

  return (
    <div id="view-financeiro" className="space-y-3 text-left animate-none">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="h-1.5 bg-[#0f4c5c]" />

        <div className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#0f4c5c]">
              AGENDASPEED
            </p>

            <h2 className="text-lg font-black tracking-tight text-neutral-950">
              Financeiro
            </h2>
          </div>

          {activeFinanceTab && (
            <button
              type="button"
              onClick={() => setActiveFinanceTab(null)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm transition hover:border-[#0f4c5c]/40 hover:bg-slate-50 sm:w-max flex items-center justify-center gap-2"
            >
              <ArrowLeft className="h-4 w-4 text-[#0f4c5c]" />
              Voltar para opções
            </button>
          )}
        </div>
      </div>

      {!activeFinanceTab && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          {renderFinanceOption({
            tab: 'faturamento',
            title: 'Faturamento',
            description: 'Analise serviços, formas de pagamento, produção por colaborador e resumo do período.',
            icon: <BarChart3 className="h-5 w-5" />
          })}

          {renderFinanceOption({
            tab: 'comissoes',
            title: 'Comissões',
            description: 'Consulte comissões por profissional e imprima fechamento individual ou geral.',
            icon: <Coins className="h-5 w-5" />
          })}

          {renderFinanceOption({
            tab: 'movimentacao',
            title: 'Movimentação Financeira',
            description: 'Entradas e saídas do período em dinheiro, PIX, débito, crédito e cortesia.',
            icon: <ArrowUpDown className="h-5 w-5" />
          })}

          {renderFinanceOption({
            tab: 'livroCaixa',
            title: 'Livro Caixa — Dinheiro',
            description: 'Controle exclusivo do caixa físico, somente com entradas e saídas em dinheiro.',
            icon: <WalletCards className="h-5 w-5" />
          })}

          {renderFinanceOption({
            tab: 'despesas',
            title: 'Despesas',
            description: 'Cadastre despesas fixas ou avulsas, controle vencimentos e registre pagamentos.',
            icon: <FileText className="h-5 w-5" />
          })}
        </div>
      )}

      {activeFinanceTab && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 p-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Data inicial
                </span>

                <input
                  type="date"
                  value={draftPeriod.startDate}
                  onChange={(event) => handleChangeStartDate(event.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold outline-none focus:border-[#0f4c5c] sm:w-44"
                />
              </label>

              <label className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Data final
                </span>

                <input
                  type="date"
                  value={draftPeriod.endDate}
                  onChange={(event) => handleChangeEndDate(event.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold outline-none focus:border-[#0f4c5c] sm:w-44"
                />
              </label>

              <button
                type="button"
                onClick={handleApplyPeriodFilter}
                disabled={isInvalidDraftPeriod || isDraftPeriodTooLong}
                className={`h-10 rounded-xl px-4 text-xs font-black transition flex items-center justify-center gap-2 ${
                  isInvalidDraftPeriod || isDraftPeriodTooLong
                    ? 'cursor-not-allowed bg-slate-200 text-slate-400'
                    : 'bg-[#0f4c5c] text-white hover:bg-[#123945]'
                }`}
              >
                <Filter className="h-4 w-4" />
                Filtrar
              </button>
            </div>

            {activeFinanceTab === 'faturamento' && (
              <button
                type="button"
                onClick={handlePrintRevenueReport}
                className="h-10 rounded-xl bg-[#0f4c5c] px-4 text-xs font-black text-white transition hover:bg-[#123945] flex items-center justify-center gap-2"
              >
                <Printer className="h-4 w-4" />
                Imprimir Faturamento
              </button>
            )}

            {activeFinanceTab === 'despesas' && (
        <PanelCard title="Despesas do Mês">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3.5">Despesa</th>
                  <th className="px-4 py-3.5 text-right">Valor previsto</th>
                  <th className="px-4 py-3.5 text-center">Vencimento</th>
                  <th className="px-4 py-3.5 text-center">Recorrência</th>
                  <th className="px-4 py-3.5 text-center">Status</th>
                  <th className="px-4 py-3.5">Observações</th>
                  <th className="px-4 py-3.5 text-right">Ações</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {expenseRows.map(({ template, payment, dueDate }) => {
                  const isPaid = payment?.status === 'paid';

                  return (
                    <tr key={template.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3.5 font-black text-slate-900">
                        {template.description}
                      </td>

                      <td className="px-4 py-3.5 text-right font-black text-[#0f4c5c]">
                        {formatCurrency(template.expectedAmount)}
                      </td>

                      <td className="px-4 py-3.5 text-center font-bold text-slate-700">
                        {dueDate
                          ? formatDateBr(dueDate)
                          : 'Sem vencimento'}
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase ${
                          template.isMonthly
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {template.isMonthly ? 'Mensal' : 'Avulsa'}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase ${
                          isPaid
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}>
                          {isPaid ? 'Paga' : 'Pendente'}
                        </span>
                      </td>

                      <td className="max-w-xs px-4 py-3.5 font-semibold text-slate-500">
                        {template.notes || '-'}
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEditExpenseTemplate(template)}
                            disabled={isPaid}
                            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                            title="Alterar"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setExpenseTemplateToDelete(template)}
                            disabled={isPaid}
                            className="rounded-xl border border-red-200 bg-white p-2 text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>

                          {isPaid ? (
                            <button
                              type="button"
                              disabled
                              className="flex items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[10px] font-black text-emerald-700"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              PAGA
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenExpensePayment(template)}
                              className="rounded-xl bg-[#0f4c5c] px-3 py-2 text-[10px] font-black text-white hover:bg-[#123945]"
                            >
                              PAGAR
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {expenseRows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      Nenhuma despesa cadastrada para este mês.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </PanelCard>
      )}

      {activeFinanceTab === 'comissoes' && (
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setShowCommissionHistory(true)}
                  className="rounded-xl bg-[#0f4c5c] px-4 py-2.5 text-xs font-black text-white transition hover:bg-[#123945] flex items-center justify-center gap-2"
                >
                  <History className="h-4 w-4" />
                  HISTÓRICO
                </button>

                <button
                  type="button"
                  onClick={handlePrintCommissionsA4}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 transition hover:border-[#0f4c5c]/40 hover:bg-slate-50"
                >
                  Imprimir A4
                </button>
              </div>
            )}

            {activeFinanceTab === 'movimentacao' && (
              <button
                type="button"
                onClick={handlePrintFinancialMovement}
                className="h-10 rounded-xl bg-[#0f4c5c] px-4 text-xs font-black text-white transition hover:bg-[#123945] flex items-center justify-center gap-2"
              >
                <Printer className="h-4 w-4" />
                Imprimir Movimentação
              </button>
            )}

            {activeFinanceTab === 'despesas' && (
              <button
                type="button"
                onClick={handleOpenNewExpenseTemplate}
                className="h-10 rounded-xl bg-[#0f4c5c] px-4 text-xs font-black text-white transition hover:bg-[#123945] flex items-center justify-center gap-2"
              >
                <Plus className="h-4 w-4" />
                INCLUIR DESPESA
              </button>
            )}

            {activeFinanceTab === 'livroCaixa' && (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <label className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Saldo inicial
                  </span>

                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatCurrencyInput(initialCashBalance)}
                    onChange={(event) => handleChangeInitialCashBalance(event.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-black outline-none focus:border-[#0f4c5c] sm:w-40"
                  />
                </label>

                <button
                  type="button"
                  onClick={handlePrintCashBook}
                  className="h-10 rounded-xl bg-[#0f4c5c] px-4 text-xs font-black text-white transition hover:bg-[#123945] flex items-center justify-center gap-2"
                >
                  <Printer className="h-4 w-4" />
                  Imprimir Caixa em Dinheiro
                </button>
              </div>
            )}
          </div>

          {isInvalidDraftPeriod && (
            <p className="px-4 pb-3 text-xs font-bold text-red-600">
              A data inicial não pode ser maior que a data final.
            </p>
          )}

          {!isInvalidDraftPeriod && isDraftPeriodTooLong && (
            <p className="px-4 pb-3 text-xs font-bold text-red-600">
              O período máximo permitido é de 31 dias corridos.
            </p>
          )}
        </div>
      )}

      {activeFinanceTab === 'faturamento' && (
        <div className="space-y-3">
          <PanelCard title="Faturamento por Tipo de Serviço">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Serviço</th>
                    <th className="px-4 py-3 text-center">Atendimento</th>
                    <th className="px-4 py-3 text-right">Valor individual</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3 text-right">%</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {serviceRevenueRows.map((row) => (
                    <tr key={row.serviceId} className="hover:bg-slate-50">
                      <td className="px-4 py-3.5 font-bold text-slate-900">
                        {row.serviceName}
                      </td>
                      <td className="px-4 py-3.5 text-center font-bold">
                        {row.quantity}
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-slate-700">
                        {formatCurrency(row.unitValue)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-black text-[#0f4c5c]">
                        {formatCurrency(row.total)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-black text-slate-700">
                        {row.percentage}%
                      </td>
                    </tr>
                  ))}

                  {serviceRevenueRows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        Nenhum atendimento finalizado neste período.
                      </td>
                    </tr>
                  )}

                  <tr className="bg-slate-50">
                    <td colSpan={3} className="px-4 py-3.5 text-right font-black uppercase">
                      Total de serviços
                    </td>
                    <td className="px-4 py-3.5 text-right font-black text-[#0f4c5c]">
                      {formatCurrency(totalRevenue)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-black text-slate-700">
                      100%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </PanelCard>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <PanelCard title="Recebimento por Forma de Pagamento">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Forma</th>
                      <th className="px-4 py-3 text-right">Valor</th>
                      <th className="px-4 py-3 text-right">%</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {paymentRevenueRows.map((row) => (
                      <tr key={row.paymentType}>
                        <td className="px-4 py-3.5 font-bold text-slate-900">
                          {getPaymentLabel(row.paymentType)}
                        </td>
                        <td className="px-4 py-3.5 text-right font-black text-[#0f4c5c]">
                          {formatCurrency(row.total)}
                        </td>
                        <td className="px-4 py-3.5 text-right font-black text-slate-700">
                          {row.percentage}%
                        </td>
                      </tr>
                    ))}

                    <tr className="bg-slate-50">
                      <td className="px-4 py-3.5 text-right font-black uppercase">
                        Total por formas
                      </td>
                      <td className="px-4 py-3.5 text-right font-black text-[#0f4c5c]">
                        {formatCurrency(totalRevenue)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-black text-slate-700">
                        100%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </PanelCard>

            <PanelCard title="Produzido por Colaborador">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Colaborador</th>
                      <th className="px-4 py-3 text-right">Valor</th>
                      <th className="px-4 py-3 text-right">%</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {professionalRevenueRows.map((row) => (
                      <tr key={row.professional.id}>
                        <td className="px-4 py-3.5 font-bold text-slate-900">
                          {row.professional.name}
                        </td>
                        <td className="px-4 py-3.5 text-right font-black text-[#0f4c5c]">
                          {formatCurrency(row.total)}
                        </td>
                        <td className="px-4 py-3.5 text-right font-black text-slate-700">
                          {row.percentage}%
                        </td>
                      </tr>
                    ))}

                    <tr className="bg-slate-50">
                      <td className="px-4 py-3.5 text-right font-black uppercase">
                        Total produzido
                      </td>
                      <td className="px-4 py-3.5 text-right font-black text-[#0f4c5c]">
                        {formatCurrency(totalRevenue)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-black text-slate-700">
                        100%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </PanelCard>
          </div>

          <PanelCard title="Vendas por Produto">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Produto</th>
                    <th className="px-4 py-3 text-center">Quantidade</th>
                    <th className="px-4 py-3 text-right">Valor médio</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3 text-right">%</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {productRevenueRows.map((row) => (
                    <tr key={row.productId} className="hover:bg-slate-50">
                      <td className="px-4 py-3.5 font-bold text-slate-900">
                        {row.description}
                      </td>
                      <td className="px-4 py-3.5 text-center font-bold">
                        {row.quantity}
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-slate-700">
                        {formatCurrency(row.unitValue)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-black text-[#0f4c5c]">
                        {formatCurrency(row.total)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-black text-slate-700">
                        {row.percentage}%
                      </td>
                    </tr>
                  ))}

                  {productRevenueRows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        Nenhum produto vendido neste período.
                      </td>
                    </tr>
                  )}

                  <tr className="bg-slate-50">
                    <td colSpan={3} className="px-4 py-3.5 text-right font-black uppercase">
                      Total vendido em produtos
                    </td>
                    <td className="px-4 py-3.5 text-right font-black text-[#0f4c5c]">
                      {formatCurrency(totalProductsRevenue)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-black text-slate-700">
                      {totalProductsRevenue > 0 ? '100%' : '0%'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </PanelCard>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0f4c5c]">
              Resumo do período
            </p>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <span className="text-[10px] font-black uppercase text-slate-400">
                  Serviços
                </span>
                <p className="text-lg font-black text-[#0f4c5c]">
                  {formatCurrency(totalRevenue)}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <span className="text-[10px] font-black uppercase text-slate-400">
                  Produtos
                </span>
                <p className="text-lg font-black text-[#0f4c5c]">
                  {formatCurrency(totalProductsRevenue)}
                </p>
              </div>

              <div className="rounded-2xl border border-[#0f4c5c]/30 bg-[#0f4c5c]/5 p-3">
                <span className="text-[10px] font-black uppercase text-[#0f4c5c]">
                  Faturamento bruto total
                </span>
                <p className="text-lg font-black text-[#0f4c5c]">
                  {formatCurrency(totalGrossRevenue)}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <span className="text-[10px] font-black uppercase text-slate-400">
                  Comissões
                </span>
                <p className="text-lg font-black text-slate-700">
                  {formatCurrency(totalCommissions)}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <span className="text-[10px] font-black uppercase text-slate-400">
                  Líquido estimado
                </span>
                <p className="text-lg font-black text-[#0f4c5c]">
                  {formatCurrency(totalGrossRevenue - totalCommissions)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeFinanceTab === 'movimentacao' && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                Total de entradas
              </p>
              <p className="mt-1 text-xl font-black text-[#0f4c5c]">
                {formatCurrency(financialMovementIncomeTotal)}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                Total de saídas
              </p>
              <p className="mt-1 text-xl font-black text-red-600">
                -{formatCurrency(financialMovementExpenseTotal).replace('R$', '').trim()}
              </p>
            </div>

            <div className="rounded-2xl border border-[#0f4c5c]/30 bg-[#0f4c5c]/5 p-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#0f4c5c]">
                Saldo do período
              </p>
              <p className={`mt-1 text-xl font-black ${
                financialMovementBalance < 0
                  ? 'text-red-600'
                  : 'text-[#0f4c5c]'
              }`}>
                {formatCurrency(financialMovementBalance)}
              </p>
            </div>
          </div>

          <PanelCard title="Movimentação Financeira">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Data</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Descrição</th>
                    <th className="px-4 py-3">Forma</th>
                    <th className="px-4 py-3 text-right">Entrada</th>
                    <th className="px-4 py-3 text-right">Saída</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {financialMovementRows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-bold text-slate-900">
                        {formatDateBr(row.date)}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-700">
                        {row.type === 'despesa'
                          ? 'Saída'
                          : row.type === 'cortesia'
                            ? 'Cortesia'
                            : 'Entrada'}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-600">
                        {row.description}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-700">
                        {getPaymentLabel(row.paymentType)}
                      </td>
                      <td className="px-4 py-3 text-right font-black text-[#0f4c5c]">
                        {row.entryValue > 0
                          ? formatCurrency(row.entryValue)
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-right font-black text-red-600">
                        {row.exitValue > 0
                          ? formatCurrency(row.exitValue)
                          : '-'}
                      </td>
                    </tr>
                  ))}

                  {financialMovementRows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        Nenhuma movimentação financeira neste período.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </PanelCard>

          <PanelCard title="Entradas por Forma de Pagamento">
            <div className="grid grid-cols-1 gap-0 sm:grid-cols-2 lg:grid-cols-5">
              {financialMovementPaymentTotals.map((row) => (
                <div
                  key={row.paymentType}
                  className="border-b border-slate-100 p-4 sm:border-r"
                >
                  <p className="text-[10px] font-black uppercase text-slate-400">
                    {getPaymentLabel(row.paymentType)}
                  </p>
                  <p className="mt-1 text-lg font-black text-[#0f4c5c]">
                    {formatCurrency(row.total)}
                  </p>
                </div>
              ))}
            </div>
          </PanelCard>
        </div>
      )}

      {activeFinanceTab === 'livroCaixa' && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                Saldo inicial
              </p>
              <p className="mt-1 text-xl font-black text-[#0f4c5c]">
                {formatCurrency(initialCashBalance)}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                Entradas dinheiro
              </p>
              <p className="mt-1 text-xl font-black text-[#0f4c5c]">
                {formatCurrency(cashBookIncomeTotal)}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                Saídas dinheiro
              </p>
              <p className="mt-1 text-xl font-black text-red-600">
                -{formatCurrency(cashBookExpenseTotal).replace('R$', '').trim()}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                Saldo final
              </p>
              <p className="mt-1 text-xl font-black text-[#0f4c5c]">
                {formatCurrency(cashBookFinalBalance)}
              </p>
            </div>
          </div>

          <PanelCard title="Livro Caixa — Dinheiro">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Data</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Descrição do Serviço</th>
                    <th className="px-4 py-3 text-right">Valor</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {cashBookRows.map((row, index) => (
                    <tr key={`${row.date}-${row.type}-${index}`}>
                      <td className="px-4 py-3 font-bold text-slate-900">
                        {formatDateBr(row.date)}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-700">
                        {row.type === 'despesa' ? 'Despesa' : 'Recebimento'}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-600">
                        {row.description}
                      </td>
                      <td className={`px-4 py-3 text-right font-black ${
                        row.type === 'despesa' ? 'text-red-600' : 'text-[#0f4c5c]'
                      }`}>
                        {row.type === 'despesa'
                          ? `-${formatCurrency(Math.abs(row.value)).replace('R$', '').trim()}`
                          : formatCurrency(row.value)}
                      </td>
                    </tr>
                  ))}

                  {cashBookRows.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400">
                        Nenhuma movimentação em dinheiro neste período.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </PanelCard>
        </div>
      )}

      {activeFinanceTab === 'comissoes' && (
        <PanelCard title="Comissões da Equipe">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3.5">Colaborador</th>
                  <th className="px-4 py-3.5">Remuneração</th>
                  <th className="px-4 py-3.5 text-center">Atendimento</th>
                  <th className="px-4 py-3.5 text-right">Faturamento</th>
                  <th className="px-4 py-3.5 text-right">Comissão Devida</th>
                  <th className="px-4 py-3.5 text-right">Fechamento</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {commissionRows.map((row) => {
                  const paidCommission =
                    commissionPaymentByProfessionalId.get(row.professional.id);

                  return (
                  <tr
                    id={`row-fin-comm-${row.professional.id}`}
                    key={row.professional.id}
                    className="transition hover:bg-slate-50"
                  >
                    <td className="flex items-center gap-2.5 px-4 py-4">
                      {row.professional.avatar ? (
                        <img
                          src={row.professional.avatar}
                          alt="foto avatar"
                          className="h-8 w-8 shrink-0 rounded-full border object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-slate-100 text-xs font-black text-slate-500">
                          {row.professional.name.slice(0, 2).toUpperCase()}
                        </span>
                      )}

                      <span className="font-extrabold text-slate-900">
                        {row.professional.name}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <span className="block w-max rounded-md bg-slate-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-600">
                        {getRemunerationLabel(row.professional)}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-center font-bold">
                      {row.completedCount}
                    </td>

                    <td className="px-4 py-4 text-right font-bold text-slate-950">
                      {formatCurrency(row.totalProduced)}
                    </td>

                    <td className="px-4 py-4 text-right font-bold text-[#0f4c5c]">
                      {formatCurrency(row.commissionValue)}
                    </td>

                    <td className="px-4 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handlePrintProfessionalCommission(row)}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black text-slate-700 transition hover:border-[#0f4c5c]/40 hover:bg-slate-50"
                        >
                          Imprimir
                        </button>

                        {paidCommission ? (
                          <button
                            type="button"
                            onClick={() => handleOpenPaidCommission(paidCommission)}
                            className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[10px] font-black text-emerald-700 transition hover:bg-emerald-100"
                          >
                            Comissão paga
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenCommissionPayment(row)}
                            disabled={row.commissionValue <= 0}
                            className="rounded-xl bg-[#0f4c5c] px-3 py-2 text-[10px] font-black text-white transition hover:bg-[#123945] disabled:cursor-not-allowed disabled:bg-slate-300"
                          >
                            Pagar comissão
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  );
                })}

                {professionals.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      Nenhum profissional cadastrado para cálculo de comissões.
                    </td>
                  </tr>
                )}

                <tr className="bg-slate-50">
                  <td colSpan={3} className="px-4 py-3.5 text-right font-black uppercase">
                    Total
                  </td>
                  <td className="px-4 py-3.5 text-right font-black text-[#0f4c5c]">
                    {formatCurrency(totalRevenue)}
                  </td>
                  <td className="px-4 py-3.5 text-right font-black text-[#0f4c5c]">
                    {formatCurrency(totalCommissions)}
                  </td>
                  <td className="px-4 py-3.5" />
                </tr>
              </tbody>
            </table>
          </div>
        </PanelCard>
      )}

      {showExpenseTemplateModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="h-1.5 bg-[#0f4c5c]" />

            <div className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0f4c5c]">
                    Despesas
                  </p>
                  <h2 className="mt-1 text-xl font-black text-slate-950">
                    {editingExpenseTemplate
                      ? 'Alterar despesa'
                      : 'Incluir despesa'}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={resetExpenseTemplateForm}
                  disabled={isSavingExpenseTemplate}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Fechar
                </button>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="space-y-1 sm:col-span-2">
                  <span className="text-[10px] font-black uppercase text-slate-500">
                    Descrição
                  </span>
                  <input
                    type="text"
                    value={expenseDescription}
                    onChange={(event) =>
                      setExpenseDescription(event.target.value.toUpperCase())
                    }
                    placeholder="Ex.: ENERGIA"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold outline-none focus:border-[#0f4c5c]"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-500">
                    Valor previsto
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatCurrencyInput(expenseExpectedAmount)}
                    onChange={(event) =>
                      setExpenseExpectedAmount(
                        parseCurrencyInput(event.target.value)
                      )
                    }
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold outline-none focus:border-[#0f4c5c]"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-500">
                    Dia do vencimento
                  </span>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={expenseDueDay}
                    onChange={(event) => setExpenseDueDay(event.target.value)}
                    placeholder="Ex.: 10"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold outline-none focus:border-[#0f4c5c]"
                  />
                </label>
              </div>

              <label className="mt-3 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <input
                  type="checkbox"
                  checked={expenseIsMonthly}
                  onChange={(event) =>
                    setExpenseIsMonthly(event.target.checked)
                  }
                  className="h-4 w-4 accent-[#0f4c5c]"
                />
                <div>
                  <p className="text-sm font-black text-slate-900">
                    Repetir mensalmente
                  </p>
                  <p className="text-[11px] font-semibold text-slate-500">
                    A despesa será preparada automaticamente nos próximos meses.
                  </p>
                </div>
              </label>

              <label className="mt-3 block space-y-1">
                <span className="text-[10px] font-black uppercase text-slate-500">
                  Observações
                </span>
                <textarea
                  value={expenseTemplateNotes}
                  onChange={(event) =>
                    setExpenseTemplateNotes(event.target.value)
                  }
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold outline-none focus:border-[#0f4c5c]"
                />
              </label>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={resetExpenseTemplateForm}
                  disabled={isSavingExpenseTemplate}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={handleSaveExpenseTemplate}
                  disabled={isSavingExpenseTemplate}
                  className="rounded-xl bg-[#0f4c5c] px-5 py-2.5 text-sm font-black text-white hover:bg-[#123945] disabled:opacity-60"
                >
                  {isSavingExpenseTemplate ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {expenseToPay && (
        <div className="fixed inset-0 z-[125] flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="h-1.5 bg-[#0f4c5c]" />

            <div className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0f4c5c]">
                    Pagamento de despesa
                  </p>
                  <h2 className="mt-1 text-xl font-black text-slate-950">
                    {expenseToPay.description}
                  </h2>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    Competência {formatDateBr(competenceMonth)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={resetExpensePaymentForm}
                  disabled={isPayingExpense}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Fechar
                </button>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-500">
                    Data do pagamento
                  </span>
                  <input
                    type="date"
                    value={expensePaidAt}
                    onChange={(event) => setExpensePaidAt(event.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold outline-none focus:border-[#0f4c5c]"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-500">
                    Forma de pagamento
                  </span>
                  <select
                    value={expensePaymentType}
                    onChange={(event) =>
                      setExpensePaymentType(event.target.value as PaymentType)
                    }
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold outline-none focus:border-[#0f4c5c]"
                  >
                    <option value="dinheiro">Dinheiro</option>
                    <option value="pix">PIX</option>
                    <option value="debito">Débito</option>
                    <option value="credito">Crédito</option>
                  </select>
                </label>

                <label className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-500">
                    Valor previsto
                  </span>
                  <input
                    type="text"
                    value={formatCurrencyInput(expenseToPay.expectedAmount)}
                    disabled
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-100 px-3 text-sm font-bold text-slate-500"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-500">
                    Juros
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatCurrencyInput(expenseInterestValue)}
                    onChange={(event) =>
                      setExpenseInterestValue(
                        parseCurrencyInput(event.target.value)
                      )
                    }
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold outline-none focus:border-[#0f4c5c]"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-500">
                    Multa
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatCurrencyInput(expenseFineValue)}
                    onChange={(event) =>
                      setExpenseFineValue(
                        parseCurrencyInput(event.target.value)
                      )
                    }
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold outline-none focus:border-[#0f4c5c]"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-500">
                    Desconto
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatCurrencyInput(expenseDiscountValue)}
                    onChange={(event) =>
                      setExpenseDiscountValue(
                        parseCurrencyInput(event.target.value)
                      )
                    }
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold outline-none focus:border-[#0f4c5c]"
                  />
                </label>
              </div>

              <label className="mt-3 block space-y-1">
                <span className="text-[10px] font-black uppercase text-slate-500">
                  Observações
                </span>
                <textarea
                  value={expensePaymentNotes}
                  onChange={(event) =>
                    setExpensePaymentNotes(event.target.value)
                  }
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold outline-none focus:border-[#0f4c5c]"
                />
              </label>

              <div className="mt-4 rounded-2xl border border-[#0f4c5c]/25 bg-[#0f4c5c]/5 p-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs font-black uppercase text-[#0f4c5c]">
                    Total a pagar
                  </span>
                  <strong className="text-xl font-black text-[#0f4c5c]">
                    {formatCurrency(expensePaymentTotal)}
                  </strong>
                </div>
                <p className="mt-1 text-[11px] font-semibold text-slate-500">
                  Valor previsto + juros + multa - desconto.
                </p>
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={resetExpensePaymentForm}
                  disabled={isPayingExpense}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={handleConfirmExpensePayment}
                  disabled={isPayingExpense}
                  className="rounded-xl bg-[#0f4c5c] px-5 py-2.5 text-sm font-black text-white hover:bg-[#123945] disabled:opacity-60"
                >
                  {isPayingExpense ? 'Salvando...' : 'Confirmar pagamento'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {expenseTemplateToDelete && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="h-1.5 bg-red-500" />

            <div className="p-5">
              <h2 className="text-lg font-black text-slate-950">
                Excluir despesa?
              </h2>
              <p className="mt-2 text-sm font-semibold text-slate-600">
                O cadastro “{expenseTemplateToDelete.description}” será removido.
              </p>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setExpenseTemplateToDelete(null)}
                  disabled={isDeletingExpenseTemplate}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={handleConfirmDeleteExpenseTemplate}
                  disabled={isDeletingExpenseTemplate}
                  className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-black text-white hover:bg-red-700 disabled:opacity-60"
                >
                  {isDeletingExpenseTemplate ? 'Excluindo...' : 'Excluir'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {expenseFeedback && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="h-1.5 bg-[#E0A96D]" />
            <div className="p-5">
              <h2 className="text-lg font-black text-slate-950">
                {expenseFeedback.title}
              </h2>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">
                {expenseFeedback.message}
              </p>
              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => setExpenseFeedback(null)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCommissionHistory && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="h-1.5 bg-[#0f4c5c]" />

            <div className="flex items-center justify-between gap-4 border-b border-slate-200 p-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0f4c5c]">
                  Comissões
                </p>
                <h2 className="text-xl font-black text-slate-950">
                  Histórico de pagamentos
                </h2>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handlePrintCommissionHistory}
                  className="rounded-xl bg-[#0f4c5c] px-4 py-2.5 text-xs font-black text-white hover:bg-[#123945]"
                >
                  HISTÓRICO
                </button>

                <button
                  type="button"
                  onClick={() => setShowCommissionHistory(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 hover:bg-slate-50"
                >
                  Fechar
                </button>
              </div>
            </div>

            <div className="max-h-[70vh] overflow-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 border-b bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Pagamento</th>
                    <th className="px-4 py-3">Profissional</th>
                    <th className="px-4 py-3">Período</th>
                    <th className="px-4 py-3 text-right">Comissão</th>
                    <th className="px-4 py-3 text-right">Extra</th>
                    <th className="px-4 py-3 text-right">Desconto</th>
                    <th className="px-4 py-3 text-right">Total pago</th>
                    <th className="px-4 py-3">Forma</th>
                    <th className="px-4 py-3 text-right">Ação</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredCommissionPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-bold">
                        {formatDateBr(payment.paidAt)}
                      </td>
                      <td className="px-4 py-3 font-black text-slate-900">
                        {payment.professionalName}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-600">
                        {formatDateBr(payment.periodStart)} a {formatDateBr(payment.periodEnd)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold">
                        {formatCurrency(payment.calculatedCommission)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold">
                        {formatCurrency(payment.extraValue)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold">
                        {formatCurrency(payment.discountValue)}
                      </td>
                      <td className="px-4 py-3 text-right font-black text-[#0f4c5c]">
                        {formatCurrency(payment.amountPaid)}
                      </td>
                      <td className="px-4 py-3 font-bold">
                        {getPaymentLabel(payment.paymentType)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handlePrintCommissionPaymentIndividual(payment)}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black text-slate-700 hover:bg-slate-50"
                        >
                          INDIVIDUAL
                        </button>
                      </td>
                    </tr>
                  ))}

                  {filteredCommissionPayments.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        Nenhuma comissão paga no período selecionado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {editingPaidCommission && (
        <div className="fixed inset-0 z-[125] flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="h-1.5 bg-emerald-600" />

            <div className="p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">
                Comissão paga
              </p>

              <h2 className="mt-1 text-xl font-black text-slate-950">
                {editingPaidCommission.professionalName}
              </h2>

              <p className="mt-2 text-sm font-semibold text-slate-600">
                Período fechado: {formatDateBr(editingPaidCommission.periodStart)} a {formatDateBr(editingPaidCommission.periodEnd)}
              </p>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[10px] font-black uppercase text-slate-400">
                  Valor pago
                </p>
                <p className="mt-1 text-xl font-black text-[#0f4c5c]">
                  {formatCurrency(editingPaidCommission.amountPaid)}
                </p>
              </div>

              <label className="mt-4 block space-y-1">
                <span className="text-[10px] font-black uppercase text-slate-500">
                  Data do pagamento
                </span>
                <input
                  type="date"
                  value={editedCommissionPaidAt}
                  onChange={(event) => setEditedCommissionPaidAt(event.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold outline-none focus:border-[#0f4c5c]"
                />
              </label>

              <p className="mt-2 text-[11px] font-semibold text-slate-500">
                Somente a data do pagamento pode ser alterada. O período e os valores permanecem congelados.
              </p>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingPaidCommission(null);
                    setEditedCommissionPaidAt('');
                  }}
                  disabled={isUpdatingCommissionPaidAt}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={handleConfirmCommissionPaidAtUpdate}
                  disabled={isUpdatingCommissionPaidAt}
                  className="rounded-xl bg-[#0f4c5c] px-4 py-2.5 text-sm font-black text-white hover:bg-[#123945] disabled:opacity-60"
                >
                  {isUpdatingCommissionPaidAt ? 'Salvando...' : 'Salvar nova data'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedCommissionRow && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="h-1.5 bg-[#0f4c5c]" />

            <div className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0f4c5c]">
                    Pagamento de comissão
                  </p>
                  <h2 className="mt-1 text-xl font-black text-slate-950">
                    {selectedCommissionRow.professional.name}
                  </h2>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    Período de {formatDateBr(period.startDate)} a {formatDateBr(period.endDate)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={resetCommissionPaymentForm}
                  disabled={isSavingCommissionPayment}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Fechar
                </button>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <span className="text-[9px] font-black uppercase text-slate-400">
                    Produção
                  </span>
                  <p className="mt-1 text-base font-black text-slate-900">
                    {formatCurrency(selectedCommissionRow.totalProduced)}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <span className="text-[9px] font-black uppercase text-slate-400">
                    Atendimentos
                  </span>
                  <p className="mt-1 text-base font-black text-slate-900">
                    {selectedCommissionRow.completedCount}
                  </p>
                </div>

                <div className="rounded-2xl border border-[#0f4c5c]/30 bg-[#0f4c5c]/5 p-3">
                  <span className="text-[9px] font-black uppercase text-[#0f4c5c]">
                    Comissão calculada
                  </span>
                  <p className="mt-1 text-base font-black text-[#0f4c5c]">
                    {formatCurrency(selectedCommissionRow.commissionValue)}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-500">
                    Data do pagamento
                  </span>
                  <input
                    type="date"
                    value={commissionPaidAt}
                    onChange={(event) => setCommissionPaidAt(event.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold outline-none focus:border-[#0f4c5c]"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-500">
                    Forma de pagamento
                  </span>
                  <select
                    value={commissionPaymentType}
                    onChange={(event) =>
                      setCommissionPaymentType(event.target.value as PaymentType)
                    }
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold outline-none focus:border-[#0f4c5c]"
                  >
                    <option value="dinheiro">Dinheiro</option>
                    <option value="pix">PIX</option>
                    <option value="debito">Débito</option>
                    <option value="credito">Crédito</option>
                  </select>
                </label>

                <label className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-500">
                    Extra
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatCurrencyInput(commissionExtraValue)}
                    onChange={(event) =>
                      setCommissionExtraValue(
                        parseCurrencyInput(event.target.value)
                      )
                    }
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold outline-none focus:border-[#0f4c5c]"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-500">
                    Desconto
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatCurrencyInput(commissionDiscountValue)}
                    onChange={(event) =>
                      setCommissionDiscountValue(
                        parseCurrencyInput(event.target.value)
                      )
                    }
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold outline-none focus:border-[#0f4c5c]"
                  />
                </label>
              </div>

              <label className="mt-3 block space-y-1">
                <span className="text-[10px] font-black uppercase text-slate-500">
                  Observações
                </span>
                <textarea
                  value={commissionNotes}
                  onChange={(event) => setCommissionNotes(event.target.value)}
                  rows={3}
                  placeholder="Ex.: bônus, ajuste de faltas ou adiantamento."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold outline-none focus:border-[#0f4c5c]"
                />
              </label>

              <div className="mt-4 rounded-2xl border border-[#0f4c5c]/25 bg-[#0f4c5c]/5 p-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs font-black uppercase text-[#0f4c5c]">
                    Total a pagar
                  </span>
                  <strong className="text-xl font-black text-[#0f4c5c]">
                    {formatCurrency(commissionAmountToPay)}
                  </strong>
                </div>

                <p className="mt-1 text-[11px] font-semibold text-slate-500">
                  Comissão + extra - desconto.
                </p>
              </div>

              <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={resetCommissionPaymentForm}
                  disabled={isSavingCommissionPayment}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={handleConfirmCommissionPayment}
                  disabled={isSavingCommissionPayment}
                  className="rounded-xl bg-[#0f4c5c] px-5 py-2.5 text-sm font-black text-white hover:bg-[#123945] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingCommissionPayment
                    ? 'Salvando pagamento...'
                    : 'Confirmar pagamento'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {commissionFeedback && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="h-1.5 bg-[#E0A96D]" />

            <div className="p-5">
              <h2 className="text-lg font-black text-slate-950">
                {commissionFeedback.title}
              </h2>

              <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">
                {commissionFeedback.message}
              </p>

              <div className="mt-5 flex justify-end gap-2">
                {pendingCommissionPrintHtml && (
                  <button
                    type="button"
                    onClick={handlePrintSavedCommissionPayment}
                    className="rounded-xl bg-[#0f4c5c] px-4 py-2.5 text-sm font-black text-white hover:bg-[#123945]"
                  >
                    Imprimir comprovante
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setCommissionFeedback(null);
                    setPendingCommissionPrintHtml('');
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
