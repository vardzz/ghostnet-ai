import { readFile } from "fs/promises";

type SupabaseCredentials = {
  url: string;
  serviceRoleKey: string;
};

function readCredentials(): SupabaseCredentials | null {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    return null;
  }

  return { url: url.replace(/\/$/, ""), serviceRoleKey };
}

export function hasSupabaseCredentials(): boolean {
  return readCredentials() !== null;
}

async function supabaseFetch<T>(path: string, init: RequestInit): Promise<T | null> {
  const credentials = readCredentials();
  if (!credentials) {
    return null;
  }

  const response = await fetch(`${credentials.url}${path}`, {
    ...init,
    headers: {
      apikey: credentials.serviceRoleKey,
      authorization: `Bearer ${credentials.serviceRoleKey}`,
      "content-type": "application/json",
      ...(init.headers || {}),
    },
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(
      `Supabase request failed for ${path}: ${response.status} ${response.statusText}${details ? ` - ${details}` : ""}`
    );
  }

  if (response.status === 204) {
    return null;
  }

  return (await response.json()) as T;
}

export async function supabaseSelectRows<T>(path: string): Promise<T[] | null> {
  return supabaseFetch<T[]>(path, { method: "GET" });
}

export async function supabaseUpsertRow<T>(
  path: string,
  row: Record<string, unknown>
): Promise<T | null> {
  return supabaseFetch<T>(path, {
    method: "POST",
    headers: {
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify(row),
  });
}

export async function supabaseUpdateRow<T>(
  path: string,
  row: Record<string, unknown>
): Promise<T | null> {
  return supabaseFetch<T>(path, {
    method: "PATCH",
    headers: {
      Prefer: "return=representation",
    },
    body: JSON.stringify(row),
  });
}

function encodeObjectPath(objectPath: string): string {
  return objectPath.split("/").map(encodeURIComponent).join("/");
}

export async function uploadSupabaseObject(
  bucket: string,
  objectPath: string,
  sourcePath: string,
  contentType = "application/octet-stream"
): Promise<string | null> {
  const credentials = readCredentials();
  if (!credentials) {
    return null;
  }

  const file = await readFile(sourcePath);
  const response = await fetch(
    `${credentials.url}/storage/v1/object/${bucket}/${encodeObjectPath(objectPath)}`,
    {
      method: "POST",
      headers: {
        apikey: credentials.serviceRoleKey,
        authorization: `Bearer ${credentials.serviceRoleKey}`,
        "content-type": contentType,
        "x-upsert": "true",
      },
      body: file,
    }
  );

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(
      `Supabase storage upload failed for ${bucket}/${objectPath}: ${response.status} ${response.statusText}${details ? ` - ${details}` : ""}`
    );
  }

  return objectPath;
}

export async function createSignedSupabaseUrl(
  bucket: string,
  objectPath: string,
  expiresIn = 3600
): Promise<string | null> {
  const credentials = readCredentials();
  if (!credentials) {
    return null;
  }

  const response = await fetch(
    `${credentials.url}/storage/v1/object/sign/${bucket}/${encodeObjectPath(objectPath)}`,
    {
      method: "POST",
      headers: {
        apikey: credentials.serviceRoleKey,
        authorization: `Bearer ${credentials.serviceRoleKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ expiresIn }),
    }
  );

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as { signedURL?: string; signedUrl?: string };
  const signedUrl = payload.signedURL ?? payload.signedUrl;
  if (!signedUrl) {
    return null;
  }

  return signedUrl.startsWith("http") ? signedUrl : `${credentials.url}${signedUrl}`;
}
