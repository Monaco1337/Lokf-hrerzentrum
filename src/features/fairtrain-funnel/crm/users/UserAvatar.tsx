/**
 * UserAvatar — circular avatar with initials fallback.
 */
import Image from "next/image";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (first + last).toUpperCase() || "·";
}

const SIZE_CLASS: Record<"sm" | "md" | "lg", string> = {
  sm: "h-7 w-7 text-[10px]",
  md: "h-9 w-9 text-[12px]",
  lg: "h-12 w-12 text-[14px]",
};

export function UserAvatar({
  name,
  avatar,
  size = "md",
  className = "",
}: {
  name: string;
  avatar?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const cls = [
    "inline-flex items-center justify-center rounded-full font-bold tracking-tight text-navy-950",
    "bg-gradient-to-br from-white via-white to-surface-subtle ring-1 ring-inset ring-ink/10",
    "shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(15,23,42,0.06)]",
    SIZE_CLASS[size],
    className,
  ].join(" ");
  if (avatar) {
    return (
      <Image
        src={avatar}
        alt={name}
        width={48}
        height={48}
        className={["rounded-full object-cover ring-1 ring-white/60", SIZE_CLASS[size], className].join(" ")}
      />
    );
  }
  return (
    <span className={cls} aria-hidden>
      {initials(name)}
    </span>
  );
}
