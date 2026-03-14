import Chat from '@/components/chat/Chat';
import Toolbar from '@/components/ui/Toolbar';

export default function Home() {
  return (
    <div className="relative min-h-screen">
      <div className="fixed top-4 right-4 z-[80] print:hidden showtime-hide">
        <Toolbar />
      </div>

      <main className="w-full h-screen">
        <Chat />
      </main>
    </div>
  );
}
