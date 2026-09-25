import { useState, useRef, useEffect } from "react";
import { TrendingUp } from "lucide-react";
import { useNavigate } from "react-router";
import Input from "../components/Input";
import Button from "../components/Button";
import Label from "../components/Label";
import api from "../api/axios"
import axios from "axios"
import { useAuth } from "../hooks/useAuth";


const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PWD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%]).{8,24}$/;
const USER_REGEX = /.{3,}$/
const REGISTER_URL = '/api/auth/register'

const NewUserPage = () => {

	const emailRef = useRef<HTMLInputElement>(null);
	const userRef = useRef<HTMLInputElement>(null);
    const errRef = useRef<HTMLParagraphElement>(null);

	const [email, setEmail] = useState("");
	const [validEmail, setValidEmail] = useState(false);
	const [emailFocus, setEmailFocus] = useState(false);

	const [password, setPassword] = useState("");
	const [validPwd, setValidPwd] = useState(false);
	const [pwdFocus, setPwdFocus] = useState(false);

	const [matchPassword, setMatchPassword] = useState("");
	const [validMatchPwd, setValidMatchPwd] = useState(false);
	const [matchPwdFocus, setMatchPwdFocus] = useState(false);

	const [userName, setUserName] = useState("");
	const [validUser, setValidUser] = useState(false);
	const [userFocus, setUserFocus] = useState(false);

	const [errMsg, setErrMsg] = useState('');

	const { setAuth } = useAuth();
	const navigate = useNavigate();
	
	useEffect(() => {
		userRef.current?.focus();
	}, [])

	// Checks that email, username and passwords are valid
	useEffect(() => {
        setValidEmail(EMAIL_REGEX.test(email));
    }, [email])

	useEffect(() => {
        setValidUser(USER_REGEX.test(userName));
    }, [userName])

	useEffect(() => {
        setValidPwd(PWD_REGEX.test(password));
        setValidMatchPwd(password === matchPassword);
    }, [password, matchPassword])

	useEffect(() => {
        setErrMsg('');
    }, [email, password, matchPassword])

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const v1 = EMAIL_REGEX.test(email);
		const v2 = PWD_REGEX.test(password);
		const v3 = USER_REGEX.test(userName);
		if (!v1 || !v2 || !v3) {
			setErrMsg( "Invalid Entry");
			return;
		}
		// Try registering
		try {
			const response = await api.post(REGISTER_URL,
				{ email, username: userName, pwd: password},
				{
					headers: { 'Content-Type': 'application/json' },
					withCredentials: true
				});
		} catch (err) {
			if (axios.isAxiosError(err)) {
			if (!err.response) {
			setErrMsg("No Server Response");
			} else if (err.response.status === 409) {
			setErrMsg("Already an account with this email");
			} else {
			setErrMsg("Registration Failed");
			}
			errRef.current?.focus();
			}
		}
		// Try logging in
		try {
			const response = await api.post("/api/auth/login",
			{ email, password },
			{
				headers: { 'Content-Type': 'application/json' },
				withCredentials: true
			});

			const { token, user } = response.data;
			setAuth({
			id: user.id,
			username: user.username,
			avatarUrl: user.avatarUrl,
			accessToken: token
			});
			navigate("/profile");
		} catch (err) {
			// Registration succeeded but auto-login failed — don't call it a
			// registration failure, since the account WAS created
			setErrMsg("Account created, but automatic login failed. Please log in.");
			navigate("/login");
		}
	}

  return (
    <section className="flex flex-col items-center justify-center min-h-screen p-5 gap-4 bg-gradient-to-br from-gray-950 via-gray-900 to-green-950">
      	<TrendingUp size={48} className="text-green-500" />
		<p ref={errRef} className={errMsg ? "errmsg" : "offscreen"} aria-live="assertive">{errMsg}</p>
      	<p className="text-gray-400 text-lg">Join us and start trading now.</p>
      	<div className="bg-gray-900 border border-gray-800 rounded-lg px-8 py-8 flex flex-col items-center">
			<h1 className="text-3xl font-bold text-green-500 mb-6">Create account :</h1>
			<form
			onSubmit={handleSubmit}
			className="flex flex-col items-center gap-4"
			>
				<div className="flex flex-col gap-1 items-center">
					<Label htmlFor="userName">User Name :</Label>
					<Input
						value={userName}
						id="userName"
						onChange={(event) => setUserName(event.target.value)}
						type="text"
						size="medium"
						placeholder="username"
						ref={userRef}
						aria-invalid={validUser ? "false" : "true"}
						onFocus={() => setUserFocus(true)}
						onBlur={() => setUserFocus(false)}
					/>
					<p id="uidnote" className={userFocus && userName && !validUser ? "instructions" : "offscreen"}>
                            Username must be at least three characters long<br />
                    </p>
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
						ref={emailRef}
						aria-invalid={validEmail ? "false" : "true"}
						onFocus={() => setEmailFocus(true)}
						onBlur={() => setEmailFocus(false)}
					/>
					<p id="uidnote" className={emailFocus && email && !validEmail ? "instructions" : "offscreen"}>
                            Invalid Email<br />
                    </p>
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
					aria-invalid={validPwd ? "false" : "true"}
					onFocus={() => setPwdFocus(true)}
					onBlur={() => setPwdFocus(false)}
				/>
				<p id="pwdnote" className={pwdFocus && !validPwd ? "instructions" : "offscreen"}>
					8 to 24 characters.<br />
					Must include:<br />
						uppercase and lowercase letters, <br />
						a number and a special character.<br />
					Allowed special characters: <span aria-label="exclamation mark">!</span> <span aria-label="at symbol">@</span> <span aria-label="hashtag">#</span> <span aria-label="dollar sign">$</span> <span aria-label="percent">%</span>
				</p>
				</div>
				<div className="flex flex-col gap-1 items-center">
				<Label htmlFor="password">Repeat Password :</Label>
				<Input
					value={matchPassword}
					id="matchPassword"
					onChange={(event) => setMatchPassword(event.target.value)}
					type="password"
					size="medium"
					placeholder="password"
					aria-invalid={validMatchPwd ? "false" : "true"}
					onFocus={() => setMatchPwdFocus(true)}
					onBlur={() => setMatchPwdFocus(false)}
				/>
				<p id="confirmnote" className={matchPwdFocus && !validMatchPwd ? "instructions" : "offscreen"}>
					Must match the first password input field.
				</p>
				</div>
				<Button disabled={!validEmail || !validPwd || !validMatchPwd || !validUser} variant="primary" size="medium" type="submit">
					Create Account
				</Button>
			</form>
    	</div>
	</section>
	)
}

export default NewUserPage;