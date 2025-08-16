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
import { MobileTable, StatusBadge, ActionButton } from '@/components/MobileTable';
import { motion } from 'framer-motion';
import { AnimatedCard } from '@/components/MicroInteractions';

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

      toast({ title: 'Serviço atualizado com sucesso!', description: 'Os dados do serviço foram salvos no sistema' });
      setEditingId(null);
      onServiceUpdate();
    } catch (error: any) {
      toast({ 
        title: 'Erro ao atualizar serviço', 
        description: error.message || 'Ocorreu um erro ao atualizar os dados do serviço',
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

      toast({ title: 'Serviço excluído com sucesso!', description: 'O serviço foi removido do sistema' });
      onServiceUpdate();
    } catch (error: any) {
      toast({ 
        title: 'Erro ao excluir serviço', 
        description: error.message || 'Ocorreu um erro ao excluir o serviço do sistema',
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

      toast({ title: `Serviço ${!currentActive ? 'ativado' : 'desativado'} com sucesso!`, description: `O serviço foi ${!currentActive ? 'ativado' : 'desativado'} no sistema` });
      onServiceUpdate();
    } catch (error: any) {
      toast({ 
        title: 'Erro ao alterar status do serviço', 
        description: error.message || 'Ocorreu um erro ao alterar o status do serviço',
        variant: 'destructive'
      });
    }
  };

  return (
    <AnimatedCard>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <motion.div
              animate={{ rotate: [0, 15, -15, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 5 }}
            >
              <Scissors className="h-5 w-5" />
            </motion.div>
            Serviços
          </CardTitle>
          <CardDescription>
            Gerencie os serviços oferecidos pelo estabelecimento
          </CardDescription>
        </CardHeader>
      </motion.div>
      <CardContent>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <MobileTable
            columns={[
              { key: 'name', label: 'Serviço' },
              { key: 'price', label: 'Preço' },
              { key: 'duration', label: 'Duração' },
              { key: 'status', label: 'Status' },
              { key: 'actions', label: 'Ações' }
            ]}
            data={services.map((service, index) => ({
              id: service.id,
              name: editingId === service.id ? (
                <motion.div 
                  className="space-y-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
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
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                >
                  <div className="font-medium">{service.name}</div>
                  {service.description && (
                    <div className="text-sm text-muted-foreground">{service.description}</div>
                  )}
                </motion.div>
              ),
              price: editingId === service.id ? (
                <motion.div 
                  className="flex items-center gap-2"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    step="0.01"
                    value={editForm.price_reais}
                    onChange={(e) => setEditForm({ ...editForm, price_reais: e.target.value })}
                    className="w-20"
                  />
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  className="font-medium"
                >
                  {formatBRL(service.price_cents)}
                </motion.div>
              ),
              duration: editingId === service.id ? (
                <motion.div 
                  className="flex items-center gap-2"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    value={editForm.duration_minutes}
                    onChange={(e) => setEditForm({ ...editForm, duration_minutes: e.target.value })}
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">min</span>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  className="flex items-center gap-1"
                >
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{service.duration_minutes} min</span>
                </motion.div>
              ),
              status: (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                >
                  <StatusBadge status={service.active ? "Ativo" : "Inativo"} variant={service.active ? "default" : "secondary"} />
                </motion.div>
              ),
              actions: editingId === service.id ? (
                <motion.div 
                  className="flex flex-wrap items-center gap-2"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ActionButton
                    onClick={handleSave}
                    icon={<Save className="h-4 w-4" />}
                    label="Salvar"
                    variant="default"
                  />
                  <ActionButton
                    onClick={handleCancel}
                    icon={<X className="h-4 w-4" />}
                    label="Cancelar"
                    variant="outline"
                  />
                </motion.div>
              ) : (
                <motion.div
                  className="flex flex-wrap items-center gap-2"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                >
                  <ActionButton
                    onClick={() => handleEdit(service)}
                    icon={<Edit className="h-4 w-4" />}
                    label="Editar"
                    variant="outline"
                  />
                  <ActionButton
                    onClick={() => handleToggleActive(service.id, service.active)}
                    icon={service.active ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    label={service.active ? "Desativar" : "Ativar"}
                    variant="outline"
                  />
                  <ActionButton
                    onClick={() => handleDelete(service.id)}
                    icon={<Trash2 className="h-4 w-4" />}
                    label="Excluir"
                    variant="destructive"
                  />
                </motion.div>
              )
            }))}
            emptyMessage="Nenhum serviço cadastrado"
          />
        </motion.div>
      </CardContent>
    </AnimatedCard>
  );
}
