import { Link } from "react-router";
import LegalLayout from "../components/LegalLayout";

const linkClass = "text-indigo-400 hover:text-indigo-300 underline underline-offset-2";
const h2Class = "text-white font-semibold text-base mb-2";

function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" lastUpdated="October 20, 2026">
      <section>
        <h2 className="text-white font-semibold text-base mb-2">1. Who we are</h2>
        <p>
          ft_transcendence is an educational cryptocurrency paper-trading platform built by
          students of 42 Paris. It is not a commercial service and no real money is involved.
        </p>
      </section>

      <section>
        <h2 className={h2Class}>2. Data we collect</h2>
        <ul className="list-disc pl-5 flex flex-col gap-1">
          <li>Account data: your email address, your username and your password. The password is stored only as a salted bcrypt hash, never in clear text.</li>
          <li>Profile data: an avatar image URL (a default placeholder image is assigned at sign-up).</li>
          <li>Trading data: your virtual balance, your open positions and the history of your simulated orders.</li>
          <li>Technical data: your IP address is processed to apply rate limiting, and may appear temporarily in web server logs.</li>
        </ul>
      </section>

      <section>
        <h2 className={h2Class}>3. How we use it</h2>
        <p>
          We use this data only to create and secure your account, run the trading simulation,
          display your portfolio and protect the service against abuse. We do not sell your
          data, share it for advertising, or use it for profiling.
        </p>
      </section>

      <section>
        <h2 className={h2Class}>4. Cookies and local storage</h2>
        <p>
          The application does not use cookies, analytics or advertising trackers. When you log
          in, a session token is stored in your browser&apos;s local storage; it expires after 20
          minutes and is removed when you log out.
        </p>
      </section>

      <section>
        <h2 className={h2Class}>5. Third parties</h2>
        <ul className="list-disc pl-5 flex flex-col gap-1">
          <li>Market prices come from Binance public data streams. No personal data is sent to Binance.</li>
          <li>The default avatar is loaded from the external image service i.pravatar.cc, which can therefore see your IP address when your avatar is displayed.</li>
        </ul>
      </section>

      <section>
        <h2 className={h2Class}>6. Retention</h2>
        <p>
          Your data is kept as long as your account exists. When you delete your account, your
          profile, portfolio and order history are permanently erased.
        </p>
      </section>

      <section>
        <h2 className={h2Class}>7. Your rights</h2>
        <p>
          Under the GDPR you have the right to access, export and erase your personal data. You
          can do both yourself, at any time, from the{" "}
          <Link to="/gdpr" className={linkClass}>
            Your data (GDPR)
          </Link>{" "}
          page: download a copy of your data in JSON format, or delete your account. To request a
          correction of your data, contact us as described below.
        </p>
      </section>

      <section>
        <h2 className={h2Class}>8. Security</h2>
        <p>
          All traffic to the application uses HTTPS. Passwords are hashed, authentication
          endpoints are rate limited, and each user can only access their own portfolio and
          orders.
        </p>
      </section>

      <section>
        <h2 className={h2Class}>9. Contact and changes</h2>
        <p>
          For any question about your data, open an issue on the project repository
          (github.com/Frogus-ex/ft_transcendence). We may update this policy; the date above
          shows the latest revision. See also our{" "}
          <Link to="/terms" className={linkClass}>
            Terms of Service
          </Link>
          .
        </p>
      </section>
    </LegalLayout>
  );
}

export default PrivacyPage;