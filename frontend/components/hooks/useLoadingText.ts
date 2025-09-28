import { useState, useEffect } from "react";

export const useLoadingText = (isLoading: boolean) => {
  const [loadingText, setLoadingText] = useState("Analyzing");

  useEffect(() => {
    if (isLoading) {
      const loadingTexts = ["Analyzing", "Processing", "Generating", "Computing", "Thinking", "Working"];
      let currentIndex = 0;
      
      const interval = setInterval(() => {
        currentIndex = (currentIndex + 1) % loadingTexts.length;
        setLoadingText(loadingTexts[currentIndex]);
      }, 5000);
      
      return () => clearInterval(interval);
    }
  }, [isLoading]);

  return loadingText;
};
