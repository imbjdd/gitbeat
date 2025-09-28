interface LoadingMessageProps {
  loadingText: string;
  title: string;
  description: string;
  estimatedTime: string;
  process: string;
  theme: 'emerald' | 'yellow';
  className?: string;
}

export default function LoadingMessage({ 
  loadingText, 
  title, 
  description, 
  estimatedTime, 
  process, 
  theme,
  className = "" 
}: LoadingMessageProps) {
  const themeColors = {
    emerald: {
      border: 'border-emerald-500/30',
      spinner: 'border-emerald-400',
      text: 'text-emerald-300'
    },
    yellow: {
      border: 'border-yellow-200/30',
      spinner: 'border-yellow-200',
      text: 'text-yellow-200'
    }
  };

  const colors = themeColors[theme];

  return (
    <div className={`bg-slate-800/50 ${colors.border} rounded-lg p-6 text-center ${className}`}>
      <div className="flex items-center justify-center gap-3 mb-4">
        <div className={`animate-spin w-6 h-6 border-3 ${colors.spinner} border-t-transparent rounded-full`}></div>
        <span className={`${colors.text} font-medium`}>{loadingText} {title}...</span>
      </div>
      <div className="text-slate-400 text-sm mb-2">
        {description}
      </div>
      <div className="text-slate-500 text-xs">
        Estimated time: {estimatedTime} • {process}
      </div>
    </div>
  );
}
