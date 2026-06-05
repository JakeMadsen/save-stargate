import type { Request } from "express";
import { config } from "../config.js";

export const getRequestBaseUrl = (req: Request) => {
  const forwardedProto = req.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const proto = forwardedProto || req.protocol;
  const forwardedHost = req.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || req.get("host");

  if (host) return `${proto}://${host}`;
  return config.appUrl;
};
