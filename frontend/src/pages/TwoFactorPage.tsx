import { useState, useRef, useEffect } from "react";
import { ShieldCheck } from "lucide-react";
import { useNavigate, useLocation } from "react-router";
import Input from "../components/Input";
import Button from "../components/Button";
import Label from "../components/Label";
import { useAuth } from "../context/AuthContext";

type TwoFactorState = { tempToken?: string } | null;

function TwoFactorPage() {
  const { verify2fa } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const tempToken = (location.state as TwoFactorState)?.tempToken;

  const codeRef = useRef<HTMLInputElement>(null);
  const errRef = useRef<HTMLParagraphElement>(null);

  const [code, setCode] = useState("");
  const [errMsg, setErrMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // No temporary token = the user did not come from the login page
  useEffect(() => {
    if (!tempToken) {
      navigate("/login", { replace: true });
      return;
    }
    codeRef.current?.focus();
  }, [tempToken, navigate]);

  useEffect(() => {
    setErrMsg("");
  }, [code]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    // Keep digits only, max 6
    setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!tempToken) return;

    if (!/^\d{6}$/.test(code)) {
      setErrMsg("The code must contain 6 digits");
      errRef.current?.focus();
      return;
    }

    setLoading(true);
    try {
      await verify2fa(tempToken, code);
      navigate("/profile", { replace: true });
    } catch (err) {
      if (err instanceof TypeError) {
        setErrMsg("No Server Response");
      } else if (err instanceof Error && err.message.includes("429")) {
        setErrMsg("Too many attempts, please wait a minute");
      } else if (err instanceof Error && err.message.includes("401")) {
        setErrMsg("Invalid or expired code");
      } else {
        setErrMsg("Verification Failed");
      }
      setCode("");
      errRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="flex flex-col items-center justify-center min-h-screen p-5 gap-4 bg-gradient-to-br from-gray-950 via-gray-900 to-green-950">
      <ShieldCheck size={48} className="text-green-500" />
      <p ref={errRef} className={errMsg ? "errmsg" : "offscreen"} aria-live="assertive">
        {errMsg}
      </p>
      <p className="text-gray-400 text-lg text-center">
        Enter the 6-digit code from your authenticator app.
      </p>
      <div className="bg-gray-900 border border-gray-800 rounded-lg px-8 py-8 flex flex-col items-center">
        <h1 className="text-3xl font-bold text-green-500 mb-6">Two-factor :</h1>
        <form onSubmit={handleSubmit} className="flex flex-col items-center gap-4">
          <div className="flex flex-col gap-1 items-center">
            <Label htmlFor="code">Code :</Label>
            <Input
              value={code}
              id="code"
              onChange={handleChange}
              type="text"
              size="medium"
              placeholder="123456"
              ref={codeRef}
            />
          </div>
          <Button variant="primary" size="medium" type="submit" disabled={loading || code.length !== 6}>
            {loading ? "Verifying..." : "Verify"}
          </Button>
        </form>
      </div>
      <Button
        variant="secondary"
        size="medium"
        type="button"
        onClick={() => navigate("/login", { replace: true })}
      >
        Back to login
      </Button>
    </section>
  );
}

export default TwoFactorPage;
