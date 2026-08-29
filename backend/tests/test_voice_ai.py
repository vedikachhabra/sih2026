import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services.voice_ai.translation_engine import indic_translator
from backend.app.services.voice_ai.tts_engine import indic_tts
from backend.app.services.voice_ai.asr_engine import indic_asr
from backend.app.services.voice_ai.transliteration_engine import indic_xlit

client = TestClient(app)

def test_indic_trans2_translation():
    res = indic_translator.translate("Good morning! It is time to take your morning medication with fresh water.", "en", "as")
    assert res["tgt_lang"] == "asm_Beng"
    assert "ঔষধ" in res["translated_text"]

    res_mizo = indic_translator.translate("Good morning! It is time to take your morning medication with fresh water.", "en", "lus")
    assert res_mizo["tgt_lang"] == "lus_Latn"
    assert "damdawi" in res_mizo["translated_text"].lower()

def test_tts_audio_synthesis():
    # Test Assamese Parler-TTS synthesis
    res_as = indic_tts.synthesize("নমস্কাৰ প্ৰিয়ম ডাঙৰীয়া।", "as")
    assert res_as["content_type"] == "audio/wav"
    assert len(res_as["audio_bytes"]) > 1000

    # Test Khasi Meta MMS-TTS synthesis
    res_kha = indic_tts.synthesize("Khublei shibun!", "kha")
    assert res_kha["sample_rate"] == 16000
    assert len(res_kha["audio_bytes"]) > 1000

def test_asr_speech_to_text():
    res = indic_asr.transcribe_audio(b"fake_audio_stream", "as")
    assert res["language"] == "as"
    assert res["intent"] == "medication_taken"

def test_indic_xlit_transliteration():
    res_as = indic_xlit.transliterate("namaskar priyom barua")
    assert "নমস্কাৰ" in res_as["transliterated_text"]
    assert "প্ৰিয়ম" in res_as["transliterated_text"]

    # Test Meitei Mayek script conversion
    res_mni = indic_xlit.transliterate("khurumjari hidak", target_lang="mni", script="mni_Mtei")
    assert res_mni["script"] == "Meitei Mayek (mni_Mtei)"
    assert "ꯈꯨꯔꯨꯃꯖꯔꯤ" in res_mni["transliterated_text"]

def test_voice_api_endpoints():
    # 1. Translate API
    r_tr = client.post("/api/v1/voice/translate", json={
        "text": "Wonderful work! Your answer is correct and your session is completed.",
        "src_lang": "en",
        "tgt_lang": "bn"
    })
    assert r_tr.status_code == 200
    assert "চমৎকার" in r_tr.json()["translated_text"]

    # 2. TTS API
    r_tts = client.post("/api/v1/voice/tts", json={
        "text": "আপোনাৰ ঔষধ খোৱাৰ সময় হৈছে।",
        "lang": "as",
        "emotion": "calm"
    })
    assert r_tts.status_code == 200
    assert r_tts.headers["content-type"] == "audio/wav"
    assert len(r_tts.content) > 500

    # 3. Models Status API
    r_stat = client.get("/api/v1/voice/models/status")
    assert r_stat.status_code == 200
    data = r_stat.json()
    assert "indic_trans2" in data
    assert "indic_parler_tts" in data
    assert "meta_mms_tts" in data
    assert "indic_whisper" in data
    assert "indic_xlit" in data
