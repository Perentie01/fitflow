import { ReactNode } from "react";

interface ScrollSnapContainerProps {
  children: ReactNode;
  className?: string;
}

export const ScrollSnapContainer = ({ children, className = "" }: ScrollSnapContainerProps) => {
  return (
    <div
      className={`md:hidden overflow-y-auto snap-y snap-mandatory flex-1 ${className}`}
    >
      {children}
    </div>
  );
};
