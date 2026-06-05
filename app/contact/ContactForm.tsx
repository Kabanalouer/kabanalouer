"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { submitContactForm, type ContactFormState } from "./actions";

const initialState: ContactFormState = { status: "idle" };

const inputCls =
  "w-full rounded-xl border border-[#ebebeb] px-4 py-2.5 text-sm text-charcoal-800 placeholder-charcoal-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors";

export default function ContactForm() {
  const t = useTranslations("contact");
  const [state, formAction, isPending] = useActionState(submitContactForm, initialState);

  const SUBJECTS = [
    t("subject0"),
    t("subject1"),
    t("subject2"),
    t("subject3"),
    t("subject4"),
    t("subject5"),
  ];

  if (state.status === "success") {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-charcoal-800 mb-2">{t("successTitle")}</h3>
        <p className="text-sm text-charcoal-600 leading-relaxed">
          {t("successBodyPre")}{" "}
          <strong>{t("successBodyStrong")}</strong>.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      {/* First name + Last name */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="first-name" className="block text-sm font-medium text-charcoal-700 mb-1.5">
            {t("formFirstName")} <span className="text-red-400">*</span>
          </label>
          <input
            id="first-name"
            name="first_name"
            type="text"
            required
            autoComplete="given-name"
            className={inputCls}
            placeholder="Marie"
          />
        </div>
        <div>
          <label htmlFor="last-name" className="block text-sm font-medium text-charcoal-700 mb-1.5">
            {t("formLastName")} <span className="text-red-400">*</span>
          </label>
          <input
            id="last-name"
            name="last_name"
            type="text"
            required
            autoComplete="family-name"
            className={inputCls}
            placeholder="Tremblay"
          />
        </div>
      </div>

      {/* Email */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-charcoal-700 mb-1.5">
          {t("formEmail")} <span className="text-red-400">*</span>
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className={inputCls}
          placeholder={t("formEmailPlaceholder")}
        />
      </div>

      {/* Subject */}
      <div>
        <label htmlFor="subject" className="block text-sm font-medium text-charcoal-700 mb-1.5">
          {t("formSubject")} <span className="text-red-400">*</span>
        </label>
        <select
          id="subject"
          name="subject"
          required
          defaultValue=""
          className="w-full rounded-xl border border-[#ebebeb] px-4 py-2.5 text-sm text-charcoal-800 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors bg-white"
        >
          <option value="" disabled>{t("formSubjectPlaceholder")}</option>
          {SUBJECTS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Message */}
      <div>
        <label htmlFor="message" className="block text-sm font-medium text-charcoal-700 mb-1.5">
          {t("formMessage")} <span className="text-red-400">*</span>
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={5}
          className="w-full rounded-xl border border-[#ebebeb] px-4 py-2.5 text-sm text-charcoal-800 placeholder-charcoal-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors resize-none"
          placeholder={t("formMessagePlaceholder")}
        />
      </div>

      {/* Error */}
      {state.status === "error" && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full inline-flex items-center justify-center bg-primary text-white font-bold py-3.5 rounded-full hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm"
      >
        {isPending ? t("formSending") : t("formSubmit")}
      </button>
    </form>
  );
}
