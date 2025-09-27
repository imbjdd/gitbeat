import { useState, useCallback, useRef } from 'react';

interface SunoGenerationResult {
  id: string;
  audioUrl: string;
  streamAudioUrl: string;
  imageUrl: string;
  prompt: string;
  modelName: string;
  title: string;
  tags: string;
  createTime: string;
  duration: number;
}

interface SunoStatusData {
  taskId: string;
  parentMusicId: string;
  param: string;
  response?: {
    taskId: string;
    sunoData: SunoGenerationResult[];
  };
  status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED';
  type: string;
  errorCode: string | null;
  errorMessage: string | null;
}

interface UseSunoPollingOptions {
  onSuccess?: (data: SunoStatusData) => void;
  onError?: (error: string) => void;
  pollingInterval?: number;
  maxPollingTime?: number;
}

export function useSunoPolling(options: UseSunoPollingOptions = {}) {
  const [isPolling, setIsPolling] = useState(false);
  const [progress, setProgress] = useState<string>('');
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  const {
    onSuccess,
    onError,
    pollingInterval = 5000, // Poll every 5 seconds
    maxPollingTime = 5 * 60 * 1000 // Stop polling after 5 minutes
  } = options;

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setIsPolling(false);
    setProgress('');
  }, []);

  const checkStatus = useCallback(async (taskId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/suno/status/${taskId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to check status');
      }

      const statusData: SunoStatusData = data.data;
      
      // Update progress message
      switch (statusData.status) {
        case 'PENDING':
          setProgress('Music generation is pending...');
          break;
        case 'PROCESSING':
          setProgress('Music is being generated...');
          break;
        case 'SUCCESS':
          setProgress('Music generation completed!');
          stopPolling();
          if (onSuccess) {
            onSuccess(statusData);
          }
          return true;
        case 'FAILED':
          setProgress('Music generation failed');
          stopPolling();
          if (onError) {
            onError(statusData.errorMessage || 'Generation failed');
          }
          return true;
        default:
          setProgress(`Status: ${statusData.status}`);
      }
      
      return false;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error checking Suno status:', error);
      setProgress('Error checking status');
      stopPolling();
      if (onError) {
        onError(errorMessage);
      }
      return true;
    }
  }, [onSuccess, onError, stopPolling]);

  const startPolling = useCallback(async (taskId: string) => {
    if (isPolling) {
      stopPolling();
    }

    setIsPolling(true);
    startTimeRef.current = Date.now();
    setProgress('Starting music generation...');

    // First immediate check
    const completed = await checkStatus(taskId);
    if (completed) return;

    // Set up interval polling
    pollingIntervalRef.current = setInterval(async () => {
      // Check if we've exceeded max polling time
      if (Date.now() - startTimeRef.current > maxPollingTime) {
        setProgress('Generation timeout - please check manually');
        stopPolling();
        if (onError) {
          onError('Polling timeout exceeded');
        }
        return;
      }

      await checkStatus(taskId);
    }, pollingInterval);
  }, [isPolling, checkStatus, stopPolling, maxPollingTime, pollingInterval]);

  return {
    isPolling,
    progress,
    startPolling,
    stopPolling
  };
}