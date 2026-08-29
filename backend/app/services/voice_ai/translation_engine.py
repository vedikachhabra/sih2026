import os
from typing import Dict, Any, List, Optional

class IndicTranslationEngine:
    """
    IndicTrans2 Machine Translation Engine:
    - Primary Model: ai4bharat/indictrans2-en-indic-1B & indictrans2-indic-indic-1B
    - Supported Language Codes:
        * Assamese: asm_Beng
        * Bengali: ben_Beng
        * Manipuri: mni_Beng / mni_Mtei
        * Hindi: hin_Deva
        * English: eng_Latn
        * Khasi: kha_Latn
        * Mizo: lus_Latn
    - Supports CTranslate2 (INT8) quantization for offline sub-100ms CPU execution.
    - Fallback heuristic dictionary for zero-dependency instant startup.
    """

    LANG_MAP = {
        "as": "asm_Beng",
        "bn": "ben_Beng",
        "mni": "mni_Beng",
        "mni_mtei": "mni_Mtei",
        "hi": "hin_Deva",
        "en": "eng_Latn",
        "kha": "kha_Latn",
        "lus": "lus_Latn"
    }

    # High-precision clinical & geriatric cognitive lexicon fallback
    CORE_LEXICON = {
        "medication_reminder": {
            "en": "Good morning! It is time to take your morning medication with fresh water.",
            "as": "নমস্কাৰ! আপোনাৰ ৰাতিপুৱাৰ ঔষধ খোৱাৰ সময় হৈছে।",
            "bn": "নমস্কার! আপনার সকালের ওষুধ খাওয়ার সময় হয়েছে।",
            "mni": "অয়ুক্কী হীদাক চাবগী মতম ওইরে।",
            "lus": "Chawhmeh leh damdawi ei a hun ta le.",
            "kha": "Ka por ban dih dawai step ka la dei.",
            "hi": "नमस्कार! आपकी सुबह की दवा लेने का समय हो गया है।"
        },
        "game_completed": {
            "en": "Wonderful work! Your answer is correct and your session is completed.",
            "as": "বৰ ধুনীয়া কাম! আপোনাৰ খেলটো সফলতাৰে সম্পূৰ্ণ হৈছে।",
            "bn": "খুব চমৎকার কাজ করেছেন! আপনার উত্তরটি সঠিক হয়েছে।",
            "mni": "য়াম্না ফরে! মপুং ফারে!",
            "lus": "I ti tha hle mai! Zo fel ta!",
            "kha": "Phi la leh bha shibun! Lah dep!",
            "hi": "बहुत बढ़िया काम! आपका उत्तर सही है।"
        },
        "memory_instruction": {
            "en": "Look at the cards and match the identical pairs.",
            "as": "কাৰ্ডবোৰত স্পৰ্শ কৰি একে ধৰণৰ যোৰাবোৰ মিলাওক।",
            "bn": "কার্ডগুলোতে স্পর্শ করে জোড়াগুলো মিলিয়ে নিন।",
            "mni": "মসিগী ময়েক অসি য়েংশিন্নু অমসুং চাপানবা অদু খনবীইউ।",
            "lus": "Card inang te hi zawng chhuak rawh le.",
            "kha": "Kyntiew ia la ka jingkynmaw da kaba jied ia kine.",
            "hi": "कार्ड देखकर समान जोड़ों का मिलान करें।"
        }
    }

    def __init__(self, model_dir: Optional[str] = None):
        self.model_dir = model_dir or os.path.join(os.path.dirname(__file__), "../../../models/indictrans2_ct2")
        self.is_neural_ready = False
        self.ct2_model = None
        self.sp_processor = None
        self._init_engine()

    def _init_engine(self):
        if os.path.exists(self.model_dir):
            try:
                import ctranslate2
                import sentencepiece as spm
                sp_model_path = os.path.join(self.model_dir, "spm.model")
                if os.path.exists(sp_model_path):
                    self.sp_processor = spm.SentencePieceProcessor()
                    self.sp_processor.load(sp_model_path)
                    self.ct2_model = ctranslate2.Translator(self.model_dir, device="cpu", compute_type="int8")
                    self.is_neural_ready = True
            except Exception as e:
                self.is_neural_ready = False

    def translate(self, text: str, src_lang: str, tgt_lang: str) -> Dict[str, Any]:
        src_code = self.LANG_MAP.get(src_lang.lower(), "eng_Latn")
        tgt_code = self.LANG_MAP.get(tgt_lang.lower(), "asm_Beng")

        if src_lang.lower() == tgt_lang.lower():
            return {"translated_text": text, "src_lang": src_code, "tgt_lang": tgt_code, "engine": "identity"}

        # 1. If CT2 INT8 weights are loaded on disk
        if self.is_neural_ready and self.ct2_model and self.sp_processor:
            try:
                tagged_text = f"__{tgt_code}__ {text}"
                tokens = self.sp_processor.encode(tagged_text, out_type=str)
                results = self.ct2_model.translate_batch([tokens])
                output_tokens = results[0].hypotheses[0]
                translated = self.sp_processor.decode(output_tokens)
                return {
                    "translated_text": translated.replace(f"__{tgt_code}__", "").strip(),
                    "src_lang": src_code,
                    "tgt_lang": tgt_code,
                    "engine": "indictrans2_ct2_int8"
                }
            except Exception:
                pass

        # 2. Heuristic Lexicon matching
        for key, lang_dict in self.CORE_LEXICON.items():
            if any(text.lower().strip() == v.lower().strip() for v in lang_dict.values()):
                if tgt_lang.lower() in lang_dict:
                    return {
                        "translated_text": lang_dict[tgt_lang.lower()],
                        "src_lang": src_code,
                        "tgt_lang": tgt_code,
                        "engine": "indictrans2_clinical_lexicon"
                    }

        # 3. Transparent Fallback
        return {
            "translated_text": text,
            "src_lang": src_code,
            "tgt_lang": tgt_code,
            "engine": "indictrans2_passthrough"
        }

indic_translator = IndicTranslationEngine()
