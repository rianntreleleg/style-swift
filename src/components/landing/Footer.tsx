import { Mail, Phone, MapPin, Instagram, Facebook, Twitter, Linkedin, Youtube, Shield, Zap, CreditCard, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Footer = () => {
  const footerSections = [
    {
      title: "StyleSwift",
      content: "A plataforma completa para barbearias e salões automatizarem seus agendamentos.",
      isLogo: true,
      socialLinks: [
        { icon: Instagram, href: "#", label: "Instagram" }
      ]
    },
    {
      title: "Produto",
      links: [
        { name: "Recursos", href: "#recursos" },
        { name: "Planos", href: "#pricing" },
        { name: "Temas", href: "#temas" },
        { name: "Painel", href: "/admin" },
        { name: "Novidades", href: "#" }
      ]
    },
    {
      title: "Suporte",
      links: [
        { name: "Central de Ajuda", href: "#" },
        { name: "Contato", href: "#contato" },
        { name: "Status", href: "#" },
        { name: "Comunidade", href: "#" },
        { name: "Feedback", href: "#" }
      ]
    },
    {
      title: "Empresa",
      links: [
        { name: "Sobre", href: "#" },
        { name: "Blog", href: "#" },
        { name: "Carreiras", href: "#" },
        { name: "Imprensa", href: "#" },
        { name: "Parceiros", href: "#" }
      ]
    }
  ];

  const trustBadges = [
    { icon: Shield, text: "100% Seguro" },
    { icon: Zap, text: "Processamento Rápido" },
    { icon: CreditCard, text: "Pagamento Seguro" },
    { icon: Truck, text: "Entrega Imediata" }
  ];

  return (
    <footer id="contato" className="border-t bg-background">
      {/* Trust badges */}
      <div className="bg-muted/20 py-4">
        <div className="container">
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12">
            {trustBadges.map((badge, index) => (
              <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                <badge.icon className="h-4 w-4" />
                <span>{badge.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Company info */}
          <div className="lg:col-span-2">
            <h3 className="font-bold text-xl mb-4">StyleSwift</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              A plataforma completa para barbearias e salões automatizarem seus agendamentos, 
              gerenciarem clientes e aumentarem sua receita.
            </p>
            
            {/* Contact info */}
            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-muted-foreground">styleswiftagendamentos@gmail.com</span>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-muted-foreground">(33) 99109-4120</span>
              </div>
            </div>
            
            {/* Social media */}
            <div className="flex gap-3">
              {footerSections[0].socialLinks?.map((social, index) => (
                <a 
                  key={index}
                  href={social.href}
                  className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
                  aria-label={social.label}
                >
                  <social.icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>
          
          {/* Links sections */}
          {footerSections.slice(1).map((section, index) => (
            <div key={index}>
              <h4 className="font-semibold mb-4 text-lg">{section.title}</h4>
              <ul className="space-y-3">
                {section.links?.map((link, linkIndex) => (
                  <li key={linkIndex}>
                    <a 
                      href={link.href} 
                      className="text-muted-foreground hover:text-foreground transition-colors text-sm"
                    >
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        
        
        {/* Legal and copyright */}
        <div className="mt-8 pt-8 border-t border-border text-center">
          <div className="flex flex-wrap justify-center gap-6 mb-4">
            <a href="#" className="text-muted-foreground hover:text-foreground text-sm transition-colors">
              Política de Privacidade
            </a>
            <a href="#" className="text-muted-foreground hover:text-foreground text-sm transition-colors">
              Termos de Uso
            </a>
            <a href="#" className="text-muted-foreground hover:text-foreground text-sm transition-colors">
              Cookies
            </a>
            <a href="#" className="text-muted-foreground hover:text-foreground text-sm transition-colors">
              LGPD
            </a>
          </div>
          <p className="text-muted-foreground text-sm">
            &copy; {new Date().getFullYear()} StyleSwift. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;