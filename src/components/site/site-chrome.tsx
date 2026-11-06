import { Link } from "@tanstack/react-router";

import { Wordmark } from "@/components/site/wordmark";

const nav = [
  { to: "/", label: "Home" },
  { to: "/features", label: "Features" },
  { to: "/how-to-use", label: "How to Use" },
  { to: "/screenshots", label: "Screenshots" },
  { to: "/downloads", label: "Downloads" },
  { to: "/faq", label: "FAQ" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/" aria-label="TeleKamera home">
          <Wordmark className="text-xl" />
        </Link>
        <nav className="hidden items-center gap-1 text-sm md:flex">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeProps={{ className: "text-foreground" }}
              className="rounded-lg px-3 py-1.5 text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <Link
          to="/downloads"
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Download
        </Link>
      </div>
      <nav className="no-scrollbar flex items-center gap-1 overflow-x-auto whitespace-nowrap border-t border-border px-3 py-2 text-sm md:hidden">
        {nav.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            activeProps={{ className: "bg-accent text-foreground" }}
            className="shrink-0 rounded-full px-3 py-1.5 text-xs text-muted-foreground"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div>
            <Wordmark className="text-xl" />
            <p className="mt-2 text-sm text-muted-foreground">Your pocket studio.</p>
          </div>
          <div className="grid grid-cols-2 gap-10 text-sm sm:grid-cols-3">
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Product</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link to="/features" className="hover:text-foreground">Features</Link></li>
                <li><Link to="/how-to-use" className="hover:text-foreground">Setup guide</Link></li>
                <li><Link to="/screenshots" className="hover:text-foreground">Screenshots</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Downloads</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link to="/download/android" className="hover:text-foreground">Android</Link></li>
                <li><Link to="/download/windows" className="hover:text-foreground">Windows</Link></li>
                <li><Link to="/downloads" className="hover:text-foreground">All releases</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Legal</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link to="/privacy" className="hover:text-foreground">Privacy policy</Link></li>
                <li><Link to="/terms" className="hover:text-foreground">Terms of use</Link></li>
                <li><Link to="/faq" className="hover:text-foreground">Support</Link></li>
              </ul>
            </div>
          </div>
        </div>
        <p className="mt-10 text-xs text-muted-foreground/70">
          © {new Date().getFullYear()} TeleKamera. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
