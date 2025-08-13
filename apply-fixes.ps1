# Script para aplicar correções no Style Swift
# Execute este script para aplicar todas as correções necessárias

Write-Host "🔧 Aplicando Correções do Style Swift" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se o usuário está no diretório correto
if (-not (Test-Path "supabase/migrations")) {
    Write-Host "❌ Erro: Execute este script no diretório raiz do projeto Style Swift" -ForegroundColor Red
    Write-Host "   Certifique-se de que existe a pasta 'supabase/migrations'" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Diretório correto detectado" -ForegroundColor Green
Write-Host ""

# Listar as migrações que precisam ser aplicadas
Write-Host "📋 Migrações que precisam ser aplicadas:" -ForegroundColor Yellow
Write-Host ""

$migrations = @(
    "20250115000002_fix_critical_issues.sql",
    "20250115000003_fix_plan_sync_and_business_hours.sql", 
    "20250115000004_auto_confirm_appointments.sql",
    "20250115000005_fix_auto_confirmation_stats.sql"
)

foreach ($migration in $migrations) {
    $path = "supabase/migrations/$migration"
    if (Test-Path $path) {
        Write-Host "   ✅ $migration" -ForegroundColor Green
    } else {
        Write-Host "   ❌ $migration (arquivo não encontrado)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "🚀 INSTRUÇÕES PARA APLICAR AS CORREÇÕES:" -ForegroundColor Cyan
Write-Host ""

Write-Host "1️⃣ Acesse o Supabase Dashboard:" -ForegroundColor Yellow
Write-Host "   - Vá para https://supabase.com/dashboard" -ForegroundColor White
Write-Host "   - Selecione seu projeto" -ForegroundColor White
Write-Host ""

Write-Host "2️⃣ Abra o SQL Editor:" -ForegroundColor Yellow
Write-Host "   - No menu lateral, clique em 'SQL Editor'" -ForegroundColor White
Write-Host "   - Clique em 'New query'" -ForegroundColor White
Write-Host ""

Write-Host "3️⃣ Aplique as migrações na ordem:" -ForegroundColor Yellow
Write-Host ""

for ($i = 0; $i -lt $migrations.Count; $i++) {
    $migration = $migrations[$i]
    $path = "supabase/migrations/$migration"
    
    if (Test-Path $path) {
        Write-Host "   📄 Migração $($i + 1): $migration" -ForegroundColor Cyan
        Write-Host "   - Copie o conteúdo do arquivo: $path" -ForegroundColor White
        Write-Host "   - Cole no SQL Editor do Supabase" -ForegroundColor White
        Write-Host "   - Clique em 'Run' para executar" -ForegroundColor White
        Write-Host "   - Aguarde a execução completar" -ForegroundColor White
        Write-Host ""
    }
}

Write-Host "4️⃣ Verifique a execução:" -ForegroundColor Yellow
Write-Host "   - Cada migração deve mostrar 'Success' no resultado" -ForegroundColor White
Write-Host "   - Se houver erro, verifique o log e tente novamente" -ForegroundColor White
Write-Host ""

Write-Host "5️⃣ Teste as funcionalidades:" -ForegroundColor Yellow
Write-Host "   - Exclusão de serviços (deve funcionar sem erro)" -ForegroundColor White
Write-Host "   - Exclusão de agendamentos (interface não deve travar)" -ForegroundColor White
Write-Host "   - Criação de profissionais (deve respeitar limites)" -ForegroundColor White
Write-Host "   - Horários de funcionamento (aba deve estar presente)" -ForegroundColor White
Write-Host "   - Seleção de horários na página pública" -ForegroundColor White
Write-Host "   - Sincronização de planos" -ForegroundColor White
Write-Host "   - Confirmação automática de agendamentos" -ForegroundColor White
Write-Host "   - Aplicação dos temas com fundo escuro" -ForegroundColor White
Write-Host ""

Write-Host "⚠️  IMPORTANTE:" -ForegroundColor Red
Write-Host "   - Faça backup do banco antes de aplicar as migrações" -ForegroundColor Yellow
Write-Host "   - Teste em ambiente de desenvolvimento primeiro" -ForegroundColor Yellow
Write-Host "   - As migrações são idempotentes (podem ser executadas múltiplas vezes)" -ForegroundColor Yellow
Write-Host ""

Write-Host "📞 Suporte:" -ForegroundColor Cyan
Write-Host "   - Se encontrar problemas, verifique o arquivo CORRECOES_IMPLEMENTADAS.md" -ForegroundColor White
Write-Host "   - Todas as correções estão documentadas com detalhes" -ForegroundColor White
Write-Host ""

Write-Host "✅ Script concluído!" -ForegroundColor Green
Write-Host "   Agora siga as instruções acima para aplicar as correções." -ForegroundColor White
