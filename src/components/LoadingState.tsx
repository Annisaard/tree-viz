import { Loader2 } from "lucide-react";
export default function LoadingState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-slate-500" role="status">
      <Loader2 className="size-6 animate-spin motion-reduce:animate-none" /> Loading visualization...
    </div>
  );
}
