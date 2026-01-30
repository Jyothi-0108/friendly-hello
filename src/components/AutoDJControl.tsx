import { Radio, CircleOff, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface AutoDJControlProps {
  isActive: boolean;
  nextCaptureIn: number;
  onToggle: () => void;
  disabled?: boolean;
}

const AutoDJControl = ({ isActive, nextCaptureIn, onToggle, disabled }: AutoDJControlProps) => {
  return (
    <div className="flex items-center gap-3">
      <Button
        onClick={onToggle}
        disabled={disabled}
        variant={isActive ? 'default' : 'outline'}
        className={cn(
          "gap-2 transition-all duration-300",
          isActive && "bg-gradient-to-r from-primary to-accent animate-pulse"
        )}
      >
        {isActive ? (
          <>
            <Radio className="w-4 h-4 animate-pulse" />
            <span>Auto-DJ On</span>
          </>
        ) : (
          <>
            <CircleOff className="w-4 h-4" />
            <span>Auto-DJ</span>
          </>
        )}
      </Button>
      
      {isActive && (
        <Badge 
          variant="secondary" 
          className="gap-1 animate-fade-in bg-muted/80 backdrop-blur"
        >
          <Zap className="w-3 h-3" />
          Next scan: {nextCaptureIn}s
        </Badge>
      )}
    </div>
  );
};

export default AutoDJControl;
