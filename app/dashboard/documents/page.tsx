import { FileText, Download } from "lucide-react";
import { requireSession } from "@/lib/auth/guards";
import { listPublicDocuments } from "@/lib/documents";

export default async function DocumentsPage() {
  await requireSession();
  const documents = listPublicDocuments();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl text-text">Dokumente</h1>

      <div className="flex flex-col gap-3">
        {documents.length === 0 ? (
          <p className="text-sm text-text-muted">Aktuell sind keine Dokumente hinterlegt.</p>
        ) : (
          documents.map((doc) => (
            <div
              key={doc.filename}
              className="flex items-center justify-between gap-3 rounded-lg border border-border border-l-4 border-l-primary bg-surface p-4 shadow-lg shadow-black/30"
            >
              <div className="flex min-w-0 items-center gap-3">
                <FileText className="shrink-0 text-primary" size={22} aria-hidden="true" />
                <p className="truncate font-heading text-base italic font-bold uppercase tracking-wide text-text">
                  {doc.displayName}
                </p>
              </div>
              <a
                href={`/${doc.filename}`}
                download
                aria-label={`${doc.displayName} herunterladen`}
                className="flex shrink-0 items-center gap-1.5 rounded-md bg-gradient-to-r from-primary-hover to-primary px-3 py-1.5 font-heading text-sm italic font-bold uppercase tracking-wide text-bg shadow-[0_4px_16px_-4px_var(--color-primary)] transition hover:brightness-105 hover:shadow-[0_4px_24px_-2px_var(--color-primary)]"
              >
                <Download size={16} aria-hidden="true" />
                <span className="hidden sm:inline">Herunterladen</span>
              </a>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
