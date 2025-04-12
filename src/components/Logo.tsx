import React from 'react';
import { Link } from 'react-router-dom';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

const Logo: React.FC<LogoProps> = ({ size = 'md', showText = true }) => {
  const sizeClasses = {
    sm: 'h-6',
    md: 'h-8',
    lg: 'h-10',
  };

  const textSizeClasses = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-3xl',
  };

  return (
    <Link to="/" className="flex items-center gap-2">
      <img
        src="/cypher.png"
        alt="Cypher"
        className={sizeClasses[size]}
      />
      {showText && (
        <span className={`font-bold gradient-text ${textSizeClasses[size]}`}>
          Cypher
        </span>
      )}
    </Link>
  );
};

export default Logo;
