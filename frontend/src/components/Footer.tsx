import { Shield } from "lucide-react";

const Footer = () => {
  return (
    <footer className="py-12 border-t border-border bg-secondary/10">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-accent-gradient">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <span className="font-bold text-foreground">JobGuard AI</span>
              <p className="text-xs text-muted-foreground">Protecting Job Seekers</p>
            </div>
          </div>
          
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Built with ML techniques: Naïve Bayes, Logistic Regression & Random Forest
            </p>
          </div>
          
          <div className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} JobGuard AI. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
