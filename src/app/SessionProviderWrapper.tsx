// src/app/SessionProviderWrapper.tsx

"use client";

import { SessionProvider } from "next-auth/react";
import React from "react";

// Step 1: Update the interface to accept an optional className
interface Props {
  children: React.ReactNode;
  className?: string;
}

const SessionProviderWrapper = ({ children, className }: Props) => {
  return (
    <SessionProvider>
      {/*
        Step 2: Wrap children in a <div> and apply the className.
        This creates the necessary DOM element to receive the `h-full`
        class and complete the height inheritance chain.
      */}
      <div className={className}>{children}</div>
    </SessionProvider>
  );
};

export default SessionProviderWrapper;
