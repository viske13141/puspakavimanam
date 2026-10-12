import { Link } from "@tanstack/react-router";
import { brand } from "@/content/site";

const footerLinks = {
  Services: [
    { to: "/aviation", label: "Helicopter Charter" },
    { to: "/aviation", label: "Private Jet Charter" },
    { to: "/aviation", label: "Fleet" },
    { to: "/experiences", label: "Events & Experiences" },
    { to: "/destinations", label: "Destinations" },
  ],
  Company: [
    { to: "/about", label: "About HELITEJET" },
    { to: "/concierge", label: "Contact" },
    { to: "/request-access", label: "Start a Request" },
  ],
  Account: [
    { to: "/login", label: "Login" },
    { to: "/register", label: "Register" },
    { to: "/customer/dashboard", label: "My Dashboard" },
  ],
};

export function PublicFooter() {
  return (
    <footer className="border-t border-[#E5E9EF] bg-[#F7F8FA] text-[#14263D]">
      <div className="mx-auto max-w-[1440px] px-6 py-14 md:px-10 md:py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.3fr_repeat(3,1fr)]">
          <div>
            <Link
              to="/"
              className="font-serif text-xl font-medium tracking-[0.18em] text-[#14263D]"
            >
              HELITEJET
            </Link>
            <p className="mt-4 max-w-xs font-sans text-sm leading-relaxed text-[#596579]">
              Aviation charter enquiries and journey coordination, arranged around your plans.
            </p>
            <a
              href={`mailto:${brand.email}`}
              className="mt-4 inline-block font-sans text-sm text-[#14263D] underline decoration-[#B79A65] underline-offset-4 hover:text-[#B79A65]"
            >
              {brand.email}
            </a>
          </div>

          {Object.entries(footerLinks).map(([heading, links]) => (
            <nav key={heading} aria-label={`${heading} footer links`}>
              <h2 className="mb-4 font-sans text-[0.65rem] font-semibold tracking-[0.16em] text-[#596579] uppercase">
                {heading}
              </h2>
              <ul className="space-y-3">
                {links.map(({ to, label }) => (
                  <li key={label}>
                    <Link
                      to={to}
                      className="font-sans text-sm text-[#596579] transition-colors hover:text-[#14263D] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B79A65]"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-[#E5E9EF] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-sans text-xs text-[#596579]">
            © {new Date().getFullYear()} HELITEJET. All rights reserved.
          </p>
          <p className="font-sans text-xs text-[#596579]">
            Privacy and terms pages are not yet configured.
          </p>
        </div>
      </div>
    </footer>
  );
}
