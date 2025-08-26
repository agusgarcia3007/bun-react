import { useState, useEffect, useRef } from "react";

interface PomodoroState {
  timeLeft: number;
  isRunning: boolean;
  currentType: 'work' | 'short_break' | 'long_break';
  sessionCount: number;
  currentSessionId: string | null;
}

const TIMER_DURATIONS = {
  work: 25 * 60, // 25 minutes
  short_break: 5 * 60, // 5 minutes
  long_break: 15 * 60, // 15 minutes
};

export function PomodoroTimer() {
  const [state, setState] = useState<PomodoroState>({
    timeLeft: TIMER_DURATIONS.work,
    isRunning: false,
    currentType: 'work',
    sessionCount: 0,
    currentSessionId: null,
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (state.isRunning && state.timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setState(prev => ({
          ...prev,
          timeLeft: Math.max(0, prev.timeLeft - 1),
        }));
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      // Auto-complete session when timer reaches 0
      if (state.timeLeft === 0 && state.currentSessionId) {
        completeSession();
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [state.isRunning, state.timeLeft]);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const startSession = async () => {
    try {
      const response = await fetch('/api/pomodoro/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          duration: TIMER_DURATIONS[state.currentType],
          type: state.currentType,
          task_id: null, // Could be linked to a specific task in the future
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setState(prev => ({
          ...prev,
          isRunning: true,
          currentSessionId: data.session.id,
        }));
      }
    } catch (error) {
      console.error('Error starting pomodoro session:', error);
      // Start locally even if API fails
      setState(prev => ({ ...prev, isRunning: true }));
    }
  };

  const completeSession = async () => {
    if (state.currentSessionId) {
      try {
        await fetch(`/api/pomodoro/sessions/${state.currentSessionId}/complete`, {
          method: 'POST',
        });
      } catch (error) {
        console.error('Error completing pomodoro session:', error);
      }
    }

    // Move to next session type
    const newSessionCount = state.currentType === 'work' ? state.sessionCount + 1 : state.sessionCount;
    let nextType: 'work' | 'short_break' | 'long_break';

    if (state.currentType === 'work') {
      // After work session, take a break
      nextType = newSessionCount % 4 === 0 ? 'long_break' : 'short_break';
    } else {
      // After break, back to work
      nextType = 'work';
    }

    setState({
      timeLeft: TIMER_DURATIONS[nextType],
      isRunning: false,
      currentType: nextType,
      sessionCount: newSessionCount,
      currentSessionId: null,
    });

    // Show notification if possible
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Pomodoro Session Complete!', {
        body: `${state.currentType.replace('_', ' ')} session finished. Time for ${nextType.replace('_', ' ')}!`,
        icon: '/favicon.ico',
      });
    }
  };

  const pauseTimer = () => {
    setState(prev => ({ ...prev, isRunning: false }));
  };

  const resetTimer = () => {
    setState({
      timeLeft: TIMER_DURATIONS[state.currentType],
      isRunning: false,
      currentType: state.currentType,
      sessionCount: state.sessionCount,
      currentSessionId: null,
    });
  };

  const switchType = (type: 'work' | 'short_break' | 'long_break') => {
    if (state.isRunning) return; // Can't switch during active session

    setState({
      timeLeft: TIMER_DURATIONS[type],
      isRunning: false,
      currentType: type,
      sessionCount: state.sessionCount,
      currentSessionId: null,
    });
  };

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  return (
    <div className="pomodoro-timer">
      <div className="timer-display">
        <div className="timer-time">{formatTime(state.timeLeft)}</div>
        <div className="timer-type">
          {state.currentType.replace('_', ' ').toUpperCase()}
        </div>
        <div className="session-count">
          Sessions completed: {state.sessionCount}
        </div>
      </div>

      <div className="timer-controls">
        {!state.isRunning ? (
          <button 
            className="btn-primary" 
            onClick={startSession}
            disabled={state.timeLeft === 0}
          >
            Start
          </button>
        ) : (
          <button className="btn-secondary" onClick={pauseTimer}>
            Pause
          </button>
        )}
        
        <button 
          className="btn-secondary" 
          onClick={resetTimer}
          disabled={state.isRunning}
        >
          Reset
        </button>
      </div>

      <div className="timer-types">
        <button
          className={`type-btn ${state.currentType === 'work' ? 'active' : ''}`}
          onClick={() => switchType('work')}
          disabled={state.isRunning}
        >
          Work (25m)
        </button>
        <button
          className={`type-btn ${state.currentType === 'short_break' ? 'active' : ''}`}
          onClick={() => switchType('short_break')}
          disabled={state.isRunning}
        >
          Short Break (5m)
        </button>
        <button
          className={`type-btn ${state.currentType === 'long_break' ? 'active' : ''}`}
          onClick={() => switchType('long_break')}
          disabled={state.isRunning}
        >
          Long Break (15m)
        </button>
      </div>
    </div>
  );
}