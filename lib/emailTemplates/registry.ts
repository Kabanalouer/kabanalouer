import type { EmailTemplateDef } from "./types";
import { TEMPLATE_BOOST_INVITE, TEMPLATE_DRAFT_REMINDER, TEMPLATE_SMS_INVITE } from "@/lib/emails/hostOnboarding";
import { TEMPLATE_WELCOME_SUBSCRIPTION } from "@/lib/emails/welcomeSubscription";
import { TEMPLATE_IMPORT_PUBLISHED } from "@/lib/emails/importPublished";
import { TEMPLATE_WINBACK_3, TEMPLATE_WINBACK_14 } from "@/lib/emails/winbackReminder";
import {
  TEMPLATE_REMINDER_30,
  TEMPLATE_REMINDER_10,
  TEMPLATE_REMINDER_3,
  TEMPLATE_AUTO_RENEWAL,
  TEMPLATE_PAYMENT_FAILED,
} from "@/lib/emails/subscriptionReminder";
import { TEMPLATE_FEATURED_CONFIRMATION, TEMPLATE_FEATURED_EXPIRING, TEMPLATE_FEATURED_EXPIRED } from "@/lib/emails/featuredListing";
import { TEMPLATE_REVIEW_RECEIVED } from "@/lib/emails/reviewReceived";
import { TEMPLATE_NEW_MESSAGE_HOST, TEMPLATE_NEW_MESSAGE_TRAVELER } from "@/lib/emails/newMessageNotification";
import { TEMPLATE_REVIEW_REPLIED } from "@/lib/emails/reviewReplied";
import { TEMPLATE_WELCOME_TRAVELER } from "@/lib/emails/welcomeTraveler";
import { TEMPLATE_REVIEW_REQUEST, TEMPLATE_STAY_REVIEW_REQUEST } from "@/lib/emails/reviewRequest";
import { TEMPLATE_NO_REPLY_NUDGE } from "@/lib/emails/noReplyNudge";

// Courriels dont les textes sont modifiables dans Admin → Séquences courriel,
// par id du catalogue (lib/adminEmailCatalog.ts). Tout nouveau courriel proprio
// ou voyageur doit exporter son TEMPLATE_* et être ajouté ici.
const ALL: EmailTemplateDef[] = [
  TEMPLATE_DRAFT_REMINDER,
  TEMPLATE_WELCOME_SUBSCRIPTION,
  TEMPLATE_IMPORT_PUBLISHED,
  TEMPLATE_BOOST_INVITE,
  TEMPLATE_SMS_INVITE,
  TEMPLATE_NEW_MESSAGE_HOST,
  TEMPLATE_REVIEW_RECEIVED,
  TEMPLATE_FEATURED_CONFIRMATION,
  TEMPLATE_FEATURED_EXPIRING,
  TEMPLATE_FEATURED_EXPIRED,
  TEMPLATE_REMINDER_30,
  TEMPLATE_REMINDER_10,
  TEMPLATE_REMINDER_3,
  TEMPLATE_AUTO_RENEWAL,
  TEMPLATE_PAYMENT_FAILED,
  TEMPLATE_WINBACK_3,
  TEMPLATE_WINBACK_14,
  TEMPLATE_WELCOME_TRAVELER,
  TEMPLATE_NEW_MESSAGE_TRAVELER,
  TEMPLATE_NO_REPLY_NUDGE,
  TEMPLATE_REVIEW_REQUEST,
  TEMPLATE_STAY_REVIEW_REQUEST,
  TEMPLATE_REVIEW_REPLIED,
];

export const EMAIL_TEMPLATES: Record<string, EmailTemplateDef> = Object.fromEntries(ALL.map((d) => [d.id, d]));
