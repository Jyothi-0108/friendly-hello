import { useState } from 'react';
import { ListMusic, Save, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Track {
  id: string;
  name: string;
  artists: string;
  album?: string;
  albumArt?: string | null;
  previewUrl?: string | null;
  spotifyUrl?: string;
  duration?: number;
}

interface SavePlaylistDialogProps {
  tracks: Track[];
  emotion: string;
  onSave: (name: string, emotion: string, tracks: Track[]) => Promise<boolean>;
  isSaving: boolean;
}

const SavePlaylistDialog = ({ tracks, emotion, onSave, isSaving }: SavePlaylistDialogProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(`${emotion.charAt(0).toUpperCase() + emotion.slice(1)} Vibes`);

  const handleSave = async () => {
    const success = await onSave(name, emotion, tracks);
    if (success) {
      setOpen(false);
      setName(`${emotion.charAt(0).toUpperCase() + emotion.slice(1)} Vibes`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2" disabled={tracks.length === 0}>
          <ListMusic className="w-4 h-4" />
          Save Playlist
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Save Mood Playlist
          </DialogTitle>
          <DialogDescription>
            Save these {tracks.length} tracks as a playlist to listen later.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="playlist-name">Playlist Name</Label>
            <Input
              id="playlist-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter playlist name..."
            />
          </div>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="px-2 py-1 rounded-full bg-primary/10 text-primary capitalize">
              {emotion}
            </span>
            <span>•</span>
            <span>{tracks.length} tracks</span>
          </div>

          {/* Preview of first 3 tracks */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Preview</Label>
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {tracks.slice(0, 3).map((track, idx) => (
                <div key={track.id} className="flex items-center gap-2 text-sm">
                  <span className="w-5 h-5 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">
                    {idx + 1}
                  </span>
                  <span className="truncate flex-1">{track.name}</span>
                  <span className="text-muted-foreground text-xs truncate max-w-24">
                    {track.artists}
                  </span>
                </div>
              ))}
              {tracks.length > 3 && (
                <div className="text-xs text-muted-foreground pl-7">
                  +{tracks.length - 3} more tracks
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!name.trim() || isSaving}
            className="gap-2"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Playlist'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SavePlaylistDialog;
