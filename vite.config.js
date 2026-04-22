import fs from "node:fs";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const enableHttps = String(env.VITE_HTTPS || "false").toLowerCase() === "true";
  const certFile = String(env.VITE_SSL_CERT_FILE || "").trim();
  const keyFile = String(env.VITE_SSL_KEY_FILE || "").trim();

  let httpsConfig = false;
  if (enableHttps) {
    if (!certFile || !keyFile) {
      throw new Error(
        "VITE_HTTPS=true requer VITE_SSL_CERT_FILE e VITE_SSL_KEY_FILE."
      );
    }
    httpsConfig = {
      cert: fs.readFileSync(certFile),
      key: fs.readFileSync(keyFile),
    };
  }

  return {
    server: {
      https: httpsConfig,
    },
  };
});
