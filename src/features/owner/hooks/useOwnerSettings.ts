import React, { useEffect, useState } from "react";

import { EstablishmentConfig } from "../../../types";
import { OwnerDashboardProps } from "../owner.types";
import {
  TenantSettingsResponse,
  SettingsViewMediaFiles,
  legacyDataUrlToPreparedImage,
  uploadTenantPublicImage,
  mapTenantSettingsToConfig,
} from "../owner.data";
import { supabase } from "../../../lib/supabase";

interface UseOwnerSettingsParams {
  state: OwnerDashboardProps["state"];
  onUpdateState: OwnerDashboardProps["onUpdateState"];
  showOwnerFeedback: (message: string, title?: string) => void;
}

export function useOwnerSettings({
  state,
  onUpdateState,
  showOwnerFeedback,
}: UseOwnerSettingsParams) {
  const { config } = state;

  const [configName, setConfigName] = useState(config.name);
  const [configAddress, setConfigAddress] = useState(config.address);
  const [configPhone, setConfigPhone] = useState(config.phone);
  const [configInstagram, setConfigInstagram] = useState(config.instagram);
  const [configLogo, setConfigLogo] = useState(config.logo);
  const [configCoverImage, setConfigCoverImage] = useState(config.coverImage);
  const [configAutoApprove] = useState(config.autoApprove);
  const [configDefaultTemplate, setConfigDefaultTemplate] = useState(
    config.defaultMsgTemplate,
  );
  const [bookingMinLeadTimeMinutes, setBookingMinLeadTimeMinutes] = useState(
    config.minLeadTimeMinutes || 0,
  );
  const [bookingMinCancelLeadTimeMinutes, setBookingMinCancelLeadTimeMinutes] =
    useState(120);
  const [
    bookingMinRescheduleLeadTimeMinutes,
    setBookingMinRescheduleLeadTimeMinutes,
  ] = useState(120);
  const [bookingAllowClientConfirmation, setBookingAllowClientConfirmation] =
    useState(true);
  const [bookingAllowClientCancellation, setBookingAllowClientCancellation] =
    useState(true);
  const [bookingAllowClientReschedule, setBookingAllowClientReschedule] =
    useState(true);
  const [bookingSlotIntervalMinutes, setBookingSlotIntervalMinutes] =
    useState(30);
  const [bookingMaxFutureDays, setBookingMaxFutureDays] = useState(
    config.maxFutureDays || 14,
  );
  const [bookingWorkHoursStart, setBookingWorkHoursStart] = useState(
    config.workHoursStart || "08:00",
  );
  const [bookingWorkHoursEnd, setBookingWorkHoursEnd] = useState(
    config.workHoursEnd || "19:00",
  );
  const [bookingLunchStart, setBookingLunchStart] = useState("12:00");
  const [bookingLunchEnd, setBookingLunchEnd] = useState("13:00");

  const [tenantId, setTenantId] = useState("");
  const [tenantSlug, setTenantSlug] = useState("");
  const [isSavingTenantSettings, setIsSavingTenantSettings] = useState(false);
  const [settingsSaveSuccessVersion, setSettingsSaveSuccessVersion] =
    useState(0);
  const [settingsSaveMessage, setSettingsSaveMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadTenantSettings() {
      const { data, error } = await supabase.rpc("get_my_tenant_settings");

      if (!isMounted) return;

      if (error) {
        console.error(
          "Erro ao carregar configurações da empresa:",
          error.message,
        );
        return;
      }

      const firstSettings = (
        Array.isArray(data) ? data[0] : null
      ) as TenantSettingsResponse | null;

      if (!firstSettings) return;

      setTenantId(firstSettings.tenant_id || "");

      const settingsSlug = String(
        firstSettings.tenant_slug || firstSettings.slug || "",
      ).trim();

      if (settingsSlug) {
        setTenantSlug(settingsSlug);
      } else {
        const { data: ownerContextData, error: ownerContextError } =
          await supabase.rpc("get_my_owner_context");

        if (ownerContextError) {
          console.error(
            "Erro ao carregar o link público da agenda:",
            ownerContextError.message,
          );
        } else {
          const ownerContext = Array.isArray(ownerContextData)
            ? ownerContextData[0]
            : ownerContextData;

          setTenantSlug(
            String(ownerContext?.tenant_slug || ownerContext?.slug || "").trim(),
          );
        }
      }

      const nextConfig = mapTenantSettingsToConfig(config, firstSettings);

      setConfigName(nextConfig.name);
      setConfigAddress(nextConfig.address);
      setConfigPhone(nextConfig.phone);
      setConfigInstagram(nextConfig.instagram);
      setConfigLogo(nextConfig.logo);
      setConfigCoverImage(nextConfig.coverImage);
      setConfigDefaultTemplate(nextConfig.defaultMsgTemplate);
      setBookingMinLeadTimeMinutes(nextConfig.minLeadTimeMinutes || 0);
      setBookingMinCancelLeadTimeMinutes(
        Number(firstSettings.booking_min_cancel_lead_time_minutes ?? 120),
      );
      setBookingMinRescheduleLeadTimeMinutes(
        Number(firstSettings.booking_min_reschedule_lead_time_minutes ?? 120),
      );
      setBookingAllowClientConfirmation(
        Boolean(firstSettings.booking_allow_client_confirmation ?? true),
      );
      setBookingAllowClientCancellation(
        Boolean(firstSettings.booking_allow_client_cancellation ?? true),
      );
      setBookingAllowClientReschedule(
        Boolean(firstSettings.booking_allow_client_reschedule ?? true),
      );
      setBookingSlotIntervalMinutes(
        Number(firstSettings.booking_slot_interval_minutes ?? 30),
      );
      setBookingMaxFutureDays(nextConfig.maxFutureDays || 14);
      setBookingWorkHoursStart(nextConfig.workHoursStart || "08:00");
      setBookingWorkHoursEnd(nextConfig.workHoursEnd || "19:00");
      setBookingLunchStart(firstSettings.booking_lunch_start || "12:00");
      setBookingLunchEnd(firstSettings.booking_lunch_end || "13:00");

      onUpdateState({
        ...state,
        config: nextConfig,
      });
    }

    void loadTenantSettings();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveCompanyConfig = async (
    event: React.FormEvent,
    mediaFiles: SettingsViewMediaFiles,
  ) => {
    event.preventDefault();

    if (isSavingTenantSettings) return;

    if (!tenantId) {
      showOwnerFeedback(
        "Não foi possível identificar a empresa para salvar as imagens.",
      );
      return;
    }

    setSettingsSaveMessage("");
    setIsSavingTenantSettings(true);

    try {
      let nextLogoUrl = configLogo;
      let nextCoverUrl = configCoverImage;

      let logoFileToUpload = mediaFiles.logoFile;
      let coverFileToUpload = mediaFiles.coverFile;

      if (!logoFileToUpload && configLogo.startsWith("data:image/")) {
        logoFileToUpload = await legacyDataUrlToPreparedImage({
          dataUrl: configLogo,
          maxWidth: 500,
          maxHeight: 500,
          maxOutputBytes: 150 * 1024,
          outputFileName: "logo.webp",
        });
      }

      if (!coverFileToUpload && configCoverImage.startsWith("data:image/")) {
        coverFileToUpload = await legacyDataUrlToPreparedImage({
          dataUrl: configCoverImage,
          maxWidth: 1600,
          maxHeight: 700,
          maxOutputBytes: 300 * 1024,
          outputFileName: "cover.webp",
        });
      }

      if (logoFileToUpload) {
        nextLogoUrl = await uploadTenantPublicImage({
          bucket: "tenant-logos",
          path: `${tenantId}/logo.webp`,
          file: logoFileToUpload,
        });
      }

      if (coverFileToUpload) {
        nextCoverUrl = await uploadTenantPublicImage({
          bucket: "tenant-covers",
          path: `${tenantId}/cover.webp`,
          file: coverFileToUpload,
        });
      }

      const { data, error } = await supabase.rpc("update_my_tenant_settings", {
        p_name: configName,
        p_address: configAddress,
        p_phone: configPhone,
        p_instagram: configInstagram,
        p_logo_url: nextLogoUrl,
        p_cover_url: nextCoverUrl,
        p_default_msg_template: configDefaultTemplate,
        p_booking_min_lead_time_minutes: bookingMinLeadTimeMinutes,
        p_booking_min_cancel_lead_time_minutes:
          bookingMinCancelLeadTimeMinutes,
        p_booking_min_reschedule_lead_time_minutes:
          bookingMinRescheduleLeadTimeMinutes,
        p_booking_allow_client_confirmation: bookingAllowClientConfirmation,
        p_booking_allow_client_cancellation: bookingAllowClientCancellation,
        p_booking_allow_client_reschedule: bookingAllowClientReschedule,
        p_booking_slot_interval_minutes: bookingSlotIntervalMinutes,
        p_booking_max_future_days: bookingMaxFutureDays,
        p_booking_work_hours_start: bookingWorkHoursStart,
        p_booking_work_hours_end: bookingWorkHoursEnd,
        p_booking_lunch_start: bookingLunchStart,
        p_booking_lunch_end: bookingLunchEnd,
      });

      if (error) {
        throw new Error(
          error.message || "Não foi possível salvar as configurações.",
        );
      }

      const saveResult = Array.isArray(data) ? data[0] : null;

      if (saveResult && saveResult.success === false) {
        throw new Error(
          saveResult.message ||
            "Não foi possível salvar as configurações no Supabase.",
        );
      }

      const updatedConfig: EstablishmentConfig = {
        ...config,
        name: configName,
        address: configAddress,
        phone: configPhone,
        instagram: configInstagram,
        logo: nextLogoUrl,
        coverImage: nextCoverUrl,
        workHoursStart: bookingWorkHoursStart,
        workHoursEnd: bookingWorkHoursEnd,
        minLeadTimeMinutes: bookingMinLeadTimeMinutes,
        maxFutureDays: bookingMaxFutureDays,
        autoApprove: configAutoApprove,
        defaultMsgTemplate: configDefaultTemplate,
      };

      setConfigLogo(nextLogoUrl);
      setConfigCoverImage(nextCoverUrl);

      onUpdateState({
        ...state,
        config: updatedConfig,
      });

      setSettingsSaveMessage("Alterações salvas com sucesso.");
      setSettingsSaveSuccessVersion((currentVersion) => currentVersion + 1);
    } catch (error) {
      setSettingsSaveMessage("");
      console.error("Erro ao salvar configurações da empresa:", error);
      showOwnerFeedback(
        error instanceof Error
          ? `Não foi possível salvar: ${error.message}`
          : "Não foi possível salvar as configurações.",
      );
    } finally {
      setIsSavingTenantSettings(false);
    }
  };

  return {
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
  };
}