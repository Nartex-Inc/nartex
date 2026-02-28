// src/app/SessionProviderWrapper.tsx

"use client";

import { SessionProvider } from "next-auth/react";
import React from "react";

interface Props {
  children: React.ReactNode;
  className?: string;
}

const SessionProviderWrapper = ({ children, className }: Props) => {
  return (
    <SessionProvider refetchOnWindowFocus={false}>
      <div className={className}>{children}</div>
    </SessionProvider>
  );
};

export default SessionProviderWrapper;
