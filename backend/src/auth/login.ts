import { tryDemoLogin, type DemoLoginOk } from "./demoLogin.js";
import { verifyStoredLogin } from "../accountsStore.js";

export type AuthOk = DemoLoginOk;

/** Ưu tiên tài khoản lưu trên server, sau đó tài khoản bootstrap qua biến môi trường (nếu có). */
export function tryAuthLogin(loginRaw: string, password: string): AuthOk | null {
  const stored = verifyStoredLogin(loginRaw, password);
  if (stored) return stored;
  return tryDemoLogin(loginRaw, password);
}
