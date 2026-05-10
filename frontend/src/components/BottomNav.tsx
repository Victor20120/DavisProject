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
        <rect
          x="2" y="10.5" width="20" height="7" rx="3.5"
          transform="rotate(-45 6 17)"
          stroke={active ? '#378ADD' : 'white'}
          strokeWidth="1.5"
        />
        <line x1="8.5" y1="15.5" x2="15.5" y2="8.5" stroke={active ? '#378ADD' : 'white'} strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    label: 'Family',
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
    label: 'Settings',
    to: '/settings',
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="3" stroke={active ? '#378ADD' : 'white'} strokeWidth="1.5" />
        <path
          d="M12 2V4M12 20V22M4.22 4.22L5.64 5.64M18.36 18.36L19.78 19.78M2 12H4M20 12H22M4.22 19.78L5.64 18.36M18.36 5.64L19.78 4.22"
          stroke={active ? '#378ADD' : 'white'}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
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
