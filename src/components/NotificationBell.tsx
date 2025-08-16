import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, BellOff } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { useNotificationContext } from '@/components/NotificationProvider';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface NotificationBellProps {
  tenantId: string;
  className?: string;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  tenantId,
  className
}) => {
  const { openPanel } = useNotificationContext();
  const { unreadCount, isLoading } = useNotifications(tenantId);

  return (
    <div className={cn('relative', className)}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => openPanel(tenantId)}
        className="relative p-2 h-auto"
        disabled={isLoading}
      >
        <AnimatePresence mode="wait">
          {unreadCount > 0 ? (
            <motion.div
              key="bell-active"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Bell className="h-5 w-5 text-primary" />
            </motion.div>
          ) : (
            <motion.div
              key="bell-inactive"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <BellOff className="h-5 w-5 text-muted-foreground" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Badge de contador */}
        {unreadCount > 0 && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ 
              type: "spring", 
              stiffness: 500, 
              damping: 30 
            }}
            className="absolute -top-1 -right-1"
          >
            <Badge 
              variant="destructive" 
              className="h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs font-bold min-w-0"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          </motion.div>
        )}

        {/* Indicador de carregamento */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </motion.div>
        )}
      </Button>
    </div>
  );
};
