# Script para configurar variáveis de ambiente do Supabase
# Execute este script no PowerShell como administrador

Write-Host "=== CONFIGURAÇÃO DE VARIÁVEIS DE AMBIENTE SUPABASE ===" -ForegroundColor Green
Write-Host ""

# Verificar se o Supabase CLI está instalado
try {
    $supabaseVersion = supabase --version
    Write-Host "✓ Supabase CLI encontrado: $supabaseVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Supabase CLI não encontrado!" -ForegroundColor Red
    Write-Host "Instale o Supabase CLI primeiro:" -ForegroundColor Yellow
    Write-Host "https://supabase.com/docs/guides/cli/getting-started" -ForegroundColor Cyan
    exit 1
}

Write-Host ""
Write-Host "=== CONFIGURANDO VARIÁVEIS ===" -ForegroundColor Yellow

# Variáveis de ambiente - SUBSTITUA PELAS SUAS CHAVES REAIS
$envVars = @{
    "STRIPE_SECRET_KEY" = "SUA_STRIPE_SECRET_KEY_AQUI"
    "SUBSCRIPTION_SECRET" = "SEU_WEBHOOK_SECRET_AQUI"
    "SUPABASE_URL" = "https://jsubmkwvqzddgppvgxiu.supabase.co"
    "SUPABASE_SERVICE_ROLE_KEY" = "SUA_SERVICE_ROLE_KEY_AQUI"
}

# Verificar se está logado
Write-Host "Verificando login..." -ForegroundColor Yellow
try {
    supabase status
} catch {
    Write-Host "✗ Não está logado no Supabase!" -ForegroundColor Red
    Write-Host "Execute: supabase login" -ForegroundColor Yellow
    exit 1
}

# Conectar ao projeto
Write-Host "Conectando ao projeto..." -ForegroundColor Yellow
try {
    supabase link --project-ref jsubmkwvqzddgppvgxiu
    Write-Host "✓ Projeto conectado!" -ForegroundColor Green
} catch {
    Write-Host "✗ Erro ao conectar ao projeto!" -ForegroundColor Red
    Write-Host "Verifique se o project-ref está correto" -ForegroundColor Yellow
    exit 1
}

# Configurar variáveis
foreach ($key in $envVars.Keys) {
    $value = $envVars[$key]
    Write-Host "Configurando $key..." -ForegroundColor Yellow
    try {
        supabase secrets set "$key=$value"
        Write-Host "✓ $key configurado!" -ForegroundColor Green
    } catch {
        Write-Host "✗ Erro ao configurar $key" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== VERIFICANDO CONFIGURAÇÃO ===" -ForegroundColor Yellow
try {
    supabase secrets list
    Write-Host "✓ Variáveis listadas com sucesso!" -ForegroundColor Green
} catch {
    Write-Host "✗ Erro ao listar variáveis" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== PRÓXIMOS PASSOS ===" -ForegroundColor Green
Write-Host "1. Deploy das functions:" -ForegroundColor Yellow
Write-Host "   supabase functions deploy" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Configure o webhook no Stripe:" -ForegroundColor Yellow
Write-Host "   URL: https://jsubmkwvqzddgppvgxiu.functions.supabase.co/stripe-webhook" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. Teste a function:" -ForegroundColor Yellow
Write-Host "   curl -X POST https://jsubmkwvqzddgppvgxiu.functions.supabase.co/create-checkout-session -H 'Content-Type: application/json' -d '{\"productId\": \"prod_SqqVGzUIvJPVpt\"}'" -ForegroundColor Cyan

Write-Host ""
Write-Host "=== ALTERNATIVA MANUAL ===" -ForegroundColor Green
Write-Host "Se o CLI não funcionar, configure manualmente no Dashboard:" -ForegroundColor Yellow
Write-Host "https://supabase.com/dashboard/project/jsubmkwvqzddgppvgxiu/settings/functions" -ForegroundColor Cyan
