import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle, ArrowLeft, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";

export default function Cancel() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-md mx-auto"
      >
        <Card className="border-0 shadow-2xl bg-background/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-2">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-20 h-20 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <XCircle className="h-10 w-10 text-orange-600 dark:text-orange-400" />
            </motion.div>
            <CardTitle className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              Pagamento Cancelado
            </CardTitle>
            <CardDescription className="text-base">
              Sua assinatura não foi processada
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6 pt-4">
            <div className="text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                O pagamento foi cancelado. Não se preocupe, nenhum valor foi cobrado.
              </p>
              
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-semibold text-sm mb-2">Por que escolher StyleSwift?</h4>
                <ul className="text-xs text-muted-foreground space-y-1 text-left">
                  <li>• Sistema completo de agendamentos</li>
                  <li>• Interface moderna e responsiva</li>
                  <li>• Gerenciamento de clientes</li>
                  <li>• Notificações automáticas</li>
                  <li>• Suporte dedicado</li>
                </ul>
              </div>
            </div>

            <div className="space-y-3">
              <Button asChild className="w-full h-12">
                <Link to="/admin" className="flex items-center justify-center gap-2">
                  <RotateCcw className="h-5 w-5" />
                  Tentar Novamente
                </Link>
              </Button>
              
              <Button asChild variant="outline" className="w-full h-12">
                <Link to="/" className="flex items-center justify-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Voltar ao Início
                </Link>
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              Dúvidas? Entre em contato conosco pelo suporte.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </main>
  );
}