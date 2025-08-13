import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Calendar, User, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FloatingActionButtonProps {
  onPrimaryAction: () => void;
  primaryLabel?: string;
  className?: string;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onPrimaryAction,
  primaryLabel = "Novo Agendamento",
  className
}) => {
  return (
    <div className={cn("fixed bottom-20 right-4 z-40 lg:hidden", className)}>
      <Button
        onClick={onPrimaryAction}
        size="lg"
        className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200"
      >
        <Plus className="h-6 w-6" />
      </Button>
    </div>
  );
};

interface QuickActionsProps {
  actions: Array<{
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  }>;
  className?: string;
}

export const QuickActions: React.FC<QuickActionsProps> = ({ actions, className }) => {
  return (
    <div className={cn("flex flex-wrap gap-2 p-4 lg:hidden", className)}>
      {actions.map((action, index) => (
        <Button
          key={index}
          onClick={action.onClick}
          variant={action.variant || "outline"}
          size="sm"
          className="flex-1 min-h-[44px]"
        >
          {action.icon}
          <span className="ml-2">{action.label}</span>
        </Button>
      ))}
    </div>
  );
};
