/**
 * OAuth provider definitions — Google, GitHub, Microsoft
 */

const PROVIDERS = {
  google: {
    label: "Google",
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    clientIdEnv: "GOOGLE_CLIENT_ID",
    clientSecretEnv: "GOOGLE_CLIENT_SECRET",
    redirectUriEnv: "GOOGLE_REDIRECT_URI",
    callbackPath: "/auth/google/callback",
    scope: "openid email profile",
    authExtra: { access_type: "online", prompt: "select_account" },
    tokenAcceptJson: false,
  },
  github: {
    label: "GitHub",
    authUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
    clientIdEnv: "GITHUB_CLIENT_ID",
    clientSecretEnv: "GITHUB_CLIENT_SECRET",
    redirectUriEnv: "GITHUB_REDIRECT_URI",
    callbackPath: "/auth/github/callback",
    scope: "user:email",
    authExtra: {},
    tokenAcceptJson: true,
  },
  microsoft: {
    label: "Microsoft",
    authUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    clientIdEnv: "MICROSOFT_CLIENT_ID",
    clientSecretEnv: "MICROSOFT_CLIENT_SECRET",
    redirectUriEnv: "MICROSOFT_REDIRECT_URI",
    callbackPath: "/auth/microsoft/callback",
    scope: "openid profile email User.Read",
    authExtra: { response_mode: "query" },
    tokenAcceptJson: false,
  },
};

function isProviderConfigured(providerKey) {
  const p = PROVIDERS[providerKey];
  if (!p) return false;
  return Boolean(process.env[p.clientIdEnv]?.trim() && process.env[p.clientSecretEnv]?.trim());
}

function getConfiguredProviders() {
  return Object.keys(PROVIDERS).filter(isProviderConfigured);
}

module.exports = { PROVIDERS, isProviderConfigured, getConfiguredProviders };
