import { ReactNode } from "react";

interface ScrollSnapContainerProps {
  children: ReactNode;
  className?: string;
}

export const ScrollSnapContainer = ({ children, className = "" }: ScrollSnapContainerProps) => {
  return (
    <div
      className={`md:hidden overflow-y-auto snap-y snap-mandatory ${className}`}
      style={{
        height: "calc(100vh - 3.5rem - 4rem)", // viewport minus header and bottom nav
      }}
    >
      {children}
    </div>
  );
};
