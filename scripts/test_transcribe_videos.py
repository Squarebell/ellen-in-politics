"""Verify Whisper receives decoded PCM without calling PyAV's file API."""
import tempfile
import unittest
import wave
from pathlib import Path
from types import SimpleNamespace

import numpy as np
from transcribe_videos import transcribe


class TranscriptionInputTests(unittest.TestCase):
    def test_passes_normalized_samples_and_keeps_timed_cues(self):
        class Model:
            def transcribe(self, audio, **options):
                np.testing.assert_allclose(audio, [-1.0, 0.0, 32767 / 32768])
                self_dtype = audio.dtype
                assert self_dtype == np.float32
                assert options['language'] == 'en'
                return iter([SimpleNamespace(start=0, end=1, text='Hello')]), None

        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'audio.wav'
            with wave.open(str(path), 'wb') as audio:
                audio.setparams((1, 2, 16000, 0, 'NONE', 'not compressed'))
                audio.writeframes(np.array([-32768, 0, 32767], dtype='<i2').tobytes())
            self.assertEqual(transcribe(Model(), path, None), [{'start': 0, 'end': 1, 'text': 'Hello'}])

    def test_rejects_audio_with_wrong_sample_rate(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'audio.wav'
            with wave.open(str(path), 'wb') as audio:
                audio.setparams((1, 2, 8000, 0, 'NONE', 'not compressed'))
                audio.writeframes(b'\x00\x00')
            with self.assertRaisesRegex(ValueError, '16 kHz'):
                transcribe(None, path, None)


if __name__ == '__main__':
    unittest.main()
