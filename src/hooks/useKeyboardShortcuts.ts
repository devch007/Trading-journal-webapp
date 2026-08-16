import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function useKeyboardShortcuts() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if typing inside input, textarea, or contentEditable
      const target = e.target as HTMLElement;
      const isInput = target && (
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.tagName === 'SELECT' || 
        target.isContentEditable
      );

      // 1. Toggle Sidebar Collapse: Cmd+B, Ctrl+B, or '['
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('toggleSidebarCollapse'));
        return;
      }

      if (!isInput && e.key === '[') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('toggleSidebarCollapse'));
        return;
      }

      // If user is currently typing in an input, skip navigation shortcuts
      if (isInput) return;

      // 2. New Trade: 'N' or 'n'
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('openNewTradeModal'));
        return;
      }

      // 3. Quick Route Switching (1-7)
      if (e.key === '1') {
        e.preventDefault();
        navigate('/dashboard');
      } else if (e.key === '2') {
        e.preventDefault();
        navigate('/trades');
      } else if (e.key === '3') {
        e.preventDefault();
        navigate('/ai-engine');
      } else if (e.key === '4') {
        e.preventDefault();
        navigate('/accounts');
      } else if (e.key === '5') {
        e.preventDefault();
        navigate('/journal');
      } else if (e.key === '6') {
        e.preventDefault();
        navigate('/strategies');
      } else if (e.key === '7') {
        e.preventDefault();
        navigate('/goals');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);
}
