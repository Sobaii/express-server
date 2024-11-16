import { Request, Response } from "express";
import path from "path";

const cookies = {
  set(
    res: Response,
    name: string,
    value: string,
    options: Record<string, any> = {}
  ): void {
    const defaultOptions = {
      httpOnly: true,
      secure: true,
      signed: true,
      sameSite: "none" as const,
      path: "/",
    };
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
