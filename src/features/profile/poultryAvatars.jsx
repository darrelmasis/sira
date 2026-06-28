/** Avatares predefinidos con temática avícola / granja */

function GallinaAvatar({ className }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="32" fill="#FEF3C7" />
      <ellipse cx="32" cy="38" rx="16" ry="14" fill="#F8FAFC" />
      <circle cx="32" cy="28" r="10" fill="#F8FAFC" />
      <path d="M26 22 L32 14 L38 22 Z" fill="#EF4444" />
      <circle cx="29" cy="27" r="1.5" fill="#1E293B" />
      <path d="M36 29 Q38 31 36 32" stroke="#F97316" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <ellipse cx="22" cy="36" rx="4" ry="7" fill="#F1F5F9" />
      <ellipse cx="42" cy="36" rx="4" ry="7" fill="#F1F5F9" />
      <path d="M18 44 Q32 52 46 44" stroke="#F97316" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function GalloAvatar({ className }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="32" fill="#FFEDD5" />
      <ellipse cx="30" cy="38" rx="14" ry="12" fill="#3B82F6" />
      <circle cx="30" cy="28" r="9" fill="#2563EB" />
      <path d="M24 21 L30 12 L36 21 Z" fill="#DC2626" />
      <circle cx="27" cy="27" r="1.5" fill="#0F172A" />
      <path d="M34 29 Q36 31 34 32" stroke="#FBBF24" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M42 30 C48 24 52 34 44 36 Z" fill="#059669" />
      <path d="M44 32 C50 28 54 38 46 40 Z" fill="#10B981" />
      <path d="M46 34 C52 32 54 42 48 42 Z" fill="#F59E0B" />
    </svg>
  );
}

function PollitoAvatar({ className }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="32" fill="#FEF9C3" />
      <circle cx="32" cy="34" r="14" fill="#FDE047" />
      <circle cx="32" cy="34" r="11" fill="#FACC15" />
      <circle cx="28" cy="32" r="2" fill="#1E293B" />
      <circle cx="36" cy="32" r="2" fill="#1E293B" />
      <path d="M32 36 L34 40 L30 40 Z" fill="#F97316" />
      <ellipse cx="22" cy="38" rx="3" ry="5" fill="#FDE047" />
      <ellipse cx="42" cy="38" rx="3" ry="5" fill="#FDE047" />
      <path d="M26 18 Q32 10 38 18" stroke="#A3E635" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function HuevoAvatar({ className }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="32" fill="#FFF7ED" />
      <ellipse cx="32" cy="42" rx="22" ry="8" fill="#D97706" opacity="0.35" />
      <path d="M32 18 C24 18 20 28 20 36 C20 44 25 48 32 48 C39 48 44 44 44 36 C44 28 40 18 32 18 Z" fill="#FFFBEB" stroke="#F59E0B" strokeWidth="1.5" />
      <path d="M18 44 Q32 50 46 44" stroke="#92400E" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M20 46 Q32 52 44 46" stroke="#92400E" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function GraneroAvatar({ className }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="32" fill="#FEE2E2" />
      <rect x="14" y="30" width="36" height="20" rx="2" fill="#DC2626" />
      <path d="M10 30 L32 14 L54 30 Z" fill="#B91C1C" />
      <rect x="26" y="36" width="12" height="14" rx="1" fill="#FFFBEB" />
      <rect x="18" y="34" width="8" height="6" rx="1" fill="#FCA5A5" />
      <rect x="38" y="34" width="8" height="6" rx="1" fill="#FCA5A5" />
      <circle cx="48" cy="18" r="8" fill="#FDE047" />
    </svg>
  );
}

function GalponAvatar({ className }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="32" fill="#E0F2FE" />
      <rect x="8" y="28" width="48" height="18" rx="2" fill="#64748B" />
      <path d="M6 28 L32 16 L58 28 Z" fill="#475569" />
      <rect x="14" y="32" width="6" height="6" rx="1" fill="#BAE6FD" />
      <rect x="24" y="32" width="6" height="6" rx="1" fill="#BAE6FD" />
      <rect x="34" y="32" width="6" height="6" rx="1" fill="#BAE6FD" />
      <rect x="44" y="32" width="6" height="6" rx="1" fill="#BAE6FD" />
      <ellipse cx="20" cy="48" rx="3" ry="2" fill="#F8FAFC" />
      <ellipse cx="44" cy="48" rx="3" ry="2" fill="#F8FAFC" />
    </svg>
  );
}

function PlumasAvatar({ className }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="32" fill="#F5F3FF" />
      <path d="M32 10 C28 22 18 28 18 38 C18 46 24 50 32 50 C40 50 46 46 46 38 C46 28 36 22 32 10 Z" fill="#8B5CF6" />
      <path d="M32 14 C30 24 24 30 24 38 C24 44 28 46 32 46 C36 46 40 44 40 38 C40 30 34 24 32 14 Z" fill="#A78BFA" />
      <path d="M32 18 L32 48" stroke="#6D28D9" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M32 24 L26 30 M32 30 L38 34 M32 36 L24 40 M32 42 L40 44" stroke="#DDD6FE" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function GranjeroAvatar({ className }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="32" fill="#ECFDF5" />
      <ellipse cx="32" cy="52" rx="18" ry="6" fill="#059669" opacity="0.25" />
      <rect x="22" y="36" width="20" height="16" rx="3" fill="#2563EB" />
      <circle cx="32" cy="28" r="10" fill="#FDBA74" />
      <path d="M20 26 Q32 14 44 26 L42 30 Q32 20 22 30 Z" fill="#D97706" />
      <circle cx="29" cy="28" r="1.5" fill="#1E293B" />
      <circle cx="35" cy="28" r="1.5" fill="#1E293B" />
      <path d="M30 32 Q32 34 34 32" stroke="#B45309" strokeWidth="1.2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function AlimentoAvatar({ className }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="32" fill="#FEF3C7" />
      <path d="M18 22 L46 22 L42 48 L22 48 Z" fill="#CA8A04" />
      <path d="M20 22 L32 12 L44 22 Z" fill="#EAB308" />
      <rect x="24" y="28" width="16" height="10" rx="2" fill="#FFFBEB" />
      <circle cx="28" cy="42" r="2" fill="#F59E0B" />
      <circle cx="32" cy="44" r="2" fill="#F59E0B" />
      <circle cx="36" cy="41" r="2" fill="#F59E0B" />
      <ellipse cx="48" cy="40" rx="4" ry="6" fill="#FBBF24" transform="rotate(20 48 40)" />
    </svg>
  );
}

function AmanecerAvatar({ className }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="32" fill="#FFF7ED" />
      <rect x="0" y="40" width="64" height="24" fill="#86EFAC" />
      <path d="M0 40 L64 40" stroke="#22C55E" strokeWidth="1" />
      <path d="M8 40 L12 32 L16 40 Z" fill="#166534" />
      <path d="M22 40 L28 26 L34 40 Z" fill="#15803D" />
      <path d="M40 40 L46 30 L52 40 Z" fill="#166534" />
      <circle cx="32" cy="28" r="12" fill="#FBBF24" />
      <path d="M32 8 L32 14 M32 42 L32 48 M14 28 L20 28 M44 28 L50 28 M18 14 L22 18 M42 14 L46 18 M18 42 L22 38 M42 42 L46 38" stroke="#FDE047" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export const POULTRY_AVATARS = [
  { id: "gallina", label: "Gallina", Component: GallinaAvatar },
  { id: "gallo", label: "Gallo", Component: GalloAvatar },
  { id: "pollito", label: "Pollito", Component: PollitoAvatar },
  { id: "huevo", label: "Huevo", Component: HuevoAvatar },
  { id: "granero", label: "Granero", Component: GraneroAvatar },
  { id: "galpon", label: "Galpón", Component: GalponAvatar },
  { id: "plumas", label: "Plumas", Component: PlumasAvatar },
  { id: "granjero", label: "Granjero", Component: GranjeroAvatar },
  { id: "alimento", label: "Alimento", Component: AlimentoAvatar },
  { id: "amanecer", label: "Amanecer", Component: AmanecerAvatar },
];

export const AVATAR_IDS = POULTRY_AVATARS.map((item) => item.id);

export function getAvatarById(id) {
  if (!id) return null;
  return POULTRY_AVATARS.find((item) => item.id === id) || null;
}
