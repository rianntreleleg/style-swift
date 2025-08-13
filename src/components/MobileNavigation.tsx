import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  Settings,
  Plus,
  Home,
  LogOut,
  Building2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/hooks/useAuth';

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href: string;
  mobileOnly?: boolean;
}

const navigationItems: NavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: <LayoutDashboard className="h-5 w-5" />,
    href: '#dashboard'
  },
  {
    id: 'establishment',
    label: 'Estabelecimento',
    icon: <Building2 className="h-5 w-5" />,
    href: '#establishment'
  },
  {
    id: 'appointments',
    label: 'Agendamentos',
    icon: <Calendar className="h-5 w-5" />,
    href: '#appointments'
  },
  {
    id: 'today',
    label: 'Hoje',
    icon: <Calendar className="h-5 w-5" />,
    href: '#today'
  },
  {
    id: 'services',
    label: 'Serviços',
    icon: <Plus className="h-5 w-5" />,
    href: '#services'
  },
  {
    id: 'professionals',
    label: 'Profissionais',
    icon: <Users className="h-5 w-5" />,
    href: '#professionals'
  },
  {
    id: 'settings',
    label: 'Configurações',
    icon: <Settings className="h-5 w-5" />,
    href: '#settings'
  }
];

interface MobileNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  desktopTab?: string;
  onDesktopTabChange?: (tab: string) => void;
}

export const MobileNavigation: React.FC<MobileNavigationProps> = ({ 
  activeTab, 
  onTabChange,
  desktopTab,
  onDesktopTabChange
}) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleTabClick = (tabId: string) => {
    onTabChange(tabId);
    // Scroll to the corresponding section
    const element = document.getElementById(tabId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <>
      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t">
        <div className="flex justify-around items-center h-16 px-2">
          {navigationItems.slice(0, 4).map((item) => (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id)}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full min-h-[44px] transition-colors",
                activeTab === item.id
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              {item.icon}
              <span className="text-xs mt-1">{item.label}</span>
            </button>
          ))}
          
          {/* More menu for additional items */}
          <Sheet>
            <SheetTrigger asChild>
              <button className="flex flex-col items-center justify-center flex-1 h-full min-h-[44px] text-muted-foreground">
                <Settings className="h-5 w-5" />
                <span className="text-xs mt-1">Mais</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[50vh]">
              <div className="flex flex-col space-y-4 pt-6">
                <h3 className="text-lg font-semibold">Menu</h3>
                {navigationItems.slice(4).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleTabClick(item.id)}
                    className={cn(
                      "flex items-center px-4 py-3 text-left rounded-lg transition-colors",
                      activeTab === item.id
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    )}
                  >
                    {item.icon}
                    <span className="ml-3">{item.label}</span>
                  </button>
                ))}
                <div className="border-t pt-4">
                  <Button
                    onClick={handleSignOut}
                    variant="outline"
                    className="w-full justify-start"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sair
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-background border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold">StyleSwift</h1>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/')}
            >
              <Home className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Spacer for mobile top bar */}
      <div className="lg:hidden h-16" />
      
      {/* Spacer for mobile bottom navigation */}
      <div className="lg:hidden h-16" />
    </>
  );
};
