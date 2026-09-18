// JSON-LD pour la fiche publique d'un chalet — SEO (Google) et GEO (agents
// IA). Deux blocs distincts générés à partir des mêmes données : le schéma
// LodgingBusiness (buildListingJsonLd) et un FAQPage (buildListingFaqJsonLd)
// limité aux faits connus avec certitude, jamais des questions inventées.

import { getAmenityLabels, type AmenityValue } from "@/lib/amenities-catalog";

export interface ListingSchemaInput {
  title: string;
  description: string | null;
  photoUrls: string[];
  url: string;
  city: string | null;
  region: string | null;
  latitude: number | null;
  longitude: number | null;
  checkinTime: string | null;
  checkoutTime: string | null;
  priceOnRequest: boolean;
  priceLow: number;
  priceHigh: number;
  amenities: AmenityValue[];
  locale: string;
  bedroomCount: number;
  bathrooms: number;
  capacity: number;
  petsAllowed: boolean;
  smokingAllowed: boolean;
  citqNumber: string | null;
  reviewCount: number;
  avgRating: number;
}

export function buildListingJsonLd(input: ListingSchemaInput): Record<string, unknown> {
  const isEn = input.locale === "en";

  const makesOffer = input.priceOnRequest
    ? { "@type": "Offer", priceCurrency: "CAD", availability: "https://schema.org/InStock" }
    : input.priceLow > 0
    ? {
        "@type": "Offer",
        priceSpecification: {
          "@type": "PriceSpecification",
          minPrice: input.priceLow,
          ...(input.priceHigh > input.priceLow ? { maxPrice: input.priceHigh } : {}),
          priceCurrency: "CAD",
        },
      }
    : null;

  return {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    name: input.title,
    description: input.description ?? "",
    image: input.photoUrls,
    url: input.url,
    address: {
      "@type": "PostalAddress",
      addressLocality: input.city ?? input.region ?? "",
      addressRegion: input.region ?? "",
      addressCountry: "CA",
    },
    ...(input.latitude && input.longitude
      ? { geo: { "@type": "GeoCoordinates", latitude: input.latitude, longitude: input.longitude } }
      : {}),
    ...(input.checkinTime ? { checkinTime: input.checkinTime } : {}),
    ...(input.checkoutTime ? { checkoutTime: input.checkoutTime } : {}),
    amenityFeature: getAmenityLabels(input.amenities, input.locale).map((name) => ({
      "@type": "LocationFeatureSpecification",
      name,
      value: true,
    })),
    numberOfBedrooms: input.bedroomCount,
    numberOfBathroomsTotal: input.bathrooms,
    occupancy: { "@type": "QuantitativeValue", maxValue: input.capacity, unitText: isEn ? "people" : "personnes" },
    petsAllowed: input.petsAllowed,
    // "smokingAllowed" n'existe pas dans le vocabulaire schema.org — passé en
    // additionalProperty (mécanisme d'extension générique) plutôt qu'inventé
    // comme propriété directe.
    additionalProperty: [
      {
        "@type": "PropertyValue",
        name: isEn ? "Smoking allowed" : "Fumeurs acceptés",
        value: input.smokingAllowed,
      },
    ],
    ...(input.citqNumber
      ? { identifier: { "@type": "PropertyValue", propertyID: "CITQ", value: input.citqNumber } }
      : {}),
    ...(makesOffer ? { makesOffer } : {}),
    ...(input.reviewCount > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: input.avgRating.toFixed(1),
            reviewCount: input.reviewCount,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
  };
}

export function buildListingFaqJsonLd(input: ListingSchemaInput): Record<string, unknown> | null {
  const isEn = input.locale === "en";
  const questions: { question: string; answer: string }[] = [];

  questions.push({
    question: isEn ? `Are pets allowed at ${input.title}?` : `Les animaux sont-ils acceptés à ${input.title} ?`,
    answer: input.petsAllowed
      ? isEn
        ? `Yes, pets are allowed at ${input.title}.`
        : `Oui, les animaux de compagnie sont acceptés à ${input.title}.`
      : isEn
      ? `No, pets are not allowed at ${input.title}.`
      : `Non, les animaux de compagnie ne sont pas acceptés à ${input.title}.`,
  });

  questions.push({
    question: isEn ? `Is smoking allowed at ${input.title}?` : `Peut-on fumer à ${input.title} ?`,
    answer: input.smokingAllowed
      ? isEn
        ? `Yes, smoking is allowed at ${input.title}.`
        : `Oui, il est permis de fumer à ${input.title}.`
      : isEn
      ? `No, smoking is not allowed at ${input.title}.`
      : `Non, il n'est pas permis de fumer à ${input.title}.`,
  });

  if (input.checkinTime && input.checkoutTime) {
    const checkin = input.checkinTime.replace(":", isEn ? ":" : "h");
    const checkout = input.checkoutTime.replace(":", isEn ? ":" : "h");
    questions.push({
      question: isEn ? "What are the check-in and check-out times?" : "Quelle est l'heure d'arrivée et de départ ?",
      answer: isEn
        ? `Check-in is from ${checkin}, and check-out is before ${checkout}.`
        : `L'arrivée se fait à partir de ${checkin}, et le départ avant ${checkout}.`,
    });
  }

  // Gratuité du stationnement : seulement si le proprio a explicitement
  // rempli ce sous-détail (voir lib/amenities-catalog.ts, entrée
  // "stationnement") — jamais une supposition si le champ n'a jamais été
  // renseigné.
  const parking = input.amenities.find((a) => a.id === "stationnement");
  const parkingFree = parking?.details?.gratuit;
  if (parking && typeof parkingFree === "boolean") {
    questions.push({
      question: isEn ? "Is parking free?" : "Le stationnement est-il gratuit ?",
      answer: parkingFree
        ? isEn
          ? "Yes, parking is free."
          : "Oui, le stationnement est gratuit."
        : isEn
        ? "No, parking is not free."
        : "Non, le stationnement n'est pas gratuit.",
    });
  }

  if (questions.length === 0) return null;

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: questions.map((q) => ({
      "@type": "Question",
      name: q.question,
      acceptedAnswer: { "@type": "Answer", text: q.answer },
    })),
  };
}
