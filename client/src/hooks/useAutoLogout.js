import { useEffect, useRef, useState } from 'react';

/**
 * Custom hook for automatic logout based on inactivity
 * @param {Function} onLogout - Callback function to execute on logout
 * @param {number} inactivityTimeout - Inactivity timeout in milliseconds (default: 15 min)
 * @param {number} warningTime - Time before logout to show warning in milliseconds (default: 2 min)
 * @param {Object} options - Additional options like notifications, sound, etc.
 */
export function useAutoLogout(onLogout, inactivityTimeout = 15 * 60 * 1000, warningTime = 2 * 60 * 1000, options = {}) {
  const {
    enableSound = true,
    enableNotification = true,
    graceperiodSeconds = 5,
    trackActivity = true,
    onBeforeLogout = null,  // Callback before logout (for auto-save)
    enableKeyboardShortcut = true,  // Ctrl/Cmd + Shift + L to logout
    enableMultiTabSync = true,  // Sync logout across tabs
    soundVolume = 0.3  // Sound volume 0-1
  } = options;

  const [showWarning, setShowWarning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [lastActivity, setLastActivity] = useState(new Date());
  const [inactiveFor, setInactiveFor] = useState(0);
  const [extensionCount, setExtensionCount] = useState(0);
  const [graceTimer, setGraceTimer] = useState(null);
  const [isIdle, setIsIdle] = useState(false);
  const [sessionProgress, setSessionProgress] = useState(100);  // 0-100 for progress bar
  const inactivityTimer = useRef(null);
  const warningTimer = useRef(null);
  const warningIntervalRef = useRef(null);
  const activityIntervalRef = useRef(null);
  const audioRef = useRef(null);
  const notificationShownRef = useRef(false);

  const resetTimers = () => {
    // Clear all existing timers
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    if (warningTimer.current) clearTimeout(warningTimer.current);
    if (warningIntervalRef.current) clearInterval(warningIntervalRef.current);

    setShowWarning(false);
    setTimeLeft(null);
    setGraceTimer(null);
    setInactiveFor(0);
    notificationShownRef.current = false;

    // Update last activity time
    if (trackActivity) {
      setLastActivity(new Date());
    }

    // Set warning timer
    warningTimer.current = setTimeout(() => {
      setShowWarning(true);
      setTimeLeft(Math.ceil(warningTime / 1000));
      notificationShownRef.current = false;

      // Play sound notification
      if (enableSound) {
        playWarningSound();
      }

      // Show browser notification
      if (enableNotification && !notificationShownRef.current && 'Notification' in window && Notification.permission === 'granted') {
        new Notification('Session Expiring', {
          body: `Your session will expire in ${Math.ceil(warningTime / 1000)} seconds due to inactivity.`,
          icon: '⚠️',
          tag: 'session-warning'
        });
        notificationShownRef.current = true;
      }

      // Update countdown every second
      warningIntervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(warningIntervalRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, inactivityTimeout - warningTime);

    // Set logout timer
    inactivityTimer.current = setTimeout(() => {
      setShowWarning(false);
      
      // Grace period: Allow user to cancel logout
      if (graceperiodSeconds > 0) {
        setGraceTimer(graceperiodSeconds);
        let graceCount = graceperiodSeconds;
        const graceInterval = setInterval(() => {
          graceCount--;
          setGraceTimer(graceCount);
          if (graceCount <= 0) {
            clearInterval(graceInterval);
            onLogout();
          }
        }, 1000);
      } else {
        onLogout();
      }
    }, inactivityTimeout);
  };

  const extendSession = () => {
    setShowWarning(false);
    setTimeLeft(null);
    setGraceTimer(null);
    setExtensionCount(prev => prev + 1);
    resetTimers();
  };

  const playWarningSound = () => {
    try {
      // Create a simple beep using Web Audio API
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800; // 800 Hz
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(soundVolume, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (err) {
      console.warn('Could not play warning sound:', err);
    }
  };

  const cancelLogout = () => {
    if (graceTimer !== null) {
      setGraceTimer(null);
      extendSession();
    }
  };

  const performLogout = () => {
    // Call before logout callback if provided (for auto-save)
    if (onBeforeLogout && typeof onBeforeLogout === 'function') {
      try {
        onBeforeLogout();
      } catch (err) {
        console.warn('Error in beforeLogout callback:', err);
      }
    }
    
    // Sync logout across tabs if enabled
    if (enableMultiTabSync) {
      localStorage.setItem('logoutSignal', JSON.stringify({ timestamp: Date.now() }));
    }
    
    onLogout();
  };

  const handleKeyboardShortcut = (e) => {
    // Ctrl/Cmd + Shift + L for logout
    if (enableKeyboardShortcut && (e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'L') {
      e.preventDefault();
      performLogout();
    }
  };

  useEffect(() => {
    // Request notification permission
    if (enableNotification && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    resetTimers();

    // Activity tracking interval
    if (trackActivity) {
      activityIntervalRef.current = setInterval(() => {
        setInactiveFor(prev => {
          const newValue = prev + 1;
          // Calculate session progress (0-100)
          const progress = Math.max(0, 100 - (newValue / (inactivityTimeout / 1000)) * 100);
          setSessionProgress(progress);
          
          // Set idle state when 75% inactive
          if (newValue > (inactivityTimeout / 1000) * 0.75) {
            setIsIdle(true);
          }
          
          return newValue > inactivityTimeout / 1000 ? inactivityTimeout / 1000 : newValue;
        });
      }, 1000);
    }

    // Activity listeners
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

    const handleActivity = () => {
      setIsIdle(false);
      setSessionProgress(100);
      resetTimers();
    };

    events.forEach((event) => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Keyboard shortcut listener
    if (enableKeyboardShortcut) {
      document.addEventListener('keydown', handleKeyboardShortcut);
    }

    // Handle page visibility
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden
      } else {
        // Page is visible again, reset timers
        resetTimers();
        setIsIdle(false);
        setSessionProgress(100);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Multi-tab sync listener
    const handleStorageChange = (e) => {
      if (e.key === 'logoutSignal' && e.newValue) {
        performLogout();
      }
    };

    if (enableMultiTabSync) {
      window.addEventListener('storage', handleStorageChange);
    }

    // Store session info in localStorage
    const sessionInfo = {
      startTime: new Date().toISOString(),
      extensionCount: extensionCount,
      lastActivity: lastActivity.toISOString()
    };
    localStorage.setItem('sessionInfo', JSON.stringify(sessionInfo));

    // Cleanup
    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity);
      });
      if (enableKeyboardShortcut) {
        document.removeEventListener('keydown', handleKeyboardShortcut);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (enableMultiTabSync) {
        window.removeEventListener('storage', handleStorageChange);
      }
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      if (warningTimer.current) clearTimeout(warningTimer.current);
      if (warningIntervalRef.current) clearInterval(warningIntervalRef.current);
      if (activityIntervalRef.current) clearInterval(activityIntervalRef.current);
    };
  }, [onLogout, inactivityTimeout, warningTime, enableSound, enableNotification, trackActivity, extensionCount, lastActivity, enableKeyboardShortcut, enableMultiTabSync, soundVolume, onBeforeLogout]);

  return {
    showWarning,
    timeLeft,
    extendSession,
    lastActivity,
    inactiveFor,
    extensionCount,
    graceTimer,
    cancelLogout,
    isIdle,
    sessionProgress,
    performLogout
  };
}
