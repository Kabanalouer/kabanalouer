"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";

const inputCls =
  "w-full border border-[#ebebeb] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition";

function SaveButton({ saving, saved, onClick, tSave, tSaving, tSaved }: {
  saving: boolean;
  saved: boolean;
  onClick: () => void;
  tSave: string;
  tSaving: string;
  tSaved: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={saving}
      className="bg-primary text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50"
    >
      {saving ? tSaving : saved ? tSaved : tSave}
    </button>
  );
}

function Toggle({ checked, onChange, label, description }: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <label className="flex items-start justify-between gap-4 cursor-pointer group">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-charcoal-800">{label}</p>
        {description && <p className="text-xs text-charcoal-400 mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={[
          "relative w-11 h-6 rounded-full transition-colors shrink-0 mt-0.5",
          checked ? "bg-primary" : "bg-charcoal-200",
        ].join(" ")}
      >
        <span
          className={[
            "absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-5" : "translate-x-0",
          ].join(" ")}
        />
      </button>
    </label>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-[#ebebeb] p-6 space-y-5">
      <div>
        <h2 className="text-base font-semibold text-charcoal-800">{title}</h2>
        {description && <p className="text-sm text-charcoal-400 mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  );
}

function ErrorMsg({ msg }: { msg: string }) {
  return msg ? <p className="text-sm text-red-500">{msg}</p> : null;
}

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ) : (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  );
}

function PasswordInput({
  value,
  onChange,
  autoComplete,
  showLabel,
  hideLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  showLabel: string;
  hideLabel: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        className="w-full border border-[#ebebeb] rounded-xl px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute inset-y-0 right-3 flex items-center text-charcoal-400 hover:text-charcoal-600 transition-colors"
        tabIndex={-1}
        aria-label={show ? hideLabel : showLabel}
      >
        <EyeIcon open={show} />
      </button>
    </div>
  );
}

export default function ProfileForm({
  userId,
  email,
  initialName,
  initialAvatarUrl,
  initialPhone,
  initialNotifPrefs,
  role,
  initialBio,
}: {
  userId: string;
  email: string;
  initialName: string;
  initialAvatarUrl: string | null;
  initialPhone: string;
  initialNotifPrefs: Record<string, boolean>;
  role: string;
  initialBio: string;
}) {
  const supabase = createClient();
  const t = useTranslations("profile");
  const tc = useTranslations("common");

  // ── Personal info ────────────────────────────────────────────────────────────
  const nameParts = initialName.trim().split(/\s+/);
  const [firstName, setFirstName] = useState(nameParts[0] ?? "");
  const [lastName, setLastName] = useState(nameParts.slice(1).join(" "));
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [infoSaving, setInfoSaving] = useState(false);
  const [infoSaved, setInfoSaved] = useState(false);
  const [infoError, setInfoError] = useState("");
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const uploadAvatar = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) { setInfoError(t("errorImageSize")); return; }
    setAvatarUploading(true);
    setInfoError("");
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${userId}/avatar.${ext}`;
    const { data, error } = await supabase.storage
      .from("avatars")
      .upload(path, file, { cacheControl: "3600", upsert: true });
    if (error) {
      console.error("[avatar upload]", error);
      setInfoError(t("errorUpload", { message: error.message }));
      setAvatarUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(data.path);
    const newUrl = `${urlData.publicUrl}?t=${Date.now()}`;
    await supabase.from("users").update({ avatar_url: urlData.publicUrl }).eq("id", userId);
    setAvatarUrl(newUrl);
    setAvatarUploading(false);
  };

  const deleteAvatar = async () => {
    if (!avatarUrl) return;
    const cleanUrl = avatarUrl.split("?")[0];
    const path = cleanUrl.split("/avatars/")[1];
    if (path) await supabase.storage.from("avatars").remove([path]);
    await supabase.from("users").update({ avatar_url: null }).eq("id", userId);
    setAvatarUrl(null);
  };

  const saveInfo = async () => {
    setInfoSaving(true);
    setInfoError("");
    const name = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
    const { error } = await supabase.from("users").update({ name }).eq("id", userId);
    setInfoSaving(false);
    if (error) setInfoError(t("errorSaving"));
    else { setInfoSaved(true); setTimeout(() => setInfoSaved(false), 2500); }
  };

  // ── Bio ──────────────────────────────────────────────────────────────────────
  const [bio, setBio] = useState(initialBio);
  const [bioSaving, setBioSaving] = useState(false);
  const [bioSaved, setBioSaved] = useState(false);
  const [bioError, setBioError] = useState("");
  const [bioGenerating, setBioGenerating] = useState(false);

  const saveBio = async () => {
    setBioSaving(true);
    setBioError("");
    const { error } = await supabase.from("users").update({ bio: bio.trim() || null }).eq("id", userId);
    setBioSaving(false);
    if (error) setBioError(t("errorSaving"));
    else { setBioSaved(true); setTimeout(() => setBioSaved(false), 2500); }
  };

  const generateBio = async () => {
    setBioGenerating(true);
    setBioError("");
    try {
      const res = await fetch("/api/ai/generate-bio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName: firstName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t("errorBioGeneration"));
      setBio(data.bio.slice(0, 300));
    } catch (e) {
      setBioError(e instanceof Error ? e.message : t("errorBioGeneration"));
    } finally {
      setBioGenerating(false);
    }
  };

  // ── Contact ──────────────────────────────────────────────────────────────────
  const [phone, setPhone] = useState(initialPhone);
  const [contactSaving, setContactSaving] = useState(false);
  const [contactSaved, setContactSaved] = useState(false);
  const [contactError, setContactError] = useState("");

  const saveContact = async () => {
    setContactSaving(true);
    setContactError("");
    const { error } = await supabase.from("users").update({ phone: phone.trim() || null }).eq("id", userId);
    setContactSaving(false);
    if (error) setContactError(t("errorSaving"));
    else { setContactSaved(true); setTimeout(() => setContactSaved(false), 2500); }
  };

  // ── Security ─────────────────────────────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdSaved, setPwdSaved] = useState(false);
  const [pwdError, setPwdError] = useState("");

  const changePassword = async () => {
    setPwdError("");
    if (!currentPassword) { setPwdError(t("errorEnterCurrentPassword")); return; }
    if (newPassword.length < 8) { setPwdError(t("errorPasswordLength")); return; }
    if (newPassword !== confirmPassword) { setPwdError(t("errorPasswordMismatch")); return; }
    setPwdSaving(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
    if (signInError) { setPwdError(t("errorCurrentPasswordWrong")); setPwdSaving(false); return; }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPwdSaving(false);
    if (error) setPwdError(error.message);
    else {
      setPwdSaved(true);
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      setTimeout(() => setPwdSaved(false), 2500);
    }
  };

  // ── Notifications ────────────────────────────────────────────────────────────
  const [notifMessages, setNotifMessages] = useState(initialNotifPrefs.notif_messages ?? true);
  const [notifFavorites, setNotifFavorites] = useState(initialNotifPrefs.notif_favorites ?? false);
  const [notifMonthly, setNotifMonthly] = useState(initialNotifPrefs.notif_monthly_report ?? false);
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifSaved, setNotifSaved] = useState(false);

  const saveNotifs = async () => {
    setNotifSaving(true);
    await supabase.from("users").update({
      notifications_prefs: {
        notif_messages: notifMessages,
        notif_favorites: notifFavorites,
        notif_monthly_report: notifMonthly,
      },
    }).eq("id", userId);
    setNotifSaving(false);
    setNotifSaved(true);
    setTimeout(() => setNotifSaved(false), 2500);
  };

  // ── Danger zone ──────────────────────────────────────────────────────────────
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [deactivated, setDeactivated] = useState(false);

  const deactivateAccount = async () => {
    setDeactivating(true);
    await supabase.from("listings").update({ is_published: false }).eq("host_id", userId);
    setDeactivating(false);
    setShowDeactivateConfirm(false);
    setDeactivated(true);
  };

  const initial = (firstName[0] ?? lastName[0] ?? "?").toUpperCase();

  return (
    <div className="space-y-6">

      {/* ── Informations personnelles ──────────────────────────────────────── */}
      <Section title={t("personalInfo")} description={t("personalInfoDesc")}>
        {/* Avatar */}
        <div className="flex items-center gap-5">
          <div className="relative w-20 h-20 shrink-0">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={t("avatarAlt")}
                fill
                className="rounded-full object-cover"
                sizes="80px"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center">
                <span className="text-white font-bold text-2xl">{initial}</span>
              </div>
            )}
            {avatarUploading && (
              <div className="absolute inset-0 rounded-full bg-black/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              disabled={avatarUploading}
              className="text-sm font-medium text-primary hover:text-primary-dark transition-colors disabled:opacity-50"
            >
              {avatarUrl ? t("changePhoto") : t("addPhoto")}
            </button>
            {avatarUrl && (
              <button
                type="button"
                onClick={deleteAvatar}
                className="text-sm text-charcoal-400 hover:text-red-500 transition-colors"
              >
                {t("deletePhoto")}
              </button>
            )}
            <p className="text-xs text-charcoal-400">{t("photoFormats")}</p>
          </div>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-charcoal-700 mb-1.5">{t("firstName")}</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className={inputCls}
              placeholder="Jean"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal-700 mb-1.5">{t("lastName")}</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className={inputCls}
              placeholder="Tremblay"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <SaveButton saving={infoSaving} saved={infoSaved} onClick={saveInfo} tSave={tc("save")} tSaving={tc("saving")} tSaved={tc("saved")} />
          <ErrorMsg msg={infoError} />
        </div>
      </Section>

      {/* ── Présentation du propriétaire (hosts only) ─────────────────────── */}
      {(role === "host" || role === "admin") && (
        <Section title={t("ownerPresentation")} description={t("ownerPresentationDesc")}>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-charcoal-700">{t("bio")}</label>
              <button
                type="button"
                onClick={generateBio}
                disabled={bioGenerating}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-dark transition-colors disabled:opacity-50"
              >
                {bioGenerating ? (
                  <>
                    <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {t("bioGenerating")}
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                    {t("bioGenerate")}
                  </>
                )}
              </button>
            </div>
            <div className="relative">
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, 300))}
                className="w-full border border-[#ebebeb] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition resize-none h-28 pb-6"
                placeholder={t("bioPlaceholder")}
                maxLength={300}
              />
              <span className="absolute bottom-2 right-3 text-xs text-charcoal-400 pointer-events-none">
                {bio.length} / 300
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <SaveButton saving={bioSaving} saved={bioSaved} onClick={saveBio} tSave={tc("save")} tSaving={tc("saving")} tSaved={tc("saved")} />
            <ErrorMsg msg={bioError} />
          </div>
        </Section>
      )}

      {/* ── Coordonnées ───────────────────────────────────────────────────── */}
      <Section title={t("contact")} description={t("contactDesc")}>
        <div>
          <label className="block text-sm font-medium text-charcoal-700 mb-1.5">{t("email")}</label>
          <input
            type="email"
            value={email}
            readOnly
            className="w-full border border-[#ebebeb] rounded-xl px-4 py-2.5 text-sm bg-charcoal-50 text-charcoal-400 cursor-default focus:outline-none"
          />
          <p className="text-xs text-charcoal-400 mt-1">{t("emailReadOnly")}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-charcoal-700 mb-1.5">
            {t("phone")} <span className="text-charcoal-400 font-normal">{t("optional")}</span>
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={inputCls}
            placeholder="+1 (418) 555-0100"
          />
        </div>
        <div className="flex items-center gap-3">
          <SaveButton saving={contactSaving} saved={contactSaved} onClick={saveContact} tSave={tc("save")} tSaving={tc("saving")} tSaved={tc("saved")} />
          <ErrorMsg msg={contactError} />
        </div>
      </Section>

      {/* ── Sécurité ──────────────────────────────────────────────────────── */}
      <Section title={t("security")}>
        <div>
          <label className="block text-sm font-medium text-charcoal-700 mb-1.5">{t("currentPassword")}</label>
          <PasswordInput value={currentPassword} onChange={setCurrentPassword} autoComplete="current-password" showLabel={t("showPassword")} hideLabel={t("hidePassword")} />
        </div>
        <div>
          <label className="block text-sm font-medium text-charcoal-700 mb-1.5">{t("newPassword")}</label>
          <PasswordInput value={newPassword} onChange={setNewPassword} autoComplete="new-password" showLabel={t("showPassword")} hideLabel={t("hidePassword")} />
          <p className="text-xs text-charcoal-400 mt-1">{t("passwordMinLength")}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-charcoal-700 mb-1.5">{t("confirmPassword")}</label>
          <PasswordInput value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" showLabel={t("showPassword")} hideLabel={t("hidePassword")} />
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={changePassword}
            disabled={pwdSaving}
            className="bg-primary text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            {pwdSaving ? t("changingPassword") : pwdSaved ? t("passwordChanged") : t("changePassword")}
          </button>
          <ErrorMsg msg={pwdError} />
        </div>
      </Section>

      {/* ── Préférences de notification ────────────────────────────────────── */}
      <Section title={t("notifications")}>
        <div className="space-y-5">
          <Toggle
            checked={notifMessages}
            onChange={setNotifMessages}
            label={t("notifMessages")}
            description={t("notifMessagesDesc")}
          />
          <Toggle
            checked={notifFavorites}
            onChange={setNotifFavorites}
            label={t("notifFavorites")}
            description={t("notifFavoritesDesc")}
          />
          <Toggle
            checked={notifMonthly}
            onChange={setNotifMonthly}
            label={t("notifMonthly")}
            description={t("notifMonthlyDesc")}
          />
        </div>
        <div className="pt-2">
          <SaveButton saving={notifSaving} saved={notifSaved} onClick={saveNotifs} tSave={tc("save")} tSaving={tc("saving")} tSaved={tc("saved")} />
        </div>
      </Section>

      {/* ── Zone de danger ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-red-100 p-6">
        <h2 className="text-base font-semibold text-charcoal-800 mb-1">{t("dangerZone")}</h2>
        <p className="text-sm text-charcoal-500 mb-5">
          {t("dangerZoneDesc")}
        </p>

        {deactivated ? (
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-700 font-medium">
            {t("deactivated")}
          </div>
        ) : !showDeactivateConfirm ? (
          <button
            type="button"
            onClick={() => setShowDeactivateConfirm(true)}
            className="border border-red-300 text-red-600 px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-red-50 transition-colors"
          >
            {t("deactivate")}
          </button>
        ) : (
          <div className="bg-red-50 border border-red-100 rounded-xl p-4 space-y-3">
            <p className="text-sm font-semibold text-red-700">{t("deactivateConfirm")}</p>
            <p className="text-sm text-red-600">
              {t("deactivateWarning")}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={deactivateAccount}
                disabled={deactivating}
                className="bg-red-600 text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deactivating ? t("deactivating") : t("deactivateYes")}
              </button>
              <button
                type="button"
                onClick={() => setShowDeactivateConfirm(false)}
                className="border border-[#ebebeb] text-charcoal-600 px-5 py-2 rounded-full text-sm font-medium hover:bg-charcoal-50 transition-colors"
              >
                {tc("cancel")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
