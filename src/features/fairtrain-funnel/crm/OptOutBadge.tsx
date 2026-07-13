/**
 * OptOutBadge — the unmistakable "🔴 WhatsApp abgemeldet (Opt-out)" indicator.
 *
 * Shown on every lead that replied with a stop keyword. Purely presentational;
 * it reads the `optOut` flag already resolved on the lead / conversation.
 */
export function OptOutBadge({
  compact = false,
}: {
  /** Compact renders just the short label (for dense inbox rows). */
  compact?: boolean;
}) {
  return (
    <span
      title="Dieser Lead hat sich per WhatsApp abgemeldet (Opt-out). Es werden keine WhatsApp-Nachrichten mehr gesendet."
      className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10.5px] font-semibold text-red-700 ring-1 ring-inset ring-red-200"
    >
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-red-500" />
      {compact ? "Abgemeldet" : "WhatsApp abgemeldet (Opt-out)"}
    </span>
  );
}
