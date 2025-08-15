import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Menu, 
  X, 
  BarChart, 
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
  Activity,
  CreditCard,
  Database
} from 'lucide-react';
import { cn } from '@/lib/utils';
import LogoIcon from '@/components/LogoIcon';

// Tipagem mais clara e específica para os objetos
interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: 'essential' | 'professional' | 'premium';
}

interface MobileSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isInstallable: boolean;
  isInstalled: boolean;
  isOnline: boolean;
  isAdmin: boolean;
  onInstall: () => Promise<void>;
  onShowPrompt: () => Promise<void>;
  onSignOut: () => void;
  selectedTenant: Tenant | null;
  tenants: Tenant[];
  onTenantChange: (tenantId: string) => void;
}

const navigationItems = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart, description: 'Visão geral do negócio' },
  { id: 'today', label: 'Hoje', icon: Calendar, description: 'Agendamentos do dia' },
  { id: 'appointments', label: 'Agendamentos', icon: Eye, description: 'Todos os agendamentos' },
  { id: 'financial', label: 'Financeiro', icon: DollarSign, description: 'Relatórios financeiros' },
  { id: 'services', label: 'Serviços', icon: Scissors, description: 'Gerenciar serviços' },
  { id: 'pros', label: 'Profissionais', icon: Users2, description: 'Gerenciar profissionais' },
  { id: 'hours', label: 'Horários', icon: Clock, description: 'Configurar horários' },
  { id: 'backups', label: 'Backups', icon: Database, description: 'Gerenciar backups' },
  { id: 'settings', label: 'Configurações', icon: Settings, description: 'Configurações gerais' }
];

// Subcomponente para o cabeçalho
const SidebarHeader = ({ closeSidebar }) => (
  <div className="flex items-center justify-between p-4 border-b">
         <div className="flex items-center gap-3">
       <LogoIcon size="md" />
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
);

// Subcomponente para o seletor de estabelecimento
const TenantSelector = ({ tenants, selectedTenant, onTenantChange }) => {
  if (tenants.length <= 1) return null;

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground block">
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
  );
};

// Subcomponente para a seção PWA
const PwaInstallSection = ({ isInstallable, isInstalled, isOnline, onInstall, onShowPrompt }) => (
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
          onClick={onInstall}
          size="sm"
          className="w-full"
        >
          <Download className="h-4 w-4 mr-2" />
          Instalar App
        </Button>
      ) : (
        <Button
          onClick={onShowPrompt}
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
);

// Subcomponente para os planos
const SubscriptionPlan = ({ selectedTenant }) => {
  if (!selectedTenant || !selectedTenant.plan) return null;

  let planLabel = selectedTenant.plan.charAt(0).toUpperCase() + selectedTenant.plan.slice(1);
  if (planLabel === 'Essential') {
    planLabel = 'Essencial';
  } else if (planLabel === 'Professional') {
    planLabel = 'Profissional';
  }

  const getBadgeColor = (plan: string) => {
    switch (plan) {
      case 'premium':
        return 'bg-amber-400 text-amber-950 hover:bg-amber-400/80';
      case 'professional':
        return 'bg-blue-400 text-blue-950 hover:bg-blue-400/80';
      default:
        return 'bg-gray-400 text-gray-950 hover:bg-gray-400/80';
    }
  };

  return (
    <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
      <div className="flex items-center gap-2">
        <Crown className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Plano</span>
      </div>
      <Badge className={getBadgeColor(selectedTenant.plan)}>
        {planLabel}
      </Badge>
    </div>
  );
};

// Subcomponente para as ações rápidas
const QuickActions = ({ selectedTenant, onTabChange }) => (
  <div className="space-y-1">
    <label className="text-xs font-medium text-muted-foreground px-2 block">
      Ações Rápidas
    </label>
    
    {selectedTenant && (
      <>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-sm"
          asChild
        >
          <a
            href={`${window.location.origin}/agendamento?tenant=${selectedTenant.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Ver página pública
          </a>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-sm"
          onClick={() => onTabChange('billing')} // Exemplo de nova aba
        >
          <CreditCard className="h-4 w-4" />
          Gerenciar Assinatura
        </Button>
      </>
    )}
  </div>
);

// Subcomponente para o rodapé
const SidebarFooter = ({ onSignOut }) => (
  <div className="p-4 border-t bg-background space-y-2">
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
);

// Componente principal refatorado
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
      {/* Botão para abrir o menu em dispositivos móveis */}
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleSidebar}
        className="lg:hidden p-2"
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Camada escura de fundo (Backdrop) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={closeSidebar}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Sidebar - Componente principal */}
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed left-0 top-0 h-screen w-80 max-w-[85vw] bg-background border-r z-50 lg:hidden flex flex-col"
          >
            {/* Componente: Header */}
            <SidebarHeader closeSidebar={closeSidebar} />

            {/* Conteúdo Principal com scroll */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Componente: Seletor de Estabelecimento */}
              <TenantSelector
                tenants={tenants}
                selectedTenant={selectedTenant}
                onTenantChange={onTenantChange}
              />
              
              {/* Componente: Plano de Assinatura */}
              <SubscriptionPlan selectedTenant={selectedTenant} />

              {isAdmin && (
                <>
                  <Separator />
                  {/* Componente: PWA Install */}
                  <PwaInstallSection
                    isInstallable={isInstallable}
                    isInstalled={isInstalled}
                    isOnline={isOnline}
                    onInstall={handleInstallClick}
                    onShowPrompt={handleShowPrompt}
                  />
                </>
              )}

              <Separator />

              {/* Navegação */}
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
                          : "hover:bg-muted text-muted-foreground hover:hover:text-foreground"
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

              {/* Componente: Ações Rápidas */}
              <QuickActions selectedTenant={selectedTenant} onTabChange={onTabChange} />
            </div>

            {/* Componente: Rodapé */}
            <SidebarFooter onSignOut={onSignOut} />
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
};