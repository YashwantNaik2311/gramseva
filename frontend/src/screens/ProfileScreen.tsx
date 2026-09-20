import { useCallback, useEffect, useRef, useState } from 'react';
import type { Attribute, AttributeName, Candidate, Profile, SupportedLanguage } from '../lib/types';
import type { TranslateFn } from '../lib/i18n';
import { localizeValue } from '../lib/values';
import { api } from '../lib/api';
import { Button } from '../components/Button';
import { Sheet } from '../components/Sheet';
import { Check, PencilSimple } from '@phosphor-icons/react';
import { ProcessingInline } from '../components/ProcessingInline';

interface ProfileProps {
  t: TranslateFn;
  lang: SupportedLanguage;
  profile: Profile;
  onConfirm: (profile: Profile, candidates: Candidate[]) => void;
}

type InputKind = 'age' | 'text' | 'options';

interface AttributeDef {
  key: AttributeName;
  editable: boolean;
  kind: InputKind;
  options?: string[];
}

// Canonical states matching the backend normalizer so edits always resolve.
const STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa',
  'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
  'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland',
  'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
];

const ATTRIBUTES: AttributeDef[] = [
  { key: 'age', editable: true, kind: 'age' },
  { key: 'state', editable: true, kind: 'options', options: STATES },
  { key: 'occupation', editable: true, kind: 'text' },
  { key: 'incomeBracket', editable: true, kind: 'options', options: ['below_poverty_line', 'low', 'lower_middle', 'middle', 'high'] },
  { key: 'gender', editable: true, kind: 'options', options: ['male', 'female', 'other', 'prefer_not_to_say'] },
  { key: 'educationLevel', editable: true, kind: 'options', options: ['none', 'primary', 'secondary', 'higher_secondary', 'undergraduate', 'postgraduate', 'doctorate'] },
  { key: 'category', editable: true, kind: 'options', options: ['SC', 'ST', 'OBC', 'general', 'other'] },
  { key: 'disability', editable: true, kind: 'options', options: ['yes', 'no', 'prefer_not_to_say'] },
];

export function ProfileScreen({ t, lang, profile, onConfirm }: ProfileProps) {
  const [attrs, setAttrs] = useState<Profile['attributes']>(() => structuredClone(profile.attributes));
  const [editing, setEditing] = useState<AttributeName | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reachedEnd, setReachedEnd] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const editingAttr = editing ? ATTRIBUTES.find((a) => a.key === editing) : null;

  const label = (k: AttributeName) => t(`profile.attribute.${k}` as Parameters<TranslateFn>[0]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) setReachedEnd(e.isIntersecting);
      },
      { root: null, threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const handleConfirm = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const next: Profile = { ...profile, attributes: attrs };
      const res = await api.getRecommendations(next);
      onConfirm(next, res.candidates);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error.genericDetail'));
    } finally {
      setBusy(false);
    }
  }, [attrs, onConfirm, profile, t]);

  const closeSheet = () => setEditing(null);

  const pickOption = (value: string) => {
    if (!editing) return;
    setAttrs((prev) => {
      const a: AttributeName = editing;
      const sensitive = prev[a].sensitive;
      const cleared = value === '__clear__';
      const next: Attribute = cleared
        ? { status: 'unknown', value: null, confidence: null, sensitive }
        : { status: 'provided', value: value, confidence: 'high', sensitive };
      return { ...prev, [a]: next };
    });
    closeSheet();
  };

  const pickAge = (value: number) => {
    setAttrs((prev) => {
      const a: AttributeName = 'age';
      const sensitive = prev[a].sensitive;
      return {
        ...prev,
        age: { status: 'provided', value, confidence: 'high', sensitive },
      };
    });
    closeSheet();
  };

  const clearAge = () => {
    setAttrs((prev) => ({ ...prev, age: { status: 'unknown', value: null, confidence: null, sensitive: prev.age.sensitive } }));
    closeSheet();
  };

  if (busy) {
    return (
      <section className="g-screen g-profile" aria-live="polite">
        <ProcessingInline t={t} phase="recommend" />
      </section>
    );
  }

  return (
    <section className="g-screen g-profile" aria-label={t('profile.title')}>
      <div className="g-profile__head">
        <h2 className="g-profile__title">{t('profile.title')}</h2>
        <p className="g-profile__sub">{t('profile.subtitle')}</p>
      </div>

      <div className="g-receipt">
        <div className="g-receipt__head">
          <span className="g-receipt__head-label">{t('profile.confirmHint')}</span>
          <span className="g-receipt__head-label" aria-hidden="true">
            {t('profile.editNote')}
          </span>
        </div>

        <div className="g-receipt__rows">
          {ATTRIBUTES.map((a) => {
            const attr = attrs[a.key];
            const provided = attr.status === 'provided' && attr.value !== null && attr.value !== undefined;
            return (
              <div className="g-attr" key={a.key}>
                <span className="g-attr__label">{label(a.key)}</span>
                {provided ? (
                  <span className="g-attr__value">{localizeValue(lang, attr.value as string | number | boolean | null | undefined)}</span>
                ) : (
                  <span className="g-attr__value g-attr__value--unknown">{t('profile.notProvided')}</span>
                )}
                <button
                  className="g-attr__edit"
                  onClick={() => setEditing(a.key)}
                  aria-label={`${label(a.key)}: ${t('profile.edit')}`}
                >
                  <PencilSimple weight="bold" aria-hidden="true" />
                  <span>{t('profile.edit')}</span>
                </button>
              </div>
            );
          })}
        </div>

        <p className="g-receipt__note">{t('profile.sensitiveNote')}</p>
      </div>

      <div ref={sentinelRef} aria-hidden="true" />

      {error ? (
        <p className="g-form-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className={`g-actions g-actions--sticky ${reachedEnd ? 'is-revealed' : ''}`}>
        <Button variant="primary" block onClick={handleConfirm} icon={<Check weight="bold" />}>
          {t('profile.confirm')}
        </Button>
      </div>

      {editingAttr ? (
        <Sheet open onClose={closeSheet} title={label(editingAttr.key)} desc={t('profile.editNote')}>
          {editingAttr.kind === 'age' ? (
            <AgeInput
              label={label('age')}
              initial={attrs.age.status === 'provided' && typeof attrs.age.value === 'number' ? attrs.age.value : ''}
              onSave={pickAge}
              onClear={clearAge}
              t={t}
            />
          ) : editingAttr.kind === 'text' ? (
            <FreeTextInput
              label={label(editingAttr.key)}
              initial={attrs[editingAttr.key].status === 'provided' ? String(attrs[editingAttr.key].value ?? '') : ''}
              onSave={(value) => pickOption(value)}
              onClear={() => pickOption('__clear__')}
              t={t}
            />
          ) : (
            <div className="g-options" role="listbox">
              <button
                className="g-option"
                onClick={() => pickOption('__clear__')}
                aria-selected={attrs[editingAttr.key].status === 'unknown'}
              >
                {t('profile.notProvided')}
              </button>
              {editingAttr.options!.map((opt) => (
                <button
                  key={opt}
                  className="g-option"
                  onClick={() => pickOption(opt)}
                  aria-selected={attrs[editingAttr.key].status === 'provided' && attrs[editingAttr.key].value === opt}
                >
                  {localizeValue(lang, opt)}
                  {attrs[editingAttr.key].status === 'provided' && attrs[editingAttr.key].value === opt ? (
                    <span className="g-option__check" aria-hidden="true">
                      <Check weight="bold" />
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          )}
        </Sheet>
      ) : null}
    </section>
  );
}

function FreeTextInput({
  label,
  initial,
  onSave,
  onClear,
  t,
}: {
  label: string;
  initial: string;
  onSave: (v: string) => void;
  onClear: () => void;
  t: TranslateFn;
}) {
  const [value, setValue] = useState(initial);
  return (
    <div className="g-field">
      <label className="g-field__label" htmlFor="free-input">
        {label}
      </label>
      <input
        id="free-input"
        className="g-field__input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        inputMode="text"
      />
      <div className="g-sheet__actions">
        <Button variant="outline" onClick={onClear}>
          {t('profile.notProvided')}
        </Button>
        <Button variant="primary" onClick={() => value.trim() && onSave(value.trim())}>
          {t('profile.done')}
        </Button>
      </div>
    </div>
  );
}

function AgeInput({
  label,
  initial,
  onSave,
  onClear,
  t,
}: {
  label: string;
  initial: number | '';
  onSave: (n: number) => void;
  onClear: () => void;
  t: TranslateFn;
}) {
  const [value, setValue] = useState<string>(initial === '' ? '' : String(initial));
  const [err, setErr] = useState<string | null>(null);

  const save = () => {
    const n = Number(value);
    if (value.trim() === '' || !Number.isInteger(n) || n < 0 || n > 120) {
      setErr(t('profile.ageError'));
      return;
    }
    onSave(n);
  };

  return (
    <div className="g-field">
      <label className="g-field__label" htmlFor="age-input">
        {label}
      </label>
      <input
        id="age-input"
        className="g-field__input"
        type="number"
        inputMode="numeric"
        min={0}
        max={120}
        step={1}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setErr(null);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') save();
        }}
      />
      {err ? (
        <p className="g-form-error" role="alert">
          {err}
        </p>
      ) : null}
      <div className="g-sheet__actions">
        <Button variant="outline" onClick={onClear}>
          {t('profile.notProvided')}
        </Button>
        <Button variant="primary" onClick={save}>
          {t('profile.done')}
        </Button>
      </div>
    </div>
  );
}
