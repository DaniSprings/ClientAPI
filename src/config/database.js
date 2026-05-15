import { env } from "./env.js";
import {createClient} from "@supabase/supabase-js";
import { env, isDatabaseConfigured } from "./env.js";
import { HttpError } from "../utils/http-error.js";

const sqlModuleName = ["ms", "sql"].join("");
const { default: sqlClient } = await import(sqlModuleName);

let poolPromise = null;

const connectionConfig = env.dbUseWindowsAuth
  ? {
      connectionString: `Server=${env.dbServer},${env.dbPort};Database=${env.dbName};Trusted_Connection=Yes;TrustServerCertificate=${env.dbTrustServerCertificate ? "Yes" : "No"};Encrypt=${env.dbEncrypt ? "Yes" : "No"};`,
      options: {
        trustedConnection: true,
        encrypt: env.dbEncrypt,
        trustServerCertificate: env.dbTrustServerCertificate,
        enableArithAbort: true,
      },
      pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000,
      },
    }
  : {
      server: env.dbServer,
      port: env.dbPort,
      database: env.dbName,
      user: env.dbUser || undefined,
      password: env.dbPassword || undefined,
      options: {
        encrypt: env.dbEncrypt,
        trustServerCertificate: env.dbTrustServerCertificate,
        enableArithAbort: true,
      },
      pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000,
      },
    };

export const getPool = async () => {
  if (!isDatabaseConfigured()) {
    throw new HttpError(
      503,
      "Database configuration is missing. Update car-api/.env with the SQL Server settings or enable DB_USE_WINDOWS_AUTH=true.",
    );
  }

  if (!poolPromise) {
    poolPromise = new sqlClient.ConnectionPool(connectionConfig)
      .connect()
      .catch((error) => {
        poolPromise = null;
        throw new HttpError(
          503,
          `Database connection failed: ${error.message}`,
        );
      });
  }

  return poolPromise;
};

export const executeQuery = async (queryBuilder) => {
  const pool = await getPool();
  const request = pool.request();
  return queryBuilder(request, sqlClient);
};

export const getDatabaseHealth = async () => {
  if (!isDatabaseConfigured()) {
    return {
      configured: false,
      connected: false,
      message: "Database environment variables are not configured.",
    };
  }

  try {
    const pool = await getPool();
    await pool.request().query("SELECT 1 AS healthy");

    return {
      configured: true,
      connected: true,
    };
  } catch (error) {
    return {
      configured: true,
      connected: false,
      message: error.message,
    };
  }
};
