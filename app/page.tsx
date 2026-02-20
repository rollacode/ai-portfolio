import Chat from '@/components/Chat';
import Toolbar from '@/components/Toolbar';

export default function Home() {
  return (
    <div className="relative min-h-screen">
      <div className="fixed top-4 right-4 z-[80] print:hidden">
        <Toolbar />
      </div>

      <main className="w-full h-screen">
        <Chat />
      </main>
    </div>
  );
}
