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
  Clock
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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
}

export default function ProfessionalsTable({ professionals, tenantId, onProfessionalUpdate }: ProfessionalsTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    bio: '',
    avatar_url: ''
  });

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

      toast({ title: 'Profissional atualizado com sucesso!' });
      setEditingId(null);
      onProfessionalUpdate();
    } catch (error: any) {
      toast({ 
        title: 'Erro ao atualizar profissional', 
        description: error.message,
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

      toast({ title: 'Profissional excluído com sucesso!' });
      onProfessionalUpdate();
    } catch (error: any) {
      toast({ 
        title: 'Erro ao excluir profissional', 
        description: error.message,
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
            title: 'Limite atingido', 
            description: `Seu plano atual permite apenas ${limit} profissional(ais) ativo(s).`,
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

      toast({ title: `Profissional ${!currentActive ? 'ativado' : 'desativado'} com sucesso!` });
      onProfessionalUpdate();
    } catch (error: any) {
      toast({ 
        title: 'Erro ao alterar status', 
        description: error.message,
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users2 className="h-5 w-5" />
          Profissionais
        </CardTitle>
        <CardDescription>
          Gerencie os profissionais do estabelecimento
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Profissional</TableHead>
              <TableHead>Bio</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {professionals.map((professional) => (
              <TableRow key={professional.id}>
                <TableCell>
                  {editingId === professional.id ? (
                    <div className="space-y-2">
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
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
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
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {editingId === professional.id ? (
                    <Textarea
                      value={editForm.bio}
                      onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                      placeholder="Biografia do profissional"
                      className="min-h-[80px]"
                    />
                  ) : (
                    <div className="max-w-xs">
                      {professional.bio ? (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {professional.bio}
                        </p>
                      ) : (
                        <span className="text-sm text-muted-foreground">Sem biografia</span>
                      )}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={professional.active ? "default" : "secondary"}>
                    {professional.active ? "Ativo" : "Inativo"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {editingId === professional.id ? (
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
                        onClick={() => handleEdit(professional)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleToggleActive(professional.id, professional.active)}
                      >
                        {professional.active ? "Desativar" : "Ativar"}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive" 
                        onClick={() => handleDelete(professional.id)}
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
        
        {professionals.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Users2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum profissional cadastrado</p>
            <p className="text-sm">Adicione profissionais para começar a receber agendamentos</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
