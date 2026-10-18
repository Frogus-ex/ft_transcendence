const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, options);

  // TODO 1 : si response.ok est false, throw une Error avec un message clair
  // (inclure le status HTTP, ex: "API error 404: ...")
  if (!response.ok) {
	throw new Error(`API error ${response.status}: ${response.statusText}`);}

  // TODO 2 : sinon, parse la réponse en JSON et renvoie-la
  // (indice : response.json() renvoie une Promise, donc il faut await)
  return await response.json();

}