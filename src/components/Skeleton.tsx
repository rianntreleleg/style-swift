import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
  animate?: boolean;
  display?: 'inline' | 'block' | 'inline-block';
}

export const Skeleton = ({ 
  className, 
  width, 
  height, 
  rounded = 'md',
  animate = true,
  display = 'inline-block'
}: SkeletonProps) => {
  const roundedClasses = {
    none: '',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full'
  };

  const displayClasses = {
    inline: 'inline',
    block: 'block',
    'inline-block': 'inline-block'
  };

  return (
    <motion.div
      className={cn(
        'bg-muted',
        roundedClasses[rounded],
        className,
        displayClasses[display],
        !width && !className?.includes('w-') ? 'w-full' : ''
      )}
      style={{ width, height }}
      animate={animate ? {
        opacity: [0.5, 1, 0.5],
      } : {}}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    />
  );
};

// Skeletons específicos para diferentes componentes
export const CardSkeleton = () => (
  <div className="space-y-3 w-full">
    <Skeleton className="h-4 w-3/4" />
    <Skeleton className="h-4 w-1/2" />
    <Skeleton className="h-4 w-2/3" />
  </div>
);

export const TableSkeleton = ({ rows = 5 }: { rows?: number }) => (
  <div className="space-y-2 w-full">
    {/* Header */}
    <div className="flex gap-2">
      <Skeleton className="h-4 w-1/4" />
      <Skeleton className="h-4 w-1/4" />
      <Skeleton className="h-4 w-1/4" />
      <Skeleton className="h-4 w-1/4" />
    </div>
    {/* Rows */}
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex gap-2">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-4 w-1/4" />
      </div>
    ))}
  </div>
);

export const AvatarSkeleton = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12'
  };

  return (
    <Skeleton 
      className={cn('rounded-full', sizeClasses[size], 'inline-block')} 
    />
  );
};

export const ButtonSkeleton = ({ variant = 'default' }: { variant?: 'default' | 'outline' }) => {
  const baseClasses = 'h-10 w-24';
  const variantClasses = {
    default: 'bg-muted',
    outline: 'bg-muted border border-border'
  };

  return (
    <Skeleton 
      className={cn(baseClasses, variantClasses[variant], 'rounded-md inline-block')} 
    />
  );
};

export const DashboardSkeleton = () => (
  <div className="space-y-6 w-full">
    {/* Stats Cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="p-6 border rounded-lg space-y-3">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      ))}
    </div>
    
    {/* Chart */}
    <div className="p-6 border rounded-lg space-y-4">
      <Skeleton className="h-6 w-1/4" />
      <Skeleton className="h-64 w-full" />
    </div>
    
    {/* Table */}
    <div className="p-6 border rounded-lg space-y-4">
      <Skeleton className="h-6 w-1/3" />
      <TableSkeleton rows={6} />
    </div>
  </div>
);
