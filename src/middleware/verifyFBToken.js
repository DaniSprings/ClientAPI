import { env } from "../config/env.js";
import { HttpError } from "../utils/http-error.js";

/**
 * Verifies a Facebook access token server-side against Facebook's Graph API,
 * mirroring the trust model of verifyGoogleToken.js.
 *
 * Expects the frontend to send: { provider: 'facebook', accessToken }
 * (the raw user access token returned by the Facebook JS SDK's login response,
 * NOT a providerId/email pulled from the client).
 *
 * If provider !== 'facebook', this middleware is a no-op and calls next()
 * so the existing Google / raw-payload paths in social-login are untouched.
 */
export const verifyFacebookToken = async (req, res, next) => {
  const { provider, accessToken } = req.body || {};

  if (provider !== "facebook") {
    return next();
  }

  if (!accessToken) {
    return next(new HttpError(400, "accessToken is required for Facebook login"));
  }

  if (!env.facebookAppId || !env.facebookAppSecret) {
    return next(
      new HttpError(503, "Facebook login is not configured on the server."),
    );
  }

  try {
    // Step 1: validate the token belongs to OUR app and is currently valid.
    const appAccessToken = `${env.facebookAppId}|${env.facebookAppSecret}`;
    const debugUrl = `https://graph.facebook.com/debug_token?input_token=${encodeURIComponent(
      accessToken,
    )}&access_token=${encodeURIComponent(appAccessToken)}`;

    const debugRes = await fetch(debugUrl);
    const debugJson = await debugRes.json();
    const tokenData = debugJson?.data;

    if (
      !tokenData ||
      !tokenData.is_valid ||
      String(tokenData.app_id) !== String(env.facebookAppId)
    ) {
      throw new Error("Facebook token is invalid or was issued for a different app.");
    }

    // Step 2: fetch the verified profile using the (now-validated) token.
    const profileUrl = `https://graph.facebook.com/${tokenData.user_id}?fields=id,name,email&access_token=${encodeURIComponent(
      accessToken,
    )}`;

    const profileRes = await fetch(profileUrl);
    const profile = await profileRes.json();

    if (profile?.error) {
      throw new Error(profile.error.message || "Failed to fetch Facebook profile.");
    }

    if (!profile.email) {
      throw new Error(
        "Your Facebook account has no email address associated with it, or email permission was not granted.",
      );
    }

    // Attach verified data, mirroring req.googleUser's shape.
    req.facebookUser = {
      providerId: profile.id,
      email: profile.email,
      fullName: profile.name || "",
    };

    next();
  } catch (err) {
    next(new HttpError(401, `Facebook token verification failed: ${err.message}`));
  }
};