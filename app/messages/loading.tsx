import Navbar from "@/components/Navbar";

// Squelette de la messagerie. app/messages n'a pas de layout : la page rend
// elle-même la Navbar, le squelette l'affiche donc aussi pour éviter un saut
// de mise en page. Mêmes hauteurs que MessagesClient (navbar 80px, barre du
// bas mobile 64px).
function ConversationRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-4 border-b border-[#ebebeb]">
      <div className="w-10 h-10 rounded-full bg-charcoal-100 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="h-4 w-2/5 rounded bg-charcoal-100" />
          <div className="h-3 w-10 rounded bg-charcoal-100" />
        </div>
        <div className="h-3 w-3/5 rounded bg-charcoal-100 mt-2" />
        <div className="h-3 w-4/5 rounded bg-charcoal-100 mt-2" />
      </div>
    </div>
  );
}

export default function MessagesLoading() {
  return (
    <>
      <Navbar />
      <div className="flex h-[calc(100dvh-144px)] md:h-[calc(100dvh-80px)] animate-pulse" aria-busy="true" aria-live="polite">
        <div className="flex flex-col bg-white border-r border-[#ebebeb] w-full md:w-80">
          <div className="p-4 border-b border-[#ebebeb]">
            <div className="h-6 w-32 rounded bg-charcoal-100" />
          </div>
          <div className="flex-1 overflow-hidden">
            {[0, 1, 2, 3, 4, 5].map((i) => <ConversationRowSkeleton key={i} />)}
          </div>
        </div>

        <div className="hidden md:flex flex-1 flex-col min-w-0">
          <div className="flex items-center gap-3 px-6 py-4 bg-white border-b border-[#ebebeb]">
            <div className="w-10 h-10 rounded-full bg-charcoal-100" />
            <div className="h-4 w-48 rounded bg-charcoal-100" />
          </div>
          <div className="flex-1 px-6 py-6 space-y-4">
            <div className="h-16 w-2/3 max-w-md rounded-2xl bg-charcoal-100" />
            <div className="h-12 w-1/2 max-w-sm rounded-2xl bg-charcoal-100 ml-auto" />
            <div className="h-20 w-3/5 max-w-md rounded-2xl bg-charcoal-100" />
            <div className="h-10 w-2/5 max-w-xs rounded-2xl bg-charcoal-100 ml-auto" />
          </div>
          <div className="px-6 py-4 bg-white border-t border-[#ebebeb]">
            <div className="h-12 w-full rounded-full bg-charcoal-100" />
          </div>
        </div>
      </div>
    </>
  );
}
