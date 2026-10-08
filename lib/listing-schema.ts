// JSON-LD pour la fiche publique d'un chalet — SEO (Google) et GEO (agents
// IA). Deux blocs distincts générés à partir des mêmes données : le schéma
// VacationRental (buildListingJsonLd) et un FAQPage (buildListingFaqJsonLd)
// limité aux faits connus avec certitude, jamais des questions inventées.

import { getAmenityCatalogEntry, summarizeAmenityDetails, type AmenityValue } from "@/lib/amenities-catalog";
import { dogFeeLabel, dogPolicyDetails, dogSizeLabel, type DogPolicy } from "@/lib/dogPolicy";
import { metaDescription } from "@/lib/metaText";
import { accessibilityFeatureLabel, accessibleLabel, type AccessibilityInfo } from "@/lib/accessibility";

// Une note « 5,0 sur 1 avis » n'apporte rien et attire l'attention des
// filtres anti-spam de Google : la note n'est déclarée dans le JSON-LD qu'à
// partir de quelques avis (elle reste toujours affichée sur la fiche).
const MIN_REVIEWS_FOR_RATING = 3;

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
  dogPolicy: DogPolicy;
  accessibility: AccessibilityInfo;
  smokingAllowed: boolean;
  citqNumber: string | null;
  reviewCount: number;
  avgRating: number;
}

export function buildListingJsonLd(input: ListingSchemaInput): Record<string, unknown> {
  const isEn = input.locale === "en";

  // « Prix sur demande » : aucune offre déclarée plutôt qu'une offre sans prix
  const makesOffer = !input.priceOnRequest && input.priceLow > 0
    ? {
        "@type": "Offer",
        priceSpecification: {
          "@type": "UnitPriceSpecification",
          price: input.priceLow,
          ...(input.priceHigh > input.priceLow ? { minPrice: input.priceLow, maxPrice: input.priceHigh } : {}),
          priceCurrency: "CAD",
          unitCode: "DAY",
          unitText: isEn ? "night" : "nuit",
        },
      }
    : null;
  const priceRange = makesOffer
    ? isEn
      ? `$${input.priceLow}${input.priceHigh > input.priceLow ? `–$${input.priceHigh}` : "+"} CAD per night`
      : `${input.priceLow}${input.priceHigh > input.priceLow ? `\u00a0$ – ${input.priceHigh}` : ""}\u00a0$ CAD par nuit`
    : null;

  // Le logement lui-même (chambres, capacité, équipements) : VacationRental
  // le place dans containsPlace, pas à la racine.
  const accommodation: Record<string, unknown> = {
    "@type": "Accommodation",
    additionalType: "EntirePlace",
    numberOfBedrooms: input.bedroomCount,
    numberOfBathroomsTotal: input.bathrooms,
    occupancy: { "@type": "QuantitativeValue", maxValue: input.capacity, unitText: isEn ? "people" : "personnes" },
    petsAllowed: input.dogPolicy.allowed,
    amenityFeature: [
      ...(input.accessibility.accessible
        ? [
            { "@type": "LocationFeatureSpecification", name: accessibleLabel(input.locale), value: true },
            ...input.accessibility.features.map((id) => ({
              "@type": "LocationFeatureSpecification",
              name: accessibilityFeatureLabel(id, input.locale),
              value: true,
            })),
          ]
        : []),
      ...input.amenities.map((a) => {
      const entry = getAmenityCatalogEntry(a.id);
      const name = entry ? (isEn ? entry.labelEn : entry.label) : a.id;
      const description = entry ? summarizeAmenityDetails(entry, a.details, input.locale) : null;
      return {
        "@type": "LocationFeatureSpecification",
        name,
        value: true,
        ...(description ? { description } : {}),
      };
    }),
    ],
  };

  return {
    "@context": "https://schema.org",
    "@type": "VacationRental",
    "@id": `${input.url}#vacationrental`,
    name: input.title,
    // Résumé plutôt que le texte intégral (plusieurs milliers de caractères)
    description: metaDescription(input.description, 500),
    inLanguage: isEn ? "en-CA" : "fr-CA",
    image: input.photoUrls,
    url: input.url,
    brand: { "@type": "Brand", name: "Kabanalouer" },
    address: {
      "@type": "PostalAddress",
      ...(input.city ? { addressLocality: input.city } : {}),
      addressRegion: "QC",
      addressCountry: "CA",
    },
    // Région touristique (Laurentides…), distincte de la province
    ...(input.region ? { containedInPlace: { "@type": "AdministrativeArea", name: input.region } } : {}),
    ...(input.latitude && input.longitude
      ? { latitude: input.latitude, longitude: input.longitude, geo: { "@type": "GeoCoordinates", latitude: input.latitude, longitude: input.longitude } }
      : {}),
    ...(input.checkinTime ? { checkinTime: input.checkinTime } : {}),
    ...(input.checkoutTime ? { checkoutTime: input.checkoutTime } : {}),
    containsPlace: accommodation,
    // petsAllowed (aussi dans containsPlace) reste booléen ; seuls les
    // chiens sont acceptés sur Kabanalouer, précisé avec les détails dans
    // additionalProperty pour les agents IA qui ne lisent que le JSON-LD.
    petsAllowed: input.dogPolicy.allowed,
    // "smokingAllowed" n'existe pas dans le vocabulaire schema.org — passé en
    // additionalProperty (mécanisme d'extension générique) plutôt qu'inventé
    // comme propriété directe.
    additionalProperty: [
      {
        "@type": "PropertyValue",
        name: isEn ? "Smoking allowed" : "Fumeurs acceptés",
        value: input.smokingAllowed,
      },
      ...buildDogProperties(input.dogPolicy, input.locale),
    ],
    ...(input.citqNumber
      ? { identifier: { "@type": "PropertyValue", propertyID: "CITQ", value: input.citqNumber } }
      : {}),
    ...(makesOffer ? { makesOffer, priceRange } : {}),
    ...(input.reviewCount >= MIN_REVIEWS_FOR_RATING
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: Math.round(input.avgRating * 10) / 10,
            reviewCount: input.reviewCount,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
  };
}

function buildDogProperties(p: DogPolicy, locale: string): Record<string, unknown>[] {
  const isEn = locale === "en";
  const props: Record<string, unknown>[] = [
    { "@type": "PropertyValue", name: isEn ? "Dogs allowed" : "Chiens acceptés", value: p.allowed },
  ];
  if (!p.allowed) return props;
  if (p.max) {
    props.push({ "@type": "PropertyValue", name: isEn ? "Maximum number of dogs" : "Nombre maximum de chiens", value: p.max });
  }
  if (p.sizeLimit) {
    props.push({ "@type": "PropertyValue", name: isEn ? "Dog weight restrictions" : "Restrictions de poids des chiens", value: dogSizeLabel(p.sizeLimit, locale) });
  }
  const fee = dogFeeLabel(p, locale);
  if (fee) {
    props.push({
      "@type": "PropertyValue",
      name: isEn ? "Dog fee" : "Frais pour les chiens",
      value: fee,
      ...(p.feeType !== "free" && p.feeAmount ? { unitText: "CAD" } : {}),
    });
  }
  return props;
}

export function buildListingFaqJsonLd(input: ListingSchemaInput): Record<string, unknown> | null {
  const isEn = input.locale === "en";
  const questions: { question: string; answer: string }[] = [];

  const dogDetails = dogPolicyDetails(input.dogPolicy, input.locale).map((d) => d.charAt(0).toLowerCase() + d.slice(1));
  questions.push({
    question: isEn ? `Are dogs allowed at ${input.title}?` : `Les chiens sont-ils acceptés à ${input.title} ?`,
    answer: input.dogPolicy.allowed
      ? isEn
        ? `Yes, dogs are allowed at ${input.title}${dogDetails.length ? `: ${dogDetails.join(", ")}` : ""}.`
        : `Oui, les chiens sont acceptés à ${input.title}${dogDetails.length ? ` : ${dogDetails.join(", ")}` : ""}.`
      : isEn
      ? `No, dogs are not allowed at ${input.title}.`
      : `Non, les chiens ne sont pas acceptés à ${input.title}.`,
  });

  if (input.accessibility.accessible) {
    const features = input.accessibility.features.map((id) => {
      const l = accessibilityFeatureLabel(id, input.locale);
      return l.charAt(0).toLowerCase() + l.slice(1);
    });
    questions.push({
      question: isEn
        ? `Is ${input.title} accessible to people with reduced mobility?`
        : `${input.title} est-il accessible aux personnes à mobilité réduite\u202f?`,
      answer: isEn
        ? `Yes, ${input.title} is accessible to people with reduced mobility${features.length ? `: ${features.join("; ")}` : ""}.`
        : `Oui, ${input.title} est accessible aux personnes à mobilité réduite${features.length ? `\u00a0: ${features.join("\u202f; ")}` : ""}.`,
    });
  }

  questions.push({
    question: isEn ? `Is smoking allowed at ${input.title}?` : `Peut-on fumer à ${input.title} ?`,
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
      question: isEn ? "What are the check-in and check-out times?" : "Quelle est l'heure d'arrivée et de départ ?",
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
      question: isEn ? "Is parking free?" : "Le stationnement est-il gratuit ?",
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
