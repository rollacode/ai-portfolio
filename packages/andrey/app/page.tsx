import Chat from '@ai-portfolio/core/components/chat/Chat';
import Toolbar from '@ai-portfolio/core/components/ui/Toolbar';
import PoweredByDomios from '@/components/PoweredByDomios';
import DotField from '@/components/DotField';
import SocialProof from '@/components/SocialProof';

export default function Home() {
  return (
    <div className="relative min-h-screen">
      <div className="print:hidden showtime-hide">
        <DotField />
      </div>
      <div className="fixed top-4 right-4 z-[80] print:hidden showtime-hide">
        <Toolbar />
      </div>

      <main className="w-full h-screen">
        <Chat enhancedExperience credit={<PoweredByDomios />} />
      </main>
      <div className="print:hidden showtime-hide">
        <SocialProof />
      </div>
    </div>
  );
}
