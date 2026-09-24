import { useState } from "react";
import { Download, FileText, FileType2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { downloadPdf, downloadWord } from "@/lib/download-work";

type Props = {
  title: string;
  getHtml: () => string;
  onDownloaded?: () => void;
};

export function DownloadWorkButton({ title, getHtml, onDownloaded }: Props) {
  const [busy, setBusy] = useState(false);

  async function download(format: "pdf" | "word") {
    if (busy) return;
    setBusy(true);
    try {
      const html = getHtml();
      if (format === "pdf") await downloadPdf(title, html);
      else downloadWord(title, html);
      onDownloaded?.();
    } catch {
      toast.error("Não foi possível descarregar o trabalho. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button disabled={busy} className="w-full sm:w-auto">
          {busy ? <Loader2 className="animate-spin" /> : <Download />}
          {busy ? "A preparar ficheiro…" : "Baixar trabalho"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onSelect={() => void download("pdf")}>
          <FileText /> PDF
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void download("word")}>
          <FileType2 /> Word (.doc)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}