import { useEffect, useState } from "react";
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
import { cn, formatBRL } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

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

  const form = useForm<BookingForm>({ 
    resolver: zodResolver(BookingSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      notes: "",
    }
  });

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
        
        if (!tenantData) {
          console.log("Tenant não encontrado");
          setLoading(false);
          return;
        }
        
        console.log("Tenant encontrado:", tenantData);
        setTenant(tenantData);
        
        // Carregar dados relacionados
        const [servicesResult, professionalsResult, hoursResult] = await Promise.all([
          supabase
            .from("services")
            .select("*")
            .eq("tenant_id", tenantData.id)
            .eq("active", true),
          supabase
            .from("professionals")
            .select("*")
            .eq("tenant_id", tenantData.id)
            .eq("active", true),
          supabase
            .from("business_hours")
            .select("*")
            .eq("tenant_id", tenantData.id),
        ]);
        
        setServices(servicesResult.data || []);
        setProfessionals(professionalsResult.data || []);
        setBusinessHours(hoursResult.data || []);
        
      } catch (error) {
        console.error("Erro geral:", error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [slug, tenantParam]);

  // Carregar agendamentos quando a data for selecionada
  useEffect(() => {
    const loadAppointments = async () => {
      if (!tenant || !selectedDate) return;
      
      try {
        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);
        
        const { data: appointmentsData } = await supabase
          .from("appointments")
          .select(`
            *,
            services(name, duration_minutes),
            professionals(name)
          `)
          .eq("tenant_id", tenant.id)
          .gte("start_time", startOfDay.toISOString())
          .lte("start_time", endOfDay.toISOString())
          .order("start_time", { ascending: true });
        
        setAppointments(appointmentsData || []);
      } catch (error) {
        console.error("Erro ao carregar agendamentos:", error);
      }
    };
    
    loadAppointments();
  }, [tenant, selectedDate]);

  useEffect(() => {
    if (tenant?.name) {
      document.title = `Agendar - ${tenant.name}`;
    }
  }, [tenant]);

  // Gerar horários disponíveis para um dia específico
  const getAvailableTimeSlots = (date: Date) => {
    const weekday = date.getDay();
    const dayHours = businessHours.find((h) => h.weekday === weekday);
    
    if (!dayHours || dayHours.closed) return [];
    
    const slots: string[] = [];
    const [openHour, openMin] = dayHours.open_time.split(":").map(Number);
    const [closeHour, closeMin] = dayHours.close_time.split(":").map(Number);
    
    let currentHour = openHour;
    let currentMin = openMin;
    
    while (currentHour < closeHour || (currentHour === closeHour && currentMin < closeMin)) {
      const timeString = `${String(currentHour).padStart(2, "0")}:${String(currentMin).padStart(2, "0")}`;
      slots.push(timeString);
      
      currentMin += 30;
      if (currentMin >= 60) {
        currentMin = 0;
        currentHour += 1;
      }
    }
    
    return slots;
  };

  // Verificar se um horário está ocupado
  const isTimeSlotOccupied = (time: string) => {
    if (!selectedDate) return false;
    const selectedProfessionalId = form.watch("professional_id");
    
    const [hour, minute] = time.split(":").map(Number);
    const targetTime = new Date(selectedDate);
    targetTime.setHours(hour, minute, 0, 0);
    
    return appointments.some(appointment => {
      const appointmentTime = parseISO(appointment.start_time);
      const sameMinute = appointmentTime.getHours() === hour && appointmentTime.getMinutes() === minute;
      const sameDay = isSameDay(appointmentTime, targetTime);
      const sameProfessional = appointment.professional_id === selectedProfessionalId;
      const notCancelled = appointment.status !== "cancelado";
      return sameDay && sameMinute && sameProfessional && notCancelled;
    });
  };

  // Submeter agendamento
  const onSubmit = async (values: BookingForm) => {
    if (!tenant) return;
    
    setSubmitting(true);
    try {
      const { data: service } = await supabase
        .from("services")
        .select("duration_minutes")
        .eq("id", values.service_id)
        .single();
      
      const [h, m] = values.time.split(":").map(Number);
      const start = new Date(values.date);
      start.setHours(h, m, 0, 0);
      const end = new Date(start.getTime() + (service?.duration_minutes ?? 30) * 60000);

      // Checagem final de conflito: recarrega agendamentos do profissional para o dia e valida overlap
      const startOfDay = new Date(start);
      startOfDay.setHours(0,0,0,0);
      const endOfDay = new Date(start);
      endOfDay.setHours(23,59,59,999);
      const { data: dayAppts } = await supabase
        .from("appointments")
        .select("start_time,end_time,status,professional_id")
        .eq("tenant_id", tenant.id)
        .eq("professional_id", values.professional_id)
        .gte("start_time", startOfDay.toISOString())
        .lte("start_time", endOfDay.toISOString());
      const hasOverlap = (dayAppts || []).some((a:any) => {
        if (a.status === 'cancelado') return false;
        const aStart = parseISO(a.start_time).getTime();
        const aEnd = parseISO(a.end_time).getTime();
        return aStart < end.getTime() && aEnd > start.getTime();
      });
      if (hasOverlap) {
        throw new Error("Horário indisponível para o profissional selecionado.");
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

      // Criar agendamento
      const { error: appointmentError } = await supabase.from("appointments").insert({
        tenant_id: tenant.id,
        service_id: values.service_id,
        professional_id: values.professional_id,
        customer_id: customerId,
        customer_name: values.name,
        customer_contact: values.phone,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        status: "agendado",
        notes: values.notes,
      } as any);

      if (appointmentError) throw appointmentError;
      
      toast({ 
        title: "Agendamento confirmado!", 
        description: `Seu horário foi agendado para ${format(start, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}` 
      });
      
      form.reset();
      // fluxo simplificado: nada para fechar
      setSelectedDate(null);
      
    } catch (e: any) {
      console.error("Erro no agendamento:", e);
      toast({ 
        title: "Falha no agendamento", 
        description: e.message || "Erro interno. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Funções para copiar link
  const getPublicBookingUrl = () => {
    const baseUrl = window.location.origin;
    if (tenant?.slug) {
      return `${baseUrl}/agendamento?tenant=${tenant.slug}`;
    }
    return '';
  };

  const handleCopyLink = async () => {
    const url = getPublicBookingUrl();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({
        title: 'Link copiado!',
        description: 'O link de agendamento foi copiado para a área de transferência.',
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
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <Loader2 className="h-16 w-16 text-primary mx-auto mb-4 animate-spin" />
          <h2 className="text-2xl font-bold mb-2">Carregando...</h2>
          <p className="text-muted-foreground">Preparando sua página de agendamento</p>
        </motion.div>
      </main>
    );
  }

  if (!tenant) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <Scissors className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Estabelecimento não encontrado</h2>
          <p className="text-muted-foreground mb-4">Verifique se o link está correto ou entre em contato conosco.</p>
          <Button asChild>
            <a href="/">Voltar ao início</a>
          </Button>
        </motion.div>
      </main>
    );
  }

  return (
    <main className={cn("min-h-screen bg-gradient-to-br from-background to-muted/20", tenant.theme_variant === "barber" ? "theme-barber" : "theme-salon")}> 
      <div className="container max-w-6xl py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <div className="flex flex-col items-center justify-center gap-3 mb-4">
            {tenant.logo_url ? (
              <img
                src={tenant.logo_url}
                alt={`Logo ${tenant.name}`}
                className="h-20 w-20 rounded-full object-cover border-4 border-primary/10 shadow-lg"
              />
            ) : (
              <div className="h-20 w-20 rounded-full border-4 border-primary/10 bg-muted/40 flex items-center justify-center shadow-lg">
                <Scissors className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            <div className="text-center">
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
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
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Agende seu horário de forma rápida e fácil. Escolha o serviço, data e horário que melhor te atende.
          </p>
        </motion.div>

        <div className="grid gap-8 lg:grid-cols-3">
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
                                <Badge variant="secondary" className="ml-2">{formatBRL(s.price_cents)}</Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {form.formState.errors.service_id && <p className="text-sm text-destructive">{form.formState.errors.service_id.message}</p>}
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
                          <Button variant="outline" className="h-12 w-full justify-start text-left font-normal">
                            {selectedDate ? format(selectedDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecione a data"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="p-0" align="start">
                          <CalendarPicker
                            mode="single"
                            selected={selectedDate ?? undefined}
                            onSelect={(d) => { if (!d) return; const only = new Date(d); only.setHours(0,0,0,0); setSelectedDate(only); form.setValue("date", only); }}
                            disabled={(d) => d < new Date(minDateStr) || d > new Date(maxDateStr)}
                            locale={ptBR}
                          />
                        </PopoverContent>
                      </Popover>
                      {form.formState.errors.date && <p className="text-sm text-destructive">{form.formState.errors.date.message as string}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium flex items-center gap-2"><Clock className="h-4 w-4" /> Horário</Label>
                      <Select onValueChange={(v) => form.setValue("time", v)} disabled={!selectedDate}>
                        <SelectTrigger className="h-12"><SelectValue placeholder={selectedDate ? "Selecione um horário" : "Selecione a data primeiro"} /></SelectTrigger>
                        <SelectContent>
                          {selectedDate && getAvailableTimeSlots(selectedDate).filter((t) => !isTimeSlotOccupied(t)).map((t) => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedDate && getAvailableTimeSlots(selectedDate).filter((t)=>!isTimeSlotOccupied(t)).length===0 && (
                        <p className="text-sm text-muted-foreground">Sem horários disponíveis nessa data.</p>
                      )}
                      {form.formState.errors.time && <p className="text-sm text-destructive">{form.formState.errors.time.message as string}</p>}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Observações (opcional)</Label>
                    <Input className="h-12" placeholder="Alguma observação?" {...form.register("notes")} />
                  </div>

                  <Button type="submit" className="w-full h-12 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70" disabled={submitting}>
                    {submitting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Confirmando...</>) : "Confirmar Agendamento"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>

          {/* Sidebar com informações */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="space-y-6"
          >
            {/* Informações do estabelecimento */}
            <Card className="border-0 shadow-lg bg-background/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg">Informações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Localização</p>
                    <p className="text-sm text-muted-foreground">Rua das Flores, 123 - Centro</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Telefone</p>
                    <p className="text-sm text-muted-foreground">(11) 99999-9999</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Horário de Funcionamento</p>
                    <p className="text-sm text-muted-foreground">Seg-Sáb: 9h às 18h</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Serviços disponíveis */}
            <Card className="border-0 shadow-lg bg-background/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg">Serviços Disponíveis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {services.map((service) => (
                    <div key={service.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div>
                        <p className="font-medium">{service.name}</p>
                        <p className="text-sm text-muted-foreground">{service.duration_minutes} min</p>
                      </div>
                      <Badge variant="secondary" className="font-semibold">
                        {formatBRL(service.price_cents)}
                      </Badge>
                    </div>
                  ))}
                  {services.length === 0 && (
                    <div className="text-center py-8">
                      <Scissors className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Nenhum serviço disponível</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            
          </motion.div>
        </div>
      </div>

      {/* Fluxo simplificado: sem modal */}
    </main>
  );
}

