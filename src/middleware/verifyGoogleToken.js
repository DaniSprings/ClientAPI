/**
 * src/middleware/verifyGoogleToken.js — CORRECTED VERSION
 *
 * Verifies the Google ID token sent from the React frontend.
 * Uses google-auth-library to validate the token signature and audience.
 *
 * CORRECTED to:
 * - Properly handle async errors in middleware using next(err)
 * - Match your error response format
 * - Use HttpError for consistency
 */
'use strict';

import { OAuth2Client } from 'google-auth-library';
import { HttpError } from '../utils/http-error.js';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const verifyGoogleToken = async (req, res, next) => {
  const { credential, provider } = req.body;

  // Only intercept Google — other providers pass through untouched
  if (provider !== 'google') {
    return next();
  }

  if (!credential) {
    return next(new HttpError(400, 'Missing Google credential token'));
  }

  if (!process.env.GOOGLE_CLIENT_ID) {
    console.error('[verifyGoogleToken] GOOGLE_CLIENT_ID env var is not set');
    return next(
      new HttpError(500, 'Google OAuth is not configured on this server')
    );
  }

  try {
    // Verify token signature, expiry, and that it was issued for YOUR app
    const ticket = await client.verifyIdToken({
      idToken:  credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload?.email_verified) {
      return next(
        new HttpError(401, 'Google account email is not verified')
      );
    }

    // Attach verified user info — used by the route handler
    req.googleUser = {
      providerId: payload.sub,           // Google's unique user ID
      email:      payload.email,
      fullName:   payload.name || payload.email,
      picture:    payload.picture || null,
    };

    next();
  } catch (err) {
    console.error('[verifyGoogleToken] Token verification failed:', err.message);
    return next(
      new HttpError(401, 'Invalid or expired Google token')
    );
  }
};
