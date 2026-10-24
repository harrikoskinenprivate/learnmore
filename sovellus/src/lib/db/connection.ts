import postgres from "postgres";

type SocketOptions = {
  path: string;
  database: string;
  user: string;
  pass: string;
  max: number;
};

// Cloud SQL -osoitteessa konenimi on tyhjä ja socket on host-parametrissa.
// postgres.js antaa merkkijonon Nodelle new URL -jäsennykseen, joka hylkää sen.
export function openPostgres(databaseUrl: string, max: number) {
  const socket = cloudSqlSocket(databaseUrl, max);
  if (socket) {
    return postgres(socket);
  }
  return postgres(databaseUrl, { max });
}

function cloudSqlSocket(databaseUrl: string, max: number): SocketOptions | null {
  const emptyHost = databaseUrl.indexOf("@/");
  if (emptyHost === -1) {
    return null;
  }

  const normalized =
    databaseUrl.slice(0, emptyHost) + "@localhost" + databaseUrl.slice(emptyHost + 1);
  const parsed = new URL(normalized);
  const socketHost = parsed.searchParams.get("host");
  if (!socketHost?.startsWith("/")) {
    throw new Error("DATABASE_URL on virheellinen.");
  }

  const database = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  if (!parsed.username || !database) {
    throw new Error("DATABASE_URL on virheellinen.");
  }

  const directory = socketHost.replace(/\/$/, "");
  return {
    path: `${directory}/.s.PGSQL.5432`,
    database,
    user: decodeURIComponent(parsed.username),
    pass: decodeURIComponent(parsed.password),
    max,
  };
}
