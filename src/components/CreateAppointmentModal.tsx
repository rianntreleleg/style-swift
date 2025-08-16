import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { motion } from 'framer-motion';
import { CalendarIcon, Plus, Loader2, AlertCircle } from 'lucide-react';
import { format, addDays, startOfDay, addMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { toDatabaseString } from '@/lib/dateUtils';
import { Alert, AlertDescription } from '@/components/ui/alert';

const CreateAppointmentSchema = z.object({
  customer_name: z.string().min(2, 'Nome é obrigatório'),
  customer_phone: z.string().min(10, 'Telefone é obrigatório'),
  customer_email: z.string().email('Email inválido').optional().or(z.literal('')),
  professional_id: z.string().uuid('Selecione um profissional'),
  service_id: z.string().uuid('Selecione um serviço'),
  date: z.date({
    required_error: 'Data é obrigatória',
  }),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Horário inválido (HH:MM)'),
  notes: z.string().optional().or(z.literal('')),
});

type CreateAppointmentForm = z.infer<typeof CreateAppointmentSchema>;

interface Professional {
  id: string;
  name: string;
}

interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  price_cents: number;
}

interface CreateAppointmentModalProps {
  tenantId: string;
  onAppointmentCreated: () => void;
  trigger?: React.ReactNode;
}

export function CreateAppointmentModal({ 
  tenantId, 
  onAppointmentCreated, 
  trigger 
}: CreateAppointmentModalProps) {
  const [open, setOpen] = useState(false);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [validationLoading, setValidationLoading] = useState(false);
  const [conflictError, setConflictError] = useState<string | null>(null);

  const form = useForm<CreateAppointmentForm>({
    resolver: zodResolver(CreateAppointmentSchema),
    mode: "onChange", // Validar em tempo real
    defaultValues: {
      customer_name: '',
      customer_phone: '',
      customer_email: '',
      professional_id: '',
      service_id: '',
      time: '',
      notes: '',
    },
  });

  // Verificar se todos os campos obrigatórios estão preenchidos
  const isFormValid = useMemo(() => {
    const values = form.getValues();
    const errors = form.formState.errors;
    
    // Campos obrigatórios que devem estar preenchidos e válidos
    const requiredFields = [
      'customer_name',
      'customer_phone',
      'professional_id',
      'service_id',
      'date',
      'time'
    ];
    
    // Verificar se todos os campos obrigatórios estão preenchidos e sem erros
    return requiredFields.every(field => {
      const value = values[field as keyof CreateAppointmentForm];
      const error = errors[field as keyof typeof errors];
      
      // Para campos de string, verificar se não estão vazios
      if (typeof value === 'string') {
        return value && value.trim() !== '' && !error;
      }
      
      // Para campos de data, verificar se existe
      if (value instanceof Date) {
        return value && !error;
      }
      
      // Para outros tipos, verificar se existe e não tem erro
      return value && !error;
    });
  }, [form.watch(), form.formState.errors]);

  // Buscar profissionais e serviços ao abrir o modal
  useEffect(() => {
    if (open) {
      fetchProfessionalsAndServices();
    }
  }, [open, tenantId]);

  const fetchProfessionalsAndServices = async () => {
    try {
      const [professionalsResult, servicesResult] = await Promise.all([
        supabase
          .from('professionals')
          .select('id, name')
          .eq('tenant_id', tenantId)
          .order('name'),
        supabase
          .from('services')
          .select('id, name, duration_minutes, price_cents')
          .eq('tenant_id', tenantId)
          .order('name'),
      ]);

      if (professionalsResult.error) throw professionalsResult.error;
      if (servicesResult.error) throw servicesResult.error;

      setProfessionals(professionalsResult.data || []);
      setServices(servicesResult.data || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar dados',
        description: error.message || 'Ocorreu um erro ao carregar os dados necessários',
        variant: 'destructive',
      });
    }
  };

  // Validar conflitos em tempo real
  const validateConflicts = async (values: Partial<CreateAppointmentForm>) => {
    if (!values.professional_id || !values.service_id || !values.date || !values.time) {
      setConflictError(null);
      return;
    }

    setValidationLoading(true);
    setConflictError(null);

    try {
      const service = services.find(s => s.id === values.service_id);
      if (!service) return;

      // Criar timestamps para início e fim
      const [hours, minutes] = values.time.split(':').map(Number);
      const startTime = new Date(values.date);
      startTime.setHours(hours, minutes, 0, 0);
      
      const endTime = addMinutes(startTime, service.duration_minutes);

      // Verificar conflitos usando a função RPC
      const { data, error } = await supabase.rpc('check_appointment_conflicts', {
        p_tenant_id: tenantId,
        p_professional_id: values.professional_id,
        p_start_time: toDatabaseString(startTime),
        p_end_time: toDatabaseString(endTime),
      });

      if (error) throw error;

      if (data === true) {
        setConflictError('Já existe um agendamento para este profissional neste horário. Por favor, escolha outro horário.');
      }
    } catch (error: any) {
      console.error('Erro ao validar conflitos:', error);
    } finally {
      setValidationLoading(false);
    }
  };

  // Validar conflitos quando campos relevantes mudarem
  useEffect(() => {
    const subscription = form.watch((values) => {
      validateConflicts(values);
    });
    return () => subscription.unsubscribe();
  }, [services]);

  const onSubmit = async (values: CreateAppointmentForm) => {
    if (conflictError) {
      toast({
        title: 'Conflito de horário',
        description: conflictError || 'Existe um conflito de horário para este profissional',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const service = services.find(s => s.id === values.service_id);
      if (!service) throw new Error('Serviço não encontrado');

      // Criar timestamps para início e fim
      const [hours, minutes] = values.time.split(':').map(Number);
      const startTime = new Date(values.date);
      startTime.setHours(hours, minutes, 0, 0);
      
      const endTime = addMinutes(startTime, service.duration_minutes);

      // Usar a função RPC segura para criar o agendamento
      const { data, error } = await supabase.rpc('create_appointment_safe', {
        p_tenant_id: tenantId,
        p_professional_id: values.professional_id,
        p_service_id: values.service_id,
        p_customer_name: values.customer_name,
        p_customer_phone: values.customer_phone,
        p_customer_email: values.customer_email || null,
        p_start_time: toDatabaseString(startTime),
        p_end_time: toDatabaseString(endTime),
        p_notes: values.notes || null,
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; message: string };

      if (!result.success) {
        if (result.error === 'CONFLICT') {
          setConflictError(result.message);
          return;
        }
        throw new Error(result.message);
      }

      toast({
        title: 'Agendamento criado com sucesso!',
        description: 'O agendamento foi registrado no sistema e o cliente será notificado.',
      });

      setOpen(false);
      form.reset();
      onAppointmentCreated();
    } catch (error: any) {
      toast({
        title: 'Erro ao criar agendamento',
        description: error.message || 'Ocorreu um erro ao criar o agendamento. Por favor, tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Gerar horários de 30 em 30 minutos das 8h às 18h
  const timeSlots = [];
  for (let hour = 8; hour <= 18; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      if (hour === 18 && minute > 0) break; // Parar em 18:00
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      timeSlots.push(timeString);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Novo Agendamento
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Novo Agendamento</DialogTitle>
          <DialogDescription>
            Preencha os dados para criar um novo agendamento.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Dados do cliente */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <h4 className="font-medium">Dados do Cliente</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <motion.div 
                className="space-y-2"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: 0.1 }}
              >
                <Label htmlFor="customer_name">Nome *</Label>
                <Input
                  id="customer_name"
                  {...form.register('customer_name')}
                  placeholder="Nome completo do cliente"
                />
                {form.formState.errors.customer_name && (
                  <motion.p 
                    className="text-sm text-red-500"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {form.formState.errors.customer_name.message}
                  </motion.p>
                )}
              </motion.div>

              <motion.div 
                className="space-y-2"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: 0.1 }}
              >
                <Label htmlFor="customer_phone">Telefone *</Label>
                <Input
                  id="customer_phone"
                  {...form.register('customer_phone')}
                  placeholder="(11) 99999-9999"
                />
                {form.formState.errors.customer_phone && (
                  <motion.p 
                    className="text-sm text-red-500"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {form.formState.errors.customer_phone.message}
                  </motion.p>
                )}
              </motion.div>
            </div>

            <motion.div 
              className="space-y-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.2 }}
            >
              <Label htmlFor="customer_email">Email</Label>
              <Input
                id="customer_email"
                type="email"
                {...form.register('customer_email')}
                placeholder="email@exemplo.com (opcional)"
              />
              {form.formState.errors.customer_email && (
                <motion.p 
                  className="text-sm text-red-500"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {form.formState.errors.customer_email.message}
                </motion.p>
              )}
            </motion.div>
          </motion.div>

          {/* Dados do agendamento */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="space-y-4"
          >
            <h4 className="font-medium">Dados do Agendamento</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <motion.div 
                className="space-y-2"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: 0.2 }}
              >
                <Label>Profissional *</Label>
                <Select
                  value={form.watch('professional_id')}
                  onValueChange={(value) => form.setValue('professional_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um profissional" />
                  </SelectTrigger>
                  <SelectContent>
                    {professionals.map((professional) => (
                      <SelectItem key={professional.id} value={professional.id}>
                        {professional.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.professional_id && (
                  <motion.p 
                    className="text-sm text-red-500"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {form.formState.errors.professional_id.message}
                  </motion.p>
                )}
              </motion.div>

              <motion.div 
                className="space-y-2"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: 0.2 }}
              >
                <Label>Serviço *</Label>
                <Select
                  value={form.watch('service_id')}
                  onValueChange={(value) => form.setValue('service_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um serviço" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name} - {service.duration_minutes}min - R$ {(service.price_cents / 100).toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.service_id && (
                  <motion.p 
                    className="text-sm text-red-500"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {form.formState.errors.service_id.message}
                  </motion.p>
                )}
              </motion.div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <motion.div 
                className="space-y-2"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: 0.3 }}
              >
                <Label>Data *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !form.watch('date') && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.watch('date') ? (
                        format(form.watch('date'), 'dd/MM/yyyy', { locale: ptBR })
                      ) : (
                        'Selecione a data'
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={form.watch('date')}
                      onSelect={(date) => date && form.setValue('date', date)}
                      disabled={(date) => date < startOfDay(new Date())}
                      initialFocus
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
                {form.formState.errors.date && (
                  <motion.p 
                    className="text-sm text-red-500"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {form.formState.errors.date.message}
                  </motion.p>
                )}
              </motion.div>

              <motion.div 
                className="space-y-2"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: 0.3 }}
              >
                <Label>Horário *</Label>
                <Select
                  value={form.watch('time')}
                  onValueChange={(value) => form.setValue('time', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o horário" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeSlots.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.time && (
                  <motion.p 
                    className="text-sm text-red-500"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {form.formState.errors.time.message}
                  </motion.p>
                )}
              </motion.div>
            </div>
          </motion.div>

          {/* Observações */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="space-y-2"
          >
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              {...form.register('notes')}
              placeholder="Observações sobre o agendamento (opcional)"
            />
          </motion.div>

          {/* Alerta de conflito */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            {validationLoading && (
              <Alert>
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertDescription>
                  Verificando conflitos de horário...
                </AlertDescription>
              </Alert>
            )}

            {conflictError && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
              >
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {conflictError}
                  </AlertDescription>
                </Alert>
              </motion.div>
            )}
          </motion.div>

          {/* Botões */}
          <motion.div 
            className="flex justify-end gap-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.4 }}
          >
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !!conflictError || validationLoading || !isFormValid}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Agendamento
            </Button>
          </motion.div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
