/**
 * Painel do Dono - AgendaZap.
 *
 * Este arquivo coordena o módulo administrativo do proprietário.
 */

import React, { useState } from "react";

import { OwnerDashboardProps, OwnerTab } from "./owner.types";
import { buildOwnerPublicBookingUrl } from "./owner.data";

import OwnerHeader from "./components/OwnerHeader";
import OwnerSidebar from "./components/OwnerSidebar";
import DashboardHomeView from "./components/DashboardHomeView";
import AgendaView from "./components/AgendaView";
import ProfessionalsView from "./components/ProfessionalsView";
import ServicesView from "./components/ServicesView";
import ProductsView from "./components/ProductsView";
import ClientsView from "./components/ClientsView";
import FinanceView from "./components/FinanceView";
import type { FinancePeriod } from "./finance/useFinanceViewModel";
import SubscriptionView from "./components/SubscriptionView";
import ReceiptsView from "./components/ReceiptsView";
import SettingsView from "./components/SettingsView";

import AppointmentModal from "./modals/AppointmentModal";
import ProfessionalModal from "./modals/ProfessionalModal";
import ServiceModal from "./modals/ServiceModal";
import ProductModal from "./modals/ProductModal";
import PermissionsModal from "./modals/PermissionsModal";

import { useOwnerFinancial } from "./hooks/useOwnerFinancial";
import { useOwnerFinanceManagement } from "./hooks/useOwnerFinanceManagement";
import { useOwnerProducts } from "./hooks/useOwnerProducts";
import { useOwnerProfessionals } from "./hooks/useOwnerProfessionals";
import { useOwnerServices } from "./hooks/useOwnerServices";
import { useOwnerAppointments } from "./hooks/useOwnerAppointments";
import { useOwnerClients } from "./hooks/useOwnerClients";
import { useOwnerSettings } from "./hooks/useOwnerSettings";
import { useOwnerSubscription } from "./hooks/useOwnerSubscription";

interface OwnerFeedbackState {
  title: string;
  message: string;
}

interface OwnerConfirmationState {
  title: string;
  message: string;
  confirmLabel: string;
  tone: "warning" | "danger";
  onConfirm: () => void | Promise<void>;
}

export default function OwnerDashboard({
  state,
  onUpdateState,
  onNavigateToClient,
  onLogOut,
}: OwnerDashboardProps) {
  const { config } = state;

  const [activeTab, setActiveTab] = useState<OwnerTab>("painel");
  const [quickOpenProfessionalAgendaId, setQuickOpenProfessionalAgendaId] =
    useState("");
  const [quickOpenProfessionalAgendaKey, setQuickOpenProfessionalAgendaKey] =
    useState(0);
  const [financialPeriod, setFinancialPeriod] =
    useState<FinancePeriod | null>(null);

  const [ownerFeedback, setOwnerFeedback] =
    useState<OwnerFeedbackState | null>(null);
  const [ownerConfirmation, setOwnerConfirmation] =
    useState<OwnerConfirmationState | null>(null);
  const [isConfirmingOwnerAction, setIsConfirmingOwnerAction] = useState(false);

  const showOwnerFeedback = (message: string, title = "Atenção") => {
    setOwnerFeedback({ title, message });
  };

  const closeOwnerConfirmation = () => {
    if (isConfirmingOwnerAction) return;
    setOwnerConfirmation(null);
  };

  const confirmOwnerAction = async () => {
    if (!ownerConfirmation || isConfirmingOwnerAction) return;

    setIsConfirmingOwnerAction(true);

    try {
      await ownerConfirmation.onConfirm();
      setOwnerConfirmation(null);
    } finally {
      setIsConfirmingOwnerAction(false);
    }
  };

  const {
    tenantId,
    tenantSlug,
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
    isSavingTenantSettings,
    settingsSaveSuccessVersion,
    settingsSaveMessage,
    setConfigName,
    setConfigAddress,
    setConfigPhone,
    setConfigInstagram,
    setConfigLogo,
    setConfigCoverImage,
    setConfigDefaultTemplate,
    setBookingMinLeadTimeMinutes,
    setBookingMinCancelLeadTimeMinutes,
    setBookingMinRescheduleLeadTimeMinutes,
    setBookingAllowClientConfirmation,
    setBookingAllowClientCancellation,
    setBookingAllowClientReschedule,
    setBookingSlotIntervalMinutes,
    setBookingMaxFutureDays,
    setBookingWorkHoursStart,
    setBookingWorkHoursEnd,
    setBookingLunchStart,
    setBookingLunchEnd,
    handleSaveCompanyConfig,
  } = useOwnerSettings({
    state,
    onUpdateState,
    showOwnerFeedback,
  });

  const {
    services,
    sortedServices,
    isLoadingServices,
    showServiceModal,
    setShowServiceModal,
    editingService,
    setEditingService,
    serviceCategories,
    serviceCategoryOrders,
    serviceCategoryStatuses,
    servName,
    servCategory,
    servDuration,
    servDisplayOrder,
    servPrice,
    servDescription,
    servActive,
    servRequireDeposit,
    servDepositValue,
    setServName,
    setServCategory,
    setServDuration,
    setServDisplayOrder,
    setServPrice,
    setServDescription,
    setServActive,
    setServRequireDeposit,
    setServDepositValue,
    handleOpenCreateService,
    handleEditServiceTrigger,
    handleAddNewService,
    handleAddServiceCategory,
    handleRenameServiceCategory,
    handleToggleServiceCategoryActive,
    handleToggleServiceActive,
    handleDeleteService,
    handleDeleteServiceCategory,
    handleChangeServiceCategoryOrder,
  } = useOwnerServices({
    state,
    onUpdateState,
    showOwnerFeedback,
  });

  const {
    professionals,
    isLoadingProfessionals,
    isSavingProfessional,
    showProfModal,
    setShowProfModal,
    showPermissionModal,
    setShowPermissionModal,
    editingProf,
    setEditingProf,
    professionalPendingHardDelete,
    isDeletingProfessional,
    profName,
    profPhone,
    profEmail,
    profRole,
    profAvatar,
    profActive,
    profDisplayOrder,
    profWeeklySchedule,
    profLunchStart,
    profLunchEnd,
    profNoLunchBreak,
    profDefaultAppointmentDuration,
    profServicesIds,
    profRemType,
    profRemValue,
    setProfName,
    setProfPhone,
    setProfEmail,
    setProfRole,
    setProfAvatar,
    setProfActive,
    setProfDisplayOrder,
    setProfWeeklySchedule,
    setProfLunchStart,
    setProfLunchEnd,
    setProfNoLunchBreak,
    setProfDefaultAppointmentDuration,
    setProfServicesIds,
    setProfRemType,
    setProfRemValue,
    handleOpenCreateProfessional,
    handleEditProfTrigger,
    handleAddNewProf,
    handleDeleteProf,
    handleHardDeleteProf,
    handleCancelHardDeleteProfessional,
    handleConfirmHardDeleteProfessional,
    handleOpenProfessionalAgenda,
    handleGenerateProfessionalAccessLink,
    handleApplySimplePermissions,
  } = useOwnerProfessionals({
    tenantId,
    state,
    onUpdateState,
    services,
    showOwnerFeedback,
    requestConfirmation: setOwnerConfirmation,
    setActiveTab,
    setQuickOpenProfessionalAgendaId,
    setQuickOpenProfessionalAgendaKey,
  });

  const {
    products,
    isLoadingProducts,
    productsLoadError,
    showProductModal,
    editingProduct,
    isSavingProduct,
    productCode,
    productDescription,
    productQuantity,
    productCostPrice,
    productSalePrice,
    productActive,
    productPopup,
    setProductCode,
    setProductDescription,
    setProductQuantity,
    setProductCostPrice,
    setProductSalePrice,
    setProductActive,
    setProductPopup,
    handleOpenCreateProduct,
    handleEditProduct,
    handleCloseProductModal,
    handleSaveProduct,
    handleToggleProductActive,
    handleDeleteProduct,
  } = useOwnerProducts({
    tenantId,
    showOwnerFeedback,
    requestConfirmation: setOwnerConfirmation,
  });

  const {
    clients,
    clientSearch,
    setClientSearch,
    filteredClients,
    isLoadingClients,
    clientsLoadError,
    loadClientsFromSupabase,
    handleAddManualClient,
    handleUpdateClient,
    handleDeleteClient,
  } = useOwnerClients({
    state,
    onUpdateState,
    tenantId,
    showOwnerFeedback,
  });

  const {
    appointments,
    setAppointments,
    calendarView,
    setCalendarView,
    isLoadingAppointments,
    appointmentsLoadError,
    showApptModal,
    setShowApptModal,
    newApptClientName,
    setNewApptClientName,
    newApptClientPhone,
    setNewApptClientPhone,
    newApptServiceId,
    setNewApptServiceId,
    newApptProfId,
    setNewApptProfId,
    newApptDate,
    setNewApptDate,
    newApptTime,
    setNewApptTime,
    newApptNotes,
    setNewApptNotes,
    newApptPayment,
    setNewApptPayment,
    handleModifyStatus,
    handleAddManualAppt,
    handleCreateAppointmentFromAgenda,
  } = useOwnerAppointments({
    state,
    onUpdateState,
    activeTab,
    services,
    professionals,
    clients,
    loadClientsFromSupabase,
    showOwnerFeedback,
  });

  const {
    baseDateStr,
    financialSummary,
    receipts,
    cashExpenses,
    isLoadingFinancialRecords,
    financialRecordsLoadError,
    loadFinancialRecordsFromSupabase,
    handleMarkAppointmentCompletedForReceipt,
    handleConfirmReceipt,
    handleConfirmPendingReceiptPayment,
    handleConfirmCashExpense,
  } = useOwnerFinancial({
    tenantId,
    financePeriod: financialPeriod ?? undefined,
    state,
    onUpdateState,
    appointments,
    clients,
    services,
    products,
    professionals,
    setLiveAppointments: setAppointments,
    loadClientsFromSupabase,
    showOwnerFeedback,
  });

  const {
    commissionPayments,
    expenseTemplates,
    expensePayments,
    handlePayCommission,
    handleUpdateCommissionPaidAt,
    handleUpdateCommissionPayment,
    handleSaveExpenseTemplate,
    handleDeleteExpenseTemplate,
    handlePayExpense,
    handleUpdateExpensePayment,
  } = useOwnerFinanceManagement({
    tenantId,
    state,
    onUpdateState,
    activeTab,
    financePeriod: financialPeriod ?? undefined,
    appointments,
    clients,
    professionals,
    loadFinancialRecordsFromSupabase,
    showOwnerFeedback,
  });

  const {
    saasSubscription,
    saasInvoices,
    isLoadingSaasBilling,
    saasBillingError,
    loadSaasBilling,
  } = useOwnerSubscription();

  const clearQuickProfessionalAgenda = () => {
    setQuickOpenProfessionalAgendaId("");
    setQuickOpenProfessionalAgendaKey((currentKey) => currentKey + 1);
  };

  const handleChangeOwnerTab = (nextTab: OwnerTab) => {
    if (nextTab === "agenda") {
      clearQuickProfessionalAgenda();
    }

    setActiveTab(nextTab);
  };

  const openTodayAgenda = () => {
    clearQuickProfessionalAgenda();
    setActiveTab("agenda");
    setCalendarView("today");
  };

  return (
    <div
      id="owner-dashboard"
      className="min-h-screen bg-neutral-50 flex flex-col font-sans text-neutral-900"
    >
      <OwnerHeader
        logoUrl={configLogo}
        companyName={configName}
        publicBookingUrl={buildOwnerPublicBookingUrl(tenantSlug)}
        onNavigateToClient={onNavigateToClient}
        onLogOut={onLogOut}
      />

      <div className="flex-1 flex flex-col lg:flex-row max-w-7xl w-full mx-auto">
        <OwnerSidebar
          activeTab={activeTab}
          onChangeTab={handleChangeOwnerTab}
          onOpenTodayAgenda={openTodayAgenda}
          subscriptionStatus={
            saasSubscription?.isOverdue
              ? "past_due"
              : saasSubscription?.subscriptionStatus || "trial"
          }
        />

        <main
          id="admin-workspace-pane"
          className="flex-1 p-4 sm:p-6 space-y-6 overflow-hidden"
        >
          {appointmentsLoadError && (
            <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-medium text-red-800">
              Não foi possível carregar a agenda real do Supabase: {appointmentsLoadError}
            </div>
          )}

          {isLoadingAppointments && (
            <div className="rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3 text-xs font-medium text-orange-800">
              Carregando agenda real do Supabase...
            </div>
          )}
          {activeTab === "painel" && (
            <DashboardHomeView
              baseDateStr={baseDateStr}
              appointments={appointments}
              professionals={professionals}
              services={services}
              configWorkDays={config.workDays}
              financialSummary={financialSummary}
              subscriptionStatus={saasSubscription?.subscriptionStatus || ""}
              subscriptionDaysUntilDue={saasSubscription?.daysUntilDue || 0}
              subscriptionIsDueSoon={saasSubscription?.isDueSoon === true}
              subscriptionIsOverdue={saasSubscription?.isOverdue === true}
              onChangeTab={setActiveTab}
              onOpenTodayAgenda={openTodayAgenda}
              onUpdateAppointmentStatus={handleModifyStatus}
            />
          )}

          {activeTab === "agenda" && (
            <AgendaView
              appointments={appointments}
              professionals={professionals}
              services={services}
              config={{
                ...config,
                maxFutureDays: Math.max(
                  1,
                  Number(bookingMaxFutureDays) || 10
                )
              }}
              clients={clients}
              quickOpenProfessionalAgendaId={quickOpenProfessionalAgendaId}
              quickOpenProfessionalAgendaKey={quickOpenProfessionalAgendaKey}
              onCreateAppointment={handleCreateAppointmentFromAgenda}
              onUpdateAppointmentStatus={handleModifyStatus}
            />
          )}

          {activeTab === "profissionais" && isLoadingProfessionals && (
            <div className="rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3 text-xs font-medium text-orange-800">
              Carregando profissionais reais do Supabase...
            </div>
          )}

          {activeTab === "profissionais" && (
            <ProfessionalsView
              professionals={professionals}
              onOpenCreateProfessional={handleOpenCreateProfessional}
              onEditProfessional={handleEditProfTrigger}
              onDeleteProfessional={handleDeleteProf}
              onHardDeleteProfessional={handleHardDeleteProf}
              onOpenPermissions={setShowPermissionModal}
              onGenerateProfessionalLink={handleGenerateProfessionalAccessLink}
              onOpenProfessionalAgenda={handleOpenProfessionalAgenda}
            />
          )}

          {activeTab === "servicos" && isLoadingServices && (
            <div className="rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3 text-xs font-medium text-orange-800">
              Carregando serviços reais do Supabase...
            </div>
          )}

          {activeTab === "servicos" && (
            <ServicesView
              services={sortedServices}
              categories={serviceCategories}
              categoryOrders={serviceCategoryOrders}
              categoryStatuses={serviceCategoryStatuses}
              onOpenCreateService={handleOpenCreateService}
              onEditService={handleEditServiceTrigger}
              onAddCategory={handleAddServiceCategory}
              onRenameCategory={handleRenameServiceCategory}
              onToggleCategoryActive={handleToggleServiceCategoryActive}
              onToggleServiceActive={handleToggleServiceActive}
              onDeleteService={handleDeleteService}
              onDeleteCategory={handleDeleteServiceCategory}
              onChangeCategoryOrder={handleChangeServiceCategoryOrder}
            />
          )}

          {activeTab === "produtos" && productsLoadError && (
            <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-medium text-red-800">
              Não foi possível carregar os produtos reais do Supabase: {productsLoadError}
            </div>
          )}

          {activeTab === "produtos" && isLoadingProducts && (
            <div className="rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3 text-xs font-medium text-orange-800">
              Carregando produtos reais do Supabase...
            </div>
          )}

          {activeTab === "produtos" && (
            <ProductsView
              products={products}
              onOpenCreateProduct={handleOpenCreateProduct}
              onEditProduct={handleEditProduct}
              onToggleProductActive={handleToggleProductActive}
              onDeleteProduct={handleDeleteProduct}
            />
          )}

          {activeTab === "clientes" && clientsLoadError && (
            <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-medium text-red-800">
              Não foi possível carregar clientes reais do Supabase: {clientsLoadError}
            </div>
          )}

          {activeTab === "clientes" && isLoadingClients && (
            <div className="rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3 text-xs font-medium text-orange-800">
              Carregando clientes reais do Supabase...
            </div>
          )}

          {activeTab === "clientes" && (
            <ClientsView
              clients={filteredClients}
              appointments={appointments}
              services={services}
              professionals={professionals}
              clientSearch={clientSearch}
              onChangeClientSearch={setClientSearch}
              onAddClient={handleAddManualClient}
              onUpdateClient={handleUpdateClient}
              onDeleteClient={handleDeleteClient}
            />
          )}

          {activeTab === "recebimentos" && financialRecordsLoadError && (
            <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-medium text-red-800">
              Não foi possível carregar o caixa real do Supabase: {financialRecordsLoadError}
            </div>
          )}

          {activeTab === "recebimentos" && isLoadingFinancialRecords && (
            <div className="rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3 text-xs font-medium text-orange-800">
              Carregando recebimentos e despesas reais do Supabase...
            </div>
          )}

          {activeTab === "recebimentos" && (
            <ReceiptsView
              clients={clients}
              appointments={appointments}
              services={services}
              products={products}
              professionals={professionals}
              receipts={receipts}
              cashExpenses={cashExpenses}
              companyName={configName}
              companyAddress={configAddress}
              companyPhone={configPhone}
              companyInstagram={configInstagram}
              onMarkAppointmentCompleted={
                handleMarkAppointmentCompletedForReceipt
              }
              onConfirmReceipt={handleConfirmReceipt}
              onConfirmExpense={handleConfirmCashExpense}
              onConfirmPendingReceiptPayment={handleConfirmPendingReceiptPayment}
            />
          )}

          {activeTab === "financeiro" && (
            <FinanceView
              professionals={professionals}
              services={services}
              completedAppointments={financialSummary.completedAppointments}
              receipts={receipts}
              cashExpenses={cashExpenses}
              companyName={configName}
              companyAddress={configAddress}
              companyPhone={configPhone}
              commissionPayments={commissionPayments}
              expenseTemplates={expenseTemplates}
              expensePayments={expensePayments}
              onPayCommission={handlePayCommission}
              onUpdateCommissionPaidAt={handleUpdateCommissionPaidAt}
              onUpdateCommissionPayment={handleUpdateCommissionPayment}
              onSaveExpenseTemplate={handleSaveExpenseTemplate}
              onDeleteExpenseTemplate={handleDeleteExpenseTemplate}
              onPayExpense={handlePayExpense}
              onUpdateExpensePayment={handleUpdateExpensePayment}
              onPeriodChange={setFinancialPeriod}
            />
          )}

          {activeTab === "mensalidade" && (
            <SubscriptionView
              subscription={saasSubscription}
              invoices={saasInvoices}
              loading={isLoadingSaasBilling}
              errorMessage={saasBillingError}
              onRefresh={loadSaasBilling}
            />
          )}

          {activeTab === "configuracoes" && (
            <SettingsView
              configName={configName}
              configAddress={configAddress}
              configPhone={configPhone}
              configInstagram={configInstagram}
              configLogo={configLogo}
              configCoverImage={configCoverImage}
              configDefaultTemplate={configDefaultTemplate}
              bookingMinLeadTimeMinutes={bookingMinLeadTimeMinutes}
              bookingMinCancelLeadTimeMinutes={bookingMinCancelLeadTimeMinutes}
              bookingMinRescheduleLeadTimeMinutes={
                bookingMinRescheduleLeadTimeMinutes
              }
              bookingAllowClientConfirmation={bookingAllowClientConfirmation}
              bookingAllowClientCancellation={bookingAllowClientCancellation}
              bookingAllowClientReschedule={bookingAllowClientReschedule}
              bookingSlotIntervalMinutes={bookingSlotIntervalMinutes}
              bookingMaxFutureDays={bookingMaxFutureDays}
              bookingWorkHoursStart={bookingWorkHoursStart}
              bookingWorkHoursEnd={bookingWorkHoursEnd}
              bookingLunchStart={bookingLunchStart}
              bookingLunchEnd={bookingLunchEnd}
              onChangeConfigName={setConfigName}
              onChangeConfigAddress={setConfigAddress}
              onChangeConfigPhone={setConfigPhone}
              onChangeConfigInstagram={setConfigInstagram}
              onChangeConfigLogo={setConfigLogo}
              onChangeConfigCoverImage={setConfigCoverImage}
              onChangeConfigDefaultTemplate={setConfigDefaultTemplate}
              onChangeBookingMinLeadTimeMinutes={setBookingMinLeadTimeMinutes}
              onChangeBookingMinCancelLeadTimeMinutes={
                setBookingMinCancelLeadTimeMinutes
              }
              onChangeBookingMinRescheduleLeadTimeMinutes={
                setBookingMinRescheduleLeadTimeMinutes
              }
              onChangeBookingAllowClientConfirmation={
                setBookingAllowClientConfirmation
              }
              onChangeBookingAllowClientCancellation={
                setBookingAllowClientCancellation
              }
              onChangeBookingAllowClientReschedule={
                setBookingAllowClientReschedule
              }
              onChangeBookingSlotIntervalMinutes={setBookingSlotIntervalMinutes}
              onChangeBookingMaxFutureDays={setBookingMaxFutureDays}
              onChangeBookingWorkHoursStart={setBookingWorkHoursStart}
              onChangeBookingWorkHoursEnd={setBookingWorkHoursEnd}
              onChangeBookingLunchStart={setBookingLunchStart}
              onChangeBookingLunchEnd={setBookingLunchEnd}
              isSaving={isSavingTenantSettings}
              saveSuccessVersion={settingsSaveSuccessVersion}
              saveSuccessMessage={settingsSaveMessage}
              onSubmit={handleSaveCompanyConfig}
            />
          )}
        </main>
      </div>

      {professionalPendingHardDelete && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-3xl border border-neutral-200 bg-white p-5 shadow-2xl">
            <h2 className="text-lg font-semibold text-[#1A3038]">
              Excluir profissional?
            </h2>

            <p className="mt-2 text-sm leading-relaxed text-neutral-600">
              Deseja excluir definitivamente{" "}
              <strong className="font-medium text-neutral-900">
                {professionalPendingHardDelete.name}
              </strong>
              ? A exclusão pode ser bloqueada caso existam agendamentos vinculados.
            </p>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleCancelHardDeleteProfessional}
                disabled={isDeletingProfessional}
                className="rounded-2xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Não
              </button>

              <button
                type="button"
                onClick={handleConfirmHardDeleteProfessional}
                disabled={isDeletingProfessional}
                className="rounded-2xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDeletingProfessional ? "Excluindo..." : "Sim, excluir"}
              </button>
            </div>
          </div>
        </div>
      )}

      <AppointmentModal
        isOpen={showApptModal}
        services={services}
        professionals={professionals}
        clientName={newApptClientName}
        clientPhone={newApptClientPhone}
        serviceId={newApptServiceId}
        professionalId={newApptProfId}
        date={newApptDate}
        time={newApptTime}
        notes={newApptNotes}
        paymentType={newApptPayment}
        onChangeClientName={setNewApptClientName}
        onChangeClientPhone={setNewApptClientPhone}
        onChangeServiceId={setNewApptServiceId}
        onChangeProfessionalId={setNewApptProfId}
        onChangeDate={setNewApptDate}
        onChangeTime={setNewApptTime}
        onChangeNotes={setNewApptNotes}
        onChangePaymentType={setNewApptPayment}
        onClose={() => setShowApptModal(false)}
        onSubmit={handleAddManualAppt}
      />

      <ProfessionalModal
        isOpen={showProfModal}
        editingProfessional={editingProf}
        services={services}
        name={profName}
        phone={profPhone}
        email={profEmail}
        role={profRole}
        avatar={profAvatar}
        active={profActive}
        displayOrder={profDisplayOrder}
        weeklySchedule={profWeeklySchedule}
        lunchStart={profLunchStart}
        lunchEnd={profLunchEnd}
        noLunchBreak={profNoLunchBreak}
        defaultAppointmentDuration={profDefaultAppointmentDuration}
        servicesIds={profServicesIds}
        remunerationType={profRemType}
        remunerationValue={profRemValue}
        onChangeName={setProfName}
        onChangePhone={setProfPhone}
        onChangeEmail={setProfEmail}
        onChangeRole={setProfRole}
        onChangeAvatar={setProfAvatar}
        onChangeActive={setProfActive}
        onChangeDisplayOrder={setProfDisplayOrder}
        onChangeWeeklySchedule={setProfWeeklySchedule}
        onChangeLunchStart={setProfLunchStart}
        onChangeLunchEnd={setProfLunchEnd}
        onChangeNoLunchBreak={setProfNoLunchBreak}
        onChangeDefaultAppointmentDuration={setProfDefaultAppointmentDuration}
        onChangeServicesIds={setProfServicesIds}
        onChangeRemunerationType={setProfRemType}
        onChangeRemunerationValue={setProfRemValue}
        isSaving={isSavingProfessional}
        onClose={() => {
          setShowProfModal(false);
          setEditingProf(null);
        }}
        onSubmit={handleAddNewProf}
      />

      <ServiceModal
        isOpen={showServiceModal}
        editingService={editingService}
        name={servName}
        category={servCategory}
        categories={serviceCategories}
        duration={servDuration}
        displayOrder={servDisplayOrder}
        price={servPrice}
        description={servDescription}
        active={servActive}
        requireDeposit={servRequireDeposit}
        depositValue={servDepositValue}
        onChangeName={setServName}
        onChangeCategory={setServCategory}
        onChangeDuration={setServDuration}
        onChangeDisplayOrder={setServDisplayOrder}
        onChangePrice={setServPrice}
        onChangeDescription={setServDescription}
        onChangeActive={setServActive}
        onChangeRequireDeposit={setServRequireDeposit}
        onChangeDepositValue={setServDepositValue}
        onClose={() => {
          setShowServiceModal(false);
          setEditingService(null);
        }}
        onSubmit={handleAddNewService}
      />

      {productPopup && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="h-1.5 bg-amber-500" />

            <div className="p-5 text-left">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-xl font-medium text-amber-700">
                !
              </div>

              <h2 className="mt-4 text-lg font-semibold text-neutral-950">
                {productPopup.title}
              </h2>

              <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">
                {productPopup.message}
              </p>

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => setProductPopup(null)}
                  className="rounded-xl bg-[#0f4c5c] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#123945]"
                >
                  Entendi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ownerFeedback && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="h-1.5 bg-[#E0A96D]" />

            <div className="p-5 text-left">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FBF4EC] text-xl font-medium text-[#8A663F]">
                !
              </div>

              <h2 className="mt-4 text-lg font-semibold text-neutral-950">
                {ownerFeedback.title}
              </h2>

              <p className="mt-2 whitespace-pre-line text-sm font-medium leading-relaxed text-slate-600">
                {ownerFeedback.message}
              </p>

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => setOwnerFeedback(null)}
                  className="rounded-xl bg-[#0f4c5c] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#123945]"
                >
                  Entendi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ownerConfirmation && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div
              className={`h-1.5 ${
                ownerConfirmation.tone === "danger"
                  ? "bg-red-600"
                  : "bg-amber-500"
              }`}
            />

            <div className="p-5 text-left">
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-2xl text-xl font-medium ${
                  ownerConfirmation.tone === "danger"
                    ? "bg-red-50 text-red-700"
                    : "bg-amber-50 text-amber-700"
                }`}
              >
                !
              </div>

              <h2 className="mt-4 text-lg font-semibold text-neutral-950">
                {ownerConfirmation.title}
              </h2>

              <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">
                {ownerConfirmation.message}
              </p>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeOwnerConfirmation}
                  disabled={isConfirmingOwnerAction}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={confirmOwnerAction}
                  disabled={isConfirmingOwnerAction}
                  className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    ownerConfirmation.tone === "danger"
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-amber-600 hover:bg-amber-700"
                  }`}
                >
                  {isConfirmingOwnerAction
                    ? "Processando..."
                    : ownerConfirmation.confirmLabel}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ProductModal
        isOpen={showProductModal}
        editingProduct={editingProduct}
        code={productCode}
        description={productDescription}
        quantity={productQuantity}
        costPrice={productCostPrice}
        salePrice={productSalePrice}
        active={productActive}
        isSaving={isSavingProduct}
        onChangeCode={setProductCode}
        onChangeDescription={setProductDescription}
        onChangeQuantity={setProductQuantity}
        onChangeCostPrice={setProductCostPrice}
        onChangeSalePrice={setProductSalePrice}
        onChangeActive={setProductActive}
        onClose={handleCloseProductModal}
        onSubmit={handleSaveProduct}
      />

      <PermissionsModal
        professional={showPermissionModal}
        onClose={() => setShowPermissionModal(null)}
        onApplySimplePermissions={handleApplySimplePermissions}
      />
    </div>
  );
}
