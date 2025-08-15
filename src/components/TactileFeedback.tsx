import { motion, useMotionValue, useTransform } from 'framer-motion';
import { ReactNode, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface TactileFeedbackProps {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  onTap?: () => void;
  scale?: number;
  duration?: number;
  ripple?: boolean;
  haptic?: boolean;
}

export const TactileFeedback = ({
  children,
  className,
  disabled = false,
  onClick,
  onTap,
  scale = 0.95,
  duration = 0.1,
  ripple = true,
  haptic = true
}: TactileFeedbackProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const scaleX = useTransform(x, [0, 1], [1, scale]);
  const scaleY = useTransform(y, [0, 1], [1, scale]);

  // Feedback tátil para dispositivos móveis
  const triggerHaptic = () => {
    if (haptic && 'vibrate' in navigator) {
      navigator.vibrate(10); // Vibração sutil de 10ms
    }
  };

  // Efeito ripple
  const createRipple = (event: React.MouseEvent) => {
    if (!ripple || !ref.current) return;

    const rect = ref.current.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;

    const rippleElement = document.createElement('span');
    rippleElement.style.width = rippleElement.style.height = size + 'px';
    rippleElement.style.left = x + 'px';
    rippleElement.style.top = y + 'px';
    rippleElement.className = 'absolute rounded-full bg-white/20 animate-ripple';

    ref.current.appendChild(rippleElement);

    setTimeout(() => {
      rippleElement.remove();
    }, 600);
  };

  const handleClick = (event: React.MouseEvent) => {
    if (disabled) return;
    
    triggerHaptic();
    createRipple(event);
    onClick?.();
  };

  const handleTap = () => {
    if (disabled) return;
    
    triggerHaptic();
    onTap?.();
  };

  return (
    <motion.div
      ref={ref}
      className={cn(
        'relative overflow-hidden cursor-pointer select-none',
        disabled && 'cursor-not-allowed opacity-50',
        className
      )}
      style={{
        scaleX,
        scaleY,
      }}
      whileHover={!disabled ? { scale: 1.02 } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
      onTap={handleTap}
      onClick={handleClick}
      transition={{
        type: "spring" as const,
        stiffness: 400,
        damping: 17,
        duration
      }}
    >
      {children}
    </motion.div>
  );
};

// Botão com feedback tátil
interface TactileButtonProps extends TactileFeedbackProps {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const TactileButton = ({
  children,
  variant = 'default',
  size = 'md',
  loading = false,
  disabled,
  className,
  ...props
}: TactileButtonProps) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';
  
  const variantClasses = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90',
    outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
    ghost: 'hover:bg-accent hover:text-accent-foreground',
    destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
  };

  const sizeClasses = {
    sm: 'h-9 px-3 text-sm',
    md: 'h-10 px-4 py-2',
    lg: 'h-11 px-8'
  };

  return (
    <TactileFeedback
      disabled={disabled || loading}
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        'rounded-md',
        className
      )}
      {...props}
    >
      {loading ? (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
        />
      ) : (
        children
      )}
    </TactileFeedback>
  );
};

// Card com feedback tátil
interface TactileCardProps extends TactileFeedbackProps {
  padding?: 'sm' | 'md' | 'lg';
  border?: boolean;
}

export const TactileCard = ({
  children,
  padding = 'md',
  border = true,
  className,
  ...props
}: TactileCardProps) => {
  const paddingClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6'
  };

  return (
    <TactileFeedback
      className={cn(
        'bg-card text-card-foreground',
        paddingClasses[padding],
        border && 'border border-border',
        'rounded-lg shadow-sm hover:shadow-md transition-shadow',
        className
      )}
      {...props}
    >
      {children}
    </TactileFeedback>
  );
};
