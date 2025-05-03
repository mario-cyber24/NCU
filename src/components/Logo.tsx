import { Link } from 'react-router-dom';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'light' | 'dark';
}

export default function Logo({ className = '', size = 'md', variant = 'dark' }: LogoProps) {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  // Fallback to text if image fails to load
  return (
    <Link to="/" className={`block ${className}`}>
      <div className={`${sizes[size]} flex items-center justify-center rounded-full ${
        variant === 'light' ? 'bg-white text-primary-600' : 'bg-primary-500 text-white'
      }`}>
        <span className="font-bold text-lg">N</span>
      </div>
    </Link>
  );
}