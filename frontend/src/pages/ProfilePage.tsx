import { useState, useEffect } from "react";
import { useOutletContext } from "react-router";
import { TrendingUp } from "lucide-react";
import Input from "../components/Input";
import Button from "../components/Button";
import Card from "../components/Card";
import Label from "../components/Label";
import Avatar from "../components/Avatar";
import Badge from "../components/Badge";
import Tooltip from "../components/Tooltip";

type OutletContextType = {
  isLoggedIn: boolean;
  setIsLoggedIn: (value: boolean) => void;
};

function ProfilePage() {
  const { isLoggedIn, setIsLoggedIn } = useOutletContext<OutletContextType>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!isLoggedIn) {
      setEmail("");
      setPassword("");
    }
  }, [isLoggedIn]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsLoggedIn(true);
  }

  if (!isLoggedIn) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-5 gap-4">
        <TrendingUp size={48} className="text-green-500" />
        <p className="text-gray-400 text-lg">
          Join us and start trading now.
        </p>
        <div className="bg-gradient-to-br from-gray-950 via-gray-900 to-green-950 border border-gray-800 rounded-lg px-8 py-8 flex flex-col items-center">
          <h1 className="text-3xl font-bold text-green-500 mb-6">
            Connexion :
          </h1>
          <form
            onSubmit={handleSubmit}
            className="flex flex-col items-center gap-4"
          >
            <div className="flex flex-col gap-1 items-center">
              <Label htmlFor="email">Email :</Label>
              <Input
                value={email}
                id="email"
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                size="medium"
                placeholder="email"
              />
            </div>
            <div className="flex flex-col gap-1 items-center">
              <Label htmlFor="password">Password :</Label>
              <Input
                value={password}
                id="password"
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                size="medium"
                placeholder="password"
              />
            </div>
            <Button variant="primary" size="medium" type="submit">
              Log in
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-white">Mon profil</h1>
      <Card padding="large">
        <Avatar
          src="https://i.pravatar.cc/150"
          alt="Photo de profil"
          size="large"
        />
        <Tooltip text="Online">
          <Badge variant="online" size="large" />
        </Tooltip>
      </Card>
    </div>
  );
}

export default ProfilePage;