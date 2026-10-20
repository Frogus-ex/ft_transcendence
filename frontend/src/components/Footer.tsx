import { Link } from "react-router";
import { BadgeDollarSign } from "lucide-react";

function Footer() {
  return (
    <footer className="border-t border-gray-800 px-12 py-8 text-gray-400">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <BadgeDollarSign size={20} className="text-yellow-400" />
            <span className="font-semibold text-white">ft_transcendence</span>
          </div>
          <p className="text-sm">Trade smarter, together.</p>
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-white font-medium mb-1">Navigation</span>
          <Link to="/profile" className="text-sm hover:text-white">
            Profile
          </Link>
          <Link to="/markets" className="text-sm hover:text-white">
            Markets
          </Link>
          <Link to="/contacts" className="text-sm hover:text-white">
            Contacts
          </Link>
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-white font-medium mb-1">Legal</span>
          <span className="text-sm">Terms of Service</span>
          <Link to="/gdpr" className="text-sm hover:text-white">
            Confidentialité (RGPD)
          </Link>
        </div>
      </div>
      <div className="border-t border-gray-800 pt-4 text-sm text-center">
        © 2026 ft_transcendence — Made at 42 Paris
      </div>
    </footer>
  );
}

export default Footer;