import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginForm } from '@/features/auth/components/login-form';
import type { LoginCredentials } from '@/features/auth/types/auth.types';
import { ApiError } from '@/lib/api/errors';
import { createQueryClient } from '@/lib/query/client';
import { deferred } from '../../helpers/http';

const session = vi.hoisted(() => ({
  calls: [] as unknown[],
  respond: (): Promise<unknown> => Promise.resolve(),
}));

vi.mock('@/features/auth/services/session', () => ({
  login: (credentials: LoginCredentials) => {
    session.calls.push(credentials);
    return session.respond();
  },
}));

function renderForm() {
  const user = userEvent.setup();
  render(
    <QueryClientProvider client={createQueryClient()}>
      <LoginForm />
    </QueryClientProvider>,
  );
  return {
    user,
    email: screen.getByLabelText('Email'),
    password: screen.getByLabelText('Password'),
    submit: screen.getByRole('button', { name: 'Sign in' }),
  };
}

describe('LoginForm', () => {
  beforeEach(() => {
    session.calls = [];
  });

  it('validates required fields without calling the API', async () => {
    const { user, submit } = renderForm();
    await user.click(submit);

    expect(await screen.findByText('Enter your email address.')).toBeInTheDocument();
    expect(screen.getByText('Enter your password.')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    expect(session.calls).toHaveLength(0);
  });

  it('mirrors the backend email and password rules', async () => {
    const { user, email, password, submit } = renderForm();
    await user.type(email, 'not-an-email');
    await user.type(password, 'short');
    await user.click(submit);

    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument();
    expect(screen.getByText('Password must be at least 8 characters.')).toBeInTheDocument();
    expect(session.calls).toHaveLength(0);
  });

  it('submits normalized credentials and prevents duplicate submissions', async () => {
    const pending = deferred<never>();
    session.respond = () => pending.promise;
    const { user, email, password, submit } = renderForm();

    await user.type(email, '  Admin@Example.com ');
    await user.type(password, 'correct-horse-battery');
    await user.click(submit);

    expect(await screen.findByRole('button', { name: 'Signing in…' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Signing in…' }));
    expect(session.calls).toEqual([
      {
        email: 'admin@example.com',
        password: 'correct-horse-battery',
      },
    ]);
    pending.reject(new ApiError({ kind: 'network' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to reach the server');
  });

  it('shows a generic message and clears the password on invalid credentials', async () => {
    session.respond = () =>
      Promise.reject(new ApiError({ kind: 'invalid_credentials', status: 401 }));
    const { user, email, password, submit } = renderForm();

    await user.type(email, 'admin@example.com');
    await user.type(password, 'wrong-password');
    await user.click(submit);

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password.');
    expect(password).toHaveValue('');
    expect(password).toHaveFocus();
  });

  it('maps server-side validation errors onto fields', async () => {
    session.respond = () =>
      Promise.reject(
        new ApiError({
          kind: 'validation',
          status: 400,
          fieldErrors: [{ field: 'email', message: 'Invalid email address' }],
        }),
      );
    const { user, email, password, submit } = renderForm();

    await user.type(email, 'admin@example.com');
    await user.type(password, 'long-enough-password');
    await user.click(submit);

    expect(await screen.findByText('Invalid email address')).toBeInTheDocument();
    expect(email).toHaveAttribute('aria-invalid', 'true');
  });

  it('toggles password visibility accessibly', async () => {
    const { user, password } = renderForm();
    const toggle = screen.getByRole('button', { name: 'Show password' });

    expect(password).toHaveAttribute('type', 'password');
    await user.click(toggle);
    expect(password).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Hide password' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});
