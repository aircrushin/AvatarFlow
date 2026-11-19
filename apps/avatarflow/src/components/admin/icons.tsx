import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      {children}
    </svg>
  );
}

export const IconOverview = (p: IconProps) => (
  <Icon {...p}><rect x="2" y="2" width="5" height="5" rx="1.2" /><rect x="9" y="2" width="5" height="5" rx="1.2" /><rect x="2" y="9" width="5" height="5" rx="1.2" /><rect x="9" y="9" width="5" height="5" rx="1.2" /></Icon>
);
export const IconEvents = (p: IconProps) => (
  <Icon {...p}><rect x="2" y="3" width="12" height="11" rx="1.6" /><path d="M2 6.5h12M5.5 1.5v3M10.5 1.5v3" /></Icon>
);
export const IconPlus = (p: IconProps) => (
  <Icon {...p}><path d="M8 3v10M3 8h10" /></Icon>
);
export const IconExternal = (p: IconProps) => (
  <Icon {...p}><path d="M9.5 2.5h4v4M13.5 2.5 7.5 8.5M12 9.5V13a.5.5 0 0 1-.5.5h-8.5a.5.5 0 0 1-.5-.5V4.5a.5.5 0 0 1 .5-.5H7" /></Icon>
);
export const IconLogout = (p: IconProps) => (
  <Icon {...p}><path d="M6 2.5H3.5a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1H6M10.5 11l3-3-3-3M13.5 8H6" /></Icon>
);
export const IconSliders = (p: IconProps) => (
  <Icon {...p}><path d="M3 4h6M12 4h1M3 12h1M7 12h6M3 8h2M8 8h5" /><circle cx="10.5" cy="4" r="1.5" /><circle cx="5.5" cy="12" r="1.5" /><circle cx="6.5" cy="8" r="1.5" /></Icon>
);
export const IconChart = (p: IconProps) => (
  <Icon {...p}><path d="M2.5 13.5h11M4.5 11V8M8 11V4.5M11.5 11V6.5" /></Icon>
);
export const IconImage = (p: IconProps) => (
  <Icon {...p}><rect x="2" y="2.5" width="12" height="11" rx="1.6" /><circle cx="5.75" cy="6" r="1.25" /><path d="m2.5 12 3.5-3.5 2.5 2.5 2-2 3 3" /></Icon>
);
export const IconDownload = (p: IconProps) => (
  <Icon {...p}><path d="M8 2.5v8M4.5 7 8 10.5 11.5 7M3 13.5h10" /></Icon>
);
export const IconUpload = (p: IconProps) => (
  <Icon {...p}><path d="M8 10.5v-8M4.5 6 8 2.5 11.5 6M3 13.5h10" /></Icon>
);
export const IconCopy = (p: IconProps) => (
  <Icon {...p}><rect x="5.5" y="5.5" width="8" height="8" rx="1.4" /><path d="M10.5 5.5V3.9a1.4 1.4 0 0 0-1.4-1.4H3.9a1.4 1.4 0 0 0-1.4 1.4v5.2a1.4 1.4 0 0 0 1.4 1.4h1.6" /></Icon>
);
export const IconCheck = (p: IconProps) => (
  <Icon {...p}><path d="m3 8.5 3 3 7-7" /></Icon>
);
export const IconArrowRight = (p: IconProps) => (
  <Icon {...p}><path d="M3 8h10M9 4l4 4-4 4" /></Icon>
);
export const IconSparkle = (p: IconProps) => (
  <Icon {...p}><path d="M8 1.5 9.4 6.6 14.5 8l-5.1 1.4L8 14.5 6.6 9.4 1.5 8l5.1-1.4z" /></Icon>
);
