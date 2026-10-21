import { useState } from "react";
import { ShieldCheck, ShieldOff } from "lucide-react";
import QRCode from "react-qr-code";
import Card from "./Card";
import Input from "./Input";
import Button from "./Button";
import Label from "./Label";
import { apiFetch } from "../api/client";
import { useAuth } from "../context/AuthContext";

type SetupResponse = { otpauthUrl: string; secret: string };
type StatusResponse = { twoFactorEnabled: boolean };
type Step = "idle" | "setup" | "disabling";

function TwoFactorSettings() {
  const { user, token, setTwoFactorEnabled } = useAuth();

  const [step, setStep] = useState<Step>("idle");
  const [otpauthUrl, setOtpauthUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [errMsg, setErrMsg] = useState("");
  const [loading, setLoading] = useState(false);

  if (!user || !token) return null;
  const enabled = user.twoFactorEnabled;

  function authHeaders() {
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  }

  function reset() {
    setStep("idle");
    setOtpauthUrl("");
    setSecret("");
    setCode("");
    setErrMsg("");
  }

  function handleError(err: unknown) {
    if (err instanceof TypeError) setErrMsg("No Server Response");
    else if (err instanceof Error && err.message.includes("429")) setErrMsg("Too many attempts, please wait a minute");
    else if (err instanceof Error && err.message.includes("400")) setErrMsg("Invalid code");
    else if (err instanceof Error && err.message.includes("401")) setErrMsg("Session expired, please log in again");
    else setErrMsg("Something went wrong");
    setCode("");
  }

  async function startSetup() {
    setLoading(true);
    setErrMsg("");
    try {
      const data = await apiFetch<SetupResponse>("/auth/2fa/setup", {
        method: "POST",
        headers: authHeaders(),
      });
      setOtpauthUrl(data.otpauthUrl);
      setSecret(data.secret);
      setStep("setup");
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setErrMsg("The code must contain 6 digits");
      return;
    }
    setLoading(true);
    try {
      const path = step === "setup" ? "/auth/2fa/enable" : "/auth/2fa/disable";
      const data = await apiFetch<StatusResponse>(path, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ code }),
      });
      setTwoFactorEnabled(data.twoFactorEnabled);
      reset();
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card padding="large" className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {enabled ? (
            <ShieldCheck size={24} className="text-green-500" />
          ) : (
            <ShieldOff size={24} className="text-gray-400" />
          )}
          <div>
            <p className="text-white font-semibold">Two-factor authentication</p>
            <p className="text-gray-400 text-sm">{enabled ? "Enabled" : "Disabled"}</p>
          </div>
        </div>
        {step === "idle" &&
          (enabled ? (
            <Button variant="secondary" size="medium" type="button" onClick={() => setStep("disabling")}>
              Disable
            </Button>
          ) : (
            <Button variant="primary" size="medium" type="button" onClick={startSetup} disabled={loading}>
              Enable
            </Button>
          ))}
      </div>

      {step === "setup" && (
        <div className="flex flex-col items-center gap-3 mb-4">
          <p className="text-gray-400 text-sm text-center">
            Scan this QR code with Google Authenticator (or any TOTP app).
          </p>
          <div className="bg-white p-3 rounded">
            <QRCode value={otpauthUrl} size={160} />
          </div>
          <p className="text-gray-400 text-xs text-center break-all">
            Or enter this key manually: <span className="text-white font-mono">{secret}</span>
          </p>
        </div>
      )}

      {step !== "idle" && (
        <form onSubmit={handleConfirm} className="flex flex-col items-center gap-3">
          <Label htmlFor="twofa-code">
            {step === "setup" ? "Enter the code shown in your app :" : "Enter your code to disable 2FA :"}
          </Label>
          <Input
            value={code}
            id="twofa-code"
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            type="text"
            size="medium"
            placeholder="123456"
          />
          <div className="flex gap-3">
            <Button variant="primary" size="medium" type="submit" disabled={loading || code.length !== 6}>
              {loading ? "Checking..." : "Confirm"}
            </Button>
            <Button variant="secondary" size="medium" type="button" onClick={reset}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {errMsg && (
        <p className="text-red-500 text-sm text-center mt-3" aria-live="assertive">
          {errMsg}
        </p>
      )}
    </Card>
  );
}

export default TwoFactorSettings;
