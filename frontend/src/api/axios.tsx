import axios, { AxiosError, type AxiosInstance } from "axios";

const BASE_URL = '/'

// Same "soft errors" mechanism as api/client.ts: the API answers handled 4xx errors with
// HTTP 200 + "X-Real-Status", and we turn them back into regular Axios errors.
function withSoftErrors(instance: AxiosInstance): AxiosInstance {
	instance.defaults.headers.common["X-Soft-Errors"] = "1";
	instance.interceptors.response.use((response) => {
		const realStatus = Number(response.headers["x-real-status"]);
		if (realStatus >= 400 && realStatus < 500) {
			response.status = realStatus;
			return Promise.reject(
				new AxiosError(`Request failed with status code ${realStatus}`, AxiosError.ERR_BAD_REQUEST, response.config, response.request, response)
			);
		}
		return response;
	});
	return instance;
}

export default withSoftErrors(axios.create({
	baseURL: BASE_URL
}));

//Private instance of Axios to attach interceptors that will attach JWT tokens for us
export const axiosPrivate = withSoftErrors(axios.create({
	baseURL: BASE_URL,
	headers: { 'Content-Type': 'application/json' },
    withCredentials: true
}));