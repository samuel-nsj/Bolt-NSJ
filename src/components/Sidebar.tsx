import {
  LayoutDashboard,
  Calculator,
  Plus,
  Package,
  MapPin,
  Box,
  CreditCard,
  HelpCircle,
  User,
  Plug,
  Bookmark
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onCreateJob?: () => void;
}

export default function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'create-job', label: 'Create Job', icon: Plus },
    { id: 'quick-quote', label: 'Quick Quote', icon: Calculator },
    { id: 'saved-quotes', label: 'Saved Quotes', icon: Bookmark },
    { id: 'tracking', label: 'Tracking', icon: Package },
    { id: 'saved-locations', label: 'Saved Locations', icon: MapPin },
    { id: 'saved-items', label: 'Saved Items', icon: Box },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'help-support', label: 'Help/Support', icon: HelpCircle },
    { id: 'my-profile', label: 'My Profile', icon: User },
    { id: 'integrations', label: 'Integrations', icon: Plug },
  ];

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen fixed left-0 top-16">
      <nav className="p-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                item.id === 'create-job'
                  ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:shadow-lg'
                  : isActive
                  ? 'bg-purple-50 text-purple-700 font-semibold'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon className={`w-5 h-5 ${item.id === 'create-job' ? 'text-white' : isActive ? 'text-purple-600' : 'text-gray-500'}`} />
              <span className="text-sm">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
