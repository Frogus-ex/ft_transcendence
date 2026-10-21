import { useState } from "react";
import Button from "./Button";
import Input from "./Input";
import Label from "./Label";
import Alert from "./Alert";
import Card from "./Card";
import { useAuth } from "../context/AuthContext";

function ProfileEditForm() {
  const { user, updateProfile } = useAuth();
  const [username, setUsername] = useState(user?.username ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const isValid = username.trim().length >= 3;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!isValid) return;

    setError(null);
    setSaved(false);
    setIsSaving(true);
    try {
      await updateProfile(username.trim());
      setSaved(true);
    } catch (err) {
      setError(
        err instanceof Error && err.message.includes("409")
          ? "Ce nom d'utilisateur est déjà pris."
          : "Échec de la mise à jour du profil."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card padding="large" className="mb-6">
      <h2 className="text-white font-semibold mb-4">Edit profile</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-md">
        <div className="flex flex-col gap-1">
          <Label htmlFor="profile-username">Username (3 characters minimum)</Label>
          <Input
            id="profile-username"
            type="text"
            size="medium"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        <Button
          variant="primary"
          size="medium"
          type="submit"
          icon={false}
          shape="square"
          disabled={!isValid || isSaving}
        >
          {isSaving ? "Saving..." : "Save"}
        </Button>
        {saved && <Alert variant="success">Profil mis à jour.</Alert>}
        {error && <Alert variant="error">{error}</Alert>}
      </form>
    </Card>
  );
}

export default ProfileEditForm;