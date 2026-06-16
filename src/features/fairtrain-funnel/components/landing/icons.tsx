import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function CheckIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4.5 12.5 10 18l9.5-12" />
    </svg>
  );
}

export function ShieldIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3 5 6v6c0 4.4 3 8.2 7 9 4-.8 7-4.6 7-9V6l-7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export function EuroIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M18 7.5A6.5 6.5 0 0 0 7 12a6.5 6.5 0 0 0 11 4.5" />
      <path d="M4 10.5h9M4 13.5h9" />
    </svg>
  );
}

export function PinIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="9" cy="9" r="3.5" />
      <path d="M2.5 19.5c.7-3.3 3.5-5 6.5-5s5.8 1.7 6.5 5" />
      <circle cx="17" cy="8" r="2.5" />
      <path d="M21.5 17.5c-.4-2-1.8-3.4-3.5-3.9" />
    </svg>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function CapIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m2.5 9 9.5-4 9.5 4-9.5 4-9.5-4Z" />
      <path d="M6 11v4c0 1.7 2.7 3 6 3s6-1.3 6-3v-4" />
      <path d="M21 9v5" />
    </svg>
  );
}

export function TrendingUpIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m3 17 6-6 4 4 8-8" />
      <path d="M14 7h7v7" />
    </svg>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M5 12h14" />
      <path d="m13 5 7 7-7 7" />
    </svg>
  );
}

export function SparkleIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.5 5.5l2 2M16.5 16.5l2 2M5.5 18.5l2-2M16.5 7.5l2-2" />
    </svg>
  );
}

export function FileTextIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
      <path d="M14 3v5h5M9 13h6M9 17h4" />
    </svg>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" />
    </svg>
  );
}

export function TrainIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="5" y="3" width="14" height="14" rx="3" />
      <path d="M5 11h14" />
      <circle cx="9" cy="14" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="15" cy="14" r="0.9" fill="currentColor" stroke="none" />
      <path d="M7 17.5 5.5 21M17 17.5 18.5 21M8.5 7h7" />
    </svg>
  );
}

export function StarIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 2.6 14.94 8.6l6.6.96-4.78 4.66 1.13 6.58L12 17.7l-5.9 3.1 1.13-6.58L2.46 9.56l6.6-.96L12 2.6Z" />
    </svg>
  );
}

export function ShieldLockIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3 5 6v6c0 4.4 3 8.2 7 9 4-.8 7-4.6 7-9V6l-7-3Z" />
      <rect x="9.5" y="11" width="5" height="4" rx="0.8" />
      <path d="M10.5 11V9.5a1.5 1.5 0 0 1 3 0V11" />
    </svg>
  );
}

export function WhatsAppIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12.04 2.003c-5.523 0-10 4.477-10 10 0 1.762.46 3.418 1.27 4.852L2 22l5.281-1.273A9.94 9.94 0 0 0 12.04 22c5.523 0 10-4.477 10-10s-4.477-9.997-10-9.997Zm0 18.18a8.18 8.18 0 0 1-4.166-1.143l-.299-.178-3.135.756.836-3.057-.195-.314a8.18 8.18 0 1 1 6.959 3.936Zm4.49-6.13c-.246-.123-1.453-.717-1.678-.799-.225-.082-.388-.123-.552.124-.163.245-.633.798-.776.961-.143.164-.286.184-.531.062-.246-.123-1.04-.383-1.98-1.221-.732-.654-1.226-1.46-1.37-1.706-.143-.246-.015-.378.108-.5.111-.11.246-.286.369-.43.123-.143.164-.245.246-.408.082-.164.041-.307-.02-.43-.062-.123-.553-1.332-.757-1.823-.2-.481-.4-.416-.553-.423l-.47-.009c-.164 0-.43.062-.654.307-.225.246-.86.84-.86 2.048 0 1.21.88 2.378 1.003 2.542.123.164 1.733 2.646 4.2 3.71.587.254 1.045.405 1.402.518.589.187 1.124.16 1.548.097.473-.07 1.453-.594 1.658-1.168.205-.575.205-1.066.143-1.168-.061-.103-.224-.164-.47-.287Z" />
    </svg>
  );
}
