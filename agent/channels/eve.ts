import { eveChannel } from "eve/channels/eve";
import { localDev, vercelOidc } from "eve/channels/auth";

/**
 * HTTP entry point for the browser UI (useEveAgent). Vercel OIDC callers
 * are accepted in deployed environments; localhost is open in local dev;
 * everything else gets a 401.
 */
export default eveChannel({ auth: [vercelOidc(), localDev()] });
