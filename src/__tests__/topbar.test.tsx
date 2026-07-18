import { render, screen, fireEvent } from '@testing-library/react';
import { TopBar } from '@/components/common/TopBar';

jest.mock('next/navigation', () => ({
  usePathname: jest.fn(() => '/dashboard'),
}));

jest.mock('@/hooks/useAuth', () => ({
  useAuth: jest.fn(() => ({
    user: { name: 'Test User', role: 'admin' },
    logout: jest.fn(),
  })),
}));

describe('TopBar', () => {
  it('renders logo and brand name', () => {
    render(<TopBar />);
    expect(screen.getByAltText('3EJS')).toBeInTheDocument();
    expect(screen.getByText('3EJS Tech')).toBeInTheDocument();
  });

  it('renders live clock with seconds', () => {
    render(<TopBar />);
    const clock = screen.getByTestId('live-clock');
    expect(clock).toBeInTheDocument();
    expect(clock.textContent).toMatch(/\d{1,2}:\d{2}:\d{2} [AP]M/);
  });

  it('renders all four nav items', () => {
    render(<TopBar />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Subscribers')).toBeInTheDocument();
    expect(screen.getByText('Clawback')).toBeInTheDocument();
    expect(screen.getByText('Historical Data')).toBeInTheDocument();
  });

  it('highlights active nav item', () => {
    render(<TopBar />);
    const dashboardLink = screen.getByText('Dashboard').closest('a');
    expect(dashboardLink).toHaveClass('active');
  });

  it('renders sync, settings, and logout buttons', () => {
    render(<TopBar />);
    expect(screen.getByLabelText('Sync')).toBeInTheDocument();
    expect(screen.getByLabelText('Settings')).toBeInTheDocument();
    expect(screen.getByLabelText('Logout')).toBeInTheDocument();
  });

  it('shows hamburger menu on mobile viewport', () => {
    const { rerender } = render(<TopBar />);
    Object.defineProperty(window, 'innerWidth', { value: 768, configurable: true });
    fireEvent(window, new Event('resize'));
    rerender(<TopBar />);
    expect(screen.getByLabelText('Open menu')).toBeInTheDocument();
  });
});