/**
 * OpsNavIcon — the sidebar's inline SVG icon set.
 *
 * Extracted from OpsSidebarClient to keep the rendering component lean. We
 * avoid a third-party icon library so the CRM shell stays bundle-light. Each
 * icon ships at 18×18 and inherits color via `stroke="currentColor"`.
 */

export function OpsNavIcon({ name }: { name: string }) {
  const s = "h-[18px] w-[18px] shrink-0";
  const common = {
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    viewBox: "0 0 24 24",
  };
  switch (name) {
    case "leitstand":
      return (
        <svg className={s} {...common}>
          <rect x="3" y="3" width="7" height="9" rx="1.2" />
          <rect x="14" y="3" width="7" height="5" rx="1.2" />
          <rect x="14" y="12" width="7" height="9" rx="1.2" />
          <rect x="3" y="16" width="7" height="5" rx="1.2" />
        </svg>
      );
    case "applicants":
      return (
        <svg className={s} {...common}>
          <path d="M20 7h-4V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2Z" />
          <path d="M10 7V5h4v2" />
        </svg>
      );
    case "folder":
      return (
        <svg className={s} {...common}>
          <path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
        </svg>
      );
    case "leads":
      return (
        <svg className={s} {...common}>
          <path d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" />
          <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
        </svg>
      );
    case "pipeline":
      return (
        <svg className={s} {...common}>
          <rect x="3" y="5" width="4" height="14" rx="1" />
          <rect x="10" y="5" width="4" height="10" rx="1" />
          <rect x="17" y="5" width="4" height="7" rx="1" />
        </svg>
      );
    case "phone":
      return (
        <svg className={s} {...common}>
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.96.36 1.9.71 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.71A2 2 0 0 1 22 16.92Z" />
        </svg>
      );
    case "clock":
      return (
        <svg className={s} {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3.5 2" />
        </svg>
      );
    case "checkbox":
      return (
        <svg className={s} {...common}>
          <rect x="3" y="3" width="18" height="18" rx="2.5" />
          <path d="m8 12 3 3 5-6" />
        </svg>
      );
    case "doc":
      return (
        <svg className={s} {...common}>
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
          <path d="M14 3v5h5" />
          <path d="M9 13h6M9 17h6" />
        </svg>
      );
    case "voucher":
      return (
        <svg className={s} {...common}>
          <path d="M3 9v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2Z" />
          <path d="M8 7v10M16 7v10" />
          <path d="M3 12h2M19 12h2M8 12h8" />
        </svg>
      );
    case "calendar":
      return (
        <svg className={s} {...common}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4" />
        </svg>
      );
    case "user-circle":
      return (
        <svg className={s} {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M5.5 19a7 7 0 0 1 13 0" />
          <circle cx="12" cy="10" r="3.2" />
        </svg>
      );
    case "upload":
      return (
        <svg className={s} {...common}>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <path d="m17 8-5-5-5 5M12 3v12" />
        </svg>
      );
    case "message":
      return (
        <svg className={s} {...common}>
          <path d="M21 12c0 4.4-4 8-9 8-1.4 0-2.7-.3-3.9-.8L3 21l1.6-4.5C3.6 15.2 3 13.7 3 12c0-4.4 4-8 9-8s9 3.6 9 8Z" />
        </svg>
      );
    case "spark":
      return (
        <svg className={s} {...common}>
          <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case "users":
      return (
        <svg className={s} {...common}>
          <path d="M16 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" />
          <path d="M8 13a3 3 0 1 0-3-3 3 3 0 0 0 3 3Z" />
          <path d="M2 21v-1a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v1" />
          <path d="M14 17v-1a5 5 0 0 1 5-5h.5a3 3 0 0 1 3 3V21" />
        </svg>
      );
    case "chart-up":
      return (
        <svg className={s} {...common}>
          <path d="M3 21h18" />
          <path d="M7 17V11M12 17V7M17 17V13" />
        </svg>
      );
    case "report":
      return (
        <svg className={s} {...common}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M8 17V9M12 17v-4M16 17V11" />
        </svg>
      );
    case "settings":
      return (
        <svg className={s} {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
        </svg>
      );
    default:
      return (
        <svg className={s} {...common}>
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
  }
}
