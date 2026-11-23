import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const backendDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export const projectRoot = path.dirname(backendDir);
for (const file of [path.join(projectRoot,'.env'),path.join(backendDir,'.env')]) {
  try { process.loadEnvFile(file); } catch (error) { if (error.code !== 'ENOENT') throw error; }
}

export const config = {
  port: Number(process.env.SMARTGST_API_PORT || process.env.PORT || 5000),
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017',
  mongoDatabase: process.env.MONGODB_DATABASE || 'smartgst',
  sessionSecret: process.env.SESSION_SECRET || '',
  sessionCookieName: 'smartgst.sid',
  sessionMaxAgeMs: 1000 * 60 * 60 * 12,
  uploadDir: path.join(backendDir,'uploads'),
  tesseractPath: process.env.TESSERACT_PATH || '',
  tesseractLanguage: process.env.TESSERACT_LANGUAGE || 'eng',
  pdftoppmPath: process.env.PDFTOPPM_PATH || 'pdftoppm',
  isProduction: process.env.NODE_ENV === 'production'
};
