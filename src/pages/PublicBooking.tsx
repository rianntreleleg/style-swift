import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const BookingSchema = z.object({
  service_id: z.string().uuid("Escolha um serviço"),
  professional_id: z.string().uuid().optional().or(z.literal("")),
  date: z.date({ required_error: "Selecione uma data" }),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  name: z.string().min(2),
  contact: z.string().min(5),
});

type BookingForm = z.infer<typeof BookingSchema>;

export default function PublicBooking() {
  const { slug = "" } = useParams();
  const [searchParams] = useSearchParams();
  const tenantParam = searchParams.get('tenant');
  const [tenant, setTenant] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [pros, setPros] = useState<any[]>([]);
  const [hours, setHours] = useState<any[]>([]);

  const form = useForm<BookingForm>({ resolver: zodResolver(BookingSchema) });

  useEffect(() => {
    const load = async () => {
      // Primeiro tenta pelo query param tenant, depois pelo slug da URL
      const searchSlug = tenantParam || slug;
      if (!searchSlug) return;
      
      const { data: t } = await supabase.from("tenants").select("*").eq("slug", searchSlug).maybeSingle();
      setTenant(t);
      if (!t) return;
      const [{ data: s }, { data: p }, { data: h }] = await Promise.all([
        supabase.from("services").select("*").eq("tenant_id", t.id).eq("active", true),
        supabase.from("professionals").select("*").eq("tenant_id", t.id).eq("active", true),
        supabase.from("business_hours").select("*").eq("tenant_id", t.id),
      ]);
      setServices(s ?? []);
      setPros(p ?? []);
      setHours(h ?? []);
    };
    load();
  }, [slug, tenantParam]);

  const slots = useMemo(() => {
    const date = form.getValues("date");
    if (!date) return [] as string[];
    const weekday = date.getDay();
    const day = hours.find((d) => d.weekday === weekday);
    const result: string[] = [];
    const open = day?.closed ? null : day?.open_time;
    const close = day?.closed ? null : day?.close_time;
    const [oh, om] = (open ?? "09:00").split(":").map(Number);
    const [ch, cm] = (close ?? "18:00").split(":").map(Number);
    let curH = oh, curM = om;
    while (curH < ch || (curH === ch && curM < cm)) {
      result.push(`${String(curH).padStart(2, "0")}:${String(curM).padStart(2, "0")}`);
      curM += 30;
      if (curM >= 60) { curM = 0; curH += 1; }
    }
    return result;
  }, [form.watch("date"), hours]);

  const onSubmit = async (values: BookingForm) => {
    if (!tenant) return;
    try {
      const { data: service } = await supabase.from("services").select("duration_minutes").eq("id", values.service_id).maybeSingle();
      const [h, m] = values.time.split(":").map(Number);
      const start = new Date(values.date);
      start.setHours(h, m, 0, 0);
      const end = new Date(start.getTime() + (service?.duration_minutes ?? 30) * 60000);

      // Ensure customer exists (by contact)
      const { data: existing } = await supabase
        .from("customers")
        .select("id")
        .eq("tenant_id", tenant.id)
        .eq("contact", values.contact)
        .maybeSingle();

      let customerId = existing?.id as string | undefined;
      if (!customerId) {
        const { data: cust, error: custErr } = await supabase
          .from("customers")
          .insert({ tenant_id: tenant.id, name: values.name, contact: values.contact } as any)
          .select("id")
          .single();
        if (custErr) throw custErr;
        customerId = cust?.id;
      }

      const { error: apptErr } = await supabase.from("appointments").insert({
        tenant_id: tenant.id,
        service_id: values.service_id,
        professional_id: values.professional_id || null,
        customer_id: customerId ?? null,
        customer_name: values.name,
        customer_contact: values.contact,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        status: "scheduled",
      } as any);

      if (apptErr) throw apptErr;
      toast({ title: "Agendamento confirmado!", description: `${format(start, "dd/MM/yyyy HH:mm")}` });
      form.reset();
    } catch (e: any) {
      toast({ title: "Falha no agendamento", description: e.message });
    }
  };

  if (!tenant) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Estabelecimento não encontrado.</p>
      </main>
    );
  }

  return (
    <main className={cn("min-h-screen py-10", tenant.theme_variant === "barber" ? "theme-barber" : "theme-salon")}> 
      <div className="container max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Agendar em {tenant.name}</span>
              {tenant.logo_url && (
                <img src={tenant.logo_url} alt={`Logo ${tenant.name}`} className="h-10 w-10 rounded-full object-cover" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label>Serviço</Label>
                <Select onValueChange={(v) => form.setValue("service_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Escolha um serviço" /></SelectTrigger>
                  <SelectContent>
                    {services.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} • R$ {(s.price_cents/100).toFixed(2)} • {s.duration_minutes}min
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Profissional (opcional)</Label>
                <Select onValueChange={(v) => form.setValue("professional_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Qualquer" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Qualquer</SelectItem>
                    {pros.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Data</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("justify-start font-normal", !form.watch("date") && "text-muted-foreground")}> 
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.watch("date") ? format(form.watch("date")!, "PPP") : <span>Escolha a data</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={form.watch("date")}
                      onSelect={(d) => d && form.setValue("date", d)}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Horário</Label>
                <div className="flex flex-wrap gap-2">
                  {slots.map((s) => (
                    <Button key={s} type="button" variant={form.watch("time") === s ? "hero" : "outline"} onClick={() => form.setValue("time", s)}>
                      {s}
                    </Button>
                  ))}
                  {slots.length === 0 && (
                    <p className="text-sm text-muted-foreground">Selecione uma data para ver os horários.</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Seu nome</Label>
                <Input {...form.register("name")} placeholder="Seu nome" />
              </div>
              <div className="space-y-2">
                <Label>Contato</Label>
                <Input {...form.register("contact")} placeholder="WhatsApp ou e-mail" />
              </div>

              <div className="md:col-span-2">
                <Button variant="hero" type="submit">Confirmar agendamento</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
