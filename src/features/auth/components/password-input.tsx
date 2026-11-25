import { Eye, EyeOff } from 'lucide-react';
import { type ComponentProps, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function PasswordInput(props: Omit<ComponentProps<typeof Input>, 'type'>) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input {...props} type={visible ? 'text' : 'password'} className="pr-10" />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="absolute top-1/2 right-0.5 -translate-y-1/2 text-muted-foreground"
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        aria-controls={props.id}
        disabled={props.disabled}
        onClick={() => setVisible((current) => !current)}
      >
        {visible ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
      </Button>
    </div>
  );
}
