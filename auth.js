import dotenv from 'dotenv';
import { auth } from 'express-oauth2-jwt-bearer';

dotenv.config({ path: '.env' });

export const checkJwt = auth({
  audience: process.env.AUTH0_AUDIENCE,
  issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}/`
});