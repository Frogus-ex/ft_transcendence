import { Link } from "react-router";
import LegalLayout from "../components/LegalLayout";

const linkClass = "text-indigo-400 hover:text-indigo-300 underline underline-offset-2";
const h2Class = "text-white font-semibold text-base mb-2";

function TermsPage() {
  return (
    <LegalLayout title="Terms of Service" lastUpdated="October 20, 2026">
      <section>
        <h2 className={h2Class}>1. About the service</h2>
        <p>
          ft_transcendence is an educational trading simulator built by students of 42 Paris.
          By creating an account or using the application, you agree to these terms.
        </p>
      </section>

      <section>
        <h2 className={h2Class}>2. Virtual trading, not financial advice</h2>
        <p>
          All balances, positions and orders are simulated with virtual money. No real trade is
          ever executed and nothing on the platform is financial advice. Market prices come from
          public data and may be delayed or inaccurate, so past simulated performance says
          nothing about real-world results.
        </p>
      </section>

      <section>
        <h2 className={h2Class}>3. Your account</h2>
        <p>
          You must provide a valid email address and keep your credentials confidential. You are
          responsible for activity carried out with your account. You can delete your account at
          any time from the{" "}
          <Link to="/gdpr" className={linkClass}>
            Your data (GDPR)
          </Link>{" "}
          page.
        </p>
      </section>

      <section>
        <h2 className={h2Class}>4. Acceptable use</h2>
        <ul className="list-disc pl-5 flex flex-col gap-1">
          <li>Do not attempt to disrupt, overload or gain unauthorized access to the service or to other users&apos; accounts.</li>
          <li>Do not bypass the rate limits or use automated tools to abuse the API.</li>
          <li>Do not use the platform for any unlawful purpose.</li>
        </ul>
      </section>

      <section>
        <h2 className={h2Class}>5. Availability and data resets</h2>
        <p>
          The service is provided &quot;as is&quot;, without warranty of any kind. As an
          educational project it may be interrupted, modified or reset at any time, and demo
          data such as accounts, balances and price history may be erased without notice.
        </p>
      </section>

      <section>
        <h2 className={h2Class}>6. Suspension</h2>
        <p>
          We may suspend or delete accounts that breach these terms, in particular in case of
          abuse of the service.
        </p>
      </section>

      <section>
        <h2 className={h2Class}>7. Intellectual property and market data</h2>
        <p>
          The source code belongs to its authors. Market data is provided by Binance public
          streams and remains the property of its owners.
        </p>
      </section>

      <section>
        <h2 className={h2Class}>8. Liability</h2>
        <p>
          To the extent permitted by law, the authors are not liable for any loss or damage
          resulting from the use of, or the inability to use, this educational platform.
        </p>
      </section>

      <section>
        <h2 className={h2Class}>9. Changes and contact</h2>
        <p>
          These terms may change; the date above shows the latest revision. Questions can be
          sent by opening an issue on the project repository
          (github.com/Frogus-ex/ft_transcendence). See also our{" "}
          <Link to="/privacy" className={linkClass}>
            Privacy Policy
          </Link>
          .
        </p>
      </section>
    </LegalLayout>
  );
}

export default TermsPage;