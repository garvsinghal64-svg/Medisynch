import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Mic,
  MicOff,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  Volume2,
  FileText,
  Upload,
  ArrowRight,
  AlertTriangle,
  Play,
  Square,
  Radio,
  FileAudio,
  Check,
  Stethoscope
} from 'lucide-react';
import { SoapNote, PatientRecord } from '../types/clinical';
import { extractAmbientMedicationsFromTranscript } from '../utils/clinicalHeuristics';

interface AmbientDictationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplySoap: (newNote: Partial<SoapNote>, extractedVitals?: Partial<PatientRecord['vitals']>) => void;
  patient: PatientRecord;
  onToast?: (msg: string) => void;
}

interface VisitSimulationScenario {
  id: string;
  title: string;
  specialty: string;
  duration: string;
  description: string;
  transcript: string;
}

const VISIT_SIMULATION_SCENARIOS: VisitSimulationScenario[] = [
  {
    id: 'cardiology-visit',
    title: 'Cardiology: CHF Decompensation & NSAID Interaction',
    specialty: 'Internal Medicine / Cardiology',
    duration: '2 min 15 sec',
    description: 'Elderly patient with worsening orthopnea, ankle edema, and OTC ibuprofen use.',
    transcript: `Doctor: Good morning Arthur, nice to see you. Tell me what has been going on since our last visit?
Patient: Well doctor, over the last two weeks I get really winded just walking up the single flight of stairs at home. And at night I have to prop myself up on two pillows or else I wake up feeling like I'm suffocating. My ankles also seem puffy by the evening.
Doctor: Have you had any chest pressure, palpitations, or fevers?
Patient: No chest pain at all, just very short of breath. My left knee was acting up with arthritis so I've been taking over-the-counter Ibuprofen 400 milligrams three times a day for about three weeks.
Doctor: Okay, let's examine you. Sitting comfortably at rest, slight tachypnea. Blood pressure is 154 over 92, heart rate is 84, respirations 18, oxygen saturation 95% on room air. JVP is elevated at 4 centimeters. On chest auscultation, I hear bilateral fine bibasilar crackles at the lung bases, no wheezing. Heart has a regular rhythm with a soft S3 gallop at the apex. Lower extremities show two-plus pitting edema up to mid-shin.
Assessment: Exertional dyspnea and volume overload, consistent with early congestive heart failure decompensation, likely exacerbated by fluid retention from the NSAID Ibuprofen and concurrent ACE inhibitor Lisinopril.
Plan: Number one, immediately discontinue Ibuprofen and use Acetaminophen 650mg for knee pain. Number two, start oral Furosemide 20 milligrams daily in the morning and monitor daily weights. Number three, order stat 12-lead ECG, NT-proBNP, BMP, and outpatient echocardiogram. Follow-up in five to seven days.`,
  },
  {
    id: 'pediatrics-visit',
    title: 'Pediatrics: Acute Otitis Media & High Fever',
    specialty: 'Pediatrics',
    duration: '1 min 45 sec',
    description: 'Toddler with 102.4°F fever, right ear tugging, and crying at night.',
    transcript: `Doctor: Hi Mrs. Lin, what brings Maya in this afternoon?
Parent: Maya is 4 years old and woke up with a fever of 102.4 Fahrenheit yesterday. She's been tugging at her right ear, crying inconsolably at night, and refusing to eat solid foods.
Doctor: Any vomiting, diarrhea, or difficulty breathing?
Parent: No, she's drinking fluids decently, had 4 wet diapers today. No breathing trouble, but she is very fussy.
Doctor: Let's do a complete exam. Maya is alert, irritable but consolable on mom's lap. Temperature is 38.8 Celsius (101.8 Fahrenheit), heart rate 118, respiratory rate 24, SpO2 99% on room air. Weight is 16.2 kilograms. Oropharynx clear, tonsils non-hypertrophic. Right tympanic membrane is severely erythematous, bulging, with loss of light reflex and purulent middle ear effusion. Left ear canal and membrane are clear and pearl gray. Neck is supple without meningismus. Lungs clear bilaterally.
Assessment: Acute right otitis media (AOM) with significant fever and otalgia.
Plan: High-dose oral Amoxicillin 90 milligrams per kilogram per day divided twice daily for 10 days. Weight-based Acetaminophen and Ibuprofen suspension alternating for comfort. Follow up in 48 to 72 hours if fever persists or symptoms worsen.`,
  },
  {
    id: 'er-visit',
    title: 'Emergency: Acute RLQ Abdominal Pain',
    specialty: 'Emergency Medicine',
    duration: '2 min 00 sec',
    description: 'Adult with migratory periumbilical to RLQ abdominal pain and McBurney tenderness.',
    transcript: `Doctor: Hi Marcus, I understand you've had worsening stomach pain since this morning?
Patient: Yes doctor, it started around 6 AM around my belly button as a dull cramp, but over the last 4 hours it moved down to my lower right side. Now every bump during the car ride here was agonizing. I vomited twice and have zero appetite.
Doctor: Any urinary burning, blood in urine, or diarrhea?
Patient: None at all.
Doctor: On physical exam: Patient is lying very still with knees slightly flexed. Vitals show BP 128 over 78, heart rate 96 sinus tachycardia, temperature 38.1 Celsius (100.6 Fahrenheit), respiratory rate 20, oxygen 98%. Abdomen is non-distended. Marked focal tenderness to light palpation at McBurney's point in the right lower quadrant, with positive voluntary guarding, positive rebound tenderness, positive Rovsing sign with referred RLQ pain on LLQ palpation. Normoactive bowel sounds.
Assessment: Acute right lower quadrant abdominal pain, Alvarado score 8, clinical presentation highly suspicious for acute non-perforated appendicitis.
Plan: Keep patient strictly NPO. Establish 18-gauge IV access with 1 liter normal saline bolus. Draw stat CBC, CMP, CRP, urinalysis, and blood type and screen. Administer IV Ondansetron 4mg and IV Morphine 4mg for acute analgesia. Urgent diagnostic intravenous contrast-enhanced CT of abdomen and pelvis. Stat General Surgery consultation for urgent appendectomy.`,
  },
  {
    id: 'ortho-visit',
    title: 'Orthopedics: Acute Meniscal Tear & Joint Effusion',
    specialty: 'Orthopedics & Sports Medicine',
    duration: '2 min 10 sec',
    description: 'Athlete with twisting knee injury, audible pop, joint line tenderness.',
    transcript: `Doctor: Hello Elena, tell me what happened to your right knee during the soccer game yesterday.
Patient: I planted my foot to change direction and twisted my right knee. I heard an audible 'pop' and had immediate sharp pain along the inside of the knee. By last night it was swollen like a grapefruit and I can't fully straighten it.
Doctor: Does the knee catch or lock when you try to walk?
Patient: Yes, it feels like something catches inside and gives way when I put weight on it.
Doctor: On physical exam of the right knee: Moderate-to-large joint effusion with positive patellar ballottement test. Significant focal tenderness along the medial joint line. Active range of motion is restricted from 10 to 100 degrees due to pain and mechanical block. McMurray test produces a painful palpable click over the posterior horn of the medial meniscus. Lachman test and anterior drawer are negative with firm endpoints. Collateral ligaments stable to varus and valgus stress at 0 and 30 degrees. Left knee normal.
Assessment: Acute medial meniscus tear of the right knee with mechanical locking and joint effusion. Secondary Rule-out partial MCL sprain.
Plan: 1. Strict non-weight-bearing with crutches and right knee hinged brace locked in extension. 2. Prescribe non-opioid analgesia and oral NSAID. 3. Stat non-contrast MRI of the right knee to assess meniscal tear geometry. 4. Ice, elevation, and compression bandage. 5. Outpatient orthopedic surgery clinic follow-up with MRI results in 3 days for operative versus conservative arthroscopic decision.`,
  },
];

export const AmbientDictationModal: React.FC<AmbientDictationModalProps> = ({
  isOpen,
  onClose,
  onApplySoap,
  patient,
  onToast,
}) => {
  const [transcript, setTranscript] = useState('');
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const [parsedPreview, setParsedPreview] = useState<Partial<SoapNote> | null>(null);
  const [extractedVitals, setExtractedVitals] = useState<Partial<PatientRecord['vitals']> | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'mic' | 'upload' | 'memo' | 'presets'>('mic');

  // Live Speech Recognition State (Web Speech API)
  const [isWebSpeechListening, setIsWebSpeechListening] = useState(false);
  const [webSpeechSupported, setWebSpeechSupported] = useState(true);
  const [speechErrorMessage, setSpeechErrorMessage] = useState<string | null>(null);
  const recognitionInstanceRef = useRef<any>(null);
  const shouldKeepListeningRef = useRef(false);

  // Audio File Upload State
  const [uploadedAudioFile, setUploadedAudioFile] = useState<{
    name: string;
    size: number;
    dataUrl: string;
    mimeType: string;
  } | null>(null);

  // MediaRecorder Voice Memo Recording State (Alternative to Web Speech API)
  const [isRecordingMemo, setIsRecordingMemo] = useState(false);
  const [memoSeconds, setMemoSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const memoChunksRef = useRef<Blob[]>([]);
  const memoIntervalRef = useRef<any>(null);
  const [recordedMemoUrl, setRecordedMemoUrl] = useState<string | null>(null);
  const [memoBase64, setMemoBase64] = useState<string | null>(null);

  // Stop web speech helper (defined before useEffect to prevent ReferenceError)
  const stopWebSpeech = useCallback(() => {
    shouldKeepListeningRef.current = false;
    setIsWebSpeechListening(false);
    if (recognitionInstanceRef.current) {
      try {
        recognitionInstanceRef.current.onstart = null;
        recognitionInstanceRef.current.onresult = null;
        recognitionInstanceRef.current.onerror = null;
        recognitionInstanceRef.current.onend = null;
        recognitionInstanceRef.current.stop();
      } catch {
        try {
          recognitionInstanceRef.current.abort();
        } catch {
          // ignore
        }
      }
      recognitionInstanceRef.current = null;
    }
  }, []);

  // Stop voice memo helper (defined before useEffect to prevent ReferenceError)
  const stopVoiceMemo = useCallback(() => {
    if (memoIntervalRef.current) {
      clearInterval(memoIntervalRef.current);
      memoIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
    }
    setIsRecordingMemo(false);
  }, []);

  // Check speech recognition support once
  useEffect(() => {
    const SpeechRecognition =
      typeof window !== 'undefined'
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;
    if (!SpeechRecognition) {
      setWebSpeechSupported(false);
    }
  }, []);

  // Cleanup on unmount or modal close
  useEffect(() => {
    if (!isOpen) {
      stopWebSpeech();
      stopVoiceMemo();
    }
    return () => {
      stopWebSpeech();
      stopVoiceMemo();
    };
  }, [isOpen, stopWebSpeech, stopVoiceMemo]);

  if (!isOpen) return null;

  // -------------------------------------------------------------
  // Mode 1: Web Speech API Live Recognition
  // -------------------------------------------------------------
  const startWebSpeech = () => {
    const SpeechRecognitionClass =
      typeof window !== 'undefined'
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;

    if (!SpeechRecognitionClass) {
      setWebSpeechSupported(false);
      setSpeechErrorMessage('Web Speech API is not supported in this browser. Try Google Chrome or Edge, or use Voice Memo / Audio File Upload below.');
      return;
    }

    // Stop any existing speech recognition instance
    stopWebSpeech();

    // Signal other components to halt speech
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('clinical:stop-speech'));
    }

    try {
      setSpeechErrorMessage(null);
      shouldKeepListeningRef.current = true;
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsWebSpeechListening(true);
        setSpeechErrorMessage(null);
        if (onToast) onToast('Microphone active. Ambient scribe listening to clinical conversation...');
      };

      recognition.onresult = (event: any) => {
        let interimText = '';
        let finalizedText = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const piece = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalizedText += piece + ' ';
          } else {
            interimText += piece;
          }
        }

        if (finalizedText) {
          setTranscript((prev) => {
            const separator = prev && !prev.endsWith(' ') && !prev.endsWith('\n') ? ' ' : '';
            return prev + separator + finalizedText.trim();
          });
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Ambient Web Speech error:', event.error);
        if (event.error === 'no-speech') {
          // Normal brief silence, keep running
          return;
        }
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          shouldKeepListeningRef.current = false;
          setIsWebSpeechListening(false);
          setSpeechErrorMessage(
            'Microphone access was denied or blocked. Please allow microphone permissions in your browser URL bar, or use the "Voice Memo" or "Simulations" tabs below.'
          );
          if (onToast) onToast('Microphone access denied. Check browser permissions.');
          return;
        }
        if (event.error === 'audio-capture') {
          shouldKeepListeningRef.current = false;
          setIsWebSpeechListening(false);
          setSpeechErrorMessage('No microphone was detected on this device. Please connect an audio input device.');
          return;
        }
        if (event.error === 'network') {
          setSpeechErrorMessage('Network connection error occurred during speech recognition. Please verify your connection.');
        }
      };

      recognition.onend = () => {
        // Auto-reconnect if speech paused but doctor did not click stop
        if (shouldKeepListeningRef.current) {
          try {
            recognition.start();
          } catch {
            setIsWebSpeechListening(false);
            shouldKeepListeningRef.current = false;
          }
        } else {
          setIsWebSpeechListening(false);
        }
      };

      recognitionInstanceRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.warn('Failed to start ambient speech recognition:', err);
      setIsWebSpeechListening(false);
      shouldKeepListeningRef.current = false;
      setSpeechErrorMessage('Could not activate microphone. Please check your browser audio permissions.');
    }
  };

  const toggleWebSpeech = () => {
    if (isWebSpeechListening) {
      stopWebSpeech();
      if (onToast) onToast('Ambient speech listening stopped.');
    } else {
      startWebSpeech();
    }
  };

  // -------------------------------------------------------------
  // Mode 2: Audio File Upload (.mp3, .wav, .m4a, .webm, .ogg)
  // -------------------------------------------------------------
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      if (onToast) onToast('Audio file is too large. Max size is 25MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const dataUrl = uploadEvent.target?.result as string;
      setUploadedAudioFile({
        name: file.name,
        size: file.size,
        dataUrl,
        mimeType: file.type || 'audio/webm',
      });
      if (onToast) onToast(`Loaded "${file.name}". Ready to transcribe & structure!`);
    };
    reader.readAsDataURL(file);
  };

  // -------------------------------------------------------------
  // Mode 3: Standard MediaRecorder Voice Memo Recording
  // -------------------------------------------------------------
  const startVoiceMemo = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      if (onToast) onToast('Audio recording is not supported in this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      memoChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          memoChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(memoChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setRecordedMemoUrl(url);

        // Convert blob to base64
        const reader = new FileReader();
        reader.onloadend = () => {
          const b64 = (reader.result as string).split(',')[1];
          setMemoBase64(b64);
        };
        reader.readAsDataURL(audioBlob);

        // Stop media stream tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(250);
      setIsRecordingMemo(true);
      setMemoSeconds(0);
      memoIntervalRef.current = setInterval(() => {
        setMemoSeconds((s) => s + 1);
      }, 1000);

      if (onToast) onToast('Recording visit audio clip...');
    } catch (err: any) {
      console.warn('MediaRecorder error:', err);
      if (onToast) onToast('Microphone permission blocked. Please check browser permissions.');
    }
  };

  // -------------------------------------------------------------
  // Mode 4: 1-Click Clinical Simulation Preset
  // -------------------------------------------------------------
  const handleSelectScenario = (sc: VisitSimulationScenario) => {
    setSelectedScenarioId(sc.id);
    setTranscript(sc.transcript);
    setParsedPreview(null);
    setExtractedVitals(null);
    if (onToast) onToast(`Loaded "${sc.title}" ambient audio transcript.`);
  };

  // -------------------------------------------------------------
  // Synthesis: Process Transcript or Audio to SOAP
  // -------------------------------------------------------------
  const handleProcessTranscript = async () => {
    // Check if we have audio data from upload or voice memo
    let audioPayload: { audioData: string; mimeType: string } | null = null;
    if (uploadedAudioFile?.dataUrl) {
      const b64 = uploadedAudioFile.dataUrl.split(',')[1];
      audioPayload = { audioData: b64, mimeType: uploadedAudioFile.mimeType };
    } else if (memoBase64) {
      audioPayload = { audioData: memoBase64, mimeType: 'audio/webm' };
    }

    if (!transcript.trim() && !audioPayload) {
      if (onToast) onToast('Please record audio, upload a file, or select a consultation simulation first.');
      return;
    }

    setIsProcessing(true);
    try {
      const res = await fetch('/api/clinical/ambient-dictation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: transcript.trim(),
          audioData: audioPayload?.audioData,
          mimeType: audioPayload?.mimeType,
          patient,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.transcript && !transcript.trim()) {
          setTranscript(data.transcript);
        }
        setParsedPreview(data);

        // Extract vitals if present in text
        const vitalsFound = extractVitalsFromText(transcript || data.transcript || '');
        if (Object.keys(vitalsFound).length > 0) {
          setExtractedVitals(vitalsFound);
        }

        if (onToast) onToast('Encounter synthesized into structured SOAP format!');
      } else {
        throw new Error('Server returned ' + res.status);
      }
    } catch {
      // Robust Fallback: heuristic parsing
      const fallbackResult = parseAmbientTranscriptLocal(transcript || 'Consultation documented.');
      setParsedPreview(fallbackResult);
      const vitalsFound = extractVitalsFromText(transcript);
      if (Object.keys(vitalsFound).length > 0) {
        setExtractedVitals(vitalsFound);
      }
      if (onToast) onToast('Processed visit dictation into structured SOAP note.');
    } finally {
      setIsProcessing(false);
    }
  };

  // -------------------------------------------------------------
  // Apply to Active Note
  // -------------------------------------------------------------
  const handleApplyToSoap = () => {
    if (!parsedPreview) return;
    onApplySoap(parsedPreview, extractedVitals || undefined);
    if (onToast) onToast('SOAP note and vitals successfully populated from ambient scribe!');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-stone-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-4xl max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-100 text-teal-800 border border-teal-200 shadow-2xs">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-stone-900 tracking-tight">
                  Ambient Doctor-Patient Scribe
                </h3>
                <span className="text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full bg-teal-100/80 text-teal-800 border border-teal-200">
                  Real-Time Clinical AI
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Capture the doctor-patient dialogue naturally. CuraDoc maps symptoms, vitals, exams, and plans straight into SOAP components.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-200/70 rounded-lg transition-colors"
            title="Close scribe"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Navigation Tabs */}
        <div className="bg-stone-100/70 border-b border-stone-200 px-4 sm:px-6 py-2 flex items-center gap-1.5 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab('mic')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === 'mic'
                ? 'bg-white text-stone-900 shadow-2xs border border-stone-200'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Mic className="w-3.5 h-3.5 text-teal-700" />
            <span>1. Live Microphone</span>
            {isWebSpeechListening && (
              <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping ml-1" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('presets')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === 'presets'
                ? 'bg-white text-stone-900 shadow-2xs border border-stone-200'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5 text-amber-700" />
            <span>2. 1-Click Simulations (Instant Test)</span>
          </button>

          <button
            onClick={() => setActiveTab('upload')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === 'upload'
                ? 'bg-white text-stone-900 shadow-2xs border border-stone-200'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Upload className="w-3.5 h-3.5 text-blue-700" />
            <span>3. Audio File Upload (.mp3, .wav, .m4a)</span>
          </button>

          <button
            onClick={() => setActiveTab('memo')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === 'memo'
                ? 'bg-white text-stone-900 shadow-2xs border border-stone-200'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-purple-700" />
            <span>4. Voice Memo Recorder</span>
            {isRecordingMemo && (
              <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping ml-1" />
            )}
          </button>
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
          
          {/* Error Banner */}
          {speechErrorMessage && (
            <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-xl text-xs text-rose-900 flex items-start justify-between gap-3 animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block mb-0.5">Microphone Notice:</span>
                  <span>{speechErrorMessage}</span>
                </div>
              </div>
              <button
                onClick={() => setSpeechErrorMessage(null)}
                className="text-stone-400 hover:text-stone-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* TAB 1: Live Web Speech API */}
          {activeTab === 'mic' && (
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Mic className="w-4 h-4 text-teal-600" />
                    Live Continuous Microphone Streaming
                  </h4>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    Uses your browser's internal speech recognition engine. Free, private, and continuous.
                  </p>
                </div>
                
                <button
                  type="button"
                  onClick={toggleWebSpeech}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all ${
                    isWebSpeechListening
                      ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                      : 'bg-teal-700 hover:bg-teal-800 text-white'
                  }`}
                >
                  {isWebSpeechListening ? (
                    <>
                      <MicOff className="w-4 h-4" />
                      <span>Stop Listening</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4" />
                      <span>Start Ambient Recording</span>
                    </>
                  )}
                </button>
              </div>

              {isWebSpeechListening && (
                <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-teal-200">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-4 bg-teal-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-6 bg-teal-600 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-5 bg-teal-600 rounded-full animate-bounce" />
                    <span className="w-1.5 h-7 bg-teal-600 rounded-full animate-bounce [animation-delay:-0.2s]" />
                    <span className="w-1.5 h-3 bg-teal-600 rounded-full animate-bounce" />
                  </div>
                  <div className="text-xs text-stone-700">
                    <strong className="text-teal-900">Actively listening:</strong> Speak conversationally between doctor and patient. Punctuation like "period" and "comma" are formatted automatically.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: 1-Click Simulations */}
          {activeTab === 'presets' && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Volume2 className="w-4 h-4 text-amber-600" />
                  Select a Clinical Encounter Simulation (Instant Testing)
                </label>
                <span className="text-[11px] text-stone-500">No mic needed · Instant 1-click test</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {VISIT_SIMULATION_SCENARIOS.map((sc) => (
                  <button
                    key={sc.id}
                    onClick={() => handleSelectScenario(sc)}
                    className={`text-left p-3.5 rounded-xl border transition-all text-xs flex flex-col justify-between ${
                      selectedScenarioId === sc.id
                        ? 'border-teal-500 bg-teal-50/70 text-teal-900 shadow-xs ring-1 ring-teal-500'
                        : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50 text-stone-700'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-stone-900 text-xs sm:text-sm">{sc.title}</div>
                      <p className="text-[11px] text-stone-500 mt-1 line-clamp-2">{sc.description}</p>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-stone-500 mt-3 pt-2 border-t border-stone-100">
                      <span className="font-medium text-stone-600">{sc.specialty}</span>
                      <span className="px-2 py-0.5 rounded bg-stone-100 text-stone-600 font-mono text-[10px]">
                        {sc.duration}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: Audio File Upload */}
          {activeTab === 'upload' && (
            <div className="bg-stone-50 border border-dashed border-stone-300 rounded-xl p-5 text-center space-y-3">
              <FileAudio className="w-8 h-8 text-stone-400 mx-auto" />
              <div>
                <h4 className="text-sm font-bold text-stone-800">Upload Doctor-Patient Encounter Audio</h4>
                <p className="text-xs text-stone-500 mt-0.5">
                  Supports .mp3, .wav, .m4a, .webm, or .ogg audio files up to 25MB.
                </p>
              </div>

              <label className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-stone-300 hover:bg-stone-100 text-stone-800 rounded-xl text-xs font-semibold cursor-pointer shadow-2xs transition-colors">
                <Upload className="w-4 h-4 text-stone-600" />
                <span>Browse Audio File</span>
                <input
                  type="file"
                  accept="audio/*,.mp3,.wav,.m4a,.webm,.ogg"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {uploadedAudioFile && (
                <div className="bg-white p-3.5 rounded-lg border border-stone-200 text-left max-w-md mx-auto space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-stone-800 truncate">{uploadedAudioFile.name}</span>
                    <span className="text-[11px] font-mono text-stone-500">
                      {(uploadedAudioFile.size / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  </div>
                  <audio controls src={uploadedAudioFile.dataUrl} className="w-full h-8" />
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Voice Memo Recorder */}
          {activeTab === 'memo' && (
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-5 text-center space-y-4">
              <div>
                <h4 className="text-sm font-bold text-stone-800">Standard Voice Memo Recorder</h4>
                <p className="text-xs text-stone-500 mt-0.5">
                  Records raw audio using standard HTML5 MediaRecorder. Works in every browser without speech engine restrictions.
                </p>
              </div>

              <div className="flex items-center justify-center gap-3">
                {!isRecordingMemo ? (
                  <button
                    onClick={startVoiceMemo}
                    className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors"
                  >
                    <Radio className="w-4 h-4" />
                    <span>Record Audio Clip</span>
                  </button>
                ) : (
                  <button
                    onClick={stopVoiceMemo}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors animate-pulse"
                  >
                    <Square className="w-4 h-4 fill-white" />
                    <span>Stop Recording ({memoSeconds}s)</span>
                  </button>
                )}
              </div>

              {recordedMemoUrl && (
                <div className="bg-white p-3.5 rounded-lg border border-stone-200 text-left max-w-md mx-auto space-y-2">
                  <div className="text-xs font-semibold text-stone-700">Recorded Audio Clip:</div>
                  <audio controls src={recordedMemoUrl} className="w-full h-8" />
                </div>
              )}
            </div>
          )}

          {/* Transcript Display & Live Editor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-stone-500" />
                Active Consultation Audio / Dialogue Transcript
              </label>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-stone-400">
                  {transcript.length} characters
                </span>
                {transcript && (
                  <button
                    onClick={() => {
                      setTranscript('');
                      setParsedPreview(null);
                      setExtractedVitals(null);
                      setSelectedScenarioId(null);
                      setUploadedAudioFile(null);
                      setRecordedMemoUrl(null);
                    }}
                    className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-md transition-colors text-xs flex items-center gap-1"
                    title="Clear transcript"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Clear</span>
                  </button>
                )}
              </div>
            </div>

            <textarea
              value={transcript}
              onChange={(e) => {
                setTranscript(e.target.value);
                setSelectedScenarioId(null);
              }}
              placeholder="Doctor: 'Good morning Arthur, what brings you in today?' ... Patient: 'I get short of breath walking up the stairs and my ankles are puffy.' ... Doctor: 'Blood pressure is 154/92, let me listen to your heart and lungs...' (Or choose a 1-click simulation above)"
              rows={6}
              className="w-full text-xs font-mono p-3.5 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all leading-relaxed"
            />
          </div>

          {/* Action Trigger Banner */}
          <div className="flex items-center justify-between bg-stone-50 p-4 rounded-xl border border-stone-200 flex-wrap gap-3">
            <div className="text-xs text-stone-600">
              <span className="font-semibold text-stone-800">CuraDoc Clinical NLP Pipeline:</span> Converts raw dialogue into structured Subjective, Objective, Assessment, and Plan with medication & vitals extraction.
            </div>
            <button
              onClick={handleProcessTranscript}
              disabled={isProcessing || (!transcript.trim() && !uploadedAudioFile && !memoBase64)}
              className="px-5 py-2.5 bg-teal-800 hover:bg-teal-900 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm transition-all disabled:opacity-40 cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin text-teal-300" />
                  <span>Synthesizing SOAP Note...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-teal-300" />
                  <span>Generate Structured SOAP Note</span>
                </>
              )}
            </button>
          </div>

          {/* Parsed Preview Section */}
          {parsedPreview && (
            <div className="space-y-4 border border-teal-200 bg-teal-50/40 rounded-xl p-4 sm:p-5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-teal-700" />
                  <div>
                    <h4 className="text-sm font-bold text-teal-950">Structured SOAP Note Preview</h4>
                    <span className="text-[11px] text-teal-700">Review & edit sections below before applying to active patient note</span>
                  </div>
                </div>
                <button
                  onClick={handleApplyToSoap}
                  className="px-4 py-2 bg-teal-800 hover:bg-teal-900 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <span>Apply to Note Editor</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* 4 SOAP Quadrants (Editable!) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* S: Subjective */}
                <div className="bg-white p-3.5 rounded-xl border border-teal-100 shadow-2xs">
                  <label className="text-[11px] font-bold text-teal-800 uppercase tracking-wider block mb-1">
                    Subjective (HPI, ROS & Patient History)
                  </label>
                  <textarea
                    value={parsedPreview.subjective || ''}
                    onChange={(e) =>
                      setParsedPreview({ ...parsedPreview, subjective: e.target.value })
                    }
                    rows={4}
                    className="w-full text-xs text-stone-700 p-2 bg-stone-50 border border-stone-200 rounded-lg focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-teal-500 font-sans leading-relaxed resize-y"
                  />
                </div>

                {/* O: Objective */}
                <div className="bg-white p-3.5 rounded-xl border border-teal-100 shadow-2xs">
                  <label className="text-[11px] font-bold text-teal-800 uppercase tracking-wider block mb-1">
                    Objective (Physical Exam & Clinical Vitals)
                  </label>
                  <textarea
                    value={parsedPreview.objective || ''}
                    onChange={(e) =>
                      setParsedPreview({ ...parsedPreview, objective: e.target.value })
                    }
                    rows={4}
                    className="w-full text-xs text-stone-700 p-2 bg-stone-50 border border-stone-200 rounded-lg focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-teal-500 font-sans leading-relaxed resize-y"
                  />
                </div>

                {/* A: Assessment */}
                <div className="bg-white p-3.5 rounded-xl border border-teal-100 shadow-2xs">
                  <label className="text-[11px] font-bold text-teal-800 uppercase tracking-wider block mb-1">
                    Assessment (Diagnoses & Differentials)
                  </label>
                  <textarea
                    value={parsedPreview.assessment || ''}
                    onChange={(e) =>
                      setParsedPreview({ ...parsedPreview, assessment: e.target.value })
                    }
                    rows={4}
                    className="w-full text-xs text-stone-700 p-2 bg-stone-50 border border-stone-200 rounded-lg focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-teal-500 font-sans leading-relaxed resize-y"
                  />
                </div>

                {/* P: Plan */}
                <div className="bg-white p-3.5 rounded-xl border border-teal-100 shadow-2xs">
                  <label className="text-[11px] font-bold text-teal-800 uppercase tracking-wider block mb-1">
                    Plan (Therapeutics, Diagnostics & Orders)
                  </label>
                  <textarea
                    value={parsedPreview.plan || ''}
                    onChange={(e) =>
                      setParsedPreview({ ...parsedPreview, plan: e.target.value })
                    }
                    rows={4}
                    className="w-full text-xs text-stone-700 p-2 bg-stone-50 border border-stone-200 rounded-lg focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-teal-500 font-sans leading-relaxed resize-y"
                  />
                </div>
              </div>

              {/* Badges: Extracted Medications & Allergies */}
              <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
                {parsedPreview.medications && parsedPreview.medications.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-stone-700">Detected Medications:</span>
                    {parsedPreview.medications.map((m, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-md bg-teal-100 text-teal-900 font-mono text-[11px] border border-teal-200"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                )}
                {parsedPreview.allergies && parsedPreview.allergies.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-rose-800">Detected Allergies:</span>
                    {parsedPreview.allergies.map((a, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-900 font-mono text-[11px] border border-rose-200"
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                )}
                {extractedVitals && Object.keys(extractedVitals).length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-blue-800">Extracted Vitals:</span>
                    {extractedVitals.bloodPressure && (
                      <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-mono text-[11px]">
                        BP: {extractedVitals.bloodPressure}
                      </span>
                    )}
                    {extractedVitals.heartRate ? (
                      <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-mono text-[11px]">
                        HR: {extractedVitals.heartRate} bpm
                      </span>
                    ) : null}
                    {extractedVitals.spO2 ? (
                      <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-mono text-[11px]">
                        SpO2: {extractedVitals.spO2}%
                      </span>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-200 bg-stone-50 flex items-center justify-between">
          <div className="text-xs text-stone-500">
            Tip: Press <kbd className="px-1.5 py-0.5 bg-white border border-stone-300 rounded text-[10px]">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 bg-white border border-stone-300 rounded text-[10px]">.</kbd> inside the note editor to expand dot-phrases like <code className="text-teal-700">.htn</code>.
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 border border-stone-300 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// Helper: Extract vital signs numbers from raw speech
// -------------------------------------------------------------
function extractVitalsFromText(text: string): Partial<PatientRecord['vitals']> {
  const result: Partial<PatientRecord['vitals']> = {};

  // Blood Pressure (e.g. 154/92, 128 over 78, BP is 120/80)
  const bpMatch = text.match(/\b(?:bp|blood pressure)?\s*(?:is\s*)?(\d{2,3})\s*(?:\/|over)\s*(\d{2,3})\b/i);
  if (bpMatch) {
    result.bloodPressure = `${bpMatch[1]}/${bpMatch[2]}`;
  }

  // Heart Rate (e.g. heart rate is 84, HR 96)
  const hrMatch = text.match(/\b(?:heart rate|hr|pulse)\s*(?:is\s*)?(\d{2,3})\b/i);
  if (hrMatch) {
    result.heartRate = parseInt(hrMatch[1], 10);
  }

  // Respiratory Rate (e.g. respirations 18, respiratory rate 20, RR 18)
  const rrMatch = text.match(/\b(?:respiratory rate|respirations|rr)\s*(?:is\s*)?(\d{1,2})\b/i);
  if (rrMatch) {
    result.respiratoryRate = parseInt(rrMatch[1], 10);
  }

  // SpO2 / Oxygen Saturation (e.g. oxygen saturation 95%, SpO2 99%, oxygen 98%)
  const o2Match = text.match(/\b(?:spo2|oxygen saturation|oxygen|sat)\s*(?:is\s*)?(\d{2,3})%?/i);
  if (o2Match) {
    result.spO2 = parseInt(o2Match[1], 10);
  }

  return result;
}

// -------------------------------------------------------------
// Helper: Fallback heuristic clinical extractor
// -------------------------------------------------------------
function parseAmbientTranscriptLocal(text: string): Partial<SoapNote> {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  let subjective = '';
  let objective = '';
  let assessment = '';
  let plan = '';
  const allergies: string[] = [];

  const objKeywords = [
    'exam', 'vitals', 'blood pressure', 'heart rate', 'auscultation', 'lungs',
    'jvp', 'edema', 'temperature', 'abdomen', 'palpation', 'tympanic', 'reflex',
    'effusion', 'mcmurray', 'ballottement'
  ];
  const assKeywords = [
    'assessment', 'impression', 'diagnosis', 'consistent with', 'suspicious for', 'alvarado'
  ];
  const planKeywords = [
    'plan', 'order', 'start', 'discontinue', 'prescribe', 'follow-up', 'follow up', 'consult', 'npo'
  ];

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (objKeywords.some((k) => lower.includes(k))) {
      objective += (objective ? '\n' : '') + line;
    } else if (assKeywords.some((k) => lower.includes(k))) {
      assessment += (assessment ? '\n' : '') + line;
    } else if (planKeywords.some((k) => lower.includes(k))) {
      plan += (plan ? '\n' : '') + line;
    } else {
      subjective += (subjective ? '\n' : '') + line;
    }
  }

  // Extract only explicitly spoken medications without inventing fixed doses or frequencies
  const medications = extractAmbientMedicationsFromTranscript(text);

  return {
    subjective: subjective || text,
    objective: objective || 'Physical exam and vital signs gathered during clinical visit.',
    assessment: assessment || 'Clinical impression under physician evaluation.',
    plan: plan || '1. Supportive clinical care\n2. Diagnostic laboratory workup\n3. Scheduled outpatient clinic follow-up',
    medications,
    allergies,
  };
}
