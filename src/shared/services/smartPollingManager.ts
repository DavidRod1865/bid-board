import { cacheManager } from './cacheManager';

// Polling configuration
interface PollingConfig {
  interval: number; // Polling interval in milliseconds
  maxInterval: number; // Maximum interval for exponential backoff
  minInterval: number; // Minimum interval
  backoffMultiplier: number; // Multiplier for exponential backoff
}

// Default polling configs for different data types
const POLLING_CONFIGS: Record<string, PollingConfig> = {
  bids: {
    interval: 30000, // 30 seconds
    maxInterval: 300000, // 5 minutes max
    minInterval: 10000, // 10 seconds min
    backoffMultiplier: 1.5
  },
  vendors: {
    interval: 120000, // 2 minutes
    maxInterval: 600000, // 10 minutes max
    minInterval: 60000, // 1 minute min
    backoffMultiplier: 2
  },
  notes: {
    interval: 15000, // 15 seconds
    maxInterval: 180000, // 3 minutes max
    minInterval: 5000, // 5 seconds min
    backoffMultiplier: 1.5
  }
};

// Polling state for each data type
interface PollingState {
  isPolling: boolean;
  currentInterval: number;
  timeoutId?: NodeJS.Timeout;
  lastUpdate: number;
  errorCount: number;
}

class SmartPollingManager {
  private pollingStates = new Map<string, PollingState>();
  private callbacks = new Map<string, () => Promise<void>>();
  private isPageVisible = true;
  private isUserActive = true;
  private lastUserActivity = Date.now();
  private userActivityTimeout?: NodeJS.Timeout;
  
  constructor() {
    this.setupVisibilityDetection();
    this.setupActivityDetection();
  }

  /**
   * Setup page visibility detection
   */
  private setupVisibilityDetection(): void {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        const wasVisible = this.isPageVisible;
        this.isPageVisible = !document.hidden;
        
        if (this.isPageVisible && !wasVisible) {
          this.resumeAllPolling();
        } else if (!this.isPageVisible && wasVisible) {
          this.pauseAllPolling();
        }
      });
    }
  }

  /**
   * Setup user activity detection
   */
  private setupActivityDetection(): void {
    if (typeof window !== 'undefined') {
      const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
      
      const updateActivity = () => {
        const wasActive = this.isUserActive;
        this.lastUserActivity = Date.now();
        this.isUserActive = true;
        
        // Clear existing timeout
        if (this.userActivityTimeout) {
          clearTimeout(this.userActivityTimeout);
        }
        
        // Set user as inactive after 5 minutes of no activity
        this.userActivityTimeout = setTimeout(() => {
          this.isUserActive = false;
          this.adjustPollingForInactivity();
        }, 5 * 60 * 1000); // 5 minutes
        
        // Resume normal polling if user became active
        if (!wasActive && this.isUserActive && this.isPageVisible) {
          this.resumeAllPolling();
        }
      };
      
      activityEvents.forEach(event => {
        window.addEventListener(event, updateActivity, true);
      });
      
      // Initial setup
      updateActivity();
    }
  }

  /**
   * Should poll based on visibility and activity
   */
  private shouldPoll(): boolean {
    return this.isPageVisible && this.isUserActive;
  }

  /**
   * Get effective polling interval
   */
  private getEffectiveInterval(type: string, state: PollingState): number {
    const config = POLLING_CONFIGS[type];
    if (!config) return 60000; // Default 1 minute
    
    let interval = state.currentInterval;
    
    // Reduce frequency if user is inactive
    if (!this.isUserActive) {
      interval *= 3; // 3x slower when inactive
    }
    
    // Apply exponential backoff for errors
    if (state.errorCount > 0) {
      interval *= Math.pow(config.backoffMultiplier, Math.min(state.errorCount, 5));
    }
    
    // Ensure within bounds
    return Math.min(Math.max(interval, config.minInterval), config.maxInterval);
  }

  /**
   * Start polling for a specific data type
   */
  startPolling(type: string, callback: () => Promise<void>): void {
    if (this.pollingStates.has(type)) {
      this.stopPolling(type);
    }
    
    const config = POLLING_CONFIGS[type];
    if (!config) {
      console.error(`No polling config found for type: ${type}`);
      return;
    }
    
    // Store callback for force refresh capability
    this.callbacks.set(type, callback);
    
    const state: PollingState = {
      isPolling: true,
      currentInterval: config.interval,
      lastUpdate: Date.now(),
      errorCount: 0
    };
    
    this.pollingStates.set(type, state);
    
    const poll = async () => {
      if (!this.shouldPoll() || !state.isPolling) {
        // Reschedule for later if not polling conditions
        state.timeoutId = setTimeout(poll, this.getEffectiveInterval(type, state));
        return;
      }
      
      try {
        await callback();
        state.lastUpdate = Date.now();
        state.errorCount = 0; // Reset error count on success
        state.currentInterval = config.interval; // Reset to normal interval
        
      } catch (error) {
        console.error(`Polling error for ${type}:`, error);
        state.errorCount++;
        
        // Invalidate cache on error to force fresh fetch next time
        cacheManager.invalidateAll(type as any);
      }
      
      // Schedule next poll
      if (state.isPolling) {
        state.timeoutId = setTimeout(poll, this.getEffectiveInterval(type, state));
      }
    };
    
    // Start immediately
    poll();
  }

  /**
   * Stop polling for a specific data type
   */
  stopPolling(type: string): void {
    const state = this.pollingStates.get(type);
    if (state) {
      state.isPolling = false;
      if (state.timeoutId) {
        clearTimeout(state.timeoutId);
        state.timeoutId = undefined;
      }
      this.pollingStates.delete(type);
      this.callbacks.delete(type); // Clean up callback
    }
  }

  /**
   * Pause all polling (when page hidden)
   */
  private pauseAllPolling(): void {
    this.pollingStates.forEach((state) => {
      if (state.timeoutId) {
        clearTimeout(state.timeoutId);
        state.timeoutId = undefined;
      }
    });
  }

  /**
   * Resume all polling (when page visible)
   */
  private resumeAllPolling(): void {
    this.pollingStates.forEach((state, type) => {
      if (state.isPolling && !state.timeoutId) {
        // Resume with immediate poll
        const config = POLLING_CONFIGS[type];
        if (config) {
          state.timeoutId = setTimeout(() => {
            this.triggerPoll(type);
          }, 100); // Small delay to avoid overwhelming
        }
      }
    });
  }

  /**
   * Adjust polling for user inactivity
   */
  private adjustPollingForInactivity(): void {
    // Polling will automatically slow down due to getEffectiveInterval
  }

  /**
   * Trigger immediate poll for a type
   */
  private triggerPoll(type: string): void {
    const state = this.pollingStates.get(type);
    if (state && state.timeoutId) {
      clearTimeout(state.timeoutId);
      // The actual polling function will be called by the callback
    }
  }

  /**
   * Force immediate refresh for a specific data type
   * Used by real-time notifications to trigger immediate updates
   */
  forceRefresh(type: string): void {
    const state = this.pollingStates.get(type);
    if (!state || !state.isPolling) {
      return;
    }
    
    // Clear existing timeout
    if (state.timeoutId) {
      clearTimeout(state.timeoutId);
      state.timeoutId = undefined;
    }
    
    // Reset error count and interval for immediate fresh attempt
    state.errorCount = 0;
    state.currentInterval = POLLING_CONFIGS[type]?.interval || 60000;
    
    // Trigger immediate poll by calling the stored callback
    this.triggerImmediatePoll(type);
  }
  
  
  /**
   * Trigger immediate poll for a type
   */
  private async triggerImmediatePoll(type: string): Promise<void> {
    const callback = this.callbacks.get(type);
    const state = this.pollingStates.get(type);
    
    if (!callback || !state) return;
    
    try {
      await callback();
      state.lastUpdate = Date.now();
      state.errorCount = 0;
      
      // Schedule next regular poll
      if (state.isPolling) {
        const config = POLLING_CONFIGS[type];
        if (config) {
          const poll = async () => {
            if (state.isPolling) {
              await this.triggerImmediatePoll(type);
            }
          };
          state.timeoutId = setTimeout(poll, this.getEffectiveInterval(type, state));
        }
      }
    } catch (error) {
      console.error(`Force refresh error for ${type}:`, error);
      state.errorCount++;
      
      // Schedule retry with backoff
      if (state.isPolling) {
        const config = POLLING_CONFIGS[type];
        if (config) {
          const poll = async () => {
            if (state.isPolling) {
              await this.triggerImmediatePoll(type);
            }
          };
          state.timeoutId = setTimeout(poll, this.getEffectiveInterval(type, state));
        }
      }
    }
  }

  /**
   * Force immediate update for all types
   */
  forceUpdate(): void {
    this.pollingStates.forEach((state, type) => {
      if (state.isPolling) {
        this.forceRefresh(type);
      }
    });
  }

  /**
   * Get polling statistics
   */
  getStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    
    this.pollingStates.forEach((state, type) => {
      stats[type] = {
        isPolling: state.isPolling,
        currentInterval: this.getEffectiveInterval(type, state),
        lastUpdate: new Date(state.lastUpdate).toISOString(),
        errorCount: state.errorCount,
        timeSinceLastUpdate: Date.now() - state.lastUpdate
      };
    });
    
    return {
      polling: stats,
      pageVisible: this.isPageVisible,
      userActive: this.isUserActive,
      timeSinceLastActivity: Date.now() - this.lastUserActivity
    };
  }

  /**
   * Stop all polling
   */
  stopAll(): void {
    Array.from(this.pollingStates.keys()).forEach(type => {
      this.stopPolling(type);
    });
  }
}

// Create singleton instance
export const smartPollingManager = new SmartPollingManager();

// Export for testing
export { SmartPollingManager };