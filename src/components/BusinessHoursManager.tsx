import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Clock, Save, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface BusinessHour {
  id: string;
  tenant_id: string;
  weekday: number;
  open_time: string | null;
  close_time: string | null;
  closed: boolean;
}

interface BusinessHoursManagerProps {
  tenantId: string;
}

const weekdays = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Segunda-feira' },
  { value: 2, label: 'Terça-feira' },
  { value: 3, label: 'Quarta-feira' },
  { value: 4, label: 'Quinta-feira' },
  { value: 5, label: 'Sexta-feira' },
  { value: 6, label: 'Sábado' }
];

export default function BusinessHoursManager({ tenantId }: BusinessHoursManagerProps) {
  const [businessHours, setBusinessHours] = useState<BusinessHour[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (tenantId) {
      fetchBusinessHours();
    }
  }, [tenantId]);

  const fetchBusinessHours = async () => {
    try {
      const { data, error } = await supabase
        .from('business_hours')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('weekday');

      if (error) throw error;

      setBusinessHours(data || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar horários',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleClosed = (weekday: number) => {
    setBusinessHours(prev => 
      prev.map(hour => 
        hour.weekday === weekday 
          ? { ...hour, closed: !hour.closed }
          : hour
      )
    );
  };

  const handleTimeChange = (weekday: number, field: 'open_time' | 'close_time', value: string) => {
    setBusinessHours(prev => 
      prev.map(hour => 
        hour.weekday === weekday 
          ? { ...hour, [field]: value }
          : hour
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Preparar dados para atualização
      const updates = businessHours.map(hour => ({
        id: hour.id,
        open_time: hour.closed ? null : hour.open_time,
        close_time: hour.closed ? null : hour.close_time,
        closed: hour.closed
      }));

      // Atualizar cada horário
      for (const update of updates) {
        const { error } = await supabase
          .from('business_hours')
          .update(update)
          .eq('id', update.id);

        if (error) throw error;
      }

      toast({ title: 'Horários salvos com sucesso!' });
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar horários',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Horários de Funcionamento
          </CardTitle>
          <CardDescription>
            Configure os horários de funcionamento do seu estabelecimento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Horários de Funcionamento
        </CardTitle>
        <CardDescription>
          Configure os horários de funcionamento do seu estabelecimento
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {weekdays.map(({ value, label }) => {
            const hour = businessHours.find(h => h.weekday === value);
            
            return (
              <div key={value} className="p-4 border rounded-lg">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-24 sm:w-32">
                      <Label className="text-sm font-medium">{label}</Label>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={!hour?.closed}
                        onCheckedChange={() => handleToggleClosed(value)}
                      />
                      <span className="text-sm text-muted-foreground">
                        {hour?.closed ? 'Fechado' : 'Aberto'}
                      </span>
                    </div>
                  </div>

                  {!hour?.closed && (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      <div className="space-y-1 w-full sm:w-auto">
                        <Label className="text-xs text-muted-foreground">Abertura</Label>
                        <Input
                          type="time"
                          value={hour?.open_time || ''}
                          onChange={(e) => handleTimeChange(value, 'open_time', e.target.value)}
                          className="w-full sm:w-32"
                        />
                      </div>
                      
                      <div className="space-y-1 w-full sm:w-auto">
                        <Label className="text-xs text-muted-foreground">Fechamento</Label>
                        <Input
                          type="time"
                          value={hour?.close_time || ''}
                          onChange={(e) => handleTimeChange(value, 'close_time', e.target.value)}
                          className="w-full sm:w-32"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end pt-4">
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvar Horários
              </>
            )}
          </Button>
        </div>

        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <h4 className="font-medium mb-2">Dicas:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Configure os horários de acordo com o funcionamento real do seu estabelecimento</li>
            <li>• Os clientes só poderão agendar horários dentro dos períodos configurados</li>
            <li>• Você pode definir dias específicos como fechados</li>
            <li>• As alterações são aplicadas imediatamente</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
