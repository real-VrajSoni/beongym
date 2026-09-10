"use client";

import { useEffect } from "react";

/**
 * Makes Back mean Back after a sign-out.
 *
 * Two different mechanisms can put a signed-in page back on screen without
 * asking the server, and guarding only one of them — which is what this
 * component used to do — leaves the hole open.
 *
 *   1. The browser's back/forward cache keeps a live copy of the rendered page
 *      and restores it wholesale. `pageshow` fires with `persisted: true`.
 *
 *   2. Next is a single-page app. Pressing Back is a `popstate` the client
 *      router answers from its own in-memory cache; no request is made, no
 *      `pageshow` fires, and the previous page simply reappears. This is the
 *      one that was still letting a signed-out visitor see a dashboard.
 *
 * Both matter on a shared front-desk machine, which is exactly where this
 * product runs: somebody signs out, the next person presses Back, and the
 * previous gym's members and revenue are on screen.
 *
 * So the page asks the server on every restore. If the session has gone it
 * leaves for the homepage with `replace`, which also means pressing Back again
 * does not walk straight back into the workspace.
 */
export function SessionGuard() {
  useEffect(() => {
    let checking = false;

    async function verify() {
      if (checking) return;
      checking = true;
      try {
        const res = await fetch("/api/session", { cache: "no-store" });
        const { signedIn } = (await res.json()) as { signedIn?: boolean };
        if (!signedIn) {
          // `replace`, not `assign`: the restored page must not stay in the
          // history stack for the next Back to find again.
          window.location.replace("/");
        }
      } catch {
        // Offline, or the check failed. Reloading is the safe answer — the
        // server decides, and a live session simply comes straight back.
        window.location.reload();
      } finally {
        checking = false;
      }
    }

    // A true bfcache restore. Reloading is cheaper and more certain than a
    // fetch here, because the whole document came back untouched.
    const onShow = (event: PageTransitionEvent) => {
      if (event.persisted) window.location.reload();
    };

    // The soft-navigation case, which is the common one in this app.
    const onPop = () => void verify();

    window.addEventListener("pageshow", onShow);
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("pageshow", onShow);
      window.removeEventListener("popstate", onPop);
    };
  }, []);

  return null;
}
