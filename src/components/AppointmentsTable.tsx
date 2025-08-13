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
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { formatBRL } from '@/lib/utils';

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
  };
  professionals: {
    name: string;
  };
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

      if (error) throw error;

      toast({ title: 'Agendamento excluído com sucesso!' });
      onAppointmentUpdate();
    } catch (error: any) {
      toast({ 
        title: 'Erro ao excluir agendamento', 
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleWhatsAppMessage = (phone: string, customerName: string, appointmentDate: string, appointmentTime: string) => {
    const message = `Olá ${customerName}! 

Confirmando seu agendamento:
📅 Data: ${new Date(appointmentDate).toLocaleDateString('pt-BR')}
🕐 Horário: ${appointmentTime}

Aguardo você! 😊

*StyleSwift - Agendamento Online*`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/55${phone.replace(/\D/g, '')}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
  };

  const formatDateTime = (dateTime: string) => {
    const date = new Date(dateTime);
    return {
      date: date.toLocaleDateString('pt-BR'),
      time: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
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
        {appointments.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum agendamento encontrado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Serviço</TableHead>
                  <TableHead>Profissional</TableHead>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appointments.map((appointment) => {
                  const { date, time } = formatDateTime(appointment.start_time);
                  
                  return (
                    <TableRow key={appointment.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{appointment.customer_name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {appointment.customer_phone}
                          </div>
                          {appointment.notes && (
                            <p className="text-xs text-muted-foreground italic">
                              "{appointment.notes}"
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{appointment.services.name}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{appointment.professionals.name}</span>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{date}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {time}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-bold text-green-600">
                          {formatBRL(appointment.services.price_cents / 100)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(appointment.status)}
                          <Select
                            value={appointment.status}
                            onValueChange={(value) => handleStatusChange(appointment.id, value)}
                            disabled={updatingId === appointment.id}
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
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleWhatsAppMessage(
                              appointment.customer_phone,
                              appointment.customer_name,
                              appointment.start_time,
                              time
                            )}
                            className="text-green-600 hover:text-green-700"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(appointment.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
