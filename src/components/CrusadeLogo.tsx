
import React from 'react';

interface CrusadeLogoProps {
  className?: string;
  width?: number;
  height?: number;
}

const CrusadeLogo = ({ className = "", width = 200, height = 60 }: CrusadeLogoProps) => {
  return (
    <div className={`inline-flex items-center bg-white rounded-lg p-4 ${className}`}>
      <svg
        width={width}
        height={height}
        viewBox="0 0 200 60"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Rocket Icon */}
        <g transform="translate(10, 10)">
          {/* Rocket body */}
          <path
            d="M20 5 L30 5 L32 10 L32 30 L18 30 L18 10 Z"
            fill="black"
            stroke="black"
            strokeWidth="1"
          />
          {/* Rocket tip */}
          <path
            d="M20 5 L25 0 L30 5 Z"
            fill="black"
          />
          {/* Rocket fins */}
          <path
            d="M18 25 L12 30 L18 30 Z"
            fill="black"
          />
          <path
            d="M32 25 L38 30 L32 30 Z"
            fill="black"
          />
          {/* Rocket flames */}
          <path
            d="M20 30 L22 38 L25 35 L28 38 L30 30 Z"
            fill="black"
          />
          {/* Window */}
          <circle cx="25" cy="15" r="3" fill="white" />
          {/* Details */}
          <rect x="22" y="20" width="6" height="2" fill="white" />
          <rect x="22" y="24" width="6" height="2" fill="white" />
        </g>
        
        {/* CRUSADE Text */}
        <g transform="translate(60, 15)">
          <text
            x="0"
            y="20"
            fontFamily="Arial, sans-serif"
            fontSize="24"
            fontWeight="bold"
            fill="black"
            letterSpacing="2px"
          >
            CRUSADE
          </text>
        </g>
      </svg>
    </div>
  );
};

export default CrusadeLogo;
