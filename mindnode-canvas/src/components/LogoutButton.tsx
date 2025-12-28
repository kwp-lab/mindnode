'use client';

/**
 * Logout button component
 * 
 * Implements:
 * - Task 17.2: Create logout functionality
 * 
 * Requirements:
 * - 12.4: User logout
 */

import { useRouter } from 'next/navigation';
import { signOut } from '@/lib/auth';
import { useState } from 'react';

interface LogoutButtonProps {
  className?: string;
  children?: React.ReactNode;
}

export function LogoutButton({ className, children }: LogoutButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);
    
    try {
      const { error } = await signOut();
      
      if (error) {
        console.error('Logout error:', error);
        setIsLoading(false);
        return;
      }

      // Redirect to login page
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error('Unexpected logout error:', err);
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={isLoading}
      className={className || 'px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'}
    >
      {isLoading ? 'Signing out...' : (children || 'Sign out')}
    </button>
  );
}
