// src/components/returns/ReturnComments.tsx
// Conversation / comments section for a return

"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { MessageSquare, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReturnComment } from "@/types/returns";

/* =============================================================================
   Props
============================================================================= */

interface ReturnCommentsProps {
  returnCode: string;
  className?: string;
}

/* =============================================================================
   API helpers
============================================================================= */

async function fetchComments(returnCode: string): Promise<ReturnComment[]> {
  const res = await fetch(`/api/returns/${encodeURIComponent(returnCode)}/comments`, {
    credentials: "include",
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Erreur de chargement");
  return json.data ?? [];
}

async function postComment(returnCode: string, content: string): Promise<ReturnComment> {
  const res = await fetch(`/api/returns/${encodeURIComponent(returnCode)}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ content }),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Erreur d'envoi");
  return json.data;
}

/* =============================================================================
   Helpers
============================================================================= */

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "À l'instant";
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `Il y a ${diffHrs}h`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `Il y a ${diffDays}j`;

  return date.toLocaleDateString("fr-CA", {
    day: "numeric",
    month: "short",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/* =============================================================================
   Avatar sub-component
============================================================================= */

function UserAvatar({ name, image }: { name: string; image: string | null }) {
  const [imgError, setImgError] = React.useState(false);

  if (image && !imgError) {
    return (
      <img
        src={image}
        alt={name}
        className="h-7 w-7 rounded-full object-cover"
        referrerPolicy="no-referrer"
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div className="h-7 w-7 rounded-full bg-accent/20 text-accent flex items-center justify-center text-[10px] font-bold">
      {getInitials(name)}
    </div>
  );
}

/* =============================================================================
   Main Component
============================================================================= */

export function ReturnComments({ returnCode, className }: ReturnCommentsProps) {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;

  const [comments, setComments] = React.useState<ReturnComment[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [draft, setDraft] = React.useState("");
  const [isSending, setIsSending] = React.useState(false);

  const listRef = React.useRef<HTMLDivElement>(null);

  // Load comments on mount
  React.useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetchComments(returnCode)
      .then((data) => {
        if (!cancelled) setComments(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [returnCode]);

  // Scroll to bottom when new comments arrive
  React.useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [comments]);

  // Submit handler
  const handleSubmit = async () => {
    const content = draft.trim();
    if (!content || isSending) return;

    setIsSending(true);
    try {
      const newComment = await postComment(returnCode, content);
      setComments((prev) => [...prev, newComment]);
      setDraft("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-[hsl(var(--text-tertiary))]" />
        <h4 className="font-semibold text-[hsl(var(--text-primary))]">
          Conversation
        </h4>
        {comments.length > 0 && (
          <span className="text-xs text-[hsl(var(--text-muted))]">
            ({comments.length})
          </span>
        )}
      </div>

      {/* Comments list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-[hsl(var(--text-muted))]" />
        </div>
      ) : error ? (
        <div className="text-sm text-[hsl(var(--danger))] py-4 text-center">
          {error}
        </div>
      ) : comments.length === 0 ? (
        <div className="text-sm text-[hsl(var(--text-muted))] text-center py-4 border border-dashed border-[hsl(var(--border-default))] rounded-xl">
          Aucun commentaire pour le moment
        </div>
      ) : (
        <div
          ref={listRef}
          className="space-y-3 max-h-[400px] overflow-y-auto pr-1"
        >
          {comments.map((c) => {
            const isOwn = c.userId === currentUserId;
            return (
              <div
                key={c.id}
                className={cn(
                  "flex gap-2.5 rounded-xl px-3 py-2.5",
                  isOwn
                    ? "bg-[hsl(var(--info-muted))]/40"
                    : "bg-[hsl(var(--bg-muted))]"
                )}
              >
                <div className="shrink-0 pt-0.5">
                  <UserAvatar name={c.userName} image={c.userImage} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium text-[hsl(var(--text-primary))]">
                      {c.userName}
                    </span>
                    <span
                      className="text-[11px] text-[hsl(var(--text-muted))]"
                      title={new Date(c.createdAt).toLocaleString("fr-CA")}
                    >
                      {formatRelativeTime(c.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-[hsl(var(--text-secondary))] whitespace-pre-wrap break-words mt-0.5">
                    {c.content}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Input area */}
      <div className="flex gap-2 items-end">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ajouter un commentaire..."
          rows={1}
          className={cn(
            "flex-1 resize-none rounded-xl border px-3 py-2 text-sm",
            "border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))]",
            "text-[hsl(var(--text-primary))] placeholder:text-[hsl(var(--text-muted))]",
            "focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent",
            "min-h-[38px] max-h-[120px]"
          )}
          onInput={(e) => {
            const el = e.currentTarget;
            el.style.height = "auto";
            el.style.height = Math.min(el.scrollHeight, 120) + "px";
          }}
          disabled={isSending}
        />
        <button
          onClick={handleSubmit}
          disabled={!draft.trim() || isSending}
          className={cn(
            "shrink-0 rounded-xl p-2.5 transition-colors",
            draft.trim() && !isSending
              ? "bg-accent text-white hover:brightness-110"
              : "bg-[hsl(var(--bg-muted))] text-[hsl(var(--text-muted))] cursor-not-allowed"
          )}
          title="Envoyer (Ctrl+Entrée)"
        >
          {isSending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
}

export default ReturnComments;
