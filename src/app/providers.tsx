"use client";

import { type PropsWithChildren } from "react";
import { CedarCopilot, ProviderConfig } from "cedar-os";
import { TripProvider } from "@/components/providers/TripProvider";

const llmProvider: ProviderConfig = {
  provider: "mastra",
  baseURL: process.env.NEXT_PUBLIC_MASTRA_URL || "http://localhost:4111",
  chatPath: "/chat/execute-function",
};

export const Providers = ({ children }: PropsWithChildren) => {
  return (
    <CedarCopilot llmProvider={llmProvider}>
      <TripProvider>{children}</TripProvider>
    </CedarCopilot>
  );
};
