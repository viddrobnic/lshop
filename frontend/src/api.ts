export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: Response
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message: string = "Unauthorized", response?: Response) {
    super(message, 401, response);
    this.name = "UnauthorizedError";
  }
}

export async function apiFetch<T = unknown>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<T | null> {
  const url = typeof input === "string" ? `/api${input}` : input;
  const response = await fetch(url, { ...init, credentials: "include" });

  if (!response.ok) {
    if (response.status === 401) {
      throw new UnauthorizedError("Unauthorized", response);
    }

    const message = `HTTP ${response.status}: ${response.statusText}`;
    throw new ApiError(message, response.status, response);
  }

  if (response.headers.get("content-type")?.startsWith("application/json")) {
    return response.json();
  } else {
    return null;
  }
}
