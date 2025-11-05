import { HelpCircle } from 'lucide-react';
import { useState } from 'react';

interface TooltipProps {
  content: string;
  children?: React.ReactNode;
}

export default function Tooltip({ content, children }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="cursor-help inline-flex items-center"
      >
        {children || <HelpCircle className="w-4 h-4 text-gray-400 hover:text-gray-600" />}
      </div>
      {isVisible && (
        <div className="absolute z-50 w-64 p-2 text-sm text-white bg-gray-900 rounded-lg shadow-lg -top-2 left-6 transform -translate-y-full">
          {content}
          <div className="absolute w-2 h-2 bg-gray-900 transform rotate-45 -bottom-1 left-4"></div>
        </div>
      )}
    </div>
  );
}
