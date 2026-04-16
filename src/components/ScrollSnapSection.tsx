import { ReactNode } from "react";

interface ScrollSnapSectionProps {
  children: ReactNode;
  className?: string;
  compact?: boolean;
}

export const ScrollSnapSection = ({ children, className = "", compact = false }: ScrollSnapSectionProps) => {
  return (
    <section
      className={`snap-start snap-always h-full flex flex-col overflow-y-auto px-4 ${
        compact ? 'py-2' : 'py-6'
      } ${className}`}
    >
      {children}
    </section>
  );
};
