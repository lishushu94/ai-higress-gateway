import { TopNav } from "@/components/layout/top-nav";

export default function ChatLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen flex-col bg-background">
      <TopNav />
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
