

import { Router } from 'express';
import { verifyGoogleToken } from '../middleware/verifyGoogleToken.js';
import { authService } from '../services/auth.service.js';
import { asyncHandler } from '../utils/async-handler.js';
import { HttpError } from '../utils/http-error.js';

export const socialAuthRouter = Router();

/**
 * POST /api/auth/social-login
 *
 * Accepts either:
 *   A) A Google ID token from @react-oauth/google (credential field)
 *   B) A raw provider/providerId/email/fullName payload (existing flow)
 */
socialAuthRouter.post(
  '/social-login',
  verifyGoogleToken,
  asyncHandler(async (req, res) => {
    let provider, providerId, email, fullName;

    if (req.googleUser) {
      // Path A: verified Google token — use values extracted by middleware
      provider   = 'google';
      providerId = req.googleUser.providerId;
      email      = req.googleUser.email;
      fullName   = req.googleUser.fullName;
    } else {
      // Path B: existing social login payload (non-Google providers)
      ({ provider, providerId, email, fullName } = req.body);

      if (!provider || !providerId || !email) {
        throw new HttpError(400, 'provider, providerId, and email are required');
      }
    }

    // authService.socialLogin() handles:
    //  - checking if the user exists
    //  - creating a new user if not
    //  - returning a JWT token + user payload
    const result = await authService.socialLogin({ 
      provider, 
      providerId, 
      email, 
      fullName 
    });

    return res.status(200).json(result);
  })
);

// Convenience helper if you prefer registering onto an existing router
export const registerSocialAuthRoutes = (router) => {
  router.post(
    '/social-login',
    verifyGoogleToken,
    asyncHandler(async (req, res) => {
      let provider, providerId, email, fullName;

      if (req.googleUser) {
        provider   = 'google';
        providerId = req.googleUser.providerId;
        email      = req.googleUser.email;
        fullName   = req.googleUser.fullName;
      } else {
        ({ provider, providerId, email, fullName } = req.body);

        if (!provider || !providerId || !email) {
          throw new HttpError(400, 'provider, providerId, and email are required');
        }
      }

      const result = await authService.socialLogin({ 
        provider, 
        providerId, 
        email, 
        fullName 
      });

      return res.status(200).json(result);
    })
  );
};
