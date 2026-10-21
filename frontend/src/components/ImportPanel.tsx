import { useState } from "react";
import Button from "./Button";
import Alert from "./Alert";
import { apiUpload } from "../api/client";
import { useAuth } from "../context/AuthContext";

type ImportResult = { received: number; inserted: number; skipped: number };
type RowError = { row: number; error: string };
type ErrorDetail = { message: string; errors?: RowError[] };

const MAX_FILE_BYTES = 1_000_000;

function ImportPanel() {
  const { token } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<RowError[]>([]);

  async function handleImport() {
    if (!file || !token) return;

    setResult(null);
    setError(null);
    setRowErrors([]);

    const extension = file.name.split(".").pop()?.toLowerCase();
    if (extension !== "csv" && extension !== "json" && extension !== "xml") {
      setError("Format non supporté : utilise un fichier .csv, .json ou .xml.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError("Fichier trop volumineux (1 Mo maximum).");
      return;
    }

    setIsImporting(true);
    try {
      const content = await file.text();
      const { status, data } = await apiUpload(`/import?format=${extension}`, content, {
        headers: { "Content-Type": "text/plain", Authorization: `Bearer ${token}` },
      });

      if (status === 201) {
        setResult(data as ImportResult);
      } else {
        const detail = (data as { detail?: ErrorDetail | string } | null)?.detail;
        if (detail && typeof detail === "object") {
          setError(detail.message);
          setRowErrors(detail.errors ?? []);
        } else {
          setError(typeof detail === "string" ? detail : "Échec de l'import.");
        }
      }
    } catch {
      setError("Échec de l'import, réessaie.");
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <div className="bg-[#050505] border border-[#1f1f1f] rounded-md p-4 flex flex-col gap-2">
      <span className="text-gray-500 text-xs uppercase tracking-wide mb-1">Import</span>
      <p className="text-gray-500 text-xs">
        Candles in CSV, JSON or XML (same layout as the export). Existing candles are never overwritten.
      </p>

      <input
        type="file"
        accept=".csv,.json,.xml"
        onChange={(e) => {
          setFile(e.target.files?.[0] ?? null);
          setResult(null);
          setError(null);
          setRowErrors([]);
        }}
        className="text-xs text-gray-300 file:mr-2 file:rounded-md file:border-0 file:bg-gray-800 file:px-2 file:py-1 file:text-gray-200"
      />

      <Button
        variant="secondary"
        size="small"
        type="button"
        icon={false}
        shape="square"
        disabled={!file || isImporting}
        onClick={handleImport}
      >
        {isImporting ? "Import..." : "Import file"}
      </Button>

      {result && (
        <Alert variant="success">
          {result.inserted} bougie(s) importée(s), {result.skipped} ignorée(s) (déjà présentes).
        </Alert>
      )}
      {error && <Alert variant="error">{error}</Alert>}
      {rowErrors.length > 0 && (
        <ul className="text-xs text-red-400 list-disc pl-4 flex flex-col gap-1">
          {rowErrors.map((rowError) => (
            <li key={rowError.row}>
              Ligne {rowError.row} : {rowError.error}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default ImportPanel;