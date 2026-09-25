import { useState, useRef, useEffect } from "react";
import { TrendingUp } from "lucide-react";
import { useNavigate } from "react-router";
import Input from "../components/Input";
import Button from "../components/Button";
import Label from "../components/Label";
import api from "../api/axios";
import axios from "axios";
import { useAuth } from "../hooks/useAuth";

const LOGIN_URL = '/api/auth/login'

function LoginPage() {
	const {setAuth} = useAuth();
	const userRef = useRef<HTMLInputElement>(null);
	const errRef = useRef<HTMLParagraphElement>(null);

	const [email, setEmail] = useState("");
	const [pwd, setPwd] = useState("");
	const [errMsg, setErrMsg] = useState("");
	const [success, setSuccess] = useState(false);
	const navigate = useNavigate();

	useEffect(() => {
		userRef.current?.focus();
	}, [])

	useEffect(() => {
		setErrMsg("");
	}, [email, pwd])

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		
		try {
			const response = await api.post(LOGIN_URL,
				{ email, password: pwd},
				{
					headers: { 'Content-Type': 'application/json' },
					withCredentials: true
				});
			const { token, user } = response.data;
			setAuth({ id: user.id, username: user.username, avatarUrl: user.avatarUrl, accessToken: token});
			setEmail('');
			setPwd('');
			setSuccess(true);
			navigate("/profile");
		} catch (err) {
			if (axios.isAxiosError(err)) {
			if (!err.response) {
			setErrMsg("No Server Response");
			} else if (err.response.status === 401) {
			setErrMsg("Incorrect email or password");
			} else {
			setErrMsg("Registration Failed");
			}
			errRef.current?.focus();
			}
		}
	}

  return (
    <section className="flex flex-col items-center justify-center min-h-screen p-5 gap-4 bg-gradient-to-br from-gray-950 via-gray-900 to-green-950">
      	<TrendingUp size={48} className="text-green-500" />
		<p ref={errRef} className={errMsg ? "errmsg" : "offscreen"} aria-live="assertive">{errMsg}</p>
      	<p className="text-gray-400 text-lg">Join us and start trading now.</p>
      	<div className="bg-gray-900 border border-gray-800 rounded-lg px-8 py-8 flex flex-col items-center">
			<h1 className="text-3xl font-bold text-green-500 mb-6">Log in :</h1>
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
					ref={userRef}
					/>
				</div>
				<div className="flex flex-col gap-1 items-center">
				<Label htmlFor="password">Password :</Label>
				<Input
				value={pwd}
				id="password"
				onChange={(event) => setPwd(event.target.value)}
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
	  	<div className="flex flex-col items-center justify-center">
			<p className="text-gray-400 text-lg">New User?</p>
			<Button variant="primary" size="medium" 
				type="button"
				onClick={() => navigate("/create_user")}>
				Create Account
			</Button>
		</div>
	  	
    </section>
  );
}

export default LoginPage;
