"use client";

import Link from "next/link";
import { useActionState } from "react";
import { createBlankListing, submitImportRequest, type ImportState } from "@/app/dashboard/listings/new/actions";

const initialState: ImportState = { status: "idle" };

const inputCls =
  "w-full rounded-xl border border-[#ebebeb] px-4 py-2.5 text-sm text-charcoal-800 placeholder-charcoal-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors";

export default function NewListingStepZero() {
  const [state, importAction, isPending] = useActionState(submitImportRequest, initialState);

  if (state.status === "success") {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
          <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-charcoal-800 mb-3">Demande envoyée</h2>
        <p className="text-charcoal-500 leading-relaxed mb-8">
          On s&apos;occupe de tout — vous recevrez votre annonce par email dans 24h.
        </p>
        <Link
          href="/dashboard/listings"
          className="inline-flex items-center gap-2 bg-primary text-white font-bold px-7 py-3.5 rounded-full hover:bg-primary/90 transition-colors text-sm"
        >
          Retour vers mes chalets
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-10">
        <h1 className="text-2xl font-bold text-charcoal-800">Ajouter un chalet</h1>
        <p className="text-charcoal-500 mt-1.5 text-sm">
          Comment voulez-vous créer votre annonce ?
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Card 1 — Créer manuellement */}
        <div className="bg-white border border-[#ebebeb] rounded-2xl p-7 flex flex-col hover:border-primary/30 transition-colors">
          <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center mb-5 shrink-0">
            <PencilIcon />
          </div>
          <h2 className="text-lg font-bold text-charcoal-800 mb-2">
            Créer mon annonce manuellement
          </h2>
          <p className="text-charcoal-500 text-sm leading-relaxed mb-7 flex-1">
            Remplissez le formulaire en 12 étapes guidées. Photos, description, disponibilités — tout en un seul endroit.
          </p>
          <form action={createBlankListing}>
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 bg-primary text-white font-bold px-6 py-3.5 rounded-full hover:bg-primary/90 transition-colors text-sm"
            >
              Commencer →
            </button>
          </form>
        </div>

        {/* Card 2 — Import depuis Airbnb */}
        <div className="bg-white border border-[#ebebeb] rounded-2xl p-7 flex flex-col hover:border-primary/30 transition-colors">
          <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center mb-5 shrink-0">
            <LinkIcon />
          </div>
          <h2 className="text-lg font-bold text-charcoal-800 mb-2">
            J&apos;ai déjà une annonce Airbnb ou Chalets.com
          </h2>
          <p className="text-charcoal-500 text-sm leading-relaxed mb-7">
            Collez le lien de votre annonce existante et on s&apos;occupe de tout. Votre annonce sera prête dans 24h.
          </p>
          <form action={importAction} className="space-y-3 mt-auto">
            <div>
              <label htmlFor="listing-url" className="block text-sm font-medium text-charcoal-700 mb-1.5">
                Lien de votre annonce
              </label>
              <input
                id="listing-url"
                name="listing_url"
                type="url"
                required
                placeholder="https://www.airbnb.ca/rooms/..."
                className={inputCls}
              />
            </div>
            {state.status === "error" && (
              <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                {state.message}
              </p>
            )}
            <button
              type="submit"
              disabled={isPending}
              className="w-full inline-flex items-center justify-center gap-2 border border-primary text-primary font-bold px-6 py-3.5 rounded-full hover:bg-primary/5 transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm"
            >
              {isPending ? "Envoi en cours…" : "Envoyer →"}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}

function PencilIcon() {
  return (
    <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
    </svg>
  );
}
