"use client";

import Link from "next/link";
import { useState } from "react";
import { useActionState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { submitImportRequest, type ImportRequestState } from "@/app/devenir-hote/actions";
import { localePath } from "@/lib/localePath";

const initialState: ImportRequestState = { status: "idle" };

const inputCls =
  "w-full rounded-xl border border-[#ebebeb] px-4 py-2.5 text-sm text-charcoal-800 placeholder-charcoal-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors";

export default function CreationChoiceSection() {
  const t = useTranslations("creationChoice");
  const locale = useLocale();
  const [formOpen, setFormOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(submitImportRequest, initialState);

  return (
    <section className="py-20 bg-white border-b border-[#ebebeb]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-charcoal-800">
            {t("title")}
          </h2>
          <p className="text-charcoal-500 mt-3">
            {t("subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">

          {/* Card 1 — Self-create */}
          <div className="border border-[#ebebeb] rounded-2xl p-8 flex flex-col h-full hover:border-primary/30 transition-colors">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-5 shrink-0">
              <PencilIcon />
            </div>
            <h3 className="text-xl font-bold text-charcoal-800 mb-3">
              {t("card1Title")}
            </h3>
            <p className="text-charcoal-500 text-sm leading-relaxed mb-8 flex-1">
              {t("card1Desc")}
            </p>
            <Link
              href={localePath("/signup?role=host", locale)}
              className="inline-flex items-center justify-center gap-2 bg-primary text-white font-bold px-6 py-3.5 rounded-full hover:bg-primary/90 transition-colors text-sm"
            >
              {t("card1Btn")}
            </Link>
          </div>

          {/* Card 2 — Import from Airbnb */}
          <div className="border border-[#ebebeb] rounded-2xl p-8 flex flex-col hover:border-primary/30 transition-colors">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-5 shrink-0">
              <LinkIcon />
            </div>
            <h3 className="text-xl font-bold text-charcoal-800 mb-3">
              {t("card2Title")}
            </h3>
            <p className="text-charcoal-500 text-sm leading-relaxed mb-8">
              {t("card2Desc")}
            </p>

            {state.status === "success" ? (
              <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center shrink-0 mt-0.5">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-sm text-green-800 font-medium leading-snug">
                  {t("successMsg")}
                </p>
              </div>
            ) : !formOpen ? (
              <button
                onClick={() => setFormOpen(true)}
                className="inline-flex items-center justify-center gap-2 border border-primary text-primary font-bold px-6 py-3.5 rounded-full hover:bg-primary/5 transition-colors text-sm"
              >
                {t("card2Btn")}
              </button>
            ) : (
              <form action={formAction} className="space-y-4">
                <div>
                  <label htmlFor="import-name" className="block text-sm font-medium text-charcoal-700 mb-1.5">
                    {t("formName")}
                  </label>
                  <input
                    id="import-name"
                    name="name"
                    type="text"
                    required
                    autoComplete="name"
                    placeholder={t("formNamePlaceholder")}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label htmlFor="import-email" className="block text-sm font-medium text-charcoal-700 mb-1.5">
                    {t("formEmail")}
                  </label>
                  <input
                    id="import-email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder={t("formEmailPlaceholder")}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label htmlFor="import-url" className="block text-sm font-medium text-charcoal-700 mb-1.5">
                    {t("formUrl")}
                  </label>
                  <input
                    id="import-url"
                    name="listing_url"
                    type="url"
                    required
                    placeholder={t("formUrlPlaceholder")}
                    className={inputCls}
                  />
                </div>

                {state.status === "error" && (
                  <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                    {state.message}
                  </p>
                )}

                <div className="flex gap-3 pt-1">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="flex-1 inline-flex items-center justify-center bg-primary text-white font-bold py-3 rounded-full hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm"
                  >
                    {isPending ? t("formSending") : t("formSend")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormOpen(false)}
                    className="px-5 py-3 text-sm text-charcoal-400 hover:text-charcoal-600 transition-colors rounded-full hover:bg-charcoal-50"
                  >
                    {t("formCancel")}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function PencilIcon() {
  return (
    <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
    </svg>
  );
}
