import { useCallback, useEffect, useRef, useState } from 'react';
import type { SupportedLanguage } from '../lib/types';
import type { TranslateFn } from '../lib/i18n';
import { api } from '../lib/api';
import { X, Microphone, StopCircle } from '@phosphor-icons/react';

type RecState = 'idle' | 'recording' | 'uploading';

interface VoiceRecorderProps {
  t: TranslateFn;
  lang: SupportedLanguage;
  onTranscript: (text: string) => void;
  onError: (message: string) => void;
  onListening: (listening: boolean) => void;
  busy: boolean;
}

const BAR_COUNT = 24;

export function VoiceRecorder({ t, lang, onTranscript, onError, onListening }: VoiceRecorderProps) {
  const [state, setState] = useState<RecState>('idle');
  const [seconds, setSeconds] = useState(0);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const levelsRef = useRef<number[]>(Array(BAR_COUNT).fill(0));
  const [levels, setLevels] = useState<number[]>(Array(BAR_COUNT).fill(0));
  const [permissionDenied, setPermissionDenied] = useState(false);

  const stopTimer = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };
  const stopLevels = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      stopTimer();
      stopLevels();
      mediaRef.current?.stream.getTracks().forEach((tr) => tr.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      onError(t('voice.unsupportedDetail'));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : '';
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.6;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Backend accepts only the bare MIME base, not "audio/webm;codecs=opus".
      const sendMime = recorder.mimeType.split(';')[0];

      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        void handleStop(sendMime);
        stream.getTracks().forEach((tr) => tr.stop());
        void ctx.close();
        stopLevels();
        analyserRef.current = null;
      };

      mediaRef.current = recorder;
      recorder.start(250);
      setSeconds(0);
      setPermissionDenied(false);
      setState('recording');
      onListening(true);

      timerRef.current = window.setInterval(() => setSeconds((s) => s + 1), 1000);
      const loop = () => {
        const analyser = analyserRef.current;
        if (analyser) {
          const data = new Uint8Array(analyser.frequencyBinCount);
          analyser.getByteFrequencyData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i++) sum += data[i];
          const avg = sum / data.length;
          const scaled = Math.min(1, avg / 90);
          levelsRef.current = [...levelsRef.current.slice(1), scaled];
          setLevels(levelsRef.current);
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    } catch (err) {
      if (err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')) {
        setPermissionDenied(true);
        onError(t('voice.permission'));
      } else {
        onError(t('error.voiceDetail'));
      }
      onListening(false);
      setState('idle');
    }
  }, [onError, onListening, t]);

  const stop = useCallback(() => {
    stopTimer();
    setState('uploading');
    mediaRef.current?.stop();
  }, []);

  const cancel = useCallback(() => {
    stopTimer();
    stopLevels();
    mediaRef.current?.stream.getTracks().forEach((tr) => tr.stop());
    mediaRef.current = null;
    chunksRef.current = [];
    setSeconds(0);
    setState('idle');
    onListening(false);
  }, [onListening]);

  const handleStop = useCallback(
    async (mimeType: string) => {
      const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
      if (blob.size === 0) {
        setState('idle');
        setSeconds(0);
        onListening(false);
        onError(t('error.voiceDetail'));
        return;
      }
      try {
        const mime = mimeType || 'audio/webm';
        const audioBase64 = await blobToBase64(blob);
        const started = await api.startRecognition(lang, audioBase64, mime);
        const text = await pollRecognition(started.jobId, 45, 1200);
        setSeconds(0);
        setState('idle');
        onListening(false);
        if (text) onTranscript(text);
        else onError(t('error.voiceDetail'));
      } catch {
        setSeconds(0);
        setState('idle');
        onListening(false);
        onError(t('error.voiceDetail'));
      }
    },
    [lang, onError, onListening, onTranscript, t]
  );

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(1, '0')}:${String(s % 60).padStart(2, '0')}`;

  if (state === 'idle') {
    return (
      <div className="g-voice g-voice--idle">
        <div className="g-voice__idle-content">
          <button
            className="g-stop-main"
            onClick={start}
            aria-label={t('input.voice')}
          >
            <span className="g-voice__core">
              <Microphone weight="fill" aria-hidden="true" />
            </span>
          </button>
        </div>
        <p className="g-voice__hint">{t('input.hint')}</p>
        {permissionDenied ? (
          <p className="g-voice__error" role="alert">
            {t('voice.permission')} {t('voice.permissionDetail')}
          </p>
        ) : null}
      </div>
    );
  }

  const uploading = state === 'uploading';

  return (
    <div className="g-voice g-voice--active" role="status" aria-live="polite">
      <span className="g-voice__lang-tag">{t('header.language')}</span>

      <div className="g-voice__ring" aria-hidden="true">
        <span className="g-voice__halo g-voice__halo--1" />
        <span className="g-voice__halo g-voice__halo--2" />
        <span className="g-voice__core">
          {uploading ? <StopCircle weight="fill" /> : <Microphone weight="fill" />}
        </span>
      </div>

      <div className="g-voice__wave" aria-hidden="true">
        {(uploading ? Array(BAR_COUNT).fill(0).map(() => 0.3) : levels).map((v, i) => (
          <span
            key={i}
            className={`g-voice__bar ${v > 0.55 ? 'is-live' : ''}`}
            style={{
              height: `${12 + v * 100}%`,
              animationDelay: `${(i % 5) * 0.09}s`,
              animationPlayState: uploading ? 'running' : 'running',
            }}
          />
        ))}
      </div>

      <span className="g-voice__status">
        {uploading ? t('voice.transcribing') : t('voice.listening')}
      </span>
      <span className="g-voice__timer">{fmt(seconds)}</span>

      {!uploading ? (
        <div className="g-voice__actions">
          <button className="g-voice__cancel" onClick={cancel} aria-label={t('voice.cancel')}>
            <X weight="bold" aria-hidden="true" />
          </button>
          <button className="g-voice__stop" onClick={stop}>
            <StopCircle weight="bold" aria-hidden="true" />
            {t('voice.stop')}
          </button>
        </div>
      ) : null}
    </div>
  );
}

async function pollRecognition(jobId: string, attempts: number, intervalMs: number): Promise<string | null> {
  for (let i = 0; i < attempts; i++) {
    await sleep(intervalMs);
    const res = await api.getRecognitionResult(jobId);
    if (res.status === 'COMPLETED') return (res.text ?? '').trim() || null;
    if (res.status === 'FAILED') return null;
  }
  return null;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const idx = result.indexOf(',');
      resolve(idx >= 0 ? result.slice(idx + 1) : result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
