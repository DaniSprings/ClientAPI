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


const renderSuccess = (payload) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Signing you in…</title>
    <style>
      body { font-family: sans-serif; display: flex; align-items: center;
             justify-content: center; min-height: 100vh; margin: 0;
             background: #0f0f0f; color: #e8e8e8; }
      p { font-size: 14px; opacity: 0.7; }
    </style>
  </head>
  <body>
    <p>Authentication complete. Closing window…</p>
    <script>
      try {
        localStorage.setItem('authToken', ${JSON.stringify(payload.token)});
        localStorage.setItem('userId',    ${JSON.stringify(String(payload.userId))});
        localStorage.setItem('username',  ${JSON.stringify(payload.username || payload.email || '')});
        localStorage.setItem('userEmail', ${JSON.stringify(payload.email || '')});
      } catch (e) {
        console.error('localStorage write failed', e);
      }
      window.close();
    </script>
  </body>
</html>`;

const renderError = (message) => `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><title>Login failed</title>
    <style>
      body { font-family: sans-serif; display: flex; flex-direction: column;
             align-items: center; justify-content: center; min-height: 100vh;
             margin: 0; background: #0f0f0f; color: #e07070; }
    </style>
  </head>
  <body>
    <p>Login failed: ${message}</p>
    <p style="color:#888;font-size:12px">You can close this window.</p>
    <script>setTimeout(() => window.close(), 3000);</script>
  </body>
</html>`;

socialAuthRouter.get(
  '/google',
  asyncHandler(async (req, res) => {
    try {
      const payload = await authService.createDevSocialLogin('google');
      res.type('html').send(renderSuccess(payload));
    } catch (err) {
      res.type('html').send(renderError(err.message || 'Google login failed'));
    }
  })
);


socialAuthRouter.get(
  '/facebook',
  asyncHandler(async (req, res) => {
    try {
      const payload = await authService.createDevSocialLogin('facebook');
      res.type('html').send(renderSuccess(payload));
    } catch (err) {
      res.type('html').send(renderError(err.message || 'Facebook login failed'));
    }
  })
);

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

export default socialAuthRouter;