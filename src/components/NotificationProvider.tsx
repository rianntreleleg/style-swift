import React, { createContext, useContext, useState } from 'react';
import { NotificationsPanel } from '@/components/NotificationsPanel';

interface NotificationContextProps {
  isPanelOpen: boolean;
  openPanel: (tenantId: string) => void;
  closePanel: () => void;
  tenantId: string | null;
}

const NotificationContext = createContext<NotificationContextProps | undefined>(undefined);

export const useNotificationContext = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationContext must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [tenantId, setTenantId] = useState<string | null>(null);

  const openPanel = (id: string) => {
    setTenantId(id);
    setIsPanelOpen(true);
  };

  const closePanel = () => {
    setIsPanelOpen(false);
  };

  return (
    <NotificationContext.Provider value={{ isPanelOpen, openPanel, closePanel, tenantId }}>
      {children}
      {tenantId && (
        <NotificationsPanel
          tenantId={tenantId}
          isOpen={isPanelOpen}
          onClose={closePanel}
        />
      )}
    </NotificationContext.Provider>
  );
};