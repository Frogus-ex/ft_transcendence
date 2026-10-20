import { useState } from "react";
import { Link } from "react-router";
import Card from "../components/Card";
import Button from "../components/Button";
import Modal from "../components/Modal";
import Alert from "../components/Alert";
import { apiDownload, apiFetch } from "../api/client";
import { useAuth } from "../context/AuthContext";

function GdprPage() {
  const { user, token, logout } = useAuth();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportDone, setExportDone] = useState(false);

  async function handleExport() {
    if (!token) return;
    setError(null);
    setExportDone(false);
    setIsExporting(true);
    try {
      await apiDownload("/users/me/export", "mes_donnees.json", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setExportDone(true);
    } catch {
      setError("Échec de l'export de tes données, réessaie.");
    } finally {
      setIsExporting(false);
    }
  }

  async function handleDeleteAccount() {
    if (!token) return;
    setError(null);
    setIsDeleting(true);
    try {
      await apiFetch("/users/me", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      logout();
    } catch {
      setError("Échec de la suppression du compte, réessaie.");
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-3xl font-bold text-white mb-6">Confidentialité &amp; RGPD</h1>

      <Card padding="large" className="mb-6">
        <p className="text-gray-400 text-sm">
          Conformément au RGPD, tu peux à tout moment télécharger une copie de toutes les
          données personnelles que nous détenons sur toi, ou demander la suppression
          définitive de ton compte et de toutes les données associées (portefeuille,
          historique d'ordres).
        </p>
      </Card>

      {!user ? (
        <Card padding="large">
          <p className="text-gray-400 text-sm mb-2">
            Connecte-toi pour gérer tes données personnelles.
          </p>
          <Link to="/login" className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 text-sm">
            Se connecter
          </Link>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          <Card padding="large">
            <h2 className="text-white font-semibold mb-2">Télécharger mes données</h2>
            <p className="text-gray-400 text-sm mb-4">
              Profil, solde, positions et historique complet de tes ordres, au format JSON.
            </p>
            <Button
              variant="secondary"
              size="medium"
              type="button"
              icon={false}
              shape="square"
              disabled={isExporting}
              onClick={handleExport}
            >
              {isExporting ? "Export..." : "Télécharger mes données"}
            </Button>
            {exportDone && (
              <div className="mt-3">
                <Alert variant="success">Export téléchargé.</Alert>
              </div>
            )}
          </Card>

          <Card padding="large">
            <h2 className="text-white font-semibold mb-2">Supprimer mon compte</h2>
            <p className="text-gray-400 text-sm mb-4">
              Supprime définitivement ton compte, ton portefeuille et ton historique
              d'ordres. Cette action est irréversible.
            </p>
            <Button
              variant="danger"
              size="medium"
              type="button"
              icon={false}
              shape="square"
              onClick={() => setIsDeleteModalOpen(true)}
            >
              Supprimer mon compte
            </Button>
          </Card>

          {error && <Alert variant="error">{error}</Alert>}
        </div>
      )}

      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)}>
        <p className="mb-4">
          Confirmer la suppression définitive de ton compte ? Cette action est
          irréversible.
        </p>
        <div className="flex gap-3 justify-center">
          <Button
            variant="danger"
            size="medium"
            type="button"
            disabled={isDeleting}
            onClick={handleDeleteAccount}
          >
            {isDeleting ? "..." : "Oui, supprimer"}
          </Button>
          <Button
            variant="secondary"
            size="medium"
            type="button"
            onClick={() => setIsDeleteModalOpen(false)}
          >
            Annuler
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export default GdprPage;