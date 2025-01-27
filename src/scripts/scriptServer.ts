import type { ServiceAccount } from "firebase-admin";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

import * as dotenv from 'dotenv';
dotenv.config();

const activeApps = getApps();
const serviceAccount = {
  "type": process.env.SERVER_TYPE,
  "project_id": process.env.SERVER_PROJECT_ID,
  "private_key_id": process.env.SERVER_PRIVATE_KEY_ID,
  "private_key": process.env.SERVER_PRIVATE_KEY,
  "client_email": process.env.SERVER_CLIENT_EMAIL,
  "client_id": process.env.SERVER_CLIENT_ID,
  "auth_uri": process.env.SERVER_AUTH_URI,
  "token_uri": process.env.SERVER_TOKEN_URI,
  "auth_provider_x509_cert_url": process.env.SERVER_AUTH_PROVIDER_X509_CERT_URL,
  "client_x509_cert_url": process.env.SERVER_CLIENT_X509_CERT_URL,
  "universe_domain": process.env.SERVER_UNIVERSE_DOMAIN
}

// console.log(serviceAccount)
console.log("number of active apps:", activeApps.length)

const initApp = () => {
  console.info('Loading service account from env.')
  return initializeApp({
    credential: cert(serviceAccount as ServiceAccount)
  })
}

export const app = activeApps.length === 0 ? initApp() : activeApps[0];
export const auth = getAuth(app)
export const db = getFirestore(app)