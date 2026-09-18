import { useState } from "react";
import { TrendingUp } from "lucide-react";
import { useNavigate, useOutletContext } from "react-router";
import Input from "../components/Input";
import Button from "../components/Button";
import Label from "../components/Label";
import { createContext } from 'react'


type OutletContextType = {
  isLoggedIn: boolean;
  setIsLoggedIn: (value: boolean) => void;
};

function NewUserPage() {
	  const { setIsLoggedIn } = useOutletContext<OutletContextType>();
	  const [email, setEmail] = useState("");
	  const [password, setPassword] = useState("");
	  const [repeatPassword, setRepeatPassword] = useState("");
	  const [firstName, setFirstName] = useState("");
	  const [lastName, setLastName] = useState("");
	  const navigate = useNavigate();
	
	  function handleSubmit(event: React.FormEvent) {
	  event.preventDefault();
	  setIsLoggedIn(true);
	  navigate("/profile");
	}

	function	checkPasswordValid()
	{
		if (password !== repeatPassword)
			return false;
		if (password.length < 4)
			return false
		return true;
	}
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-5 gap-4 bg-gradient-to-br from-gray-950 via-gray-900 to-green-950">
      	<TrendingUp size={48} className="text-green-500" />
      	<p className="text-gray-400 text-lg">Join us and start trading now.</p>
      	<div className="bg-gray-900 border border-gray-800 rounded-lg px-8 py-8 flex flex-col items-center">
			<h1 className="text-3xl font-bold text-green-500 mb-6">Create account :</h1>
			<form
			onSubmit={handleSubmit}
			className="flex flex-col items-center gap-4"
			>
				<div className="flex gap-1 items-center">
					<div className="flex flex-col items-center">
						<Label htmlFor="firstName">First Name :</Label>
						<Input
						value={firstName}
						id="firstName"
						onChange={(event) => setFirstName(event.target.value)}
						type="text"
						size="medium"
						placeholder="first name"
						/>
					</div>
					<div className="flex flex-col items-center">
						<Label htmlFor="lastName">Last Name :</Label>
						<Input
						value={lastName}
						id="lastName"
						onChange={(event) => setLastName(event.target.value)}
						type="text"
						size="medium"
						placeholder="last name"
						/>
					</div>
				</div>
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
				<div className="flex flex-col gap-1 items-center">
				<Label htmlFor="password">Repeat Password :</Label>
				<Input
				value={repeatPassword}
				id="repeatPassword"
				onChange={(event) => setRepeatPassword(event.target.value)}
				type="password"
				size="medium"
				placeholder="password"
				/>
				</div>
				<div className="text-red-700">
					{checkPasswordValid() ? "" : "Error: Passwords don't match"}
				</div>
				<Button variant="primary" size="medium" type="submit">
					Create Account
				</Button>
			</form>
    	</div>
	</div>
	)
}

export default NewUserPage;