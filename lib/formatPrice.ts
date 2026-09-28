// Prix affiché selon la langue : « 350 $ » (espace insécable) en français, « $350 » en anglais.
export function formatPrice(amount: number | string, locale: string): string {
  return locale === "en" ? `$${amount}` : `${amount} $`;
}
