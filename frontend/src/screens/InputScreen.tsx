import { useCallback, useEffect, useRef, useState } from 'react';
import type { Profile, SupportedLanguage } from '../lib/types';
import type { TranslateFn } from '../lib/i18n';
import type { Mood } from '../App';
import { api } from '../lib/api';
import { ArrowRight, Microphone, Keyboard, X } from '@phosphor-icons/react';
import { VoiceRecorder } from '../components/VoiceRecorder';
import { ProcessingInline } from '../components/ProcessingInline';

interface InputProps {
  t: TranslateFn;
  lang: SupportedLanguage;
  initialMode: 'voice' | 'type';
  onMood: (m: Mood) => void;
  onExtracted: (profile: Profile) => void;
  onError: (message: string) => void;
}

const EXAMPLES: Parameters<TranslateFn>[0][] = [
  'input.examples.farmer',
  'input.examples.education',
  'input.examples.income',
];

export function InputScreen({ t, lang, initialMode, onMood, onExtracted, onError }: InputProps) {
  const [mode, setMode] = useState<'voice' | 'type'>(initialMode);
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);
  const [busy, setBusy] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const state = busy ? 'typing' : focused ? 'focused' : text.trim() ? 'typing' : 'idle';

  useEffect(() => {
    onMood('input');
  }, [onMood]);

  useEffect(() => {
    if (mode === 'type') taRef.current?.focus();
  }, [mode]);

  const runExtract = useCallback(
    async (inputText: string) => {
      if (!inputText.trim()) return;
      setBusy(true);
      try {
        const profile = await api.extractProfile({ language: lang, text: inputText.trim() });
        onExtracted(profile);
      } catch (err) {
        onError(err instanceof Error ? err.message : t('error.genericDetail'));
      } finally {
        setBusy(false);
      }
    },
    [lang, onExtracted, onError, t]
  );

  const submitText = () => {
    if (text.trim()) runExtract(text);
  };

  const onVoiceTranscript = useCallback(
    (transcript: string) => runExtract(transcript),
    [runExtract]
  );

  const onVoiceListening = useCallback(
    (listening: boolean) => onMood(listening ? 'listening' : 'input'),
    [onMood]
  );

  if (busy) {
    return (
      <section className="g-screen g-input" aria-live="polite">
        <ProcessingInline t={t} phase="extract" />
      </section>
    );
  }

  return (
    <section className="g-screen g-input" data-state={state} aria-label={t('input.prompt')}>
      <div className="g-input__head">
        <h2 className="g-input__prompt">{t('input.prompt')}</h2>
        <p className="g-input__hint">{t('input.hint')}</p>
        <div className="g-suggestions">
          <span className="g-suggestions__label">{t('input.suggestionsLabel')}</span>
          <span className="g-suggestions__items">{t('input.suggestions')}</span>
        </div>
      </div>

      <div className="g-mode" role="tablist" aria-label={t('input.prompt')}>
        <button
          role="tab"
          aria-selected={mode === 'voice'}
          className="g-mode__tab"
          onClick={() => setMode('voice')}
        >
          <Microphone weight="bold" aria-hidden="true" />
          {t('input.voice')}
        </button>
        <button
          role="tab"
          aria-selected={mode === 'type'}
          className="g-mode__tab"
          onClick={() => setMode('type')}
        >
          <Keyboard weight="bold" aria-hidden="true" />
          {t('input.type')}
        </button>
      </div>

      {mode === 'voice' ? (
        <VoiceRecorder
          t={t}
          lang={lang}
          onTranscript={onVoiceTranscript}
          onError={onError}
          onListening={onVoiceListening}
          busy={false}
        />
      ) : (
        <div className={`g-composer ${focused ? 'is-focused' : ''} ${text.trim() ? 'is-typing' : ''}`}>
          <div className="g-composer__area">
            <label className="g-composer__label" htmlFor="situation-input">
              {t('input.typeLabel')}
            </label>
            <textarea
              ref={taRef}
              id="situation-input"
              className="g-textarea"
              placeholder={t('input.placeholder')}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              rows={3}
            />
          </div>
          <div className="g-composer__foot">
            {text ? (
              <button className="g-icon-btn" onClick={() => setText('')} aria-label={t('input.clear')}>
                <X weight="bold" />
              </button>
            ) : null}
            <button
              className="g-send"
              onClick={submitText}
              disabled={!text.trim()}
              aria-label={t('input.submit')}
            >
              <span className="g-send__label">{t('input.submit')}</span>
              <ArrowRight weight="bold" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {mode === 'type' ? (
        <div className="g-examples">
          <p className="g-examples__label">{t('input.example.label')}</p>
          <div className="g-examples__list">
            {EXAMPLES.map((k) => (
              <button
                key={k}
                className="g-example"
                onClick={() => {
                  setText(t(k));
                  taRef.current?.focus();
                }}
              >
                {t(k)}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
