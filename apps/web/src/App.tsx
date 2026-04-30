import { MBTI_TYPES } from '@mbti/shared';
import { Button } from '@/components/ui/button';

function App() {
  return (
    <div className="min-h-screen bg-[#0D0F1A] flex items-center justify-center">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold text-white">MBTI Platform</h1>
        <p className="text-slate-400 text-lg">{MBTI_TYPES.length} personality types</p>
        <Button className="bg-[#6366F1] hover:bg-[#4F46E5] text-white px-8 py-3">
          Xem tôi thuộc kiểu người nào →
        </Button>
      </div>
    </div>
  );
}

export default App;
