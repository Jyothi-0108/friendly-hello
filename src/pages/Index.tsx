import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Music, LogOut } from 'lucide-react';

const Index = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-primary">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between p-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center shadow-lg shadow-primary/30">
            <Music className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-gradient">Feel the Beat</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <span className="text-muted-foreground text-sm">
            {user.email}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSignOut}
            className="gap-2"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
        <div className="max-w-2xl space-y-6">
          <h2 className="text-4xl md:text-5xl font-bold">
            Welcome to{' '}
            <span className="text-gradient">Feel the Beat</span>
          </h2>
          <p className="text-xl text-muted-foreground">
            Your emotion-powered music companion. We'll detect your mood through webcam, voice, or text and recommend the perfect songs to uplift your spirits.
          </p>
          
          <div className="flex flex-wrap justify-center gap-4 pt-6">
            <div className="px-6 py-4 rounded-xl bg-card/50 border border-border/50 backdrop-blur">
              <div className="text-3xl mb-2">📷</div>
              <p className="text-sm text-muted-foreground">Webcam Detection</p>
            </div>
            <div className="px-6 py-4 rounded-xl bg-card/50 border border-border/50 backdrop-blur">
              <div className="text-3xl mb-2">🎤</div>
              <p className="text-sm text-muted-foreground">Voice Analysis</p>
            </div>
            <div className="px-6 py-4 rounded-xl bg-card/50 border border-border/50 backdrop-blur">
              <div className="text-3xl mb-2">💬</div>
              <p className="text-sm text-muted-foreground">Text Sentiment</p>
            </div>
            <div className="px-6 py-4 rounded-xl bg-card/50 border border-border/50 backdrop-blur">
              <div className="text-3xl mb-2">🎵</div>
              <p className="text-sm text-muted-foreground">Spotify Integration</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
