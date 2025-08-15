import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Edit,
  Trash2,
  MessageCircle,
  Calendar,
  Clock,
  User,
  Phone,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { formatBRL, cn } from '@/lib/utils';
import { formatSimpleTime, formatSimpleDateTime, parseSimpleDateTime } from '@/lib/dateUtils';
import { MobileTable, StatusBadge, ActionButton } from '@/components/MobileTable';

interface Appointment {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  start_time: string;
  end_time: string;
  status: string;
  notes?: string;
  services: {
    name: string;
    price_cents: number;
  } | null;
  professionals: {
    name: string;
  } | null;
}

interface AppointmentsTableProps {
  appointments: Appointment[];
  tenantId: string;
  onAppointmentUpdate: () => void;
}

const statusOptions = [
  { value: 'agendado', label: 'Agendado', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
  { value: 'confirmado', label: 'Confirmado', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
  { value: 'concluido', label: 'Concluído', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' },
  { value: 'cancelado', label: 'Cancelado', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' },
  { value: 'nao_compareceu', label: 'Não Compareceu', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300' }
];

export default function AppointmentsTable({ appointments, tenantId, onAppointmentUpdate }: AppointmentsTableProps) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleStatusChange = async (appointmentId: string, newStatus: string) => {
    setUpdatingId(appointmentId);

    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', appointmentId);

      if (error) throw error;

      toast({ title: 'Status atualizado com sucesso!' });
      onAppointmentUpdate();
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar status',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (appointmentId: string) => {
    if (!confirm('Tem certeza que deseja excluir este agendamento?')) return;

    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', appointmentId);

      if (error) {
        console.error('Erro ao excluir agendamento:', error);
        throw error;
      }

      toast({ title: 'Agendamento excluído com sucesso!' });

      // Chamar callback para atualizar a lista
      if (onAppointmentUpdate) {
        onAppointmentUpdate();
      }
    } catch (error: any) {
      console.error('Erro detalhado:', error);
      toast({
        title: 'Erro ao excluir agendamento',
        description: error.message || 'Erro desconhecido ao excluir agendamento',
        variant: 'destructive'
      });
    }
  };

  const handleWhatsAppMessage = (phone: string, customerName: string, appointmentDate: string, appointmentTime: string, serviceName?: string, professionalName?: string) => {
    console.log('handleWhatsAppMessage called with:', { phone, customerName, appointmentDate, appointmentTime, serviceName, professionalName });
    
    if (!phone || phone.trim() === '') {
      toast({ 
        title: 'Telefone não disponível', 
        description: 'Este cliente não possui número de telefone cadastrado',
        variant: 'destructive' 
      });
      return;
    }

    try {
      const formattedDate = new Date(appointmentDate).toLocaleDateString('pt-BR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      const message = `*Olá ${customerName}!* 👋

*📋 CONFIRMAÇÃO DE AGENDAMENTO*

📅 *Data:* ${formattedDate}
🕐 *Horário:* ${appointmentTime}
${serviceName ? `🛠️ *Serviço:* ${serviceName}` : ''}
${professionalName ? `👨‍💼 *Profissional:* ${professionalName}` : ''}

*📍 IMPORTANTE:*
• Chegue com 10 minutos de antecedência
• Em caso de cancelamento, avise com pelo menos 2 horas de antecedência

*📞 Precisa de algo?*
Entre em contato conosco!

*Aguardo você!* 😊

---
*StyleSwift - Sistema de Agendamento Online*`;

      let cleanPhone = phone.replace(/\D/g, '');
      
      // Garantir que o número tenha o código do país
      if (!cleanPhone.startsWith('55')) {
        cleanPhone = '55' + cleanPhone;
      }
      
      if (!cleanPhone || cleanPhone.length < 12) {
        toast({ 
          title: 'Número inválido', 
          description: 'O número de telefone não está em um formato válido',
          variant: 'destructive' 
        });
        return;
      }
      
      const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
      console.log('Opening WhatsApp URL:', whatsappUrl);
      
      window.open(whatsappUrl, '_blank');
      
      toast({ 
        title: 'WhatsApp aberto', 
        description: 'Mensagem de confirmação pronta para envio',
        variant: 'default' 
      });
    } catch (error) {
      console.error('Erro ao abrir WhatsApp:', error);
      toast({ 
        title: 'Erro', 
        description: 'Não foi possível abrir o WhatsApp',
        variant: 'destructive' 
      });
    }
  };

  const formatDateTime = (dateTimeString: string) => {
    const date = parseSimpleDateTime(dateTimeString);
    return {
      date: date.toLocaleDateString('pt-BR', { timeZone: 'UTC' }),
      time: formatSimpleTime(dateTimeString)
    };
  };

  const getStatusBadge = (status: string) => {
    const statusOption = statusOptions.find(option => option.value === status);
    if (!statusOption) return null;

    return (
      <Badge className={statusOption.color}>
        {statusOption.label}
      </Badge>
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmado':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'cancelado':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'nao_compareceu':
        return <AlertCircle className="h-4 w-4 text-orange-600" />;
      default:
        return <Calendar className="h-4 w-4 text-blue-600" />;
    }
  };

  // Prepare data for mobile table
  const tableData = appointments.map((appointment) => {
    const { date, time } = formatDateTime(appointment.start_time);
    return {
      id: appointment.id,
      customer: {
        name: appointment.customer_name,
        phone: appointment.customer_phone,
        notes: appointment.notes
      },
      service: appointment.services?.name || 'Serviço não encontrado',
      professional: appointment.professionals?.name || 'Profissional não encontrado',
      dateTime: { date, time },
      price: appointment.services?.price_cents ? 
        `R$ ${(appointment.services.price_cents / 100).toFixed(2).replace('.', ',')}` : 
        'N/A',
      status: appointment.status,
      raw: appointment
    };
  });

  const columns = [
    {
      key: 'customer',
      label: 'Cliente',
      mobilePriority: true,
      render: (value: any) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{value.name}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="h-3 w-3" />
            {value.phone}
          </div>
          {value.notes && (
            <p className="text-xs text-muted-foreground italic">
              "{value.notes}"
            </p>
          )}
        </div>
      )
    },
    {
      key: 'service',
      label: 'Serviço',
      mobilePriority: true,
      render: (value: string) => <span className="font-medium">{value}</span>
    },
    {
      key: 'professional',
      label: 'Profissional',
      mobilePriority: true,
      render: (value: string) => <span className="text-sm">{value}</span>
    },
    {
      key: 'dateTime',
      label: 'Data/Hora',
      mobilePriority: true,
      render: (value: any) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{value.date}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-3 w-3" />
            {value.time}
          </div>
        </div>
      )
    },
    {
      key: 'price',
      label: 'Valor',
      mobilePriority: false,
      render: (value: string) => (
        <span className="font-bold text-green-600">{value}</span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      mobilePriority: true,
      render: (value: string) => (
        <div className="flex items-center gap-2">
          {getStatusIcon(value)}
          <Select
            value={value}
            onValueChange={(newStatus) => handleStatusChange(tableData.find(row => row.status === value)?.raw.id, newStatus)}
            disabled={updatingId === tableData.find(row => row.status === value)?.raw.id}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )
    },
    {
      key: 'actions',
      label: 'Ações',
      mobilePriority: true,
      render: (value: any, row: any) => (
        <div className="flex flex-wrap items-center gap-2">
          <ActionButton
            onClick={() => handleWhatsAppMessage(
              row.raw.customer_phone,
              row.raw.customer_name,
              row.raw.start_time,
              formatSimpleTime(row.raw.start_time),
              row.raw.services?.name,
              row.raw.professionals?.name
            )}
            icon={<MessageCircle className="h-4 w-4" />}
            label="WhatsApp"
            className="bg-green-50 text-green-600 hover:bg-green-100 border-green-200 hover:border-green-300"
          />
          <ActionButton
            onClick={() => handleDelete(row.raw.id)}
            icon={<Trash2 className="h-4 w-4" />}
            label="Excluir"
            variant="destructive"
          />
        </div>
      )
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Agendamentos ({appointments.length})
        </CardTitle>
        <CardDescription>
          Gerencie todos os agendamentos do estabelecimento
        </CardDescription>
      </CardHeader>
      <CardContent>
        <MobileTable
          columns={columns}
          data={tableData}
          emptyMessage="Nenhum agendamento encontrado."
        />
      </CardContent>
    </Card>
  );
}
