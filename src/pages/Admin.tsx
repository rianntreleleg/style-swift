import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Building2, Scissors, Users2, LogOut, ExternalLink } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const TenantSchema = z.object({
  name: z.string().min(2, "Nome obrigatório"),
  slug: z.string().min(2, "Slug obrigatório").regex(/^[a-z0-9-]+$/, "Use letras minúsculas, números e hífen"),
  theme_variant: z.enum(["barber", "salon"]).default("barber"),
  logo_url: z.string().url().optional().or(z.literal("")),
});

type TenantForm = z.infer<typeof TenantSchema>;

const ServiceSchema = z.object({
  tenant_id: z.string().uuid("Selecione o estabelecimento"),
  name: z.string().min(2),
  price_cents: z.coerce.number().min(0),
  duration_minutes: z.coerce.number().min(5).max(480),
  description: z.string().optional(),
});

type ServiceForm = z.infer<typeof ServiceSchema>;

const ProSchema = z.object({
  tenant_id: z.string().uuid("Selecione o estabelecimento"),
  name: z.string().min(2),
  bio: z.string().optional(),
  avatar_url: z.string().url().optional().or(z.literal("")),
});

type ProForm = z.infer<typeof ProSchema>;

export default function Admin() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<Array<{ id: string; name: string; slug: string }>>([]);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
  }, [user, navigate]);

  useEffect(() => {
    const fetchTenants = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from("tenants")
        .select("id,name,slug")
        .eq("owner_id", user.id);
      if (error) {
        toast({ title: "Erro ao carregar estabelecimentos", description: error.message });
        return;
      }
      setTenants(data ?? []);
    };
    fetchTenants();
  }, [user]);

  const tenantForm = useForm<TenantForm>({ resolver: zodResolver(TenantSchema) });
  const serviceForm = useForm<ServiceForm>({ resolver: zodResolver(ServiceSchema) });
  const proForm = useForm<ProForm>({ resolver: zodResolver(ProSchema) });

  const onCreateTenant = async (values: TenantForm) => {
    if (!user) return;
    
    const { error } = await supabase.from("tenants").insert({
      owner_id: user.id,
      name: values.name,
      slug: values.slug,
      theme_variant: values.theme_variant,
      logo_url: values.logo_url || null,
    } as any);
    
    if (error) {
      toast({ title: "Erro ao criar estabelecimento", description: error.message });
    } else {
      toast({ title: "Estabelecimento criado!", description: "Agora cadastre serviços e profissionais." });
      tenantForm.reset();
      // Recarregar lista de tenants
      const { data } = await supabase
        .from("tenants")
        .select("id,name,slug")
        .eq("owner_id", user.id);
      setTenants(data ?? []);
    }
  };

  const onCreateService = async (values: ServiceForm) => {
    const { error } = await supabase.from("services").insert(values as any);
    if (error) {
      toast({ title: "Erro ao cadastrar serviço", description: error.message });
    } else {
      toast({ title: "Serviço cadastrado!" });
      serviceForm.reset({ tenant_id: values.tenant_id } as any);
    }
  };

  const onCreatePro = async (values: ProForm) => {
    const { error } = await supabase.from("professionals").insert({
      tenant_id: values.tenant_id,
      name: values.name,
      bio: values.bio || null,
      avatar_url: values.avatar_url || null,
    } as any);
    if (error) {
      toast({ title: "Erro ao cadastrar profissional", description: error.message });
    } else {
      toast({ title: "Profissional cadastrado!" });
      proForm.reset({ tenant_id: values.tenant_id } as any);
    }
  };

  if (!user) {
    return null; // Será redirecionado para auth
  }

  return (
    <main className="container py-10 space-y-10">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Painel do Administrador</h1>
          <p className="text-muted-foreground">Bem-vindo, {user.email}</p>
        </div>
        <div className="flex items-center gap-4">
          {tenants.length > 0 && (
            <div className="text-sm space-y-1">
              <p className="font-medium">Seus links de agendamento:</p>
              {tenants.map(tenant => (
                <div key={tenant.id} className="flex items-center gap-2">
                  <span className="text-muted-foreground">{tenant.name}:</span>
                  <Button variant="link" size="sm" asChild className="h-auto p-0">
                    <a 
                      href={`${window.location.origin}/agendamento?tenant=${tenant.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1"
                    >
                      {window.location.origin}/agendamento?tenant={tenant.slug}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                </div>
              ))}
            </div>
          )}
          <Button variant="outline" onClick={signOut} className="gap-2">
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
      </header>

      <Tabs defaultValue="tenant">
        <TabsList>
          <TabsTrigger value="tenant" className="gap-2"><Building2 className="h-4 w-4" /> Estabelecimento</TabsTrigger>
          <TabsTrigger value="services" className="gap-2"><Scissors className="h-4 w-4" /> Serviços</TabsTrigger>
          <TabsTrigger value="pros" className="gap-2"><Users2 className="h-4 w-4" /> Profissionais</TabsTrigger>
        </TabsList>

        <TabsContent value="tenant" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Configuração do Estabelecimento</CardTitle>
              <CardDescription>Crie seu perfil, slug público e aparência.</CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={tenantForm.handleSubmit(onCreateTenant)}
                className="grid gap-4 md:grid-cols-2"
              >
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input id="name" placeholder="Barbearia do Clebin" {...tenantForm.register("name")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug público</Label>
                  <Input id="slug" placeholder="barbearia-clebin" {...tenantForm.register("slug")} />
                </div>
                <div className="space-y-2">
                  <Label>Tema</Label>
                  <Select onValueChange={(v) => tenantForm.setValue("theme_variant", v as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha o tema" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="barber">Barbearia (dark + dourado)</SelectItem>
                      <SelectItem value="salon">Salão (clean + rosa)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="logo_url">Logo (URL)</Label>
                  <Input id="logo_url" placeholder="https://..." {...tenantForm.register("logo_url")} />
                </div>
                <div className="md:col-span-2">
                  <Button variant="hero" type="submit">Salvar</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Serviços</CardTitle>
              <CardDescription>Cadastre seus serviços e valores.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={serviceForm.handleSubmit(onCreateService)} className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Estabelecimento</Label>
                  <Select onValueChange={(v) => serviceForm.setValue("tenant_id", v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {tenants.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input {...serviceForm.register("name")} placeholder="Corte masculino" />
                </div>
                <div className="space-y-2">
                  <Label>Preço (centavos)</Label>
                  <Input type="number" {...serviceForm.register("price_cents")} placeholder="5000" />
                </div>
                <div className="space-y-2">
                  <Label>Duração (min)</Label>
                  <Input type="number" {...serviceForm.register("duration_minutes")} placeholder="45" />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label>Descrição</Label>
                  <Input {...serviceForm.register("description")} placeholder="Detalhes do serviço" />
                </div>
                <div className="md:col-span-2">
                  <Button type="submit">Cadastrar serviço</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pros" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Profissionais</CardTitle>
              <CardDescription>Inclua os profissionais do seu time.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={proForm.handleSubmit(onCreatePro)} className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Estabelecimento</Label>
                  <Select onValueChange={(v) => proForm.setValue("tenant_id", v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {tenants.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input {...proForm.register("name")} placeholder="Clebin" />
                </div>
                <div className="space-y-2">
                  <Label>Bio</Label>
                  <Input {...proForm.register("bio")} placeholder="Especialista em fade" />
                </div>
                <div className="space-y-2">
                  <Label>Avatar (URL)</Label>
                  <Input {...proForm.register("avatar_url")} placeholder="https://..." />
                </div>
                <div className="md:col-span-2">
                  <Button type="submit">Cadastrar profissional</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}
