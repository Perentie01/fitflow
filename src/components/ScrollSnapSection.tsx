import { ReactNode } from "react";

interface ScrollSnapSectionProps {
  children: ReactNode;
  className?: string;
}

export const ScrollSnapSection = ({ children, className = "" }: ScrollSnapSectionProps) => {
  return (
    <section
      className={`snap-start snap-always h-full flex flex-col overflow-y-auto px-4 py-6 ${className}`}
    >
      {children}
    </section>
  );
};
