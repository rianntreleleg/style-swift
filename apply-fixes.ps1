# Script para aplicar correções críticas no StyleSwift

Write-Host "🔧 Aplicando Correções Críticas - StyleSwift" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green

# Verificar se estamos no diretório correto
if (-not (Test-Path "supabase/migrations/20250115000002_fix_critical_issues.sql")) {
    Write-Host "❌ Erro: Arquivo de migração não encontrado!" -ForegroundColor Red
    Write-Host "Certifique-se de estar no diretório raiz do projeto StyleSwift" -ForegroundColor Yellow
    exit 1
}

if (-not (Test-Path "supabase/migrations/20250115000003_fix_plan_sync_and_business_hours.sql")) {
    Write-Host "❌ Erro: Arquivo de migração de planos não encontrado!" -ForegroundColor Red
    Write-Host "Certifique-se de estar no diretório raiz do projeto StyleSwift" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Arquivos de migração encontrados" -ForegroundColor Green

Write-Host ""
Write-Host "📋 INSTRUÇÕES PARA APLICAR AS CORREÇÕES:" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Acesse o Dashboard do Supabase:" -ForegroundColor White
Write-Host "   https://supabase.com/dashboard" -ForegroundColor Yellow
Write-Host ""
Write-Host "2. Selecione seu projeto StyleSwift" -ForegroundColor White
Write-Host ""
Write-Host "3. Vá para SQL Editor (no menu lateral)" -ForegroundColor White
Write-Host ""
Write-Host "4. Copie e cole o conteúdo do arquivo:" -ForegroundColor White
Write-Host "   supabase/migrations/20250115000002_fix_critical_issues.sql" -ForegroundColor Yellow
Write-Host ""
Write-Host "5. Clique em 'Run' para executar o SQL" -ForegroundColor White
Write-Host ""
Write-Host "6. Aguarde a execução e verifique se não há erros" -ForegroundColor White
Write-Host ""
Write-Host "7. Agora copie e cole o conteúdo do arquivo:" -ForegroundColor White
Write-Host "   supabase/migrations/20250115000003_fix_plan_sync_and_business_hours.sql" -ForegroundColor Yellow
Write-Host ""
Write-Host "8. Clique em 'Run' para executar o SQL" -ForegroundColor White
Write-Host ""
Write-Host "9. Aguarde a execução e verifique se não há erros" -ForegroundColor White
Write-Host ""

Write-Host "🚀 PRÓXIMOS PASSOS APÓS APLICAR O SQL:" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Teste a exclusão de serviços" -ForegroundColor White
Write-Host "2. Teste a exclusão de agendamentos" -ForegroundColor White
Write-Host "3. Teste o cadastro de profissionais" -ForegroundColor White
Write-Host "4. Teste as configurações de horários" -ForegroundColor White
Write-Host "5. Teste a seleção de horários na página de agendamento público" -ForegroundColor White
Write-Host "6. Verifique se o plano está sendo reconhecido corretamente" -ForegroundColor White
Write-Host ""

Write-Host "🎉 CORREÇÕES PRONTAS PARA APLICAÇÃO!" -ForegroundColor Green
Write-Host "Para mais informações, consulte o arquivo CORRECOES_CRITICAS.md" -ForegroundColor Blue
Write-Host ""

Read-Host "Pressione Enter para sair"
