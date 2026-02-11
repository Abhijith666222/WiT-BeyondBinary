"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RelayRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/messages?view=relay");
  }, [router]);
  return (
    <div className="flex items-center justify-center min-h-[200px] text-muted-foreground">
      Redirecting to Bridge…
    </div>
  );
}
