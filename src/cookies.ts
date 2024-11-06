import { Request, Response } from "express";

const cookies = {
  set(
    res: Response,
    name: string,
    value: string,
    options: Record<string, any> = {},
  ): void {
    const defaultOptions = { httpOnly: true, secure: true, signed: true };
    res.cookie(name, value, { ...defaultOptions, ...options });
  },

  get(req: Request, name: string, signed: boolean = true): string | undefined {
    return signed ? req.signedCookies[name] : req.cookies[name];
  },

  delete(res: Response, name: string): void {
    res.clearCookie(name);
  },
};

export default cookies;
