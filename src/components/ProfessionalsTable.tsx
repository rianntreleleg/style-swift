import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  Save, 
  X, 
  Users2,
  User,
  Calendar,
  Clock,
  Plus
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { MobileTable, StatusBadge, ActionButton } from '@/components/MobileTable';
import { checkFeatureAccess, canAddProfessional } from '@/config/plans';
import UpgradePrompt from '@/components/UpgradePrompt';
import { motion } from 'framer-motion';
import { AnimatedCard } from '@/components/MicroInteractions';

interface Professional {
  id: string;
  name: string;
  bio?: string;
  avatar_url?: string;
  active: boolean;
}

interface ProfessionalsTableProps {
  professionals: Professional[];
  tenantId: string;
  onProfessionalUpdate: () => void;
  planTier?: string;
}

export default function ProfessionalsTable({ professionals, tenantId, onProfessionalUpdate, planTier }: ProfessionalsTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    bio: '',
    avatar_url: ''
  });

  // Verificar acesso aos profissionais
  const hasProfessionalsAccess = checkFeatureAccess(planTier, 'hasFinancialDashboard');
  const canAdd = canAddProfessional(planTier, professionals.length);

  const handleEdit = (professional: Professional) => {
    setEditingId(professional.id);
    setEditForm({
      name: professional.name,
      bio: professional.bio || '',
      avatar_url: professional.avatar_url || ''
    });
  };

  const handleSave = async () => {
    if (!editingId) return;

    try {
      const { error } = await supabase
        .from('professionals')
        .update({
          name: editForm.name,
          bio: editForm.bio || null,
          avatar_url: editForm.avatar_url || null
        })
        .eq('id', editingId);

      if (error) throw error;

      toast({ title: 'Profissional atualizado com sucesso!', description: 'Os dados do profissional foram salvos no sistema' });
      setEditingId(null);
      onProfessionalUpdate();
    } catch (error: any) {
      toast({ 
        title: 'Erro ao atualizar profissional', 
        description: error.message || 'Ocorreu um erro ao atualizar os dados do profissional',
        variant: 'destructive'
      });
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({
      name: '',
      bio: '',
      avatar_url: ''
    });
  };

  const handleDelete = async (professionalId: string) => {
    if (!confirm('Tem certeza que deseja excluir este profissional?')) return;

    try {
      const { error } = await supabase
        .from('professionals')
        .delete()
        .eq('id', professionalId);

      if (error) throw error;

      toast({ title: 'Profissional excluído com sucesso!', description: 'O profissional foi removido do sistema' });
      onProfessionalUpdate();
    } catch (error: any) {
      toast({ 
        title: 'Erro ao excluir profissional', 
        description: error.message || 'Ocorreu um erro ao excluir o profissional do sistema',
        variant: 'destructive'
      });
    }
  };

  const handleToggleActive = async (professionalId: string, currentActive: boolean) => {
    try {
      // Se está tentando ativar, verificar limite primeiro
      if (!currentActive) {
        // Contar profissionais ativos
        const { count } = await supabase
          .from('professionals')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)
          .eq('active', true);

        // Buscar plano do tenant
        const { data: tenantData } = await supabase
          .from('tenants')
          .select('plan')
          .eq('id', tenantId)
          .single();

        const plan = tenantData?.plan || 'free';
        const limit = plan === 'free' ? 1 : plan === 'pro' ? 3 : 10;

        if (count && count >= limit) {
          toast({ 
            title: 'Limite de profissionais atingido', 
            description: `Seu plano atual permite apenas ${limit} profissional(ais) ativo(s). Considere fazer um upgrade para adicionar mais profissionais.`,
            variant: 'destructive'
          });
          return;
        }
      }

      const { error } = await supabase
        .from('professionals')
        .update({ active: !currentActive })
        .eq('id', professionalId);

      if (error) throw error;

      toast({ title: `Profissional ${!currentActive ? 'ativado' : 'desativado'} com sucesso!`, description: `O profissional foi ${!currentActive ? 'ativado' : 'desativado'} no sistema` });
      onProfessionalUpdate();
    } catch (error: any) {
      toast({ 
        title: 'Erro ao alterar status do profissional', 
        description: error.message || 'Ocorreu um erro ao alterar o status do profissional',
        variant: 'destructive'
      });
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Se não tem acesso, mostrar prompt de upgrade
  if (!hasProfessionalsAccess) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <UpgradePrompt
          requiredPlan="professional"
          featureName="Gerenciamento de Profissionais"
          currentPlan={planTier}
        />
      </motion.div>
    );
  }

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
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 5 }}
            >
              <Users2 className="h-5 w-5" />
            </motion.div>
            Profissionais
          </CardTitle>
          <CardDescription>
            Gerencie os profissionais do estabelecimento
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
              { key: 'professional', label: 'Profissional' },
              { key: 'bio', label: 'Bio' },
              { key: 'status', label: 'Status' },
              { key: 'actions', label: 'Ações' }
            ]}
            data={professionals.map((professional, index) => ({
              id: professional.id,
              professional: editingId === professional.id ? (
                <motion.div 
                  className="space-y-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Input
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    placeholder="Nome do profissional"
                  />
                  <Input
                    value={editForm.avatar_url}
                    onChange={(e) => setEditForm({ ...editForm, avatar_url: e.target.value })}
                    placeholder="URL da foto (opcional)"
                  />
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  className="flex items-center gap-3"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={professional.avatar_url} />
                    <AvatarFallback>
                      {getInitials(professional.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{professional.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {professional.bio ? 'Bio disponível' : 'Sem bio'}
                    </div>
                  </div>
                </motion.div>
              ),
              bio: editingId === professional.id ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Textarea
                    value={editForm.bio}
                    onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                    placeholder="Biografia do profissional"
                    className="min-h-[80px]"
                  />
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  className="max-w-xs"
                >
                  {professional.bio ? (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {professional.bio}
                    </p>
                  ) : (
                    <span className="text-sm text-muted-foreground">Sem biografia</span>
                  )}
                </motion.div>
              ),
              status: (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                >
                  <StatusBadge status={professional.active ? "Ativo" : "Inativo"} variant={professional.active ? "default" : "secondary"} />
                </motion.div>
              ),
              actions: editingId === professional.id ? (
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
                    onClick={() => handleEdit(professional)}
                    icon={<Edit className="h-4 w-4" />}
                    label="Editar"
                    variant="outline"
                  />
                  <ActionButton
                    onClick={() => handleToggleActive(professional.id, professional.active)}
                    icon={professional.active ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    label={professional.active ? "Desativar" : "Ativar"}
                    variant="outline"
                  />
                  <ActionButton
                    onClick={() => handleDelete(professional.id)}
                    icon={<Trash2 className="h-4 w-4" />}
                    label="Excluir"
                    variant="destructive"
                  />
                </motion.div>
              )
            }))}
            emptyMessage="Nenhum profissional cadastrado"
          />
        </motion.div>
      </CardContent>
    </AnimatedCard>
  );
}
