// src/components/returns/AttachmentsSection.tsx
// Attachments section with Google Drive iframe previews
// Matches the PHP app's "Fichiers joints" display with inline previews

"use client";

import * as React from "react";
import {
  Folder,
  Trash2,
  UploadCloud,
  Loader2,
  ExternalLink,
  Download,
  File as FileIcon,
  X,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* =============================================================================
   Types
============================================================================= */

export interface AttachmentData {
  id: string;          // Google Drive file ID
  dbId?: number;       // Database ID (optional)
  name: string;        // File name
  mimeType?: string;   // MIME type
  fileSize?: number;   // File size in bytes
  url?: string;        // View URL
  previewUrl?: string; // Iframe embed URL
  downloadUrl?: string;// Direct download URL
  createdAt?: string;  // Upload timestamp
}

interface AttachmentsSectionProps {
  returnCode: string;
  attachments: AttachmentData[];
  onAttachmentsChange: (attachments: AttachmentData[]) => void;
  readOnly?: boolean;
  className?: string;
}

/* =============================================================================
   API Functions
============================================================================= */

async function uploadFiles(returnCode: string, files: File[]): Promise<AttachmentData[]> {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));

  const res = await fetch(`/api/returns/${encodeURIComponent(returnCode)}/attachments`, {
    method: "POST",
    body: formData,
  });

  const json = await res.json();
  if (!json.ok) {
    throw new Error(json.error || "Erreur lors de l'upload");
  }

  return json.attachments || [];
}

async function deleteAttachment(returnCode: string, fileId: string): Promise<void> {
  const res = await fetch(
    `/api/returns/${encodeURIComponent(returnCode)}/attachments?fileId=${encodeURIComponent(fileId)}`,
    { method: "DELETE" }
  );

  const json = await res.json();
  if (!json.ok) {
    throw new Error(json.error || "Erreur lors de la suppression");
  }
}

async function fetchAttachments(returnCode: string): Promise<AttachmentData[]> {
  const res = await fetch(`/api/returns/${encodeURIComponent(returnCode)}/attachments`);
  const json = await res.json();
  if (!json.ok) {
    throw new Error(json.error || "Erreur lors du chargement");
  }
  return json.attachments || [];
}

/* =============================================================================
   Helper Functions
============================================================================= */

function formatFileSize(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getPreviewUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/preview?rm=minimal&ui=integrated&dscale=1&embedded=true`;
}

/* =============================================================================
   Attachment Card Component
============================================================================= */

function AttachmentCard({
  attachment,
  onDelete,
  readOnly,
}: {
  attachment: AttachmentData;
  onDelete: () => void;
  readOnly?: boolean;
}) {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [iframeError, setIframeError] = React.useState(false);

  const previewUrl = attachment.previewUrl || getPreviewUrl(attachment.id);

  const handleDelete = async () => {
    if (!confirm("Êtes-vous certain de vouloir supprimer cette pièce-jointe ?")) return;
    setIsDeleting(true);
    try {
      await onDelete();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      className={cn(
        "rounded-xl border border-[hsl(var(--border-subtle))] overflow-hidden bg-[hsl(var(--bg-surface))]",
        isExpanded && "col-span-full"
      )}
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-[hsl(var(--border-subtle))] bg-[hsl(var(--bg-muted))] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <FileIcon className="h-4 w-4 text-[hsl(var(--text-tertiary))] shrink-0" />
          <span
            className="text-sm font-medium text-[hsl(var(--text-primary))] truncate"
            title={attachment.name}
          >
            {attachment.name}
          </span>
          {attachment.fileSize && (
            <span className="text-xs text-[hsl(var(--text-muted))] shrink-0">
              ({formatFileSize(attachment.fileSize)})
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Expand/Collapse */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-md text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-primary))] hover:bg-[hsl(var(--bg-elevated))] transition-colors"
            title={isExpanded ? "Réduire" : "Agrandir"}
          >
            {isExpanded ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </button>

          {/* Open in new tab */}
          <a
            href={attachment.url || `https://drive.google.com/file/d/${attachment.id}/view`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-md text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-primary))] hover:bg-[hsl(var(--bg-elevated))] transition-colors"
            title="Ouvrir dans un nouvel onglet"
          >
            <ExternalLink className="h-4 w-4" />
          </a>

          {/* Download */}
          <a
            href={attachment.downloadUrl || `https://drive.google.com/uc?export=download&id=${attachment.id}`}
            className="p-1.5 rounded-md text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text-primary))] hover:bg-[hsl(var(--bg-elevated))] transition-colors"
            title="Télécharger"
          >
            <Download className="h-4 w-4" />
          </a>

          {/* Delete */}
          {!readOnly && (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className={cn(
                "p-1.5 rounded-md transition-colors",
                "text-[hsl(var(--text-muted))] hover:text-[hsl(var(--danger))] hover:bg-[hsl(var(--danger-muted))]",
                isDeleting && "opacity-50 pointer-events-none"
              )}
              title="Supprimer"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Iframe Preview - Just like the PHP app */}
      <div
        className={cn(
          "relative bg-[hsl(var(--bg-muted))]",
          isExpanded ? "h-[600px]" : "h-[400px]"
        )}
      >
        {iframeError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-[hsl(var(--text-tertiary))]">
            <FileIcon className="h-12 w-12 mb-2 opacity-50" />
            <p className="text-sm">Aperçu non disponible</p>
            <a
              href={attachment.url || `https://drive.google.com/file/d/${attachment.id}/view`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 text-xs text-accent hover:underline"
            >
              Ouvrir dans Google Drive
            </a>
          </div>
        ) : (
          <iframe
            src={previewUrl}
            className="w-full h-full border-0"
            allowFullScreen
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            loading="lazy"
            onError={() => setIframeError(true)}
          />
        )}
      </div>
    </div>
  );
}

/* =============================================================================
   File Upload Zone
============================================================================= */

function UploadZone({
  returnCode,
  onUploadComplete,
  disabled,
}: {
  returnCode: string;
  onUploadComplete: (newAttachments: AttachmentData[]) => void;
  disabled?: boolean;
}) {
  const [isDragging, setIsDragging] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState<string>("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    // Filter valid files
    const validFiles = fileArray.filter((file) => {
      const validTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
      const maxSize = 25 * 1024 * 1024; // 25MB
      return validTypes.includes(file.type) && file.size <= maxSize;
    });

    if (validFiles.length === 0) {
      alert("Aucun fichier valide. Types acceptés: PDF, JPG, PNG (max 25MB)");
      return;
    }

    setIsUploading(true);
    setUploadProgress(`Upload de ${validFiles.length} fichier(s)...`);

    try {
      const uploaded = await uploadFiles(returnCode, validFiles);
      onUploadComplete(uploaded);
      setUploadProgress("");
    } catch (err) {
      alert("Erreur: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!disabled && !isUploading) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && !isUploading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={cn(
        "relative border-2 border-dashed rounded-xl p-6 text-center transition-colors",
        isDragging
          ? "border-accent bg-accent/5"
          : "border-[hsl(var(--border-default))] bg-[hsl(var(--bg-muted))]",
        (disabled || isUploading) && "opacity-50 pointer-events-none"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
        disabled={disabled || isUploading}
      />

      <div className="flex flex-col items-center gap-2">
        {isUploading ? (
          <>
            <Loader2 className="h-8 w-8 text-accent animate-spin" />
            <p className="text-sm text-[hsl(var(--text-secondary))]">{uploadProgress}</p>
          </>
        ) : (
          <>
            <UploadCloud className="h-8 w-8 text-[hsl(var(--text-tertiary))]" />
            <p className="text-sm text-[hsl(var(--text-secondary))]">
              <span className="font-medium text-accent">Cliquez pour sélectionner</span> ou
              glissez-déposez des fichiers
            </p>
            <p className="text-xs text-[hsl(var(--text-muted))]">
              PDF, JPG, PNG (max 25MB par fichier)
            </p>
          </>
        )}
      </div>
    </div>
  );
}

/* =============================================================================
   Main Component
============================================================================= */

export function AttachmentsSection({
  returnCode,
  attachments,
  onAttachmentsChange,
  readOnly = false,
  className,
}: AttachmentsSectionProps) {
  const [isLoading, setIsLoading] = React.useState(false);

  // Reload attachments from API
  const reloadAttachments = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchAttachments(returnCode);
      onAttachmentsChange(data);
    } catch (err) {
      console.error("Failed to reload attachments:", err);
    } finally {
      setIsLoading(false);
    }
  }, [returnCode, onAttachmentsChange]);

  // Handle upload complete
  const handleUploadComplete = (newAttachments: AttachmentData[]) => {
    onAttachmentsChange([...newAttachments, ...attachments]);
  };

  // Handle delete
  const handleDelete = async (fileId: string) => {
    try {
      await deleteAttachment(returnCode, fileId);
      onAttachmentsChange(attachments.filter((a) => a.id !== fileId));
    } catch (err) {
      alert("Erreur: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Folder className="h-5 w-5 text-[hsl(var(--text-tertiary))]" />
          <h4 className="font-semibold text-[hsl(var(--text-primary))]">
            Fichiers joints
          </h4>
          <span className="text-xs text-[hsl(var(--text-muted))]">
            ({attachments.length})
          </span>
        </div>

        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-[hsl(var(--text-muted))]" />}
      </div>

      {/* Upload Zone */}
      {!readOnly && (
        <UploadZone
          returnCode={returnCode}
          onUploadComplete={handleUploadComplete}
          disabled={isLoading}
        />
      )}

      {/* Skip attachments link (like PHP app) */}
      {attachments.length > 0 && (
        <a
          href="#products-section"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-accent text-white hover:brightness-110 transition-colors"
        >
          Ignorer les pièces jointes
        </a>
      )}

      {/* Attachments Grid */}
      {attachments.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {attachments.map((attachment) => (
            <AttachmentCard
              key={attachment.id}
              attachment={attachment}
              onDelete={() => handleDelete(attachment.id)}
              readOnly={readOnly}
            />
          ))}
        </div>
      ) : (
        <div className="text-sm text-[hsl(var(--text-muted))] text-center py-4 border border-dashed border-[hsl(var(--border-default))] rounded-xl">
          Aucun fichier joint au retour {returnCode}
        </div>
      )}
    </div>
  );
}

export default AttachmentsSection;
