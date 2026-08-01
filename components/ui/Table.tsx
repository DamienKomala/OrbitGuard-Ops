import { cn } from "@/lib/cn";

export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-13">{children}</table>
    </div>
  );
}

export function Th({
  children,
  align = "left",
  className,
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={cn(
        "sticky top-0 z-10 whitespace-nowrap border-b border-line bg-panel px-3 py-2 text-11 font-medium uppercase tracking-eyebrow text-fg-dim",
        align === "right" ? "text-right" : "text-left",
        className
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  align = "left",
  mono,
  className,
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  mono?: boolean;
  className?: string;
}) {
  return (
    <td
      className={cn(
        "whitespace-nowrap border-b border-line px-3 py-2",
        align === "right" ? "text-right" : "text-left",
        mono && "font-mono",
        className
      )}
    >
      {children}
    </td>
  );
}

export function Tr({
  children,
  onClick,
  selected,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  selected?: boolean;
}) {
  return (
    <tr
      onClick={onClick}
      className={cn(
        "transition-colors duration-150",
        onClick && "cursor-pointer hover:bg-panel-alt",
        selected && "bg-accent/10"
      )}
    >
      {children}
    </tr>
  );
}
