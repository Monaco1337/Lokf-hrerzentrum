"use client";
/**
 * WorkspaceNav — lets any (client) piece of the Bewerberakte jump to a tab.
 *
 * The workspace shell owns the active-tab state and provides `goTo` through
 * this context, so nested client components (the progress stepper, guidance
 * banner, deep-links) can navigate without prop-drilling a callback across the
 * server/client boundary.
 */
import { createContext, useContext } from "react";

export interface WorkspaceNav {
  goTo: (tab: string) => void;
}

const WorkspaceNavContext = createContext<WorkspaceNav | null>(null);

export const WorkspaceNavProvider = WorkspaceNavContext.Provider;

/** Returns the workspace navigator, or a no-op when rendered outside a shell. */
export function useWorkspaceNav(): WorkspaceNav {
  return useContext(WorkspaceNavContext) ?? { goTo: () => {} };
}
