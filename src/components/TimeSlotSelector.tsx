import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Clock, Calendar, User, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { format, parseISO, isSameDay, setHours, setMinutes, isWithinInterval, addDays, startOfDay, endOfDay, isBefore, isAfter, addMinutes, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toDatabaseString, getLocalDayBounds, parseSimpleDateTime } from '@/lib/dateUtils';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, Tag } from "lucide-react";

interface Appointment {
  id: string;
  customer_name: string;
  start_time: string;
  end_time: string;
  status: string;
  services: {
    name: string;
  } | null;
  professionals: {
    name: string;
  } | null;
}

interface TimeBlock {
  id: string;
  professional_id: string;
  start_time: string;
  end_time: string;
  reason?: string;
  professionals: {
    name: string;
  } | null;
}

interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  price_cents: number;
}

interface TimeSlotSelectorProps {
  selectedDate: Date;
  tenantId: string;
  serviceId?: string;
  professionalId?: string;
  onTimeSelect: (time: string) => void;
  selectedTime?: string;
}

export const TimeSlotSelector = ({
  selectedDate,
  tenantId,
  serviceId,
  professionalId,
  onTimeSelect,
  selectedTime
}: TimeSlotSelectorProps) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [businessHours, setBusinessHours] = useState<any[]>([]);
  const { toast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      const startOfSelectedDay = startOfDay(selectedDate);
      const endOfSelectedDay = endOfDay(selectedDate);

      // Usar função utilitária para conversão ISO local

      const [
        { data: appointmentsData, error: appointmentsError },
        { data: professionalsData, error: professionalsError },
        { data: servicesData, error: servicesError },
        { data: businessHoursData, error: businessHoursError }
      ] = await Promise.all([
        supabase
          .from('appointments')
          .select(`
            *,
            services(name),
            professionals(name)
          `)
          .eq('tenant_id', tenantId)
          .gte('start_time', getLocalDayBounds(selectedDate).start)
          .lte('start_time', getLocalDayBounds(selectedDate).end)
          .order('start_time', { ascending: true }),
        supabase
          .from('professionals')
          .select('id, name, active')
          .eq('tenant_id', tenantId)
          .eq('active', true)
          .order('name'),
        supabase
          .from('services')
          .select('id, name, duration_minutes, price_cents')
          .eq('tenant_id', tenantId)
          .eq('active', true)
          .order('name'),
        supabase
          .from('business_hours')
          .select('*')
          .eq('tenant_id', tenantId)
      ]);

      if (appointmentsError) throw appointmentsError;
      if (professionalsError) throw professionalsError;
      if (servicesError) throw servicesError;

      setAppointments(appointmentsData || []);
      setTimeBlocks([]); // Por enquanto, não usamos time_blocks
      setProfessionals(professionalsData || []);
      setServices(servicesData || []);
      setBusinessHours(businessHoursData || []);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os horários disponíveis',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedDate, tenantId]);

  const getBusinessHoursForDay = (date: Date) => {
    const weekday = date.getDay(); // 0 = domingo, 1 = segunda, etc.
    console.log('[TimeSlotSelector] Buscando horários para dia da semana:', weekday);
    console.log('[TimeSlotSelector] Horários disponíveis:', businessHours);
    
    const businessHour = businessHours.find(bh => bh.weekday === weekday);

    if (businessHour) {
      console.log('[TimeSlotSelector] Horário encontrado:', businessHour);
      return {
        open: businessHour.open_time,
        close: businessHour.close_time,
        closed: businessHour.closed
      };
    }

    console.log('[TimeSlotSelector] Usando horários padrão para dia:', weekday);
    // Fallback para horários padrão se não encontrar configuração
    const defaultHours = {
      0: { open: '09:00', close: '18:00', closed: true }, // Domingo
      1: { open: '09:00', close: '18:00', closed: false }, // Segunda
      2: { open: '09:00', close: '18:00', closed: false }, // Terça
      3: { open: '09:00', close: '18:00', closed: false }, // Quarta
      4: { open: '09:00', close: '18:00', closed: false }, // Quinta
      5: { open: '09:00', close: '18:00', closed: false }, // Sexta
      6: { open: '09:00', close: '17:00', closed: false }  // Sábado
    };

    return defaultHours[weekday as keyof typeof defaultHours];
  };

  const generateTimeSlots = () => {
    console.log('[TimeSlotSelector] Gerando slots para data:', selectedDate);
    const hours = getBusinessHoursForDay(selectedDate);
    console.log('[TimeSlotSelector] Horários de funcionamento:', hours);

    if (hours.closed) {
      console.log('[TimeSlotSelector] Estabelecimento fechado neste dia');
      return [];
    }

    const slots = [];
    
    // Parsear horários de abertura e fechamento
    const [openHour, openMinute] = hours.open.split(':').map(Number);
    const [closeHour, closeMinute] = hours.close.split(':').map(Number);
    console.log('[TimeSlotSelector] Horário de abertura:', `${openHour}:${openMinute}`);
    console.log('[TimeSlotSelector] Horário de fechamento:', `${closeHour}:${closeMinute}`);

    // Criar data base para o dia selecionado (sem timezone)
    const baseDate = new Date(selectedDate);
    baseDate.setHours(0, 0, 0, 0);

    // Definir horário de início
    let currentTime = new Date(baseDate);
    currentTime.setHours(openHour, openMinute, 0, 0);

    // Definir horário de fechamento
    const closeTime = new Date(baseDate);
    closeTime.setHours(closeHour, closeMinute, 0, 0);

    // Gerar slots de 30 em 30 minutos
    while (currentTime < closeTime) {
      slots.push(new Date(currentTime));
      currentTime = new Date(currentTime.getTime() + 30 * 60 * 1000); // 30 minutos
    }

    console.log('[TimeSlotSelector] Slots gerados:', slots.length);
    return slots;
  };

  const isTimeSlotBooked = (timeSlot: Date) => {
    return appointments.some(appointment => {
      // Se há um profissional selecionado, só bloquear para esse profissional
      if (professionalId && appointment.professional_id !== professionalId) {
        return false;
      }
      
      // Parse direto SEM conversão - o que está no banco é o que comparamos
      const appointmentTime = parseSimpleDateTime(appointment.start_time);
      return isSameDay(appointmentTime, timeSlot) &&
        appointmentTime.getHours() === timeSlot.getHours() &&
        appointmentTime.getMinutes() === timeSlot.getMinutes() &&
        appointment.status !== 'cancelado';
    });
  };

  const isTimeSlotBlocked = (timeSlot: Date) => {
    return timeBlocks.some(block => {
      const startTime = parseISO(block.start_time);
      const endTime = parseISO(block.end_time);
      return isWithinInterval(timeSlot, { start: startTime, end: endTime });
    });
  };

  // Nova função: verificar se o horário já passou (para hoje)
  const isTimeSlotPast = (timeSlot: Date) => {
    const now = new Date();
    const isToday = isSameDay(timeSlot, now);

    if (!isToday) return false;

    // Para hoje, apenas bloquear horários que já passaram (sem margem)
    return isBefore(timeSlot, now);
  };

  // Nova função: verificar se o slot está ocupado por múltiplos slots
  const isTimeSlotOccupiedByMultiSlot = (timeSlot: Date) => {
    if (!selectedService) return false;

    const serviceDuration = selectedService.duration_minutes;
    const serviceSlots = Math.ceil(serviceDuration / 30);

    // Se o serviço ocupa apenas 1 slot, não há problema
    if (serviceSlots <= 1) return false;

    // Verificar se há conflito com agendamentos existentes
    for (let i = 0; i < serviceSlots; i++) {
      const checkTime = addMinutes(timeSlot, i * 30);

      // Verificar se este slot específico está ocupado
      const isOccupied = appointments.some(appointment => {
        // Se há um profissional selecionado, só verificar para esse profissional
        if (professionalId && appointment.professional_id !== professionalId) {
          return false;
        }
        
        // Converter UTC do banco para horário local para comparação
        const appointmentTime = parseUTCToLocal(appointment.start_time);
        return isSameDay(appointmentTime, checkTime) &&
          appointmentTime.getHours() === checkTime.getHours() &&
          appointmentTime.getMinutes() === checkTime.getMinutes() &&
          appointment.status !== 'cancelado';
      });

      if (isOccupied) return true;
    }

    return false;
  };

  // Nova função: verificar se um slot está parcialmente ocupado por um agendamento longo
  const isTimeSlotPartiallyOccupied = (timeSlot: Date) => {
    return appointments.some(appointment => {
      if (appointment.status === 'cancelado') return false;
      
      // Se há um profissional selecionado, só verificar para esse profissional
      if (professionalId && appointment.professional_id !== professionalId) {
        return false;
      }
      
      // Parse direto SEM conversão - o que está no banco é o que comparamos
      const appointmentStart = parseSimpleDateTime(appointment.start_time);
      const appointmentEnd = parseSimpleDateTime(appointment.end_time);
      
      // Verificar se o slot está dentro do período de um agendamento existente
      return isSameDay(appointmentStart, timeSlot) &&
        timeSlot.getTime() >= appointmentStart.getTime() &&
        timeSlot.getTime() < appointmentEnd.getTime();
    });
  };

  // Nova função: obter informações do agendamento que ocupa este slot (PROTEGIDO - sem mostrar nome)
  const getOccupyingAppointment = (timeSlot: Date) => {
    return appointments.find(appointment => {
      if (appointment.status === 'cancelado') return false;
      
      // Se há um profissional selecionado, só verificar para esse profissional
      if (professionalId && appointment.professional_id !== professionalId) {
        return false;
      }
      
      // Parse direto SEM conversão - o que está no banco é o que comparamos
      const appointmentStart = parseSimpleDateTime(appointment.start_time);
      const appointmentEnd = parseSimpleDateTime(appointment.end_time);
      
      return isSameDay(appointmentStart, timeSlot) &&
        timeSlot.getTime() >= appointmentStart.getTime() &&
        timeSlot.getTime() < appointmentEnd.getTime();
    });
  };

  const getAppointmentForTimeSlot = (timeSlot: Date) => {
    return appointments.find(appointment => {
      // Se há um profissional selecionado, só verificar para esse profissional
      if (professionalId && appointment.professional_id !== professionalId) {
        return false;
      }
      
      // Parse direto SEM conversão - o que está no banco é o que comparamos
      const appointmentTime = parseSimpleDateTime(appointment.start_time);
      return isSameDay(appointmentTime, timeSlot) &&
        appointmentTime.getHours() === timeSlot.getHours() &&
        appointmentTime.getMinutes() === timeSlot.getMinutes();
    });
  };

  const handleTimeSlotClick = (timeSlot: Date) => {
    console.log('[TimeSlotSelector] Clicou no horário:', timeSlot);
    
    if (isTimeSlotBooked(timeSlot) || isTimeSlotBlocked(timeSlot) || isTimeSlotPast(timeSlot) || isTimeSlotOccupiedByMultiSlot(timeSlot) || isTimeSlotPartiallyOccupied(timeSlot)) {
      console.log('[TimeSlotSelector] Horário bloqueado ou ocupado');
      return;
    }

    // Enviar apenas o horário no formato HH:mm sem conversão de timezone
    const timeString = format(timeSlot, 'HH:mm');
    console.log('[TimeSlotSelector] Enviando horário:', timeString);
    onTimeSelect(timeString);
  };

  // Obter informações do serviço selecionado
  const selectedService = services.find(s => s.id === serviceId);
  const serviceDuration = selectedService?.duration_minutes || 30;
  const serviceSlots = Math.ceil(serviceDuration / 30); // Cada slot é de 30 minutos

  const timeSlots = generateTimeSlots();
  const hours = getBusinessHoursForDay(selectedDate);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-6 gap-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (hours.closed) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <XCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Fechado</h3>
          <p className="text-muted-foreground">
            Não há horários disponíveis para {format(selectedDate, 'EEEE', { locale: ptBR })}.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Informações do serviço */}
      {selectedService && (() => {
        // Lógica para deixar o JSX mais limpo
        const slotText = `${serviceSlots} ${serviceSlots === 1 ? 'vaga' : 'vagas'}`;
        const formattedPrice = new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        }).format(selectedService.price_cents / 100);

        return (
          <Alert className="mt-4">
            <Info className="h-4 w-4" />
            <AlertTitle>{selectedService.name}</AlertTitle>
            <AlertDescription className="mt-2 space-y-1">
              <div className="flex items-center text-sm text-muted-foreground">
                <Clock className="mr-2 h-4 w-4 flex-shrink-0" />
                <span>Duração: {serviceDuration} minutos ({slotText})</span>
              </div>
              <div className="flex items-center text-sm text-muted-foreground">
                <Tag className="mr-2 h-4 w-4 flex-shrink-0" />
                <span>Preço: {formattedPrice}</span>
              </div>
            </AlertDescription>
          </Alert>
        );
      })()}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Horários Disponíveis
          </CardTitle>
          <CardDescription>
            {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })} • {hours.open} - {hours.close}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
            {timeSlots.map((timeSlot, index) => {
              const isBooked = isTimeSlotBooked(timeSlot);
              const isBlocked = isTimeSlotBlocked(timeSlot);
              const isPast = isTimeSlotPast(timeSlot);
              const isMultiSlotOccupied = isTimeSlotOccupiedByMultiSlot(timeSlot);
              const isPartiallyOccupied = isTimeSlotPartiallyOccupied(timeSlot);
              const appointment = getAppointmentForTimeSlot(timeSlot);
              const occupyingAppointment = getOccupyingAppointment(timeSlot);
              const isSelected = selectedTime === format(timeSlot, 'HH:mm');

              let buttonClass = '';
              if (isBooked) {
                buttonClass = 'bg-red-100 text-red-800 border-red-300 cursor-not-allowed';
              } else if (isBlocked) {
                buttonClass = 'bg-gray-100 text-gray-500 border-gray-300 cursor-not-allowed';
              } else if (isPast) {
                buttonClass = 'bg-orange-100 text-orange-800 border-orange-300 cursor-not-allowed';
              } else if (isMultiSlotOccupied) {
                buttonClass = 'bg-yellow-100 text-yellow-800 border-yellow-300 cursor-not-allowed';
              } else if (isPartiallyOccupied) {
                buttonClass = 'bg-blue-100 text-blue-800 border-blue-300 cursor-not-allowed';
              } else if (isSelected) {
                buttonClass = 'bg-primary text-primary-foreground';
              } else {
                buttonClass = 'hover:bg-primary/10';
              }

              return (
                <Button
                  type="button"
                  key={index}
                  variant={isSelected ? "default" : "outline"}
                  className={`h-14 md:h-16 flex flex-col items-center justify-center p-2 text-xs min-h-[44px] ${buttonClass}`}
                  onClick={() => handleTimeSlotClick(timeSlot)}
                  disabled={isBooked || isBlocked || isPast || isMultiSlotOccupied || isPartiallyOccupied}
                >
                  <div className="font-medium">
                    {format(timeSlot, 'HH:mm')}
                  </div>
                  {appointment && (
                    <div className="text-xs opacity-75 truncate max-w-full">
                      Agendado
                    </div>
                  )}
                  {occupyingAppointment && (
                    <div className="text-xs opacity-75 truncate max-w-full text-blue-600">
                      Indisponível
                    </div>
                  )}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Legenda */}
      <div className="grid grid-cols-2 md:flex md:items-center gap-2 md:gap-4 text-xs md:text-sm flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 md:w-4 md:h-4 border-2 border-gray-300 bg-white rounded"></div>
          <span>Disponível</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 md:w-4 md:h-4 bg-red-100 border-2 border-red-300 rounded"></div>
          <span>Ocupado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 md:w-4 md:h-4 bg-gray-100 border-2 border-gray-300 rounded"></div>
          <span>Bloqueado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 md:w-4 md:h-4 bg-orange-100 border-2 border-orange-300 rounded"></div>
          <span>Horário passou</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 md:w-4 md:h-4 bg-yellow-100 border-2 border-yellow-300 rounded"></div>
          <span>Conflito</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 md:w-4 md:h-4 bg-blue-100 border-2 border-blue-300 rounded"></div>
          <span>Ocupado por agendamento longo</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 md:w-4 md:h-4 bg-primary border-2 border-primary rounded"></div>
          <span>Selecionado</span>
        </div>
      </div>

      {/* Informações do horário selecionado */}
      {selectedTime && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <div className="font-medium">
                  Horário selecionado: {selectedTime}
                </div>
                <div className="text-sm text-muted-foreground">
                  {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                </div>
                {selectedService && (
                  <div className="text-sm text-blue-600">
                    Serviço: {selectedService.name} ({serviceDuration} min)
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Informações sobre o sistema de slots */}
      {selectedService && serviceSlots > 1 && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Informação sobre slots</AlertTitle>
          <AlertDescription>
            Este serviço ocupa {serviceSlots} slots de 30 minutos ({serviceDuration} min total). 
            Todos os slots necessários devem estar disponíveis para o agendamento.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
