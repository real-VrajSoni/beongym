"use client";

import { useEffect, useRef } from "react";
import { recordProfileViewAction } from "@/app/actions/stats";

export function ProfileView({ code }: { code: string }) {
  const recorded = useRef<string | null>(null);
  useEffect(() => {
    if (recorded.current === code) return;
    recorded.current = code;
    void recordProfileViewAction(code).catch(() => undefined);
  }, [code]);
  return null;
}
