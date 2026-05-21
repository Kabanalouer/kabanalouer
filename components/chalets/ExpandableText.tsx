"use client";

import { useState, useRef, useEffect } from "react";

const LINE_HEIGHT = 24; // px — matches leading-relaxed at text-base
const VISIBLE_LINES = 6;
const THRESHOLD = LINE_HEIGHT * (VISIBLE_LINES + 1); // don't truncate if barely over

export default function ExpandableText({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [needsTruncation, setNeedsTruncation] = useState(false);

  useEffect(() => {
    if (ref.current) {
      setNeedsTruncation(ref.current.scrollHeight > THRESHOLD);
    }
  }, [text]);

  return (
    <div>
      <div className="relative">
        <p
          ref={ref}
          className="text-charcoal-600 leading-relaxed whitespace-pre-line overflow-hidden transition-[max-height] duration-300 ease-in-out"
          style={{ maxHeight: expanded || !needsTruncation ? "none" : `${LINE_HEIGHT * VISIBLE_LINES}px` }}
        >
          {text}
        </p>
        {needsTruncation && !expanded && (
          <div className="absolute bottom-0 inset-x-0 h-12 bg-gradient-to-t from-white to-transparent pointer-events-none" />
        )}
      </div>
      {needsTruncation && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 text-sm font-medium text-primary hover:text-primary-dark transition-colors"
        >
          {expanded ? "Voir moins ↑" : "Voir la suite ↓"}
        </button>
      )}
    </div>
  );
}
