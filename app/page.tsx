import Chat from '@/components/Chat';
import ThemeToggle from '@/components/ThemeToggle';

export default function Home() {
  return (
    <div className="relative min-h-screen">
      {/* Theme toggle — floating top right */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      {/* Main content */}
      <main className="w-full h-screen">
        <Chat />
      </main>
    </div>
  );
}
