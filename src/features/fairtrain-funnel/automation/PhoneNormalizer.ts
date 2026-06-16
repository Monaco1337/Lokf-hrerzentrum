/**
 * Normalizes phone numbers for WhatsApp provider APIs (E.164 preferred).
 * Defaults to Germany (+49) when no country code is present.
 */
export function normalizePhoneForWhatsApp(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;

  let digits = trimmed.replace(/[^\d+]/g, "");
  if (digits.startsWith("00")) {
    digits = `+${digits.slice(2)}`;
  }

  if (digits.startsWith("+")) {
    return `+${digits.slice(1).replace(/\D/g, "")}`;
  }

  const onlyDigits = digits.replace(/\D/g, "");
  if (onlyDigits.startsWith("0")) {
    return `+49${onlyDigits.slice(1)}`;
  }
  if (onlyDigits.startsWith("49")) {
    return `+${onlyDigits}`;
  }
  return `+${onlyDigits}`;
}

export function isValidE164(phone: string): boolean {
  return /^\+[1-9]\d{6,14}$/.test(phone);
}
