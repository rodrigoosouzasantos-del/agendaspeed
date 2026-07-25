import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";

import { Appointment, AppointmentStatus, CashExpense, Client, PaymentType, Product, Professional, Receipt, Service } from "../../../types";
import { OwnerDashboardProps } from "../owner.types";
import { calculateOwnerFinancialSummary, updateClientsAfterAppointmentStatusChange } from "../owner.utils";
import { supabase } from "../../../lib/supabase";
import { PendingReceiptPaymentPayload, ReceiptPayload } from "../components/ReceiptsView";
import type { FinancePeriod } from "../finance/useFinanceViewModel";
import {
  SUPABASE_RECEIPTS_SELECT, SUPABASE_RECEIPT_ITEMS_SELECT, SUPABASE_RECEIPT_PAYMENTS_SELECT, SUPABASE_CASH_EXPENSES_SELECT,
  SupabaseReceiptResponse, SupabaseReceiptItemResponse, SupabaseReceiptPaymentResponse, SupabaseCashExpenseResponse,
  toNullableUuid, mapSupabaseReceiptToAppReceipt, mapSupabaseCashExpenseToAppCashExpense,
  buildReceiptInsertPayload, buildReceiptItemInsertPayload, calculateReceiptTotals, buildReceiptItems,
  SupabaseAppointmentResponse, mapSupabaseAppointmentToAppAppointment,
} from "../owner.data";

type ShowOwnerFeedback = (message: string, title?: string) => void;
interface UseOwnerFinancialParams {
  tenantId: string; state: OwnerDashboardProps["state"]; onUpdateState: OwnerDashboardProps["onUpdateState"];
  appointments: Appointment[]; clients: Client[]; services: Service[]; products: Product[]; professionals: Professional[];
  setLiveAppointments: Dispatch<SetStateAction<Appointment[]>>;
  loadClientsFromSupabase: (showLoading?: boolean) => Promise<Client[]>; showOwnerFeedback: ShowOwnerFeedback;
  financePeriod?: FinancePeriod;
}

const FINANCIAL_QUERY_BATCH_SIZE = 200;
const MAX_FINANCIAL_PERIOD_DAYS = 31;

function addDaysToDateKey(dateKey: string, amount: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + amount));
  return date.toISOString().slice(0, 10);
}

function getInclusivePeriodDays(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T12:00:00Z`).getTime();
  const end = new Date(`${endDate}T12:00:00Z`).getTime();
  return Math.floor((end - start) / 86_400_000) + 1;
}

function normalizeFinancePeriod(
  financePeriod: FinancePeriod | undefined,
  today: string,
): FinancePeriod {
  const currentMonthStart = `${today.slice(0, 7)}-01`;
  const requestedStart = financePeriod?.startDate || currentMonthStart;
  const requestedEnd = financePeriod?.endDate || today;
  const isValidDateKey = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

  if (
    !isValidDateKey(requestedStart) ||
    !isValidDateKey(requestedEnd) ||
    requestedStart > requestedEnd ||
    getInclusivePeriodDays(requestedStart, requestedEnd) >
      MAX_FINANCIAL_PERIOD_DAYS
  ) {
    return {
      startDate: currentMonthStart,
      endDate: today,
    };
  }

  return {
    startDate: requestedStart,
    endDate: requestedEnd,
  };
}

function toSaoPauloStartTimestamp(dateKey: string): string {
  return `${dateKey}T00:00:00-03:00`;
}

export function useOwnerFinancial(params: UseOwnerFinancialParams) {
  const { tenantId, state, onUpdateState, appointments, clients, services, products, professionals, setLiveAppointments, loadClientsFromSupabase, showOwnerFeedback, financePeriod } = params;
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [cashExpenses, setCashExpenses] = useState<CashExpense[]>([]);
  const [financialAppointments, setFinancialAppointments] = useState<
    Appointment[]
  >([]);
  const [isLoadingFinancialRecords, setIsLoadingFinancialRecords] = useState(true);
  const [financialRecordsLoadError, setFinancialRecordsLoadError] = useState("");
  const financialLoadRequestIdRef = useRef(0);
  const latestFinancialRecordsRef = useRef<{
    receipts: Receipt[];
    cashExpenses: CashExpense[];
    completedAppointments: Appointment[];
  }>({
    receipts: [],
    cashExpenses: [],
    completedAppointments: [],
  });
  const pendingReceiptPaymentsRef = useRef<Set<string>>(new Set());

  const loadFinancialRecordsFromSupabase = async (
    showLoading = true,
  ): Promise<{
    receipts: Receipt[];
    cashExpenses: CashExpense[];
    completedAppointments: Appointment[];
  }> => {
    const requestId = ++financialLoadRequestIdRef.current;

    if (!tenantId) {
      if (requestId === financialLoadRequestIdRef.current) {
        latestFinancialRecordsRef.current = {
          receipts: [],
          cashExpenses: [],
          completedAppointments: [],
        };
        setReceipts([]);
        setCashExpenses([]);
        setFinancialAppointments([]);
        setFinancialRecordsLoadError("");
        setIsLoadingFinancialRecords(false);
      }

      return {
        receipts: [],
        cashExpenses: [],
        completedAppointments: [],
      };
    }

    if (showLoading) {
      setIsLoadingFinancialRecords(true);
    }

    if (requestId === financialLoadRequestIdRef.current) {
      setFinancialRecordsLoadError("");
    }

    const today = new Date().toLocaleDateString("en-CA", {
      timeZone: "America/Sao_Paulo",
    });
    const currentMonthStart = `${today.slice(0, 7)}-01`;
    const selectedPeriod = normalizeFinancePeriod(financePeriod, today);
    const selectedPeriodEndExclusive = addDaysToDateKey(
      selectedPeriod.endDate,
      1,
    );
    const currentMonthEndExclusive = addDaysToDateKey(
      `${today.slice(0, 7)}-01`,
      32,
    ).slice(0, 7) + "-01";
    const receiptPeriodFilter = [
      `status.eq.pending`,
      `and(paid_at.gte.${toSaoPauloStartTimestamp(currentMonthStart)},paid_at.lt.${toSaoPauloStartTimestamp(currentMonthEndExclusive)})`,
      `and(paid_at.gte.${toSaoPauloStartTimestamp(selectedPeriod.startDate)},paid_at.lt.${toSaoPauloStartTimestamp(selectedPeriodEndExclusive)})`,
    ].join(",");

    const [receiptsResult, appointmentsResult] = await Promise.all([
      supabase
        .from("receipts")
        .select(SUPABASE_RECEIPTS_SELECT)
        .eq("tenant_id", tenantId)
        .or(receiptPeriodFilter)
        .order("paid_at", { ascending: false }),
      supabase.rpc("get_my_appointments_v2", {
        p_start_date: selectedPeriod.startDate,
        p_end_date: selectedPeriod.endDate,
      }),
    ]);

    if (receiptsResult.error || appointmentsResult.error) {
      const loadError = receiptsResult.error || appointmentsResult.error;
      console.error(
        "Erro ao carregar dados financeiros:",
        loadError?.message,
      );
      if (requestId === financialLoadRequestIdRef.current) {
        setFinancialRecordsLoadError(
          loadError?.message || "Erro ao carregar dados financeiros.",
        );
        setIsLoadingFinancialRecords(false);
      }
      return latestFinancialRecordsRef.current;
    }

    const completedAppointments = (
      (Array.isArray(appointmentsResult.data)
        ? appointmentsResult.data
        : []) as SupabaseAppointmentResponse[]
    )
      .map(mapSupabaseAppointmentToAppAppointment)
      .filter((appointment) => appointment.status === "completed");

    const receiptRows = (Array.isArray(receiptsResult.data)
      ? receiptsResult.data
      : []) as SupabaseReceiptResponse[];
    const receiptIds = receiptRows.map((receipt) => receipt.id).filter(Boolean);

    let receiptItemRows: SupabaseReceiptItemResponse[] = [];
    let receiptPaymentRows: SupabaseReceiptPaymentResponse[] = [];

    for (
      let batchStart = 0;
      batchStart < receiptIds.length;
      batchStart += FINANCIAL_QUERY_BATCH_SIZE
    ) {
      const receiptIdBatch = receiptIds.slice(
        batchStart,
        batchStart + FINANCIAL_QUERY_BATCH_SIZE,
      );
      const [receiptItemsResult, receiptPaymentsResult] = await Promise.all([
        supabase
          .from("receipt_items")
          .select(SUPABASE_RECEIPT_ITEMS_SELECT)
          .eq("tenant_id", tenantId)
          .in("receipt_id", receiptIdBatch),
        supabase
          .from("receipt_payments")
          .select(SUPABASE_RECEIPT_PAYMENTS_SELECT)
          .eq("tenant_id", tenantId)
          .in("receipt_id", receiptIdBatch),
      ]);

      if (receiptItemsResult.error || receiptPaymentsResult.error) {
        const loadError =
          receiptItemsResult.error || receiptPaymentsResult.error;
        console.error(
          "Erro ao carregar detalhes dos recebimentos:",
          loadError?.message,
        );
        if (requestId === financialLoadRequestIdRef.current) {
          setFinancialRecordsLoadError(
            loadError?.message ||
              "Erro ao carregar os detalhes dos recebimentos.",
          );
          setIsLoadingFinancialRecords(false);
        }
        return latestFinancialRecordsRef.current;
      }

      receiptItemRows.push(
        ...((Array.isArray(receiptItemsResult.data)
          ? receiptItemsResult.data
          : []) as SupabaseReceiptItemResponse[]),
      );
      receiptPaymentRows.push(
        ...((Array.isArray(receiptPaymentsResult.data)
          ? receiptPaymentsResult.data
          : []) as SupabaseReceiptPaymentResponse[]),
      );
    }

    const expensePeriodFilter = [
      `and(expense_date.gte.${currentMonthStart},expense_date.lt.${currentMonthEndExclusive})`,
      `and(expense_date.gte.${selectedPeriod.startDate},expense_date.lt.${selectedPeriodEndExclusive})`,
    ].join(",");
    const expensesResult = await supabase
      .from("cash_expenses")
      .select(SUPABASE_CASH_EXPENSES_SELECT)
      .eq("tenant_id", tenantId)
      .or(expensePeriodFilter)
      .order("expense_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (expensesResult.error) {
      console.error("Erro ao carregar despesas:", expensesResult.error.message);
      if (requestId === financialLoadRequestIdRef.current) {
        setFinancialRecordsLoadError(
          expensesResult.error.message || "Erro ao carregar despesas.",
        );
        setIsLoadingFinancialRecords(false);
      }
      return latestFinancialRecordsRef.current;
    }

    const receiptItemsByReceiptId = receiptItemRows.reduce<
      Record<string, SupabaseReceiptItemResponse[]>
    >((accumulator, receiptItem) => {
      if (!accumulator[receiptItem.receipt_id]) {
        accumulator[receiptItem.receipt_id] = [];
      }

      accumulator[receiptItem.receipt_id].push(receiptItem);
      return accumulator;
    }, {});

    const receiptPaymentsByReceiptId = receiptPaymentRows.reduce<
      Record<string, SupabaseReceiptPaymentResponse[]>
    >((accumulator, receiptPayment) => {
      if (!accumulator[receiptPayment.receipt_id]) {
        accumulator[receiptPayment.receipt_id] = [];
      }

      accumulator[receiptPayment.receipt_id].push(receiptPayment);
      return accumulator;
    }, {});

    const nextReceipts = receiptRows.map((receipt) => {
      return mapSupabaseReceiptToAppReceipt({
        receipt,
        items: receiptItemsByReceiptId[receipt.id] || [],
        payments: receiptPaymentsByReceiptId[receipt.id] || [],
      });
    });

    const expenseRows = (Array.isArray(expensesResult.data)
      ? expensesResult.data
      : []) as SupabaseCashExpenseResponse[];
    const nextCashExpenses = expenseRows.map(mapSupabaseCashExpenseToAppCashExpense);

    const loadedRecords = {
      receipts: nextReceipts,
      cashExpenses: nextCashExpenses,
      completedAppointments,
    };

    if (requestId !== financialLoadRequestIdRef.current) {
      return latestFinancialRecordsRef.current;
    }

    latestFinancialRecordsRef.current = loadedRecords;
    setReceipts(nextReceipts);
    setCashExpenses(nextCashExpenses);
    setFinancialAppointments(completedAppointments);
    setIsLoadingFinancialRecords(false);

    return loadedRecords;
  };


  useEffect(() => {
    let isMounted = true;

    async function loadInitialFinancialRecords() {
      if (!tenantId) return;

      const loadedRecords = await loadFinancialRecordsFromSupabase(true);

      if (!isMounted) return;

      onUpdateState({
        ...state,
        receipts: loadedRecords.receipts,
        cashExpenses: loadedRecords.cashExpenses,
      } as unknown as typeof state);
    }

    loadInitialFinancialRecords();

    return () => {
      isMounted = false;
    };
    // Carrega caixa real quando o tenant é identificado. Supabase é a fonte oficial.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, financePeriod?.startDate, financePeriod?.endDate]);



  const baseDateStr = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Sao_Paulo",
  });

  const baseFinancialSummary = calculateOwnerFinancialSummary({
    appointments: financialAppointments,
    professionals,
    baseDateStr,
  });

  const receiptTotals = calculateReceiptTotals(receipts, baseDateStr);
  const hasPaidReceipts = receipts.some((receipt) => receipt.status === "paid");

  const financialSummary = hasPaidReceipts
    ? {
        ...baseFinancialSummary,
        totalReceivedToday: receiptTotals.totalReceivedToday,
        totalReceivedMonth: receiptTotals.totalReceivedMonth,
        totalCommissionsMonth: receiptTotals.totalCommissionsMonth,
      }
    : baseFinancialSummary;

  const handleMarkAppointmentCompletedForReceipt = (appointmentId: string) => {
    const updatedAppointments = appointments.map((appointment) => {
      if (appointment.id !== appointmentId) {
        return appointment;
      }

      return {
        ...appointment,
        status: "completed" as AppointmentStatus,
      };
    });

    const updatedClients = updateClientsAfterAppointmentStatusChange({
      clients,
      appointments,
      appointmentId,
      destinationStatus: "completed",
    });

    setLiveAppointments(updatedAppointments);

    onUpdateState({
      ...state,
      appointments: updatedAppointments,
      clients: updatedClients,
      receipts,
      cashExpenses,
    } as unknown as typeof state);
  };

  const handleConfirmReceipt = async (payload: ReceiptPayload): Promise<void> => {
    const failReceiptSave = (message: string): never => {
      showOwnerFeedback(message, "Recebimento não concluído");
      throw new Error(message);
    };

    if (!tenantId) {
      failReceiptSave(
        "Não foi possível identificar a empresa para salvar o recebimento.",
      );
    }

    const draftReceiptItems = buildReceiptItems({
      draftItems: payload.items,
      receiptId: "pending-receipt",
      services,
      products,
      professionals,
    });

    const subtotal = draftReceiptItems.reduce(
      (sum, item) => sum + item.price,
      0,
    );
    const discountValue = Math.max(
      0,
      Math.min(Number(payload.discountValue) || 0, subtotal),
    );
    const totalAmount = Math.max(0, subtotal - discountValue);

    const { data: receiptData, error: receiptError } = await supabase
      .from("receipts")
      .insert(
        buildReceiptInsertPayload({
          tenantId,
          payload,
          subtotal,
          discountValue,
          totalAmount,
        }),
      )
      .select(SUPABASE_RECEIPTS_SELECT)
      .limit(1);

    if (receiptError) {
      failReceiptSave(
        receiptError.message || "Não foi possível salvar o recebimento.",
      );
    }

    const savedReceiptRow = (
      Array.isArray(receiptData) ? receiptData[0] : null
    ) as SupabaseReceiptResponse | null;

    if (!savedReceiptRow?.id) {
      void loadFinancialRecordsFromSupabase(false);

      failReceiptSave(
        "Recebimento salvo, mas não foi possível confirmar o registro.",
      );
    }

    const savedReceiptId = savedReceiptRow!.id;

    const receiptItems = buildReceiptItems({
      draftItems: payload.items,
      receiptId: savedReceiptId,
      services,
      products,
      professionals,
    });

    const receiptItemsPayload = receiptItems.map((receiptItem) => {
      return buildReceiptItemInsertPayload({
        tenantId,
        receiptItem,
      });
    });

    if (receiptItemsPayload.length > 0) {
      const { error: receiptItemsError } = await supabase
        .from("receipt_items")
        .insert(receiptItemsPayload);

      if (receiptItemsError) {
        await supabase.from("receipts").delete().eq("id", savedReceiptId);
        void loadFinancialRecordsFromSupabase(false);

        failReceiptSave(
          receiptItemsError.message ||
            "Não foi possível salvar os itens do recebimento.",
        );
      }
    }

    const receiptPaymentsPayload = payload.payments
      .filter((payment) => Number(payment.amount) > 0)
      .map((payment) => ({
        tenant_id: tenantId,
        receipt_id: savedReceiptId,
        payment_type: payment.paymentType,
        amount: Number(payment.amount) || 0,
      }));

    if (receiptPaymentsPayload.length > 0) {
      const { error: receiptPaymentError } = await supabase
        .from("receipt_payments")
        .insert(receiptPaymentsPayload);

      if (receiptPaymentError) {
        await supabase.from("receipts").delete().eq("id", savedReceiptId);
        void loadFinancialRecordsFromSupabase(false);

        failReceiptSave(
          receiptPaymentError.message ||
            "Não foi possível salvar as formas de pagamento do recebimento.",
        );
      }
    }

    if (toNullableUuid(payload.appointmentId)) {
      const { error: appointmentStatusError } = await supabase.rpc(
        "update_my_appointment_status",
        {
          p_appointment_id: payload.appointmentId,
          p_status: "completed",
        },
      );

      if (appointmentStatusError) {
        console.error(
          "Recebimento salvo, mas o status do atendimento não foi atualizado:",
          appointmentStatusError.message,
        );
      }
    }

    const loadedRecords = await loadFinancialRecordsFromSupabase(false);
    const updatedAppointments = appointments.map((appointment) => {
      if (appointment.id !== payload.appointmentId) {
        return appointment;
      }

      return {
        ...appointment,
        status: "completed" as AppointmentStatus,
        paymentType:
          payload.status === "pending"
            ? "pendente"
            : payload.paymentType,
        price:
          receiptItems.find((item) => item.appointmentId === appointment.id)
            ?.price || appointment.price,
      };
    });

    setLiveAppointments(updatedAppointments);
    void loadClientsFromSupabase(false);

    onUpdateState({
      ...state,
      appointments: updatedAppointments,
      receipts: loadedRecords.receipts,
      cashExpenses: loadedRecords.cashExpenses,
    } as unknown as typeof state);
  };

  const handleConfirmPendingReceiptPayment = async (
    payload: PendingReceiptPaymentPayload,
  ): Promise<void> => {
    const failPendingPayment = (message: string): never => {
      showOwnerFeedback(message, "Baixa pendente não concluída");
      throw new Error(message);
    };

    if (!tenantId) {
      failPendingPayment(
        "Não foi possível identificar a empresa para baixar o saldo pendente.",
      );
    }

    if (pendingReceiptPaymentsRef.current.has(payload.receiptId)) {
      failPendingPayment(
        "A baixa deste recebimento já está sendo processada. Aguarde a conclusão.",
      );
    }

    pendingReceiptPaymentsRef.current.add(payload.receiptId);

    try {
      const targetReceipt = receipts.find(
        (receipt) => receipt.id === payload.receiptId,
      );

      if (!targetReceipt) {
        const message = "Recebimento pendente não encontrado.";
        showOwnerFeedback(message, "Baixa pendente não concluída");
        throw new Error(message);
      }

      const currentPending = Math.max(
        0,
        Number(targetReceipt.amountPending) || 0,
      );
      const amountReceived = Number(
        Math.max(0, Number(payload.amountReceived) || 0).toFixed(2),
      );

      if (amountReceived <= 0) {
        failPendingPayment("Informe um valor recebido maior que zero.");
      }

      if (amountReceived > currentPending) {
        failPendingPayment(
          "O valor recebido não pode ser maior que o saldo pendente.",
        );
      }

      const normalizedPaymentType = payload.paymentType || "pix";
      const normalizedPaidAt =
        payload.paidAt ||
        new Date().toLocaleDateString("en-CA", {
          timeZone: "America/Sao_Paulo",
        });

      const { error: pendingPaymentError } = await supabase.rpc(
        "pay_pending_receipt",
        {
          p_receipt_id: payload.receiptId,
          p_payment_type: normalizedPaymentType,
          p_amount: amountReceived,
          p_paid_at: normalizedPaidAt,
          p_notes: payload.notes || null,
        },
      );

      if (pendingPaymentError) {
        failPendingPayment(
          pendingPaymentError.message ||
            "Não foi possível baixar o saldo pendente.",
        );
      }

      const loadedRecords = await loadFinancialRecordsFromSupabase(false);

      onUpdateState({
        ...state,
        appointments,
        clients,
        receipts: loadedRecords.receipts,
        cashExpenses: loadedRecords.cashExpenses,
      } as unknown as typeof state);
    } finally {
      pendingReceiptPaymentsRef.current.delete(payload.receiptId);
    }
  };

  const handleConfirmCashExpense = async (payload: {
    description: string;
    amount: number;
    paymentType: PaymentType;
    notes?: string;
  }): Promise<void> => {
    const failExpenseSave = (message: string): never => {
      showOwnerFeedback(message, "Despesa não concluída");
      throw new Error(message);
    };

    if (!tenantId) {
      failExpenseSave(
        "Não foi possível identificar a empresa para salvar a despesa.",
      );
    }

    const today = new Date().toLocaleDateString("en-CA", {
      timeZone: "America/Sao_Paulo",
    });

    const { data, error } = await supabase
      .from("cash_expenses")
      .insert({
        tenant_id: tenantId,
        description: payload.description,
        amount: Number(payload.amount) || 0,
        payment_type: payload.paymentType,
        expense_date: today,
        notes: payload.notes || null,
      })
      .select(SUPABASE_CASH_EXPENSES_SELECT)
      .limit(1);

    if (error) {
      failExpenseSave(error.message || "Não foi possível salvar a despesa.");
    }

    const savedRow = (
      Array.isArray(data) ? data[0] : null
    ) as SupabaseCashExpenseResponse | null;

    if (!savedRow) {
      void loadFinancialRecordsFromSupabase(false);

      failExpenseSave(
        "Despesa salva, mas não foi possível recarregar o registro.",
      );
    }

    const loadedRecords = await loadFinancialRecordsFromSupabase(false);

    onUpdateState({
      ...state,
      appointments,
      clients,
      receipts: loadedRecords.receipts,
      cashExpenses: loadedRecords.cashExpenses,
    } as unknown as typeof state);
  };


  return { baseDateStr, financialSummary, receipts, cashExpenses, isLoadingFinancialRecords, financialRecordsLoadError,
    loadFinancialRecordsFromSupabase, handleMarkAppointmentCompletedForReceipt, handleConfirmReceipt,
    handleConfirmPendingReceiptPayment, handleConfirmCashExpense };
}