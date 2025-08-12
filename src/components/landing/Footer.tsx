const Footer = () => {
  const footerSections = [
    {
      title: "StyleSwift",
      content: "A plataforma completa para barbearias e salões automatizarem seus agendamentos.",
      isLogo: true
    },
    {
      title: "Produto",
      links: [
        { name: "Recursos", href: "#recursos" },
        { name: "Temas", href: "#planos" },
        { name: "Painel", href: "/admin" }
      ]
    },
    {
      title: "Suporte",
      links: [
        { name: "Central de Ajuda", href: "#" },
        { name: "Contato", href: "#" },
        { name: "Status", href: "#" }
      ]
    },
    {
      title: "Legal",
      links: [
        { name: "Privacidade", href: "#" },
        { name: "Termos", href: "#" },
        { name: "Cookies", href: "#" }
      ]
    }
  ];

  return (
    <footer className="border-t bg-muted/20">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {footerSections.map((section, index) => (
            <div key={index}>
              {section.isLogo ? (
                <>
                  <h3 className="font-bold text-lg mb-4">{section.title}</h3>
                  <p className="text-muted-foreground">{section.content}</p>
                </>
              ) : (
                <>
                  <h4 className="font-semibold mb-4">{section.title}</h4>
                  <ul className="space-y-2 text-muted-foreground">
                    {section.links?.map((link, linkIndex) => (
                      <li key={linkIndex}>
                        <a href={link.href} className="hover:text-foreground transition-colors">
                          {link.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          ))}
        </div>
        <div className="border-t mt-8 pt-8 text-center text-muted-foreground">
          <p>&copy; 2024 StyleSwift. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;