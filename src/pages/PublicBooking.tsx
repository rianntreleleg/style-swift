import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  CalendarIcon,
  Clock,
  User,
  Phone,
  Scissors,
  CheckCircle2,
  Star,
  MapPin,
  Phone as PhoneIcon,
  Loader2,
  FileText,
  ExternalLink,
  Copy,
  Check,
  Mail
} from "lucide-react";
import { format, addDays, isSameDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toLocalISOString, createLocalDateTime, formatDateTimeBR, getLocalDayBounds } from "@/lib/dateUtils";
import { cn, formatBRL } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { ThemeApplicator } from "@/components/ThemeApplicator";
import { TimeSlotSelector } from "@/components/TimeSlotSelector";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, Tag } from "lucide-react";

const BookingSchema = z.object({
  service_id: z.string({ required_error: "Selecione um serviço" }).uuid("Selecione um serviço"),
  professional_id: z.string({ required_error: "Selecione um profissional" }).uuid("Selecione um profissional"),
  date: z.date({ required_error: "Selecione uma data" }),
  time: z.string({ required_error: "Selecione um horário" }).regex(/^\d{2}:\d{2}$/, "Horário inválido"),
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("E-mail inválido"),
  phone: z.string().min(10, "Telefone deve ter pelo menos 10 dígitos"),
  notes: z.string().optional(),
});

type BookingForm = z.infer<typeof BookingSchema>;

export default function PublicBooking() {
  const { slug = "" } = useParams();
  const [searchParams] = useSearchParams();
  const tenantParam = searchParams.get('tenant');
  const [tenant, setTenant] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [businessHours, setBusinessHours] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [copied, setCopied] = useState(false);
  const minDateStr = new Date().toISOString().split("T")[0];
  const maxDateStr = addDays(new Date(), 14).toISOString().split("T")[0];

  // Sistema de fila FIFO
  const bookingQueue = useRef<Array<{
    id: string;
    data: any;
    timestamp: number;
    attempts: number;
  }>>([]);
  const queueInterval = useRef<NodeJS.Timeout | null>(null);
  const maxAttempts = 3;

  const form = useForm<BookingForm>({
    resolver: zodResolver(BookingSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      notes: "",
    }
  });

  // Funções de gerenciamento da fila
  const addToQueue = (bookingData: any) => {
    const queueItem = {
      id: `${Date.now()}-${Math.random()}`,
      data: bookingData,
      timestamp: Date.now(),
      attempts: 0
    };
    bookingQueue.current.push(queueItem);
    console.log(`[FILA] Agendamento adicionado à fila. ID: ${queueItem.id}. Fila atual: ${bookingQueue.current.length} itens`);
  };

  const removeFromQueue = (id: string) => {
    bookingQueue.current = bookingQueue.current.filter(item => item.id !== id);
  };

  const createAppointment = async (values: BookingForm) => {
    if (!tenant) throw new Error("Estabelecimento não encontrado");

    const { data: service } = await supabase
      .from("services")
      .select("duration_minutes, name")
      .eq("id", values.service_id)
      .single();

    // Processar horário usando utilitários de data
    const start = createLocalDateTime(values.date, values.time);
    const end = new Date(start.getTime() + (service?.duration_minutes ?? 30) * 60000);
    
    console.log(`[AGENDAMENTO] Horário selecionado: ${values.time}`);
    console.log(`[AGENDAMENTO] Data/hora de início: ${formatDateTimeBR(start)}`);
    console.log(`[AGENDAMENTO] Data/hora de término: ${formatDateTimeBR(end)}`);

    // VALIDAÇÃO DE HORÁRIOS DE FUNCIONAMENTO
    const weekday = start.getDay(); // 0 = domingo, 1 = segunda, etc.
    const { data: businessHour, error: bhError } = await supabase
      .from("business_hours")
      .select("*")
      .eq("tenant_id", tenant.id)
      .eq("weekday", weekday)
      .single();

    if (bhError) {
      console.error("Erro ao buscar horários de funcionamento:", bhError);
      throw new Error("Erro ao verificar horários de funcionamento");
    }

    if (!businessHour || businessHour.closed) {
      throw new Error("Estabelecimento fechado neste dia");
    }

    if (!businessHour.open_time || !businessHour.close_time) {
      throw new Error("Horários de funcionamento não configurados para este dia");
    }

    // Converter horários para comparação usando apenas o horário local
    const [openHour, openMinute] = businessHour.open_time.split(':').map(Number);
    const [closeHour, closeMinute] = businessHour.close_time.split(':').map(Number);
    
    // Criar horários de comparação no mesmo dia do agendamento
    const openTime = new Date(start);
    openTime.setHours(openHour, openMinute, 0, 0);
    
    const closeTime = new Date(start);
    closeTime.setHours(closeHour, closeMinute, 0, 0);



    // Verificar se o agendamento está dentro do horário de funcionamento
    // Usar getTime() para comparação numérica precisa
    if (start.getTime() < openTime.getTime() || end.getTime() > closeTime.getTime()) {
      throw new Error(`Agendamento deve ser feito entre ${businessHour.open_time} e ${businessHour.close_time}`);
    }

    // Validação de conflito no backend usando utilitários de data
    const dayBounds = getLocalDayBounds(start);

    const { data: dayAppts, error: conflictError } = await supabase
      .from("appointments")
      .select("start_time,end_time,status,professional_id")
      .eq("tenant_id", tenant.id)
      .eq("professional_id", values.professional_id)
      .gte("start_time", dayBounds.start)
      .lte("start_time", dayBounds.end);

    if (conflictError) throw conflictError;

    const hasOverlap = (dayAppts || []).some((a: any) => {
      if (a.status === 'cancelado') return false;
      const aStart = parseISO(a.start_time).getTime();
      const aEnd = parseISO(a.end_time).getTime();
      return aStart < end.getTime() && aEnd > start.getTime();
    });

    if (hasOverlap) {
      throw new Error("Horário já agendado");
    }

    // Verificar se cliente já existe
    const { data: existingCustomer } = await supabase
      .from("customers")
      .select("id")
      .eq("tenant_id", tenant.id)
      .eq("contact", values.phone)
      .maybeSingle();

    let customerId = existingCustomer?.id;
    if (!customerId) {
      const { data: newCustomer, error: customerError } = await supabase
        .from("customers")
        .insert({
          tenant_id: tenant.id,
          name: values.name,
          contact: values.phone
        } as any)
        .select("id")
        .single();

      if (customerError) throw customerError;
      customerId = newCustomer?.id;
    }

    // Usar função utilitária para conversão ISO local

    // Criar agendamento
    const { error: appointmentError } = await supabase.from("appointments").insert({
      tenant_id: tenant.id,
      service_id: values.service_id,
      professional_id: values.professional_id,
      customer_id: customerId,
      customer_name: values.name,
      customer_contact: values.phone,
      customer_email: values.email,
      start_time: toLocalISOString(start),
      end_time: toLocalISOString(end),
      status: "agendado",
      notes: values.notes,
    } as any);
    
    console.log(`[AGENDAMENTO] Salvando no banco - start_time: ${toLocalISOString(start)}`);
    console.log(`[AGENDAMENTO] Salvando no banco - end_time: ${toLocalISOString(end)}`);

    if (appointmentError) throw appointmentError;

    // Enviar webhook após criar o agendamento com sucesso
    try {
      const webhookData = {
        appointment: {
          id: customerId, // Usando customerId como identificador temporário
          customer_name: values.name,
          customer_email: values.email,
          customer_phone: values.phone,
          service_id: values.service_id,
          service_name: service?.name || 'Serviço não especificado',
          professional_id: values.professional_id,
          start_time: toLocalISOString(start),
          end_time: toLocalISOString(end),
          notes: values.notes || '',
          status: "agendado"
        },
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug
        },
        timestamp: new Date().toISOString()
      };

      await fetch('https://chatbot-n8n.mw2uje.easypanel.host/webhook-test/swift-style', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookData)
      });
    } catch (webhookError) {
      // Log do erro do webhook mas não falhar o agendamento
      console.error('Erro ao enviar webhook:', webhookError);
    }

    // Recarregar agendamentos para atualizar a interface
    await loadAppointments();

    return { success: true };
  };

  const processQueue = async () => {
    if (bookingQueue.current.length === 0) return;

    const item = bookingQueue.current[0]; // FIFO - primeiro item
    console.log(`[FILA] Processando agendamento ID: ${item.id}. Tentativa: ${item.attempts + 1}`);

    try {
      const result = await createAppointment(item.data);
      console.log(`[FILA] Agendamento ID: ${item.id} criado com sucesso!`);
      removeFromQueue(item.id);
      toast({ title: "Agendamento realizado com sucesso!", description: "Você receberá uma confirmação em breve." });
    } catch (error: any) {
      item.attempts++;
      console.log(`[FILA] Erro no agendamento ID: ${item.id}. Tentativa ${item.attempts}/${maxAttempts}. Erro:`, error.message);

      if (item.attempts >= maxAttempts) {
        console.log(`[FILA] Agendamento ID: ${item.id} falhou após ${maxAttempts} tentativas. Removendo da fila.`);
        removeFromQueue(item.id);
        toast({
          title: "Erro ao realizar agendamento",
          description: error.message || "Tente novamente mais tarde.",
          variant: "destructive"
        });
      }
    }
  };

  const startQueueProcessor = () => {
    if (queueInterval.current) return;

    queueInterval.current = setInterval(() => {
      processQueue();
    }, 2000); // Processa a cada 2 segundos

    console.log("[FILA] Processador de fila iniciado");
  };

  const stopQueueProcessor = () => {
    if (queueInterval.current) {
      clearInterval(queueInterval.current);
      queueInterval.current = null;
      console.log("[FILA] Processador de fila parado");
    }
  };

  // Submeter agendamento usando fila FIFO
  const onSubmit = async (values: BookingForm) => {
    if (!tenant) return;

    setSubmitting(true);
    try {
      // Adicionar à fila FIFO
      addToQueue(values);

      // Iniciar processador de fila se não estiver rodando
      startQueueProcessor();

      toast({
        title: "Agendamento em processamento",
        description: "Seu agendamento foi adicionado à fila e será processado em breve."
      });

      // Reset form only after successful submission
      form.reset();
      setSelectedDate(null);
    } catch (error: any) {
      toast({
        title: "Erro ao adicionar à fila",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Carregar dados iniciais
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const searchSlug = tenantParam || slug;
        if (!searchSlug) {
          setLoading(false);
          return;
        }

        console.log("Buscando tenant com slug:", searchSlug);

        const { data: tenantData, error: tenantError } = await supabase
          .from("tenants")
          .select("*")
          .eq("slug", searchSlug)
          .single();

        if (tenantError) {
          console.error("Erro ao buscar tenant:", tenantError);
          setLoading(false);
          return;
        }

        setTenant(tenantData);

        // Carregar serviços
        const { data: servicesData } = await supabase
          .from("services")
          .select("*")
          .eq("tenant_id", tenantData.id)
          .eq("active", true)
          .order("name");

        setServices(servicesData || []);

        // Carregar profissionais
        const { data: professionalsData } = await supabase
          .from("professionals")
          .select("*")
          .eq("tenant_id", tenantData.id)
          .eq("active", true)
          .order("name");

        setProfessionals(professionalsData || []);

        // Carregar horários de funcionamento
        const { data: hoursData } = await supabase
          .from("business_hours")
          .select("*")
          .eq("tenant_id", tenantData.id);

        setBusinessHours(hoursData || []);

        // Carregar agendamentos
        await loadAppointments();

      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [slug, tenantParam]);

  // Limpar intervalo quando componente for desmontado
  useEffect(() => {
    return () => {
      stopQueueProcessor();
    };
  }, []);

  const loadAppointments = async () => {
    if (!tenant) return;

    const { data: appointmentsData } = await supabase
      .from("appointments")
      .select("*")
      .eq("tenant_id", tenant.id)
      .gte("start_time", new Date().toISOString());

    setAppointments(appointmentsData || []);
  };



  const handleCopyLink = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({
        title: 'Link copiado!',
        description: 'O link foi copiado para a área de transferência.',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: 'Erro ao copiar',
        description: 'Não foi possível copiar o link. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <Loader2 className="h-16 w-16 text-primary mx-auto mb-4 animate-spin" />
          <h2 className="text-2xl font-bold mb-2">Carregando...</h2>
          <p className="text-muted-foreground">Aguarde um momento</p>
        </motion.div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <div className="w-20 h-20 bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/20 dark:to-red-800/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="h-10 w-10 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Estabelecimento não encontrado</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            O link de agendamento não está correto ou o estabelecimento não existe.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <>
      <ThemeApplicator themeVariant={tenant?.theme_variant} />
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
        <div className="container py-4 md:py-8 space-y-6 md:space-y-8 px-4">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-6 md:mb-8"
          >
            <div className="flex flex-col items-center justify-center gap-3 mb-4">
              {tenant.logo_url ? (
                <img
                  src={tenant.logo_url}
                  alt={`Logo ${tenant.name}`}
                  className="h-16 w-16 md:h-20 md:w-20 rounded-full object-cover border-4 border-primary/10 shadow-lg"
                />
              ) : (
                <div className="h-16 w-16 md:h-20 md:w-20 rounded-full border-4 border-primary/10 bg-muted/40 flex items-center justify-center shadow-lg">
                  <Scissors className="h-6 w-6 md:h-8 md:w-8 text-muted-foreground" />
                </div>
              )}
              <div className="text-center">
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  {tenant.name}
                </h1>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  </div>
                  <span className="text-sm text-muted-foreground">(4.9/5)</span>
                </div>
              </div>
            </div>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
              Agende seu horário de forma rápida e fácil. Escolha o serviço, data e horário que melhor te atende.
            </p>
          </motion.div>

          <div className="grid gap-6 md:gap-8 lg:grid-cols-3">
            {/* Formulário de Agendamento */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="lg:col-span-2"
            >
              <Card className="border-0 shadow-xl bg-background/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <CalendarIcon className="h-5 w-5 text-primary" />
                    Agendar Horário
                  </CardTitle>
                  <CardDescription>
                    Selecione uma data para ver os horários disponíveis
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium flex items-center gap-2"><User className="h-4 w-4" /> Nome</Label>
                        <Input className="h-12" placeholder="Seu nome" {...form.register("name")} />
                        {form.formState.errors.name && <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium flex items-center gap-2"><Mail className="h-4 w-4" /> E-mail</Label>
                        <Input className="h-12" type="email" placeholder="seu@email.com" {...form.register("email")} />
                        {form.formState.errors.email && <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>}
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label className="text-sm font-medium flex items-center gap-2"><PhoneIcon className="h-4 w-4" /> Telefone/WhatsApp</Label>
                        <Input className="h-12" placeholder="(11) 99999-9999" {...form.register("phone")} />
                        {form.formState.errors.phone && <p className="text-sm text-destructive">{form.formState.errors.phone.message}</p>}
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium flex items-center gap-2"><Scissors className="h-4 w-4" /> Serviço</Label>
                        <Select onValueChange={(v) => form.setValue("service_id", v)}>
                          <SelectTrigger className="h-12"><SelectValue placeholder="Selecione um serviço" /></SelectTrigger>
                          <SelectContent>
                            {services.map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                <div className="flex items-center justify-between w-full">
                                  <span>{s.name}</span>
                                  <Badge variant="secondary" className="ml-2">
                                    R$ {(s.price_cents / 100).toFixed(2).replace('.', ',')}
                                  </Badge>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {form.formState.errors.service_id && <p className="text-sm text-destructive">{form.formState.errors.service_id.message}</p>}

                        {/* Informações do serviço selecionado */}
                        {form.watch("service_id") && (() => {
                          const selectedService = services.find(s => s.id === form.watch("service_id"));
                          if (!selectedService) return null;

                          // Prepara as variáveis para deixar o JSX mais limpo
                          const duration = selectedService.duration_minutes;
                          const slots = Math.ceil(duration / 30);
                          const slotText = `${slots} ${slots === 1 ? 'vaga' : 'vagas'}`;
                          const formattedPrice = new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                          }).format(selectedService.price_cents / 100);

                          return (
                            <div className="mt-2">
                              <Alert>
                                <Info className="h-4 w-4" />
                                <AlertTitle>{selectedService.name}</AlertTitle>
                                <AlertDescription className="mt-2 space-y-1">
                                  <div className="flex items-center text-sm text-muted-foreground">
                                    <Clock className="mr-2 h-4 w-4 flex-shrink-0" />
                                    <span>Duração: {duration} minutos ({slotText})</span>
                                  </div>
                                  <div className="flex items-center text-sm text-muted-foreground">
                                    <Tag className="mr-2 h-4 w-4 flex-shrink-0" />
                                    <span>Preço: {formattedPrice}</span>
                                  </div>
                                </AlertDescription>
                              </Alert>
                            </div>
                          );
                        })()}
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium flex items-center gap-2"><User className="h-4 w-4" /> Profissional (opcional)</Label>
                        <Select onValueChange={(v) => form.setValue("professional_id", v)}>
                          <SelectTrigger className="h-12"><SelectValue placeholder="Selecione um profissional" /></SelectTrigger>
                          <SelectContent>
                            {professionals.map((p) => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}
                          </SelectContent>
                        </Select>
                        {form.formState.errors.professional_id && <p className="text-sm text-destructive">{form.formState.errors.professional_id.message}</p>}
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium flex items-center gap-2"><CalendarIcon className="h-4 w-4" /> Data</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "h-12 w-full justify-start text-left font-normal min-h-[44px]",
                                !selectedDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {selectedDate ? format(selectedDate, "PPP", { locale: ptBR }) : "Selecione uma data"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarPicker
                              mode="single"
                              selected={selectedDate}
                              onSelect={(date) => {
                                setSelectedDate(date);
                                form.setValue("date", date || new Date());
                                // Clear time when date changes
                                form.setValue("time", "");
                              }}
                              disabled={(date) => {
                                // Allow same-day appointments, but disable past dates
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                const selectedDate = new Date(date);
                                selectedDate.setHours(0, 0, 0, 0);
                                return selectedDate < today || date > addDays(new Date(), 14);
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        {form.formState.errors.date && <p className="text-sm text-destructive">{form.formState.errors.date.message}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium flex items-center gap-2"><Clock className="h-4 w-4" /> Horário</Label>
                        {selectedDate && tenant ? (
                          <TimeSlotSelector
                            selectedDate={selectedDate}
                            tenantId={tenant.id}
                            serviceId={form.watch("service_id")}
                            professionalId={form.watch("professional_id")}
                            onTimeSelect={(time) => {
                              console.log('[PublicBooking] Horário selecionado:', time);
                              // time já vem no formato HH:mm, então podemos usar diretamente
                              form.setValue("time", time);
                            }}
                            selectedTime={form.watch("time") || undefined}
                          />
                        ) : (
                          <div className="h-12 flex items-center justify-center border rounded-md bg-muted/50 text-muted-foreground min-h-[44px]">
                            {selectedDate ? "Carregando horários..." : "Selecione uma data primeiro"}
                          </div>
                        )}
                        {form.formState.errors.time && <p className="text-sm text-destructive">{form.formState.errors.time.message}</p>}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium flex items-center gap-2"><FileText className="h-4 w-4" /> Observações (opcional)</Label>
                      <Input className="h-12" placeholder="Alguma observação especial..." {...form.register("notes")} />
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-12 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300"
                      disabled={submitting}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processando...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Confirmar Agendamento
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>

            {/* Informações do Estabelecimento */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Card className="border-0 shadow-xl bg-background/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    Informações
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/20 dark:to-green-800/20 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="font-medium">Agendamento Online</p>
                      <p className="text-sm text-muted-foreground">Rápido e seguro</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/20 dark:to-blue-800/20 rounded-full flex items-center justify-center">
                      <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="font-medium">Horários Flexíveis</p>
                      <p className="text-sm text-muted-foreground">Escolha o melhor horário</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/20 dark:to-purple-800/20 rounded-full flex items-center justify-center">
                      <Phone className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="font-medium">Confirmação por WhatsApp</p>
                      <p className="text-sm text-muted-foreground">Receba confirmação instantânea</p>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleCopyLink}
                    >
                      {copied ? (
                        <>
                          <Check className="mr-2 h-4 w-4" />
                          Link Copiado!
                        </>
                      ) : (
                        <>
                          <Copy className="mr-2 h-4 w-4" />
                          Compartilhar Link
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </>
  );
}

