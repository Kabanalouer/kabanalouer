"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

// Formulaires des pages de revendication (/revendiquer, /retirer, /signaler,
// /revendiquer/verification) — appellent /api/claims/*. Rien n'est décidé ici :
// le serveur revalide le jeton et la session à chaque appel.

const PRIMARY_BUTTON =
  "inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-base font-semibold text-white hover:bg-primary-dark transition-colors disabled:opacity-60";
const SECONDARY_BUTTON =
  "inline-flex items-center justify-center rounded-full border border-charcoal-300 bg-white px-6 py-3 text-base font-semibold text-charcoal-800 hover:bg-charcoal-50 transition-colors";
const INPUT =
  "w-full rounded-xl border border-[#ebebeb] bg-white px-4 py-3 text-base text-charcoal-800 focus:outline-none focus:ring-2 focus:ring-primary/30";

type Status = "idle" | "submitting" | "done" | "error";

async function postJson(url: string, body: unknown): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return res.ok;
  } catch {
    return false;
  }
}

export function ClaimForm({
  token,
  count,
  signedInEmail,
  loginHref,
  signupHref,
  dashboardHref,
}: {
  token: string;
  count: number;
  signedInEmail: string | null;
  loginHref: string;
  signupHref: string;
  dashboardHref: string;
}) {
  const t = useTranslations("claim");
  const [status, setStatus] = useState<Status>("idle");

  async function activate() {
    setStatus("submitting");
    setStatus((await postJson("/api/claims/claim", { token })) ? "done" : "error");
  }

  if (status === "done") {
    return (
      <div role="status">
        <h2 className="text-heading-2 font-semibold text-charcoal-800">{t("doneTitle")}</h2>
        <p className="mt-2 text-base text-charcoal-600">{t("doneBody")}</p>
        <Link href={dashboardHref} className={`${PRIMARY_BUTTON} mt-6`}>{t("goDashboard")}</Link>
      </div>
    );
  }

  if (!signedInEmail) {
    return (
      <div>
        <p className="text-base text-charcoal-600">{t("accountNeeded")}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href={signupHref} className={PRIMARY_BUTTON}>{t("createAccount")}</Link>
          <Link href={loginHref} className={SECONDARY_BUTTON}>{t("signIn")}</Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-charcoal-500">{t("signedInAs", { email: signedInEmail })}</p>
      <button type="button" onClick={activate} disabled={status === "submitting"} className={`${PRIMARY_BUTTON} mt-4`}>
        {status === "submitting" ? t("activating") : t("activateButton", { count })}
      </button>
      {status === "error" && <p className="mt-3 text-sm text-error-600" role="alert">{t("activateError")}</p>}
    </div>
  );
}

export function RemoveForm({ token, title }: { token: string; title: string }) {
  const t = useTranslations("claim");
  const [status, setStatus] = useState<Status>("idle");

  async function remove() {
    setStatus("submitting");
    setStatus((await postJson("/api/claims/remove", { token })) ? "done" : "error");
  }

  if (status === "done") {
    return (
      <div role="status">
        <h2 className="text-heading-2 font-semibold text-charcoal-800">{t("removeDoneTitle")}</h2>
        <p className="mt-2 text-base text-charcoal-600">{t("removeDoneBody")}</p>
      </div>
    );
  }
  return (
    <div>
      <h2 className="text-heading-2 font-semibold text-charcoal-800">{t("removeTitle")}</h2>
      <p className="mt-2 text-base text-charcoal-600">{t("removeBody", { title })}</p>
      <button type="button" onClick={remove} disabled={status === "submitting"} className={`${PRIMARY_BUTTON} mt-6`}>
        {status === "submitting" ? t("removing") : t("removeButton")}
      </button>
      {status === "error" && <p className="mt-3 text-sm text-error-600" role="alert">{t("activateError")}</p>}
    </div>
  );
}

export function ReportForm({ token }: { token: string }) {
  const t = useTranslations("claim");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setStatus("submitting");
    setStatus((await postJson("/api/claims/report", { token, message })) ? "done" : "error");
  }

  if (status === "done") {
    return (
      <div role="status">
        <h2 className="text-heading-2 font-semibold text-charcoal-800">{t("reportDoneTitle")}</h2>
        <p className="mt-2 text-base text-charcoal-600">{t("reportDoneBody")}</p>
      </div>
    );
  }
  return (
    <form onSubmit={send}>
      <h2 className="text-heading-2 font-semibold text-charcoal-800">{t("reportTitle")}</h2>
      <p className="mt-2 text-base text-charcoal-600">{t("reportBody")}</p>
      <label htmlFor="report-message" className="mt-6 block text-sm font-medium text-charcoal-700">{t("messageLabel")}</label>
      <textarea
        id="report-message"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        maxLength={5000}
        rows={5}
        required
        className={`${INPUT} mt-1`}
      />
      <button type="submit" disabled={status === "submitting" || !message.trim()} className={`${PRIMARY_BUTTON} mt-4`}>
        {status === "submitting" ? t("sending") : t("send")}
      </button>
      {status === "error" && <p className="mt-3 text-sm text-error-600" role="alert">{t("activateError")}</p>}
    </form>
  );
}

const ACCEPTED_PROOF = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

export function VerificationForm({ listingId, title }: { listingId: string; title: string }) {
  const t = useTranslations("claim");
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status | "already" | "fileError">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    if (file.size > 5 * 1024 * 1024 || !ACCEPTED_PROOF.includes(file.type)) {
      setStatus("fileError");
      return;
    }
    setStatus("submitting");
    const form = new FormData();
    form.set("listingId", listingId);
    form.set("message", message);
    form.set("proof", file);
    try {
      const res = await fetch("/api/claims/request", { method: "POST", body: form });
      setStatus(res.ok ? "done" : res.status === 409 ? "already" : "error");
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div role="status">
        <h2 className="text-heading-2 font-semibold text-charcoal-800">{t("verifyDoneTitle")}</h2>
        <p className="mt-2 text-base text-charcoal-600">{t("verifyDoneBody")}</p>
      </div>
    );
  }
  return (
    <form onSubmit={submit}>
      <h2 className="text-heading-2 font-semibold text-charcoal-800">{t("verifyTitle")}</h2>
      <p className="mt-2 text-base text-charcoal-600">{t("verifyIntro")}</p>
      <p className="mt-1 text-sm text-charcoal-400">{t("verifyChalet", { title })}</p>

      <label htmlFor="verify-proof" className="mt-6 block text-sm font-medium text-charcoal-700">{t("verifyProof")}</label>
      <input
        id="verify-proof"
        type="file"
        required
        accept="image/jpeg,image/png,image/webp,application/pdf"
        onChange={(e) => { setFile(e.target.files?.[0] ?? null); setStatus("idle"); }}
        className="mt-1 block w-full text-base text-charcoal-600 file:mr-4 file:rounded-full file:border-0 file:bg-charcoal-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-charcoal-700"
      />
      <p className="mt-1 text-sm text-charcoal-400">{t("verifyProofHelp")}</p>

      <label htmlFor="verify-message" className="mt-5 block text-sm font-medium text-charcoal-700">{t("verifyMessage")}</label>
      <textarea
        id="verify-message"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        maxLength={5000}
        rows={4}
        className={`${INPUT} mt-1`}
      />
      <p className="mt-1 text-sm text-charcoal-400">{t("verifyMessageHelp")}</p>

      <button type="submit" disabled={status === "submitting" || !file} className={`${PRIMARY_BUTTON} mt-6`}>
        {status === "submitting" ? t("sending") : t("verifySubmit")}
      </button>
      {status === "already" && <p className="mt-3 text-sm text-charcoal-600" role="status">{t("verifyAlready")}</p>}
      {status === "fileError" && <p className="mt-3 text-sm text-error-600" role="alert">{t("verifyFileError")}</p>}
      {status === "error" && <p className="mt-3 text-sm text-error-600" role="alert">{t("verifyError")}</p>}
    </form>
  );
}
