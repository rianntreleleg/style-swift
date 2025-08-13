import React from 'react';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Column {
  key: string;
  label: string;
  render?: (value: any, row: any) => React.ReactNode;
  mobilePriority?: boolean; // Show on mobile cards
  className?: string;
}

interface MobileTableProps {
  columns: Column[];
  data: any[];
  className?: string;
  emptyMessage?: string;
  onRowClick?: (row: any) => void;
}

export const MobileTable: React.FC<MobileTableProps> = ({
  columns,
  data,
  className,
  emptyMessage = "Nenhum dado encontrado",
  onRowClick
}) => {
  const mobileColumns = columns.filter(col => col.mobilePriority !== false);

  if (data.length === 0) {
    return (
      <div className={cn("text-center py-8 text-muted-foreground", className)}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Desktop Table */}
      <div className="hidden md:block">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead key={column.key} className={column.className}>
                    {column.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, index) => (
                <TableRow 
                  key={row.id || index}
                  className={cn(
                    onRowClick && "cursor-pointer hover:bg-muted/50",
                    "transition-colors"
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((column) => (
                    <TableCell key={column.key} className={column.className}>
                      {column.render 
                        ? column.render(row[column.key], row)
                        : row[column.key]
                      }
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {data.map((row, index) => (
          <Card 
            key={row.id || index}
            className={cn(
              onRowClick && "cursor-pointer hover:shadow-md",
              "transition-all"
            )}
            onClick={() => onRowClick?.(row)}
          >
            <CardContent className="p-4">
              <div className="space-y-3">
                {mobileColumns.map((column) => (
                  <div key={column.key} className="flex flex-col space-y-1">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {column.label}
                    </span>
                    <div className={cn("text-sm", column.className)}>
                      {column.render 
                        ? column.render(row[column.key], row)
                        : row[column.key]
                      }
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

// Helper components for common table elements
export const StatusBadge: React.FC<{ status: string; variant?: string }> = ({ 
  status, 
  variant 
}) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'agendado':
        return { label: 'Agendado', className: 'bg-blue-100 text-blue-800' };
      case 'confirmado':
        return { label: 'Confirmado', className: 'bg-green-100 text-green-800' };
      case 'concluido':
        return { label: 'Concluído', className: 'bg-purple-100 text-purple-800' };
      case 'cancelado':
        return { label: 'Cancelado', className: 'bg-red-100 text-red-800' };
      case 'nao_compareceu':
        return { label: 'Não Compareceu', className: 'bg-orange-100 text-orange-800' };
      default:
        return { label: status, className: 'bg-gray-100 text-gray-800' };
    }
  };

  const config = getStatusConfig(status);

  return (
    <Badge className={cn("text-xs", config.className)}>
      {config.label}
    </Badge>
  );
};

export const ActionButton: React.FC<{
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}> = ({ onClick, icon, label, variant = "outline", size = "sm", className }) => {
  return (
    <Button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      variant={variant}
      size={size}
      className={cn("min-h-[44px]", className)}
    >
      {icon}
      <span className="ml-2">{label}</span>
    </Button>
  );
};
