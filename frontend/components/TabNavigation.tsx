import { ActiveTab } from './types';

interface TabNavigationProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onTabChange?: () => void;
}

export default function TabNavigation({ activeTab, setActiveTab, onTabChange }: TabNavigationProps) {
  const handleTabClick = (tab: ActiveTab) => {
    setActiveTab(tab);
    onTabChange?.();
  };

  return (
    <div className="flex justify-center mb-6 sm:mb-8 px-2">
      <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-600 w-full sm:w-auto">
        <button
          onClick={() => handleTabClick('beats')}
          className={`flex-1 sm:flex-none px-3 sm:px-6 py-2 rounded-md font-medium text-sm sm:text-base transition-all duration-300 hover:cursor-pointer ${
            activeTab === 'beats'
              ? 'bg-emerald-300 text-black shadow-lg shadow-emerald-300/50'
              : 'text-slate-400 hover:text-white hover:bg-slate-700'
          }`}
        >
          Beats
        </button>
        <button
          onClick={() => handleTabClick('repo')}
          className={`flex-1 sm:flex-none px-3 sm:px-6 py-2 rounded-md font-medium text-sm sm:text-base transition-all duration-300 hover:cursor-pointer ${
            activeTab === 'repo'
              ? 'bg-yellow-200 text-black shadow-lg shadow-yellow-200/50'
              : 'text-slate-400 hover:text-white hover:bg-slate-700'
          }`}
        >
          <span className="hidden sm:inline">Repository Analysis</span>
          <span className="sm:hidden">Analysis</span>
        </button>
      </div>
    </div>
  );
}
