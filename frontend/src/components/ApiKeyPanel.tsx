import { useCallback, useEffect, useState } from "react";
import Card from "./Card";
import Button from "./Button";
import Alert from "./Alert";
import { apiFetch } from "../api/client";
import { useAuth } from "../context/AuthContext";

type KeyStatus = { hasKey: boolean; prefix: string | null; createdAt: string | null };

function ApiKeyPanel() {
  const { token } = useAuth();
  const [status, setStatus] = useState<KeyStatus | null>(null);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    if (!token) return;
    try {
      setStatus(await apiFetch<KeyStatus>("/keys", { headers: { Authorization: `Bearer ${token}` } }));
    } catch {
      setError("Impossible de charger l'état de la clé d'API.");
    }
  }, [token]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  async function handleGenerate() {
    if (!token) return;
    setError(null);
    setCopied(false);
    setIsBusy(true);
    try {
      const created = await apiFetch<{ apiKey: string; prefix: string }>("/keys", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      setNewKey(created.apiKey);
      await loadStatus();
    } catch {
      setError("Échec de la génération de la clé.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleRevoke() {
    if (!token) return;
    setError(null);
    setIsBusy(true);
    try {
      await apiFetch("/keys", { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      setNewKey(null);
      await loadStatus();
    } catch {
      setError("Échec de la révocation de la clé.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleCopy() {
    if (!newKey) return;
    try {
      await navigator.clipboard.writeText(newKey);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  const exampleKey = newKey ?? "<your-api-key>";

  return (
    <Card padding="large" className="mb-6">
      <h2 className="text-white font-semibold mb-2">API key</h2>
      <p className="text-gray-400 text-sm mb-4">
        Use an API key to call your portfolio, orders and profile endpoints from a script or an
        external tool, without logging in. See the{" "}
        <a
          href="/api/docs"
          target="_blank"
          rel="noreferrer"
          className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
        >
          API documentation
        </a>
        .
      </p>

      {status && (
        <p className="text-gray-300 text-sm mb-4">
          {status.hasKey
            ? `Active key: ${status.prefix}… (created ${new Date(status.createdAt ?? "").toLocaleString("fr-FR")})`
            : "No active key."}
        </p>
      )}

      {newKey && (
        <div className="mb-4 flex flex-col gap-2">
          <Alert variant="warning">Copy this key now: it will not be shown again.</Alert>
          <code className="bg-black border border-gray-700 rounded-md text-sm text-green-400 px-3 py-2 break-all">
            {newKey}
          </code>
          <div>
            <Button variant="secondary" size="small" type="button" icon={false} shape="square" onClick={handleCopy}>
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>
      )}

      <div className="flex gap-3 mb-4">
        <Button variant="primary" size="medium" type="button" icon={false} shape="square" disabled={isBusy} onClick={handleGenerate}>
          {status?.hasKey ? "Regenerate key" : "Generate API key"}
        </Button>
        {status?.hasKey && (
          <Button variant="danger" size="medium" type="button" icon={false} shape="square" disabled={isBusy} onClick={handleRevoke}>
            Revoke
          </Button>
        )}
      </div>

      <p className="text-gray-500 text-xs mb-1">Example:</p>
      <code className="block bg-black border border-gray-700 rounded-md text-xs text-gray-300 px-3 py-2 break-all">
        curl -H &quot;X-API-Key: {exampleKey}&quot; {window.location.origin}/api/portfolio
      </code>

      {error && (
        <div className="mt-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}
    </Card>
  );
}

export default ApiKeyPanel;