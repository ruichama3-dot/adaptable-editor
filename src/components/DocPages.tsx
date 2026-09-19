import { forwardRef, useImperativeHandle, useRef } from "react";
import { splitPages, joinPages } from "@/lib/doc-pages";

export type DocPagesHandle = {
  getHtml: () => string;
  focusedPage: () => HTMLDivElement | null;
};

type Props = {
  html: string;
  editable?: boolean;
  /** Re-mounts the sheets when it changes (e.g. after loading/regenerating). */
  version?: string | number;
};

export const DocPages = forwardRef<DocPagesHandle, Props>(function DocPages(
  { html, editable = false, version },
  ref,
) {
  const pages = splitPages(html);
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  const last = useRef<HTMLDivElement | null>(null);

  useImperativeHandle(ref, () => ({
    getHtml: () => joinPages(refs.current.filter(Boolean).map((el) => el!.innerHTML)),
    focusedPage: () => last.current ?? refs.current[0] ?? null,
  }));

  return (
    <div className="doc-pages mt-5">
      {pages.map((page, i) => (
        <div key={`${String(version ?? "v")}-${i}`} className="w-full max-w-[794px]">
          <div
            ref={(el) => {
              refs.current[i] = el;
            }}
            contentEditable={editable}
            suppressContentEditableWarning
            onFocus={(e) => {
              last.current = e.currentTarget;
            }}
            dangerouslySetInnerHTML={{ __html: page }}
            className="doc-sheet shadow-soft rounded-2xl border border-border outline-none"
          />
          <p className="page-number mt-1.5 pr-2 print:hidden">Página {i + 1} de {pages.length}</p>
        </div>
      ))}
    </div>
  );
});
