import { Link, useLocation } from 'react-router-dom';

const NAV_ITEMS = [
  {
    label: 'Home',
    to: '/',
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path
          d="M3 12L12 3L21 12V21H15V15H9V21H3V12Z"
          fill={active ? '#378ADD' : 'none'}
          stroke={active ? '#378ADD' : 'white'}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    label: 'Medications',
    to: '/medications',
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="9" width="18" height="6" rx="3"
          transform="rotate(-45 12 12)"
          stroke={active ? '#378ADD' : 'white'}
          strokeWidth="1.5" fill="none" />
        <line x1="9" y1="9" x2="15" y2="15"
          stroke={active ? '#378ADD' : 'white'} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: 'Family Loops',
    to: '/family',
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle cx="9" cy="7" r="3" stroke={active ? '#378ADD' : 'white'} strokeWidth="1.5" />
        <path d="M3 20C3 17 5.5 15 9 15C12.5 15 15 17 15 20" stroke={active ? '#378ADD' : 'white'} strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="17" cy="9" r="2.5" stroke={active ? '#378ADD' : 'white'} strokeWidth="1.5" />
        <path d="M14 20C14 18 15.5 16.5 17 16.5C18.5 16.5 20 18 20 20" stroke={active ? '#378ADD' : 'white'} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: 'Reminders',
    to: '/settings',
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M12 3C8.134 3 5 6.134 5 10V16L3 18H21L19 16V10C19 6.134 15.866 3 12 3Z"
          stroke={active ? '#378ADD' : 'white'} strokeWidth="1.5" strokeLinejoin="round" fill="none" />
        <path d="M10 18C10 19.1 10.9 20 12 20C13.1 20 14 19.1 14 18"
          stroke={active ? '#378ADD' : 'white'} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
];

export default function BottomNav() {
  const { pathname } = useLocation();

  const isActive = (to: string) =>
    to === '/' ? pathname === '/' : pathname.startsWith(to);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-[#0C447C]">
      <div className="flex items-center justify-around px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {NAV_ITEMS.map(({ label, to, icon }) => {
          const active = isActive(to);
          return (
            <Link
              key={to}
              to={to}
              className="flex flex-col items-center gap-1 min-w-[56px] py-1"
            >
              {icon(active)}
              <span
                className="text-[11px] font-medium leading-none"
                style={{ color: active ? '#378ADD' : 'white' }}
              >
                {label}
              </span>
              <span
                className="w-1.5 h-1.5 rounded-full transition-all duration-200"
                style={{ backgroundColor: active ? '#378ADD' : 'transparent' }}
              />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
