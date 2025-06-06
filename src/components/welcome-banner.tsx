"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

export function WelcomeBanner() {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="bg-primary/10 dark:bg-primary/20 p-6 rounded-lg shadow-md relative mb-6">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-7 w-7"
        onClick={() => setIsVisible(false)}
      >
        <X className="h-4 w-4" />
        <span className="sr-only">Dismiss</span>
      </Button>
      <h2 className="text-2xl font-semibold text-primary mb-2">Welcome to Your Dashboard!</h2>
      <p className="text-muted-foreground">
        This is a simplified view of your application. You can find your product requests below.
      </p>
      {/* You can add more relevant info or quick links here */}
    </div>
  );
}