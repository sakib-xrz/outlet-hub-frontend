import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

function FormDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open dialog</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Test Dialog</DialogTitle>
        </DialogHeader>
        <label htmlFor="dialog-name">Name</label>
        <input id="dialog-name" type="text" />
      </DialogContent>
    </Dialog>
  );
}

function FormSheet() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button>Open sheet</Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Test Sheet</SheetTitle>
        </SheetHeader>
        <label htmlFor="sheet-name">Name</label>
        <input id="sheet-name" type="text" />
      </SheetContent>
    </Sheet>
  );
}

describe('Dialog auto-focus', () => {
  it('focuses content element, not first input, when dialog opens', async () => {
    render(<FormDialog />);
    await userEvent.click(screen.getByRole('button', { name: 'Open dialog' }));
    const content = await screen.findByRole('dialog');
    expect(document.activeElement).toBe(content);
    expect(document.activeElement).not.toBe(screen.getByLabelText('Name'));
  });

  it('moves focus to first field on Tab', async () => {
    render(<FormDialog />);
    await userEvent.click(screen.getByRole('button', { name: 'Open dialog' }));
    await screen.findByRole('dialog');
    await userEvent.tab();
    expect(document.activeElement).toBe(screen.getByLabelText('Name'));
  });

  it('closes on Escape and returns focus to trigger', async () => {
    render(<FormDialog />);
    const trigger = screen.getByRole('button', { name: 'Open dialog' });
    await userEvent.click(trigger);
    await screen.findByRole('dialog');
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(document.activeElement).toBe(trigger);
  });

  it('respects a caller-provided onOpenAutoFocus that prevents default', async () => {
    let callerFired = false;
    render(
      <Dialog>
        <DialogTrigger asChild>
          <Button>Open</Button>
        </DialogTrigger>
        <DialogContent
          onOpenAutoFocus={(e) => {
            callerFired = true;
            e.preventDefault(); // caller takes over
          }}
        >
          <DialogTitle>Custom focus</DialogTitle>
          <input id="custom-input" type="text" aria-label="Custom" />
        </DialogContent>
      </Dialog>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Open' }));
    await screen.findByRole('dialog');
    expect(callerFired).toBe(true);
    // Our handler respects the caller's preventDefault — content itself not focused
    expect(document.activeElement).not.toBe(screen.getByRole('dialog'));
  });
});

describe('Sheet auto-focus', () => {
  it('focuses content element, not first input, when sheet opens', async () => {
    render(<FormSheet />);
    await userEvent.click(screen.getByRole('button', { name: 'Open sheet' }));
    const content = await screen.findByRole('dialog');
    expect(document.activeElement).toBe(content);
    expect(document.activeElement).not.toBe(screen.getByLabelText('Name'));
  });

  it('moves focus to first field on Tab', async () => {
    render(<FormSheet />);
    await userEvent.click(screen.getByRole('button', { name: 'Open sheet' }));
    await screen.findByRole('dialog');
    await userEvent.tab();
    expect(document.activeElement).toBe(screen.getByLabelText('Name'));
  });
});
