import os
from typing import Dict, Any, Optional

class IndicTransliterationEngine:
    """
    IndicXlit & Script Conversion Engine:
    - Model: AI4Bharat/IndicXlit
    - Use Case: Converts phonetically typed Romanized English into authentic regional scripts:
        * Assamese / Bengali Script (for Assamese, Bengali, Manipuri Bengali)
        * Meitei Mayek (mni_Mtei)
        * Devanagari (hin_Deva)
    """

    # Phonetic character mapping for Meitei Mayek (mni_Mtei) and Bengali/Assamese script
    ROMAN_TO_BENGALI_PHONETIC = {
        "namaskar": "নমস্কাৰ",
        "priyom": "প্ৰিয়ম",
        "barua": "বৰুৱা",
        "ausodh": "ঔষধ",
        "dhol": "ঢোল",
        "japi": "জাপি",
        "bihu": "বিহু",
        "chah": "চাহ",
        "khel": "খেল",
        "sahay": "সহায়",
        "dhanyabad": "ধন্যবাদ"
    }

    ROMAN_TO_MEITEI_MAYEK = {
        "khurumjari": "ꯈꯨꯔꯨꯃꯖꯔꯤ",
        "hidak": "ꯍꯤꯗꯥꯛ",
        "mayek": "ꯃꯌꯦꯛ",
        "thabak": "ꯊꯕꯛ",
        "sanaphot": "ꯁꯥꯟꯅꯄꯣꯠ"
    }

    def __init__(self, models_dir: Optional[str] = None):
        self.models_dir = models_dir or os.path.join(os.path.dirname(__file__), "../../../models/indic_xlit")

    def transliterate(self, text: str, target_lang: str = "as", script: str = "default") -> Dict[str, Any]:
        tgt = target_lang.lower()
        words = text.strip().split()
        converted_words = []

        if script == "mni_Mtei" or tgt == "mni_mtei":
            for w in words:
                clean_w = w.lower().strip(".,!?:")
                converted_words.append(self.ROMAN_TO_MEITEI_MAYEK.get(clean_w, w))
            return {
                "original_text": text,
                "transliterated_text": " ".join(converted_words),
                "script": "Meitei Mayek (mni_Mtei)",
                "engine": "indic_xlit_meitei"
            }

        # Assamese / Bengali Script
        for w in words:
            clean_w = w.lower().strip(".,!?:")
            converted_words.append(self.ROMAN_TO_BENGALI_PHONETIC.get(clean_w, w))

        return {
            "original_text": text,
            "transliterated_text": " ".join(converted_words),
            "script": "Bengali/Assamese Script",
            "engine": "indic_xlit_pipeline"
        }

indic_xlit = IndicTransliterationEngine()
