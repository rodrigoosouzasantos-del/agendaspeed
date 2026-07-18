import { useEffect, useState } from "react";

import { Appointment, CashExpense, Client, Professional, Receipt } from "../../../types";
import { OwnerDashboardProps } from "../owner.types";
import { supabase } from "../../../lib/supabase";
import {
  CommissionPaymentPayload, CommissionPaymentRecord, ExpensePaymentPayload, ExpensePaymentRecord,
  ExpensePaymentUpdatePayload, ExpenseTemplatePayload, ExpenseTemplateRecord,
} from "../components/FinanceView";
import {
  isValidUuid,
  SupabaseCommissionPaymentResponse,
  SupabaseExpenseTemplateResponse,
  SupabaseExpensePaymentResponse,
  mapSupabaseCommissionPaymentToAppRecord,
  mapSupabaseExpenseTemplateToAppRecord,
  mapSupabaseExpensePaymentToAppRecord,
} from "../owner.data";

type ShowOwnerFeedback = (message: string, title?: string) => void;
type FinancialRecords = { receipts: Receipt[]; cashExpenses: CashExpense[] };
interface UseOwnerFinanceManagementParams {
  tenantId: string; state: OwnerDashboardProps["state"]; onUpdateState: OwnerDashboardProps["onUpdateState"];
  appointments: Appointment[]; clients: Client[]; professionals: Professional[];
  loadFinancialRecordsFromSupabase: (showLoading?: boolean) => Promise<FinancialRecords>;
  showOwnerFeedback: ShowOwnerFeedback;
}

export function useOwnerFinanceManagement(params: UseOwnerFinanceManagementParams) {
  const { tenantId, state, onUpdateState, appointments, clients, professionals, loadFinancialRecordsFromSupabase, showOwnerFeedback } = params;
  const [commissionPayments, setCommissionPayments] = useState<CommissionPaymentRecord[]>([]);
  const [expenseTemplates, setExpenseTemplates] = useState<ExpenseTemplateRecord[]>([]);
  const [expensePayments, setExpensePayments] = useState<ExpensePaymentRecord[]>([]);

  const loadCommissionPaymentsFromSupabase = async (
    showFeedback = false,
  ): Promise<CommissionPaymentRecord[]> => {
    if (!tenantId) {
      setCommissionPayments([]);
      return [];
    }

    const { data, error } = await supabase
      .from("commission_payments")
      .select(
        "id,tenant_id,professional_id,period_start,period_end,calculated_commission,extra_value,discount_value,amount_paid,payment_type,paid_at,notes,created_at",
      )
      .eq("tenant_id", tenantId)
      .order("paid_at", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error(
        "Erro ao carregar histórico de comissões:",
        error.message,
      );

      if (showFeedback) {
        showOwnerFeedback(
          error.message ||
            "Não foi possível carregar o histórico de comissões.",
          "Histórico não carregado",
        );
      }

      return [];
    }

    const rows = (Array.isArray(data) ? data : []) as
      SupabaseCommissionPaymentResponse[];

    const nextCommissionPayments = rows.map((payment) =>
      mapSupabaseCommissionPaymentToAppRecord({
        payment,
        professionals,
      }),
    );

    setCommissionPayments(nextCommissionPayments);
    return nextCommissionPayments;
  };

  const loadExpenseRecordsFromSupabase = async (
    showFeedback = false,
  ): Promise<{
    templates: ExpenseTemplateRecord[];
    payments: ExpensePaymentRecord[];
  }> => {
    if (!tenantId) {
      setExpenseTemplates([]);
      setExpensePayments([]);
      return {
        templates: [],
        payments: [],
      };
    }

    const [templatesResult, paymentsResult] = await Promise.all([
      supabase
        .from("expense_templates")
        .select(
          "id,tenant_id,description,expected_amount,due_day,is_monthly,active,notes,created_at,updated_at",
        )
        .eq("tenant_id", tenantId)
        .order("due_day", { ascending: true, nullsFirst: false })
        .order("description", { ascending: true }),
      supabase
        .from("expense_payments")
        .select(
          "id,tenant_id,expense_template_id,description,competence_month,due_date,expected_amount,interest_value,fine_value,discount_value,amount_paid,payment_type,status,paid_at,notes,created_at,updated_at",
        )
        .eq("tenant_id", tenantId)
        .order("competence_month", { ascending: false })
        .order("created_at", { ascending: false }),
    ]);

    if (templatesResult.error || paymentsResult.error) {
      const message =
        templatesResult.error?.message ||
        paymentsResult.error?.message ||
        "Não foi possível carregar as despesas.";

      console.error("Erro ao carregar módulo de despesas:", message);

      if (showFeedback) {
        showOwnerFeedback(message, "Despesas não carregadas");
      }

      return {
        templates: expenseTemplates,
        payments: expensePayments,
      };
    }

    const templateRows = (
      Array.isArray(templatesResult.data) ? templatesResult.data : []
    ) as SupabaseExpenseTemplateResponse[];

    const paymentRows = (
      Array.isArray(paymentsResult.data) ? paymentsResult.data : []
    ) as SupabaseExpensePaymentResponse[];

    const nextTemplates = templateRows.map(
      mapSupabaseExpenseTemplateToAppRecord,
    );
    const nextPayments = paymentRows.map(
      mapSupabaseExpensePaymentToAppRecord,
    );

    setExpenseTemplates(nextTemplates);
    setExpensePayments(nextPayments);

    return {
      templates: nextTemplates,
      payments: nextPayments,
    };
  };


  useEffect(() => {
    if (!tenantId) {
      setCommissionPayments([]);
      return;
    }

    void loadCommissionPaymentsFromSupabase(false);
    // Carrega o histórico de comissões quando a empresa é identificada.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, professionals.length]);


  useEffect(() => {
    if (!tenantId) {
      setExpenseTemplates([]);
      setExpensePayments([]);
      return;
    }

    void loadExpenseRecordsFromSupabase(false);
    // Carrega os cadastros e pagamentos de despesas quando o tenant é identificado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);



  const handlePayCommission = async (
    payload: CommissionPaymentPayload,
  ): Promise<void> => {
    const failCommissionPayment = (message: string): never => {
      showOwnerFeedback(message, "Comissão não paga");
      throw new Error(message);
    };

    if (!tenantId) {
      failCommissionPayment(
        "Não foi possível identificar a empresa para registrar a comissão.",
      );
    }

    if (!isValidUuid(payload.professionalId)) {
      failCommissionPayment(
        "O profissional selecionado não possui um cadastro válido no Supabase.",
      );
    }

    const periodStart = new Date(`${payload.periodStart}T00:00:00Z`);
    const periodEnd = new Date(`${payload.periodEnd}T00:00:00Z`);

    if (
      Number.isNaN(periodStart.getTime()) ||
      Number.isNaN(periodEnd.getTime()) ||
      periodEnd < periodStart
    ) {
      failCommissionPayment("O período informado para a comissão é inválido.");
    }

    const periodDifferenceInDays = Math.round(
      (periodEnd.getTime() - periodStart.getTime()) / 86400000,
    );

    if (periodDifferenceInDays > 31) {
      failCommissionPayment(
        "O período máximo permitido para comissão é de 31 dias.",
      );
    }

    const normalizedCalculatedCommission = Math.max(
      0,
      Number(payload.calculatedCommission) || 0,
    );
    const normalizedExtraValue = Math.max(
      0,
      Number(payload.extraValue) || 0,
    );
    const normalizedDiscountValue = Math.max(
      0,
      Number(payload.discountValue) || 0,
    );
    const normalizedAmountPaid = Math.max(
      0,
      Number(payload.amountPaid) || 0,
    );

    const expectedAmountPaid = Math.max(
      0,
      normalizedCalculatedCommission +
        normalizedExtraValue -
        normalizedDiscountValue,
    );

    if (Math.abs(normalizedAmountPaid - expectedAmountPaid) > 0.01) {
      failCommissionPayment(
        "O valor final da comissão não corresponde ao cálculo de comissão, extra e desconto.",
      );
    }

    if (normalizedAmountPaid <= 0) {
      failCommissionPayment(
        "O valor final da comissão precisa ser maior que zero.",
      );
    }

    const { data: overlappingPayments, error: overlapError } = await supabase
      .from("commission_payments")
      .select("id,period_start,period_end,amount_paid,paid_at")
      .eq("tenant_id", tenantId)
      .eq("professional_id", payload.professionalId)
      .lte("period_start", payload.periodEnd)
      .gte("period_end", payload.periodStart)
      .limit(1);

    if (overlapError) {
      failCommissionPayment(
        overlapError.message ||
          "Não foi possível verificar pagamentos anteriores de comissão.",
      );
    }

    const overlappingPayment = Array.isArray(overlappingPayments)
      ? overlappingPayments[0]
      : null;

    if (overlappingPayment) {
      const formattedStart = String(
        overlappingPayment.period_start || "",
      )
        .split("-")
        .reverse()
        .join("/");
      const formattedEnd = String(
        overlappingPayment.period_end || "",
      )
        .split("-")
        .reverse()
        .join("/");

      failCommissionPayment(
        `Este profissional já possui comissão paga em período sobreposto (${formattedStart} a ${formattedEnd}). O período já pago permanece fechado.`,
      );
    }

    const { data: commissionData, error: commissionError } = await supabase
      .from("commission_payments")
      .insert({
        tenant_id: tenantId,
        professional_id: payload.professionalId,
        period_start: payload.periodStart,
        period_end: payload.periodEnd,
        calculated_commission: normalizedCalculatedCommission,
        extra_value: normalizedExtraValue,
        discount_value: normalizedDiscountValue,
        amount_paid: normalizedAmountPaid,
        payment_type: payload.paymentType,
        paid_at: payload.paidAt,
        notes: payload.notes || null,
      })
      .select("id")
      .limit(1);

    if (commissionError) {
      failCommissionPayment(
        commissionError.message ||
          "Não foi possível registrar o pagamento da comissão.",
      );
    }

    const savedCommissionPayment = Array.isArray(commissionData)
      ? commissionData[0]
      : null;

    const savedCommissionPaymentId = savedCommissionPayment?.id;

    if (!savedCommissionPaymentId) {
      failCommissionPayment(
        "A comissão foi processada, mas o registro não retornou do Supabase.",
      );
    }

    const expenseDescription =
      `Comissão paga - ${payload.professionalName} ` +
      `(${payload.periodStart.split("-").reverse().join("/")} a ` +
      `${payload.periodEnd.split("-").reverse().join("/")})`;

    const { error: expenseError } = await supabase
      .from("cash_expenses")
      .insert({
        tenant_id: tenantId,
        description: expenseDescription,
        amount: normalizedAmountPaid,
        payment_type: payload.paymentType,
        expense_date: payload.paidAt,
        notes:
          payload.notes ||
          `Pagamento de comissão referente ao período de ${payload.periodStart} a ${payload.periodEnd}.`,
      });

    if (expenseError) {
      await supabase
        .from("commission_payments")
        .delete()
        .eq("tenant_id", tenantId)
        .eq("id", savedCommissionPaymentId);

      failCommissionPayment(
        expenseError.message ||
          "A comissão não foi concluída porque a despesa financeira não pôde ser registrada.",
      );
    }

    const loadedRecords = await loadFinancialRecordsFromSupabase(false);
    await loadCommissionPaymentsFromSupabase(false);

    onUpdateState({
      ...state,
      appointments,
      clients,
      receipts: loadedRecords.receipts,
      cashExpenses: loadedRecords.cashExpenses,
    } as unknown as typeof state);
  };

  const handleUpdateCommissionPaidAt = async (
    paymentId: string,
    paidAt: string,
  ): Promise<void> => {
    if (!tenantId) {
      throw new Error(
        "Não foi possível identificar a empresa para atualizar a comissão.",
      );
    }

    const currentPayment = commissionPayments.find(
      (payment) => payment.id === paymentId,
    );

    if (!currentPayment) {
      throw new Error("Pagamento de comissão não encontrado.");
    }

    const { error: commissionUpdateError } = await supabase
      .from("commission_payments")
      .update({ paid_at: paidAt })
      .eq("tenant_id", tenantId)
      .eq("id", paymentId);

    if (commissionUpdateError) {
      throw new Error(
        commissionUpdateError.message ||
          "Não foi possível atualizar a data da comissão.",
      );
    }

    const expenseDescription =
      `Comissão paga - ${currentPayment.professionalName} ` +
      `(${currentPayment.periodStart.split("-").reverse().join("/")} a ` +
      `${currentPayment.periodEnd.split("-").reverse().join("/")})`;

    const { error: expenseUpdateError } = await supabase
      .from("cash_expenses")
      .update({ expense_date: paidAt })
      .eq("tenant_id", tenantId)
      .eq("description", expenseDescription);

    if (expenseUpdateError) {
      await supabase
        .from("commission_payments")
        .update({ paid_at: currentPayment.paidAt })
        .eq("tenant_id", tenantId)
        .eq("id", paymentId);

      throw new Error(
        expenseUpdateError.message ||
          "A data da comissão não foi alterada porque a despesa vinculada não pôde ser atualizada.",
      );
    }

    await Promise.all([
      loadCommissionPaymentsFromSupabase(false),
      loadFinancialRecordsFromSupabase(false),
    ]);
  };

  const handleSaveExpenseTemplate = async (
    payload: ExpenseTemplatePayload,
  ): Promise<void> => {
    if (!tenantId) {
      throw new Error(
        "Não foi possível identificar a empresa para salvar a despesa.",
      );
    }

    const normalizedPayload = {
      tenant_id: tenantId,
      description: payload.description.trim().toUpperCase(),
      expected_amount: Math.max(0, Number(payload.expectedAmount) || 0),
      due_day:
        payload.dueDay === undefined || payload.dueDay === null
          ? null
          : Math.min(31, Math.max(1, Number(payload.dueDay) || 1)),
      is_monthly: payload.isMonthly === true,
      active: true,
      notes: payload.notes || null,
    };

    const query = payload.id
      ? supabase
          .from("expense_templates")
          .update(normalizedPayload)
          .eq("tenant_id", tenantId)
          .eq("id", payload.id)
      : supabase.from("expense_templates").insert(normalizedPayload);

    const { data, error } = await query
      .select(
        "id,tenant_id,description,expected_amount,due_day,is_monthly,active,notes,created_at,updated_at",
      )
      .limit(1);

    if (error) {
      throw new Error(
        error.message || "Não foi possível salvar a despesa.",
      );
    }

    const savedRow = (
      Array.isArray(data) ? data[0] : null
    ) as SupabaseExpenseTemplateResponse | null;

    if (!savedRow?.id) {
      await loadExpenseRecordsFromSupabase(false);
      throw new Error(
        "A despesa foi processada, mas o registro atualizado não retornou.",
      );
    }

    const savedTemplate = mapSupabaseExpenseTemplateToAppRecord(savedRow);

    setExpenseTemplates((currentTemplates) => {
      const exists = currentTemplates.some(
        (template) => template.id === savedTemplate.id,
      );

      const nextTemplates = exists
        ? currentTemplates.map((template) =>
            template.id === savedTemplate.id
              ? savedTemplate
              : template,
          )
        : [...currentTemplates, savedTemplate];

      return nextTemplates.sort((firstTemplate, secondTemplate) => {
        const firstDueDay = firstTemplate.dueDay || 32;
        const secondDueDay = secondTemplate.dueDay || 32;

        if (firstDueDay !== secondDueDay) {
          return firstDueDay - secondDueDay;
        }

        return firstTemplate.description.localeCompare(
          secondTemplate.description,
          "pt-BR",
        );
      });
    });
  };

  const handleDeleteExpenseTemplate = async (
    expenseTemplateId: string,
  ): Promise<void> => {
    if (!tenantId) {
      throw new Error(
        "Não foi possível identificar a empresa para excluir a despesa.",
      );
    }

    const hasPaymentHistory = expensePayments.some(
      (payment) =>
        payment.expenseTemplateId === expenseTemplateId &&
        payment.status === "paid",
    );

    if (hasPaymentHistory) {
      throw new Error(
        "Esta despesa já possui pagamento registrado e não pode ser excluída.",
      );
    }

    const { error } = await supabase
      .from("expense_templates")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("id", expenseTemplateId);

    if (error) {
      throw new Error(
        error.message ||
          "Não foi possível excluir a despesa. Verifique se existe alguma competência vinculada.",
      );
    }

    setExpenseTemplates((currentTemplates) =>
      currentTemplates.filter(
        (template) => template.id !== expenseTemplateId,
      ),
    );
  };

  const handlePayExpense = async (
    payload: ExpensePaymentPayload,
  ): Promise<void> => {
    if (!tenantId) {
      throw new Error(
        "Não foi possível identificar a empresa para pagar a despesa.",
      );
    }

    const expectedAmountPaid = Math.max(
      0,
      Number(payload.expectedAmount) +
        Number(payload.interestValue) +
        Number(payload.fineValue) -
        Number(payload.discountValue),
    );

    if (Math.abs(expectedAmountPaid - Number(payload.amountPaid)) > 0.01) {
      throw new Error(
        "O valor final não corresponde ao cálculo da despesa.",
      );
    }

    const { data: existingPayments, error: existingPaymentError } =
      await supabase
        .from("expense_payments")
        .select("id,status")
        .eq("tenant_id", tenantId)
        .eq("expense_template_id", payload.expenseTemplateId)
        .eq("competence_month", payload.competenceMonth)
        .neq("status", "cancelled")
        .limit(1);

    if (existingPaymentError) {
      throw new Error(
        existingPaymentError.message ||
          "Não foi possível verificar pagamentos anteriores.",
      );
    }

    if (
      Array.isArray(existingPayments) &&
      existingPayments.length > 0
    ) {
      throw new Error(
        "Esta despesa já possui um registro nesta competência.",
      );
    }

    const { data: paymentData, error: paymentError } = await supabase
      .from("expense_payments")
      .insert({
        tenant_id: tenantId,
        expense_template_id: payload.expenseTemplateId,
        description: payload.description,
        competence_month: payload.competenceMonth,
        due_date: payload.dueDate || null,
        expected_amount: Number(payload.expectedAmount) || 0,
        interest_value: Number(payload.interestValue) || 0,
        fine_value: Number(payload.fineValue) || 0,
        discount_value: Number(payload.discountValue) || 0,
        amount_paid: Number(payload.amountPaid) || 0,
        payment_type: payload.paymentType,
        status: "paid",
        paid_at: payload.paidAt,
        notes: payload.notes || null,
      })
      .select(
        "id,tenant_id,expense_template_id,description,competence_month,due_date,expected_amount,interest_value,fine_value,discount_value,amount_paid,payment_type,status,paid_at,notes,created_at,updated_at",
      )
      .limit(1);

    if (paymentError) {
      throw new Error(
        paymentError.message ||
          "Não foi possível registrar o pagamento da despesa.",
      );
    }

    const savedPaymentRow = (
      Array.isArray(paymentData) ? paymentData[0] : null
    ) as SupabaseExpensePaymentResponse | null;

    if (!savedPaymentRow?.id) {
      throw new Error(
        "O pagamento foi processado, mas o registro não retornou.",
      );
    }

    const expenseDescription =
      `${payload.description} - competência ` +
      `${payload.competenceMonth.slice(0, 7).split("-").reverse().join("/")}`;

    const { error: cashExpenseError } = await supabase
      .from("cash_expenses")
      .insert({
        tenant_id: tenantId,
        description: expenseDescription,
        amount: Number(payload.amountPaid) || 0,
        payment_type: payload.paymentType,
        expense_date: payload.paidAt,
        notes: payload.notes || null,
      });

    if (cashExpenseError) {
      await supabase
        .from("expense_payments")
        .delete()
        .eq("tenant_id", tenantId)
        .eq("id", savedPaymentRow.id);

      throw new Error(
        cashExpenseError.message ||
          "O pagamento não foi concluído porque não foi possível alimentar os relatórios financeiros.",
      );
    }

    const savedPayment =
      mapSupabaseExpensePaymentToAppRecord(savedPaymentRow);

    setExpensePayments((currentPayments) => [
      savedPayment,
      ...currentPayments.filter(
        (payment) => payment.id !== savedPayment.id,
      ),
    ]);

    const loadedRecords = await loadFinancialRecordsFromSupabase(false);

    onUpdateState({
      ...state,
      appointments,
      clients,
      receipts: loadedRecords.receipts,
      cashExpenses: loadedRecords.cashExpenses,
    } as unknown as typeof state);
  };

  const handleUpdateExpensePayment = async (
    payload: ExpensePaymentUpdatePayload,
  ): Promise<void> => {
    if (!tenantId) {
      throw new Error(
        "Não foi possível identificar a empresa para atualizar a despesa.",
      );
    }

    const currentPayment = expensePayments.find(
      (payment) => payment.id === payload.paymentId,
    );

    if (!currentPayment) {
      throw new Error("Pagamento de despesa não encontrado.");
    }

    const normalizedExpectedAmount = Math.max(
      0,
      Number(payload.expectedAmount) || 0,
    );
    const normalizedInterestValue = Math.max(
      0,
      Number(payload.interestValue) || 0,
    );
    const normalizedFineValue = Math.max(
      0,
      Number(payload.fineValue) || 0,
    );
    const normalizedDiscountValue = Math.max(
      0,
      Number(payload.discountValue) || 0,
    );
    const normalizedAmountPaid = Math.max(
      0,
      Number(payload.amountPaid) || 0,
    );

    const expectedAmountPaid = Math.max(
      0,
      normalizedExpectedAmount +
        normalizedInterestValue +
        normalizedFineValue -
        normalizedDiscountValue,
    );

    if (Math.abs(expectedAmountPaid - normalizedAmountPaid) > 0.01) {
      throw new Error(
        "O valor final não corresponde ao cálculo atualizado da despesa.",
      );
    }

    if (normalizedAmountPaid <= 0) {
      throw new Error(
        "O valor final da despesa precisa ser maior que zero.",
      );
    }

    const previousExpenseDescription =
      `${currentPayment.description} - competência ` +
      `${currentPayment.competenceMonth
        .slice(0, 7)
        .split("-")
        .reverse()
        .join("/")}`;

    const previousPaidAt = currentPayment.paidAt || "";
    const previousAmountPaid = Number(currentPayment.amountPaid) || 0;
    const previousPaymentType = currentPayment.paymentType;
    const previousNotes = currentPayment.notes || null;

    const { data: updatedPaymentData, error: paymentUpdateError } =
      await supabase
        .from("expense_payments")
        .update({
          expected_amount: normalizedExpectedAmount,
          interest_value: normalizedInterestValue,
          fine_value: normalizedFineValue,
          discount_value: normalizedDiscountValue,
          amount_paid: normalizedAmountPaid,
          payment_type: payload.paymentType,
          paid_at: payload.paidAt,
          notes: payload.notes || null,
        })
        .eq("tenant_id", tenantId)
        .eq("id", payload.paymentId)
        .select(
          "id,tenant_id,expense_template_id,description,competence_month,due_date,expected_amount,interest_value,fine_value,discount_value,amount_paid,payment_type,status,paid_at,notes,created_at,updated_at",
        )
        .limit(1);

    if (paymentUpdateError) {
      throw new Error(
        paymentUpdateError.message ||
          "Não foi possível atualizar o pagamento da despesa.",
      );
    }

    const updatedPaymentRow = (
      Array.isArray(updatedPaymentData) ? updatedPaymentData[0] : null
    ) as SupabaseExpensePaymentResponse | null;

    if (!updatedPaymentRow?.id) {
      throw new Error(
        "O pagamento foi atualizado, mas o registro não retornou do Supabase.",
      );
    }

    let cashExpenseQuery = supabase
      .from("cash_expenses")
      .update({
        amount: normalizedAmountPaid,
        payment_type: payload.paymentType,
        expense_date: payload.paidAt,
        notes: payload.notes || null,
      })
      .eq("tenant_id", tenantId)
      .eq("description", previousExpenseDescription)
      .eq("amount", previousAmountPaid)
      .eq("payment_type", previousPaymentType);

    if (previousPaidAt) {
      cashExpenseQuery = cashExpenseQuery.eq(
        "expense_date",
        previousPaidAt,
      );
    }

    const { data: updatedCashExpenses, error: cashExpenseUpdateError } =
      await cashExpenseQuery
        .select("id")
        .limit(1);

    if (
      cashExpenseUpdateError ||
      !Array.isArray(updatedCashExpenses) ||
      updatedCashExpenses.length === 0
    ) {
      await supabase
        .from("expense_payments")
        .update({
          expected_amount: currentPayment.expectedAmount,
          interest_value: currentPayment.interestValue,
          fine_value: currentPayment.fineValue,
          discount_value: currentPayment.discountValue,
          amount_paid: currentPayment.amountPaid,
          payment_type: currentPayment.paymentType,
          paid_at: currentPayment.paidAt || null,
          notes: previousNotes,
        })
        .eq("tenant_id", tenantId)
        .eq("id", payload.paymentId);

      throw new Error(
        cashExpenseUpdateError?.message ||
          "A alteração foi cancelada porque o lançamento financeiro vinculado não foi encontrado.",
      );
    }

    const updatedPayment =
      mapSupabaseExpensePaymentToAppRecord(updatedPaymentRow);

    setExpensePayments((currentPayments) =>
      currentPayments.map((payment) =>
        payment.id === updatedPayment.id
          ? updatedPayment
          : payment,
      ),
    );

    const loadedRecords = await loadFinancialRecordsFromSupabase(false);

    onUpdateState({
      ...state,
      appointments,
      clients,
      receipts: loadedRecords.receipts,
      cashExpenses: loadedRecords.cashExpenses,
    } as unknown as typeof state);
  };

  return { commissionPayments, expenseTemplates, expensePayments, handlePayCommission, handleUpdateCommissionPaidAt,
    handleSaveExpenseTemplate, handleDeleteExpenseTemplate, handlePayExpense, handleUpdateExpensePayment };
}
