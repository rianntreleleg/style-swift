import { motion, AnimatePresence } from 'framer-motion';
import { ReactNode, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

// Variantes de animação para diferentes elementos
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 24
    }
  }
};

const cardVariants = {
  hidden: { scale: 0.95, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      type: "spring" as const,
      stiffness: 400,
      damping: 25
    }
  },
  hover: {
    scale: 1.02,
    y: -2,
    transition: {
      type: "spring" as const,
      stiffness: 400,
      damping: 25
    }
  }
};

// Container animado para listas
interface AnimatedContainerProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export const AnimatedContainer = ({ 
  children, 
  className,
  delay = 0 
}: AnimatedContainerProps) => {
  return (
    <motion.div
      className={className}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
};

// Item animado para listas
interface AnimatedItemProps {
  children: ReactNode;
  className?: string;
  index?: number;
}

export const AnimatedItem = ({ 
  children, 
  className,
  index = 0 
}: AnimatedItemProps) => {
  return (
    <motion.div
      className={className}
      variants={itemVariants}
      custom={index}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {children}
    </motion.div>
  );
};

// Card animado
interface AnimatedCardProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  interactive?: boolean;
}

export const AnimatedCard = ({ 
  children, 
  className,
  delay = 0,
  interactive = true
}: AnimatedCardProps) => {
  return (
    <motion.div
      className={cn(
        'bg-card border border-border rounded-lg shadow-sm',
        interactive && 'cursor-pointer',
        className
      )}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover={interactive ? "hover" : undefined}
      whileTap={interactive ? { scale: 0.98 } : undefined}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
};

// Badge animado
interface AnimatedBadgeProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error';
  className?: string;
}

export const AnimatedBadge = ({ 
  children, 
  variant = 'default',
  className 
}: AnimatedBadgeProps) => {
  const variantClasses = {
    default: 'bg-primary text-primary-foreground',
    success: 'bg-green-500 text-white',
    warning: 'bg-yellow-500 text-white',
    error: 'bg-red-500 text-white'
  };

  return (
    <motion.span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        variantClasses[variant],
        className
      )}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{
        type: "spring" as const,
        stiffness: 500,
        damping: 30
      }}
    >
      {children}
    </motion.span>
  );
};

// Progress bar animada
interface AnimatedProgressProps {
  value: number;
  max?: number;
  className?: string;
  color?: string;
}

export const AnimatedProgress = ({ 
  value, 
  max = 100,
  className,
  color = 'bg-primary'
}: AnimatedProgressProps) => {
  const percentage = Math.min((value / max) * 100, 100);

  return (
    <div className={cn('w-full bg-muted rounded-full h-2 overflow-hidden', className)}>
      <motion.div
        className={cn('h-full rounded-full', color)}
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        transition={{
          duration: 0.8,
          ease: "easeOut"
        }}
      />
    </div>
  );
};

// Loading spinner animado
interface AnimatedSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const AnimatedSpinner = ({ 
  size = 'md',
  className 
}: AnimatedSpinnerProps) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <motion.div
      className={cn('border-2 border-muted border-t-current rounded-full', sizeClasses[size], className)}
      animate={{ rotate: 360 }}
      transition={{
        duration: 1,
        repeat: Infinity,
        ease: "linear"
      }}
    />
  );
};

// Toast animado
interface AnimatedToastProps {
  children: ReactNode;
  isVisible: boolean;
  onClose: () => void;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

export const AnimatedToast = ({ 
  children, 
  isVisible, 
  onClose, 
  type = 'info',
  duration = 3000 
}: AnimatedToastProps) => {
  const [isOpen, setIsOpen] = useState(isVisible);

  useEffect(() => {
    setIsOpen(isVisible);
    if (isVisible && duration > 0) {
      const timer = setTimeout(() => {
        setIsOpen(false);
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  const typeClasses = {
    success: 'bg-green-500 text-white',
    error: 'bg-red-500 text-white',
    warning: 'bg-yellow-500 text-white',
    info: 'bg-blue-500 text-white'
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={cn(
            'fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm',
            typeClasses[type]
          )}
          initial={{ x: 300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 300, opacity: 0 }}
          transition={{
            type: "spring" as const,
            stiffness: 300,
            damping: 30
          }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Pulse animado para notificações
interface PulseProps {
  children: ReactNode;
  className?: string;
  color?: string;
}

export const Pulse = ({ 
  children, 
  className,
  color = 'bg-red-500' 
}: PulseProps) => {
  return (
    <div className="relative">
      {children}
      <motion.div
        className={cn('absolute inset-0 rounded-full', color)}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.7, 0, 0.7]
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
    </div>
  );
};
