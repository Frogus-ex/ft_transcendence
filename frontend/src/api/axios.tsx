import axios from "axios";

const BASE_URL = 'http://localhost:5173'

export default axios.create({
	baseURL: BASE_URL
});

//Private instance of Axios to attach interceptors that will attach JWT tokens for us
export const axiosPrivate = axios.create({
	baseURL: BASE_URL,
	headers: { 'Content-Type': 'application/json' },
    withCredentials: true
});