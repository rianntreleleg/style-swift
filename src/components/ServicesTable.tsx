import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Edit, 
  Trash2, 
  Plus, 
  Save, 
  X, 
  Scissors,
  Clock,
  DollarSign
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { formatBRL } from '@/lib/utils';

interface Service {
  id: string;
  name: string;
  price_cents: number;
  duration_minutes: number;
  description?: string;
  active: boolean;
}

interface ServicesTableProps {
  services: Service[];
  tenantId: string;
  onServiceUpdate: () => void;
}

export default function ServicesTable({ services, tenantId, onServiceUpdate }: ServicesTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    price_reais: '',
    duration_minutes: '',
    description: ''
  });

  const handleEdit = (service: Service) => {
    setEditingId(service.id);
    setEditForm({
      name: service.name,
      price_reais: (service.price_cents / 100).toString(),
      duration_minutes: service.duration_minutes.toString(),
      description: service.description || ''
    });
  };

  const handleSave = async () => {
    if (!editingId) return;

    try {
      const { error } = await supabase
        .from('services')
        .update({
          name: editForm.name,
          price_cents: Math.round(parseFloat(editForm.price_reais) * 100),
          duration_minutes: parseInt(editForm.duration_minutes),
          description: editForm.description || null
        })
        .eq('id', editingId);

      if (error) throw error;

      toast({ title: 'Serviço atualizado com sucesso!' });
      setEditingId(null);
      onServiceUpdate();
    } catch (error: any) {
      toast({ 
        title: 'Erro ao atualizar serviço', 
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({
      name: '',
      price_reais: '',
      duration_minutes: '',
      description: ''
    });
  };

  const handleDelete = async (serviceId: string) => {
    if (!confirm('Tem certeza que deseja excluir este serviço?')) return;

    try {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', serviceId);

      if (error) throw error;

      toast({ title: 'Serviço excluído com sucesso!' });
      onServiceUpdate();
    } catch (error: any) {
      toast({ 
        title: 'Erro ao excluir serviço', 
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleToggleActive = async (serviceId: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from('services')
        .update({ active: !currentActive })
        .eq('id', serviceId);

      if (error) throw error;

      toast({ title: `Serviço ${!currentActive ? 'ativado' : 'desativado'} com sucesso!` });
      onServiceUpdate();
    } catch (error: any) {
      toast({ 
        title: 'Erro ao alterar status', 
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scissors className="h-5 w-5" />
          Serviços
        </CardTitle>
        <CardDescription>
          Gerencie os serviços oferecidos pelo estabelecimento
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Serviço</TableHead>
              <TableHead>Preço</TableHead>
              <TableHead>Duração</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {services.map((service) => (
              <TableRow key={service.id}>
                <TableCell>
                  {editingId === service.id ? (
                    <div className="space-y-2">
                      <Input
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        placeholder="Nome do serviço"
                      />
                      <Input
                        value={editForm.description}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        placeholder="Descrição (opcional)"
                      />
                    </div>
                  ) : (
                    <div>
                      <div className="font-medium">{service.name}</div>
                      {service.description && (
                        <div className="text-sm text-muted-foreground">{service.description}</div>
                      )}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {editingId === service.id ? (
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        step="0.01"
                        value={editForm.price_reais}
                        onChange={(e) => setEditForm({ ...editForm, price_reais: e.target.value })}
                        className="w-20"
                      />
                    </div>
                  ) : (
                    <div className="font-medium">{formatBRL(service.price_cents / 100)}</div>
                  )}
                </TableCell>
                <TableCell>
                  {editingId === service.id ? (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        value={editForm.duration_minutes}
                        onChange={(e) => setEditForm({ ...editForm, duration_minutes: e.target.value })}
                        className="w-20"
                      />
                      <span className="text-sm text-muted-foreground">min</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{service.duration_minutes} min</span>
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={service.active ? "default" : "secondary"}>
                    {service.active ? "Ativo" : "Inativo"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {editingId === service.id ? (
                    <div className="flex items-center gap-2 justify-end">
                      <Button size="sm" onClick={handleSave}>
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleCancel}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 justify-end">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleEdit(service)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleToggleActive(service.id, service.active)}
                      >
                        {service.active ? "Desativar" : "Ativar"}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive" 
                        onClick={() => handleDelete(service.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
        {services.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Scissors className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum serviço cadastrado</p>
            <p className="text-sm">Adicione serviços para começar a receber agendamentos</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
