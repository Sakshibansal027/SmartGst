import { randomBytes } from 'node:crypto';
export const createSessionSecret=()=>randomBytes(48).toString('base64url');
