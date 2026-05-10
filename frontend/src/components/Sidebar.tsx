import { Link, useLocation } from 'react-router-dom';

const NAV_ITEMS = [
  { label: 'Home',         to: '/',            icon: HomeIcon },
  { label: 'Medications',  to: '/medications', icon: PillIcon },
  { label: 'Family Loops', to: '/family',      icon: FamilyIcon },
  { label: 'Reminders',    to: '/settings',    icon: ReminderIcon },
];

export default function Sidebar() {
  const { pathname } = useLocation();
  const isActive = (to: string) => (to === '/' ? pathname === '/' : pathname.startsWith(to));

  return (
    <aside
      className="fixed left-0 top-0 h-screen w-[240px] z-40 hidden lg:flex flex-col"
      style={{ backgroundColor: '#fff', borderRight: '1px solid #D6E4F7' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 pt-8 pb-8">
        <CapsuleIcon />
        <span className="text-[26px] font-bold tracking-tight" style={{ color: '#0C447C' }}>
          Pal
        </span>
      </div>

      {/* Nav items */}
      <nav className="flex flex-col gap-1 px-3">
        {NAV_ITEMS.map(({ label, to, icon: Icon }) => {
          const active = isActive(to);
          return (
            <Link
              key={to}
              to={to}
              className="flex items-center gap-3 px-4 py-3 rounded-[12px] text-[15px] font-medium transition-colors"
              style={{
                backgroundColor: active ? '#EFF6FF' : 'transparent',
                color: active ? '#185FA5' : '#0C447C',
              }}
            >
              <Icon active={active} />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

function CapsuleIcon() {
  return (
    <svg width="22" height="38" viewBox="0 0 22 38" fill="none">
      <path d="M11 1C6.582 1 3 4.582 3 9V19H19V9C19 4.582 15.418 1 11 1Z" fill="#0C447C" />
      <path d="M3 19V29C3 33.418 6.582 37 11 37C15.418 37 19 33.418 19 29V19H3Z" fill="#185FA5" />
      <line x1="3" y1="19" x2="19" y2="19" stroke="white" strokeWidth="1.2" />
    </svg>
  );
}

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M2 10L10 2L18 10V18H13V13H7V18H2V10Z"
        fill={active ? '#185FA5' : 'none'}
        stroke={active ? '#185FA5' : '#0C447C'}
        strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function PillIcon({ active }: { active: boolean }) {
  const c = active ? '#185FA5' : '#0C447C';
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="2" y="7" width="16" height="6" rx="3"
        transform="rotate(-45 10 10)"
        stroke={c} strokeWidth="1.5" fill="none" />
      <line x1="7" y1="7" x2="13" y2="13"
        stroke={c} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function FamilyIcon({ active }: { active: boolean }) {
  const c = active ? '#185FA5' : '#0C447C';
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="7.5" cy="6" r="2.5" stroke={c} strokeWidth="1.5" />
      <path d="M2 17C2 14.5 4.5 13 7.5 13C10.5 13 13 14.5 13 17" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="14.5" cy="7.5" r="2" stroke={c} strokeWidth="1.5" />
      <path d="M12 17C12 15.5 13 14 14.5 14C16 14 17.5 15.5 17.5 17" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ReminderIcon({ active }: { active: boolean }) {
  const c = active ? '#185FA5' : '#0C447C';
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M10 2C6.686 2 4 4.686 4 8V13L2 15H18L16 13V8C16 4.686 13.314 2 10 2Z"
        stroke={c} strokeWidth="1.5" strokeLinejoin="round" fill="none" />
      <path d="M8 15C8 16.1 8.9 17 10 17C11.1 17 12 16.1 12 15"
        stroke={c} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
