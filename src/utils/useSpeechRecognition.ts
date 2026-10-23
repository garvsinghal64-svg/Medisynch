import { useState, useEffect, useRef, useCallback } from 'react';

// Format spoken medical punctuation
export function formatMedicalDictation(text: string): string {
  let formatted = text;
  formatted = formatted.replace(/\bperiod\b/gi, '.');
  formatted = formatted.replace(/\bcomma\b/gi, ',');
  formatted = formatted.replace(/\bcolon\b/gi, ':');
  formatted = formatted.replace(/\bsemicolon\b/gi, ';');
  formatted = formatted.replace(/\bquestion mark\b/gi, '?');
  formatted = formatted.replace(/\bexclamation mark\b/gi, '!');
  formatted = formatted.replace(/\bnew line\b/gi, '\n');
  formatted = formatted.replace(/\bnext line\b/gi, '\n');
  formatted = formatted.replace(/\bnew paragraph\b/gi, '\n\n');
  return formatted;
}

export function useSpeechRecognition() {
  const [isListening, setIsListening] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const targetSectionRef = useRef<string | null>(null);
  const onTextCallbackRef = useRef<((text: string, section: string) => void) | null>(null);
  const isStartedRef = useRef(false);
  const isStartingRef = useRef(false);

  // Check speech recognition support once on mount
  useEffect(() => {
    const SpeechRecognition =
      typeof window !== 'undefined'
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;

    if (!SpeechRecognition) {
      setIsSupported(false);
    }

    // Listen for global stop-speech event (e.g. from modal or another component)
    const handleGlobalStop = () => {
      stopListening();
    };
    window.addEventListener('clinical:stop-speech', handleGlobalStop);

    return () => {
      window.removeEventListener('clinical:stop-speech', handleGlobalStop);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onstart = null;
          recognitionRef.current.onresult = null;
          recognitionRef.current.onerror = null;
          recognitionRef.current.onend = null;
          recognitionRef.current.abort();
        } catch {
          // ignore cleanup errors
        }
      }
    };
  }, []);

  const stopListening = useCallback(() => {
    isStartingRef.current = false;
    isStartedRef.current = false;
    setIsListening(false);
    setActiveSection(null);
    targetSectionRef.current = null;
    onTextCallbackRef.current = null;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.stop();
      } catch {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
      recognitionRef.current = null;
    }
  }, []);

  const startListening = useCallback((section: string, onText: (text: string, section: string) => void) => {
    const SpeechRecognitionClass =
      typeof window !== 'undefined'
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;

    if (!SpeechRecognitionClass) {
      setErrorMessage('Web Speech API is not supported in this browser. Try Google Chrome, Edge, or Safari.');
      return;
    }

    // Always update target callback and section
    targetSectionRef.current = section;
    onTextCallbackRef.current = onText;
    setActiveSection(section);

    // If already listening or in process of starting, just switch the active target section!
    // NO need to call recognition.start() again, which causes InvalidStateError!
    if (isStartedRef.current || isStartingRef.current) {
      setIsListening(true);
      return;
    }

    // Clean up any stale recognition instance before creating fresh one
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }

    try {
      isStartingRef.current = true;
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        isStartingRef.current = false;
        isStartedRef.current = true;
        setIsListening(true);
        setErrorMessage(null);
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }

        if (finalTranscript && targetSectionRef.current && onTextCallbackRef.current) {
          const cleaned = formatMedicalDictation(finalTranscript.trim());
          onTextCallbackRef.current(cleaned, targetSectionRef.current);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition event:', event.error);
        if (event.error === 'no-speech') {
          // Non-fatal momentary silence
          return;
        }
        if (event.error === 'aborted') {
          isStartingRef.current = false;
          isStartedRef.current = false;
          setIsListening(false);
          setActiveSection(null);
          return;
        }
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setErrorMessage('Microphone access was denied. Please allow microphone permissions in your browser.');
        } else if (event.error === 'network') {
          setErrorMessage('Speech recognition network error. Please verify internet connection.');
        }
        isStartingRef.current = false;
        isStartedRef.current = false;
        setIsListening(false);
        setActiveSection(null);
        targetSectionRef.current = null;
      };

      recognition.onend = () => {
        isStartingRef.current = false;
        isStartedRef.current = false;
        setIsListening(false);
        setActiveSection(null);
        targetSectionRef.current = null;
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      isStartingRef.current = false;
      // Handle "recognition has already started" error gracefully
      if (
        err?.name === 'InvalidStateError' ||
        (typeof err?.message === 'string' && err.message.toLowerCase().includes('already started'))
      ) {
        console.warn('Speech recognition is already running. Switched active section safely.');
        isStartedRef.current = true;
        setIsListening(true);
        setActiveSection(section);
        return;
      }
      console.warn('Failed to start speech recognition:', err);
      isStartedRef.current = false;
      setIsListening(false);
      setActiveSection(null);
      setErrorMessage('Could not initialize microphone. Please check browser permissions.');
    }
  }, [stopListening]);

  const toggleListening = useCallback((section: string, onText: (text: string, section: string) => void) => {
    // If we're already listening to this exact section, stop.
    if ((isListening || isStartedRef.current) && activeSection === section) {
      stopListening();
    } else {
      // If we're already listening to another section, or idle, switch/start.
      startListening(section, onText);
    }
  }, [isListening, activeSection, startListening, stopListening]);

  return {
    isListening,
    activeSection,
    isSupported,
    errorMessage,
    startListening,
    stopListening,
    toggleListening,
    clearError: () => setErrorMessage(null),
  };
}
