import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Menu, 
  X, 
  BarChart3, 
  Calendar, 
  Eye, 
  DollarSign, 
  Scissors, 
  Users2, 
  Clock, 
  Settings,
  Download,
  Smartphone,
  Crown,
  LogOut,
  ExternalLink,
  Building2,
  Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isInstallable: boolean;
  isInstalled: boolean;
  isOnline: boolean;
  isAdmin: boolean;
  onInstall: () => Promise<boolean>;
  onShowPrompt: () => void;
  onSignOut: () => void;
  selectedTenant: any;
  tenants: any[];
  onTenantChange: (tenantId: string) => void;
}

const navigationItems = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: BarChart3,
    description: 'Visão geral do negócio'
  },
  {
    id: 'today',
    label: 'Hoje',
    icon: Calendar,
    description: 'Agendamentos do dia'
  },
  {
    id: 'appointments',
    label: 'Agendamentos',
    icon: Eye,
    description: 'Todos os agendamentos'
  },
  {
    id: 'financial',
    label: 'Financeiro',
    icon: DollarSign,
    description: 'Relatórios financeiros'
  },
  {
    id: 'services',
    label: 'Serviços',
    icon: Scissors,
    description: 'Gerenciar serviços'
  },
  {
    id: 'pros',
    label: 'Profissionais',
    icon: Users2,
    description: 'Gerenciar profissionais'
  },
  {
    id: 'hours',
    label: 'Horários',
    icon: Clock,
    description: 'Configurar horários'
  },
  {
    id: 'settings',
    label: 'Configurações',
    icon: Settings,
    description: 'Configurações gerais'
  }
];

export const MobileSidebar: React.FC<MobileSidebarProps> = ({
  activeTab,
  onTabChange,
  isInstallable,
  isInstalled,
  isOnline,
  isAdmin,
  onInstall,
  onShowPrompt,
  onSignOut,
  selectedTenant,
  tenants,
  onTenantChange
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleSidebar = () => setIsOpen(!isOpen);
  const closeSidebar = () => setIsOpen(false);

  const handleTabClick = (tabId: string) => {
    onTabChange(tabId);
    closeSidebar();
  };

  const handleInstallClick = async () => {
    await onInstall();
    closeSidebar();
  };

  const handleShowPrompt = () => {
    onShowPrompt();
    closeSidebar();
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleSidebar}
        className="lg:hidden p-2"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={closeSidebar}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed left-0 top-0 h-full w-80 max-w-[85vw] bg-background border-r z-50 lg:hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center">
                  <Scissors className="h-4 w-4 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="font-semibold text-sm">StyleSwift</h2>
                  <p className="text-xs text-muted-foreground">Admin Panel</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={closeSidebar}
                className="p-2"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex flex-col h-full">
              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Tenant Selector */}
                {tenants.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">
                      Estabelecimento
                    </label>
                    <select
                      value={selectedTenant?.id || ''}
                      onChange={(e) => onTenantChange(e.target.value)}
                      className="w-full p-2 text-sm border rounded-md bg-background"
                    >
                      {tenants.map(tenant => (
                        <option key={tenant.id} value={tenant.id}>
                          {tenant.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* PWA Install Section - Admin Only */}
                {isAdmin && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Instalar App</span>
                    </div>
                    
                    <div className="space-y-2">
                      {isInstalled ? (
                        <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950/20 rounded-md">
                          <div className="w-2 h-2 bg-green-500 rounded-full" />
                          <span className="text-xs text-green-700 dark:text-green-300">
                            App instalado
                          </span>
                        </div>
                      ) : isInstallable ? (
                        <Button
                          onClick={handleInstallClick}
                          size="sm"
                          className="w-full"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Instalar App
                        </Button>
                      ) : (
                        <Button
                          onClick={handleShowPrompt}
                          variant="outline"
                          size="sm"
                          className="w-full"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Baixar App
                        </Button>
                      )}
                      
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          isOnline ? "bg-green-500" : "bg-red-500"
                        )} />
                        {isOnline ? "Online" : "Offline"}
                      </div>
                    </div>
                  </div>
                )}

                <Separator />

                {/* Navigation */}
                <nav className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground px-2">
                    Navegação
                  </label>
                  {navigationItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleTabClick(item.id)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-md transition-colors",
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <div className="flex-1 text-left">
                          <div className="font-medium">{item.label}</div>
                          <div className="text-xs opacity-70">{item.description}</div>
                        </div>
                      </button>
                    );
                  })}
                </nav>

                <Separator />

                {/* Quick Actions */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground px-2">
                    Ações Rápidas
                  </label>
                  
                  {selectedTenant && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                      asChild
                    >
                      <a
                        href={`${window.location.origin}/agendamento?tenant=${selectedTenant.slug}`}
                        target="_blank"
                        className="flex items-center gap-2"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Ver página pública
                      </a>
                    </Button>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t space-y-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onSignOut}
                  className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
