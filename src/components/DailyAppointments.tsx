import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Search, Phone, Calendar, Clock, MapPin, MessageCircle, Users, TrendingUp, CheckCircle, AlertCircle, XCircle, Filter } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { format, isToday, parseISO, startOfDay, endOfDay, addDays, subDays } from 'date-fns';
import { toDatabaseString, formatSimpleTime, parseSimpleDateTime } from '@/lib/dateUtils';
import { ptBR } from 'date-fns/locale';


interface Appointment {
  id: string;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
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

interface DailyAppointmentsProps {
  tenantId: string;
}

export const DailyAppointments = ({ tenantId }: DailyAppointmentsProps) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [professionalFilter, setProfessionalFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);


  const fetchTodayAppointments = async () => {
    try {
      const startOfSelectedDate = startOfDay(selectedDate);
      const endOfSelectedDate = endOfDay(selectedDate);

      let query = supabase
        .from('appointments')
        .select(`
          id,
          customer_name,
          customer_phone,
          customer_email,
          start_time,
          end_time,
          status,
          notes,
          services(name, price_cents),
          professionals(name)
        `)
        .eq('tenant_id', tenantId)
        .gte('start_time', toDatabaseString(startOfSelectedDate))
        .lte('start_time', toDatabaseString(endOfSelectedDate))
        .order('start_time', { ascending: true });

      // Aplicar filtros
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (professionalFilter !== 'all') {
        query = query.eq('professionals.name', professionalFilter);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar agendamentos:', error);
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar os agendamentos',
          variant: 'destructive'
        });
        return;
      }

      console.log('Fetched appointments:', data);
      setAppointments(data || []);
    } catch (error) {
      console.error('Erro ao buscar agendamentos:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os agendamentos',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodayAppointments();
    
    // Atualizar a cada 2 minutos
    const interval = setInterval(fetchTodayAppointments, 2 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [tenantId, selectedDate, statusFilter, professionalFilter]);

  const filteredAppointments = appointments.filter(appointment =>
    appointment.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    appointment.services?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    appointment.professionals?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmado':
        return 'default';
      case 'agendado':
        return 'secondary';
      case 'concluido':
        return 'outline';
      case 'cancelado':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmado':
        return 'Confirmado';
      case 'agendado':
        return 'Agendado';
      case 'concluido':
        return 'Concluído';
      case 'cancelado':
        return 'Cancelado';
      default:
        return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmado':
        return <CheckCircle className="h-4 w-4" />;
      case 'agendado':
        return <Clock className="h-4 w-4" />;
      case 'concluido':
        return <CheckCircle className="h-4 w-4" />;
      case 'cancelado':
        return <XCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const enviarWhatsApp = (telefone?: string, nome?: string, servico?: string, profissional?: string, horario?: string) => {
    console.log('enviarWhatsApp called with:', { telefone, nome, servico, profissional, horario });
    
    if (!telefone || telefone.trim() === '') {
      toast({
        title: 'Telefone não disponível',
        description: 'Este cliente não possui número de telefone cadastrado',
        variant: 'destructive'
      });
      return;
    }

    try {
      const hoje = new Date().toLocaleDateString('pt-BR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      const mensagem = `*Olá ${nome || 'cliente'}!* 👋

*📋 CONFIRMAÇÃO DE AGENDAMENTO - HOJE*

📅 *Data:* ${hoje}
🕐 *Horário:* ${horario || 'Confirmar horário'}
${servico ? `🛠️ *Serviço:* ${servico}` : ''}
${profissional ? `👨‍💼 *Profissional:* ${profissional}` : ''}

*📍 IMPORTANTE:*
• Chegue com 10 minutos de antecedência
• Em caso de cancelamento, avise com pelo menos 2 horas de antecedência

*📞 Precisa de algo?*
Entre em contato conosco!

*Aguardo você!* 😊

---
*StyleSwift - Sistema de Agendamento Online*`;

      let numeroLimpo = telefone.replace(/\D/g, '');
      
      // Garantir que o número tenha o código do país
      if (!numeroLimpo.startsWith('55')) {
        numeroLimpo = '55' + numeroLimpo;
      }
      
      if (!numeroLimpo || numeroLimpo.length < 12) {
        toast({
          title: 'Número inválido',
          description: 'O número de telefone não está em um formato válido',
          variant: 'destructive'
        });
        return;
      }
      
      const url = `https://wa.me/${numeroLimpo}?text=${encodeURIComponent(mensagem)}`;
      console.log('Opening WhatsApp URL:', url);
      
      window.open(url, '_blank');
      
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



  // Estatísticas
  const totalAppointments = appointments.length;
  const confirmedAppointments = appointments.filter(a => a.status === 'confirmado').length;
  const pendingAppointments = appointments.filter(a => a.status === 'agendado').length;
  const completedAppointments = appointments.filter(a => a.status === 'concluido').length;
  const cancelledAppointments = appointments.filter(a => a.status === 'cancelado').length;
  
  console.log('Appointment statistics:', {
    total: totalAppointments,
    confirmed: confirmedAppointments,
    pending: pendingAppointments,
    completed: completedAppointments,
    cancelled: cancelledAppointments,
    allStatuses: appointments.map(a => a.status)
  });

  // Receita total (em centavos)
  const totalRevenue = appointments
    .filter(a => a.status === 'concluido')
    .reduce((sum, a) => sum + (a.services?.price_cents || 0), 0);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com busca e filtros */}
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar clientes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filtros
          </Button>
          <div className="text-sm text-muted-foreground">
            Última atualização: {format(new Date(), 'HH:mm', { locale: ptBR })}
          </div>
        </div>

        {/* Painel de filtros */}
        {showFilters && (
          <Card className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Filtro de data */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Data</label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedDate(subDays(selectedDate, 1))}
                  >
                    ←
                  </Button>
                  <div className="flex-1 text-center text-sm font-medium">
                    {format(selectedDate, 'dd/MM/yyyy', { locale: ptBR })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                  >
                    →
                  </Button>
                </div>
              </div>

              {/* Filtro de status */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="agendado">Agendado</SelectItem>
                    <SelectItem value="confirmado">Confirmado</SelectItem>
                    <SelectItem value="concluido">Concluído</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                    <SelectItem value="nao_compareceu">Não Compareceu</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro de profissional */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Profissional</label>
                <Select value={professionalFilter} onValueChange={setProfessionalFilter}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Todos os profissionais" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os profissionais</SelectItem>
                    {Array.from(new Set(appointments.map(a => a.professionals?.name).filter(Boolean))).map(name => (
                      <SelectItem key={name} value={name!}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Botão limpar filtros */}
              <div className="space-y-2">
                <label className="text-sm font-medium">&nbsp;</label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setStatusFilter('all');
                    setProfessionalFilter('all');
                    setSelectedDate(new Date());
                  }}
                  className="w-full"
                >
                  Limpar Filtros
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>



      {/* Dashboard/Relatório */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-blue-500"></div>
              <span className="text-sm font-medium">Total</span>
            </div>
            <div className="text-2xl font-bold">{totalAppointments}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              <span className="text-sm font-medium">Confirmados</span>
            </div>
            <div className="text-2xl font-bold">{confirmedAppointments}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
              <span className="text-sm font-medium">Pendentes</span>
            </div>
            <div className="text-2xl font-bold">{pendingAppointments}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-purple-500"></div>
              <span className="text-sm font-medium">Concluídos</span>
            </div>
            <div className="text-2xl font-bold">{completedAppointments}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-red-500"></div>
              <span className="text-sm font-medium">Cancelados</span>
            </div>
            <div className="text-2xl font-bold">{cancelledAppointments}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
              <span className="text-sm font-medium">Receita</span>
            </div>
            <div className="text-2xl font-bold">R$ {(totalRevenue / 100).toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Agendamentos de Hoje ({filteredAppointments.length})
          </CardTitle>
          <CardDescription>
            Lista de agendamentos para hoje - atualizada automaticamente
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredAppointments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm 
                ? 'Nenhum agendamento encontrado com o filtro aplicado'
                : 'Nenhum agendamento para hoje'
              }
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Horário</TableHead>
                  <TableHead>Profissional</TableHead>
                  <TableHead>Serviço</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAppointments.map((appointment) => (
                  <TableRow key={appointment.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{appointment.customer_name}</div>
                        {appointment.notes && (
                          <div className="text-sm text-muted-foreground">
                            {appointment.notes}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {formatSimpleTime(appointment.start_time)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {appointment.professionals ? (
                        <div className="font-medium">{appointment.professionals.name}</div>
                      ) : (
                        <span className="text-muted-foreground">Não definido</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{appointment.services?.name || 'Não definido'}</div>
                        {appointment.services?.price_cents && (
                          <div className="text-sm text-muted-foreground">
                            R$ {(appointment.services.price_cents / 100).toFixed(2)}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(appointment.status)} className="flex items-center gap-1">
                        {getStatusIcon(appointment.status)}
                        {getStatusText(appointment.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {appointment.customer_phone && (
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="h-3 w-3" />
                            {appointment.customer_phone}
                          </div>
                        )}
                        {appointment.customer_email && (
                          <div className="text-sm text-muted-foreground">
                            {appointment.customer_email}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => enviarWhatsApp(
                  appointment.customer_phone, 
                  appointment.customer_name,
                  appointment.services?.name,
                  appointment.professionals?.name,
                  formatSimpleTime(appointment.start_time)
                )}
                              disabled={!appointment.customer_phone}
                              className="bg-green-50 text-green-600 hover:bg-green-100 border-green-200 hover:border-green-300"
                            >
                              <MessageCircle className="h-4 w-4 mr-1" />
                              WhatsApp
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Enviar mensagem no WhatsApp</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
