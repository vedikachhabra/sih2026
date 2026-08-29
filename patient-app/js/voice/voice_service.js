// Multilingual Voice AI Service: Spoken Audio Prompts & Speech Recognition Assistant
class VoiceService {
  constructor() {
    this.currentLanguage = localStorage.getItem("patient_language") || "as";
    this.synth = window.speechSynthesis;
    this.isListening = false;
    this.recognition = null;
    this.onStateChange = null;
    this.onTranscript = null;
    this.initSpeechRecognition();
  }

  setLanguage(langCode) {
    if (TRANSLATIONS[langCode]) {
      this.currentLanguage = langCode;
      localStorage.setItem("patient_language", langCode);
      if (this.recognition) {
        this.recognition.lang = this.getSpeechLocale(langCode);
      }
    }
  }

  getSpeechLocale(langCode = this.currentLanguage) {
    const bcp47Map = {
      as: "as-IN",
      bn: "bn-IN",
      hi: "hi-IN",
      en: "en-IN",
      mni: "bn-IN",
      kha: "en-IN",
      lus: "en-IN"
    };
    return bcp47Map[langCode] || "en-IN";
  }

  getTranslation(key) {
    const langData = TRANSLATIONS[this.currentLanguage] || TRANSLATIONS.en;
    return langData[key] || TRANSLATIONS.en[key] || key;
  }

  speak(textOrPromptKey, onEndCallback = null) {
    if (!this.synth) return;
    try {
      this.synth.cancel(); // Stop any previous speech
    } catch (e) {}

    let textToSpeak = textOrPromptKey;
    const langData = TRANSLATIONS[this.currentLanguage] || TRANSLATIONS.en;
    
    if (langData.spoken_prompts && langData.spoken_prompts[textOrPromptKey]) {
      textToSpeak = langData.spoken_prompts[textOrPromptKey];
    }

    try {
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.rate = 0.85; // Geriatric gentle, clear pace
      utterance.pitch = 1.0;
      utterance.lang = this.getSpeechLocale();

      // Match voices if browser provides regional voices
      const voices = this.synth.getVoices();
      if (voices && voices.length > 0) {
        const matchingVoice = voices.find(v => 
          v.lang.startsWith(utterance.lang) || 
          v.lang.startsWith(this.currentLanguage) ||
          v.lang.startsWith("hi") ||
          v.lang.startsWith("bn")
        );
        if (matchingVoice) utterance.voice = matchingVoice;
      }

      if (onEndCallback) {
        utterance.onend = () => onEndCallback();
      }

      this.synth.speak(utterance);
    } catch (err) {
      console.warn("Speech synthesis unavailable:", err);
      if (onEndCallback) onEndCallback();
    }
  }

  initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("SpeechRecognition not supported in this browser.");
      return;
    }

    try {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 3;
      this.recognition.lang = this.getSpeechLocale();

      this.recognition.onstart = () => {
        this.isListening = true;
        if (this.onStateChange) this.onStateChange(true);
      };

      this.recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        const text = (finalTranscript || interimTranscript).trim();
        if (this.onTranscript) this.onTranscript(text, Boolean(finalTranscript));

        if (finalTranscript) {
          console.log("Voice recognized:", finalTranscript);
          this.handleVoiceCommand(finalTranscript.toLowerCase());
        }
      };

      this.recognition.onerror = (event) => {
        console.warn("Speech recognition error:", event.error);
        this.isListening = false;
        if (this.onStateChange) this.onStateChange(false, event.error);
      };

      this.recognition.onend = () => {
        this.isListening = false;
        if (this.onStateChange) this.onStateChange(false);
      };
    } catch (err) {
      console.error("SpeechRecognition initialization failed:", err);
    }
  }

  startListening(onTranscript = null, onStateChange = null) {
    if (!this.recognition) {
      this.initSpeechRecognition();
    }
    if (!this.recognition) {
      this.speak("Speech recognition is not supported in this browser.");
      return;
    }

    this.onTranscript = onTranscript;
    this.onStateChange = onStateChange;
    this.recognition.lang = this.getSpeechLocale();

    try {
      this.recognition.start();
    } catch (e) {
      console.warn("Speech recognition already active or restarting:", e);
    }
  }

  stopListening() {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (e) {}
    }
    this.isListening = false;
    if (this.onStateChange) this.onStateChange(false);
  }

  toggleListening(onTranscript = null, onStateChange = null) {
    if (this.isListening) {
      this.stopListening();
    } else {
      this.startListening(onTranscript, onStateChange);
    }
  }

  handleVoiceCommand(cmd) {
    const normalized = cmd.toLowerCase().trim();
    console.log("Processing Voice Command:", normalized);

    // Multilingual Keywords Dictionary:
    // 1. Home / Navigation
    const homeWords = ["home", "main", "menu", "back", "ghor", "ghar", "bari", "ঘৰ", "বাড়ি", "ঘর", "होम", "ing", "in"];
    if (homeWords.some(w => normalized.includes(w))) {
      this.speak("Navigating to Home screen.");
      if (window.patientApp) window.patientApp.renderHome();
      return;
    }

    // 2. Memory Pairs Game
    const memoryWords = ["memory", "pair", "card", "smriti", "yaad", "স্মৃতি", "খেলা", "खेल", "याद", "khel"];
    if (memoryWords.some(w => normalized.includes(w))) {
      this.speak("Starting Memory Pairs Game.");
      if (window.patientApp) window.patientApp.launchGame("memory");
      return;
    }

    // 3. Attention Focus Game
    const attentionWords = ["attention", "focus", "odd", "monojog", "dhyan", "মনোযোগ", "ध्यान"];
    if (attentionWords.some(w => normalized.includes(w))) {
      this.speak("Starting Attention and Focus Game.");
      if (window.patientApp) window.patientApp.launchGame("attention");
      return;
    }

    // 4. Sequencing Routine Game
    const seqWords = ["sequence", "sequencing", "step", "order", "kram", "ধাপ", "ক্রম", "क्रम", "ryntih"];
    if (seqWords.some(w => normalized.includes(w))) {
      this.speak("Starting Daily Sequencing Game.");
      if (window.patientApp) window.patientApp.launchGame("sequencing");
      return;
    }

    // 5. Pattern Match Game
    const patternWords = ["pattern", "shape", "weave", "naksha", "নক্সা", "নকশা", "नक्शा"];
    if (patternWords.some(w => normalized.includes(w))) {
      this.speak("Starting Pattern Recognition Game.");
      if (window.patientApp) window.patientApp.launchGame("pattern");
      return;
    }

    // 6. Medication & Pills
    const medWords = ["medicine", "pill", "tablet", "dawa", "dawai", "oukhodh", "oushodh", "ঔষধ", "ওষুধ", "दवा", "दवाई", "damdawi", "dawai"];
    if (medWords.some(w => normalized.includes(w))) {
      if (normalized.includes("took") || normalized.includes("খাই") || normalized.includes("খেয়ে") || normalized.includes("ली") || normalized.includes("done")) {
        this.speak("Good job! Marking your morning medication as taken.");
        if (window.patientApp) window.patientApp.markMedicationTaken();
      } else {
        this.speak("Opening medication reminder.");
        if (window.patientApp) window.patientApp.openMedicationModal();
      }
      return;
    }

    // 7. Caregiver Emergency Call
    const callWords = ["caregiver", "emergency", "call", "phone", "help", "doctor", "anjali", "sahay", "madad", "জরুরি", "সহায়", "সাহায্য", "मदद", "ফোন", "कॉल"];
    if (callWords.some(w => normalized.includes(w))) {
      if (window.patientApp) window.patientApp.triggerCaregiverCall();
      return;
    }

    // 8. Mood Log
    const moodWords = ["mood", "feeling", "happy", "sad", "calm", "মন", "মস্তিষ্ক", "मूड"];
    if (moodWords.some(w => normalized.includes(w))) {
      this.speak("How are you feeling right now? Very happy, calm, okay, or sad?");
      return;
    }

    // 9. Generic Help fallback
    this.speak("I heard: " + normalized + ". You can say: Home, Play Memory Game, Medicine, or Call Caregiver.");
  }
}

const voiceService = new VoiceService();

