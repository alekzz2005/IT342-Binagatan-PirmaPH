import { useState, useEffect, useRef, useCallback } from 'react';
import authApi from '../../api/authApi';
import './OTPModal.css';

/**
 * OTPModal — PirmaPH email OTP verification modal.
 *
 * Props:
 *   isOpen       {boolean}   — controls visibility
 *   email        {string}    — the email address the OTP was sent to
 *   onVerified   {function}  — called after successful verification
 *   onClose      {function}  — called when the modal is dismissed
 *   onResend     {function?} — optional override for resend logic
 */
const OTPModal = ({ isOpen, email, onVerified, onClose, onResend }) => {
  // ─── State ─────────────────────────────────────────────────────────────────
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [modalState, setModalState] = useState('default'); // default | invalid | expired | verified
  const [loading, setLoading] = useState(false);
  const [attemptsUsed, setAttemptsUsed] = useState(0);
  const maxAttempts = 5;
  const expiresIn = 300; // seconds

  // Timer state
  const [timerRemaining, setTimerRemaining] = useState(expiresIn);
  const timerRef = useRef(null);

  // Resend cooldown state
  const resendCooldown = 60;
  const [resendRemaining, setResendRemaining] = useState(resendCooldown);
  const [resendDisabled, setResendDisabled] = useState(true);
  const resendRef = useRef(null);

  // Digit input refs
  const inputRefs = useRef([]);

  // ─── Helpers ───────────────────────────────────────────────────────────────
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const timerPct = (timerRemaining / expiresIn) * 100;
  const timerClass =
    timerRemaining <= 60 ? 'danger' : timerRemaining <= 120 ? 'warn' : '';

  const allFilled = digits.every((d) => d.length === 1);

  // ─── Timers ────────────────────────────────────────────────────────────────
  const startTimer = useCallback(() => {
    clearInterval(timerRef.current);
    setTimerRemaining(expiresIn);
    timerRef.current = setInterval(() => {
      setTimerRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setModalState('expired');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [expiresIn]);

  const stopTimer = () => clearInterval(timerRef.current);

  const startResendCooldown = useCallback(() => {
    clearInterval(resendRef.current);
    setResendRemaining(resendCooldown);
    setResendDisabled(true);
    resendRef.current = setInterval(() => {
      setResendRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(resendRef.current);
          setResendDisabled(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [resendCooldown]);

  // ─── Lifecycle ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      // Reset state when modal opens
      setDigits(['', '', '', '', '', '']);
      setModalState('default');
      setAttemptsUsed(0);
      startTimer();
      startResendCooldown();
      setTimeout(() => inputRefs.current[0]?.focus(), 80);
    } else {
      stopTimer();
      clearInterval(resendRef.current);
    }
    return () => {
      clearInterval(timerRef.current);
      clearInterval(resendRef.current);
    };
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Digit keyboard handling ────────────────────────────────────────────────
  const handleDigitChange = (idx, e) => {
    const val = e.target.value.replace(/\D/g, '');
    const char = val ? val[val.length - 1] : '';
    const newDigits = [...digits];
    newDigits[idx] = char;
    setDigits(newDigits);
    if (char && idx < 5) inputRefs.current[idx + 1]?.focus();
    // Clear error state on new input
    if (modalState === 'invalid') setModalState('default');
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
      const newDigits = [...digits];
      newDigits[idx - 1] = '';
      setDigits(newDigits);
    }
    if (e.key === 'ArrowLeft' && idx > 0) inputRefs.current[idx - 1]?.focus();
    if (e.key === 'ArrowRight' && idx < 5) inputRefs.current[idx + 1]?.focus();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData)
      .getData('text')
      .replace(/\D/g, '')
      .slice(0, 6);
    const newDigits = ['', '', '', '', '', ''];
    text.split('').forEach((ch, i) => { newDigits[i] = ch; });
    setDigits(newDigits);
    if (text.length > 0) inputRefs.current[Math.min(text.length - 1, 5)]?.focus();
  };

  // ─── Verify ────────────────────────────────────────────────────────────────
  const handleVerify = async () => {
    if (!allFilled || loading) return;
    setLoading(true);
    const code = digits.join('');
    try {
      await authApi.verifyOtp(email, code);
      setModalState('verified');
      stopTimer();
      clearInterval(resendRef.current);
      setTimeout(() => {
        if (typeof onVerified === 'function') onVerified();
      }, 1800);
    } catch (err) {
      if (err.status === 410) {
        // 410 Gone → expired
        setModalState('expired');
      } else {
        setModalState('invalid');
        setAttemptsUsed((prev) => Math.min(prev + 1, maxAttempts));
        setTimeout(() => {
          setDigits(['', '', '', '', '', '']);
          setModalState('default');
          inputRefs.current[0]?.focus();
        }, 700);
      }
    } finally {
      setLoading(false);
    }
  };

  // ─── Resend ────────────────────────────────────────────────────────────────
  const handleResend = async () => {
    if (resendDisabled) return;
    setLoading(true);
    try {
      if (typeof onResend === 'function') {
        await onResend();
      } else {
        await authApi.sendOtp(email);
      }
      setDigits(['', '', '', '', '', '']);
      setModalState('default');
      setAttemptsUsed(0);
      startTimer();
      startResendCooldown();
      setTimeout(() => inputRefs.current[0]?.focus(), 80);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  // ─── Digit styling ─────────────────────────────────────────────────────────
  const digitClass = (idx) => {
    let cls = 'otp-digit';
    if (modalState === 'invalid') cls += ' invalid';
    else if (modalState === 'expired') cls += ' expired';
    else if (modalState === 'verified') cls += ' verified';
    else if (digits[idx]) cls += ' filled';
    return cls;
  };

  // ─── Top-bar colors ─────────────────────────────────────────────────────────
  const topbar = {
    default:  ['#0038A8', '#CE1126', '#FCD116'],
    invalid:  ['#CE1126', '#0038A8', '#FCD116'],
    expired:  ['#FCD116', '#CE1126', '#0038A8'],
    verified: ['#10B981', '#0038A8', '#FCD116'],
  }[modalState] ?? ['#0038A8', '#CE1126', '#FCD116'];

  // ─── Icons / titles ─────────────────────────────────────────────────────────
  const stateConfig = {
    default:  { icon: '📧', iconBg: '#EEF2FC', iconColor: '#0038A8', title: 'Verify Your Email' },
    invalid:  { icon: '❌', iconBg: '#FDF0F2', iconColor: '#CE1126', title: 'Incorrect Code' },
    expired:  { icon: '⏰', iconBg: '#FFFBEA', iconColor: '#a07800', title: 'Code Expired' },
    verified: { icon: '✅', iconBg: '#ECFDF5', iconColor: '#10B981', title: 'Email Verified!' },
  }[modalState];

  if (!isOpen) return null;

  return (
    <div
      className={`pirma-modal-overlay is-open`}
      id="otpOverlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="otpTitle"
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div className="otp-modal" id="otpModal">

        {/* Flag top-bar */}
        <div className="otp-topbar">
          <span style={{ background: topbar[0] }} />
          <span style={{ background: topbar[1] }} />
          <span style={{ background: topbar[2] }} />
        </div>

        {/* Close button */}
        <button className="otp-close" onClick={onClose} aria-label="Close">✕</button>

        {/* Icon */}
        <div className="otp-icon-zone">
          <div
            className={`otp-icon state-${modalState}`}
            style={{ background: stateConfig.iconBg, color: stateConfig.iconColor }}
          >
            {stateConfig.icon}
          </div>
        </div>

        {/* ── Verified success screen ── */}
        {modalState === 'verified' ? (
          <div className="success-body show" id="successBody">
            <span className="success-checkmark">🎉</span>
            <div className="otp-title" style={{ color: 'var(--green)' }}>Email Verified!</div>
            <div className="otp-message">
              Your email address has been successfully verified. You can now access all PirmaPH services.
            </div>
            <div className="success-user-info">
              <div className="sui-row">
                <span className="sui-key">Verified Email</span>
                <span className="sui-val">{email}</span>
              </div>
              <div className="sui-row">
                <span className="sui-key">Verified At</span>
                <span className="sui-val">
                  {new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
                  {' · '}
                  {new Date().toLocaleDateString('en-PH')}
                </span>
              </div>
              <div className="sui-row">
                <span className="sui-key">Account Status</span>
                <span className="sui-val" style={{ color: 'var(--green)' }}>✅ Active</span>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Main body */}
            <div className="otp-body" id="otpMainBody">
              <div className="otp-title" id="otpTitle">{stateConfig.title}</div>
              <div className="otp-message" id="otpMessage">
                {modalState === 'expired'
                  ? 'Your verification code has expired. Please request a new one.'
                  : modalState === 'invalid'
                  ? "The code you entered doesn't match. Please try again."
                  : 'We sent a 6-digit verification code to'}
              </div>
              {modalState === 'default' && (
                <span className="otp-email-display">{email}</span>
              )}
            </div>

            {/* Input section */}
            <div className="otp-input-section" id="otpInputSection">
              {/* State messages */}
              {modalState === 'invalid' && (
                <div className="otp-state-msg msg-invalid show">
                  <span>❌</span> Incorrect code. Please try again.
                </div>
              )}
              {modalState === 'expired' && (
                <div className="otp-state-msg msg-expired show">
                  <span>⏰</span> Code expired. Request a new one below.
                </div>
              )}

              {/* 6 digit inputs */}
              <div className="otp-digits-row" id="otpDigitsRow">
                {[0, 1, 2].map((i) => (
                  <input
                    key={i}
                    ref={(el) => (inputRefs.current[i] = el)}
                    className={digitClass(i)}
                    id={`d${i + 1}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    autoComplete={i === 0 ? 'one-time-code' : undefined}
                    value={digits[i]}
                    onChange={(e) => handleDigitChange(i, e)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    onPaste={handlePaste}
                    disabled={modalState === 'expired'}
                  />
                ))}
                <div className="otp-sep" />
                {[3, 4, 5].map((i) => (
                  <input
                    key={i}
                    ref={(el) => (inputRefs.current[i] = el)}
                    className={digitClass(i)}
                    id={`d${i + 1}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digits[i]}
                    onChange={(e) => handleDigitChange(i, e)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    onPaste={handlePaste}
                    disabled={modalState === 'expired'}
                  />
                ))}
              </div>

              {/* Attempts tracker */}
              <div className="attempts-row" id="attemptsRow">
                {[...Array(maxAttempts)].map((_, i) => (
                  <div key={i} className={`attempt-dot ${i < attemptsUsed ? 'used' : 'avail'}`} />
                ))}
                <span className="attempts-label">
                  {maxAttempts - attemptsUsed} attempt{maxAttempts - attemptsUsed !== 1 ? 's' : ''} remaining
                </span>
              </div>
            </div>

            {/* Timer bar */}
            {modalState !== 'expired' && (
              <div className="timer-section" id="timerSection">
                <div className="timer-track">
                  <div
                    className={`timer-fill ${timerClass}`}
                    style={{ width: `${timerPct}%` }}
                  />
                </div>
                <div className={`timer-label ${timerClass}`}>
                  {formatTime(timerRemaining)} remaining
                </div>
              </div>
            )}
            {modalState === 'expired' && (
              <div className="timer-section" id="timerSection">
                <div className="timer-track">
                  <div className="timer-fill danger" style={{ width: '0%' }} />
                </div>
                <div className="timer-label danger">0:00 · Expired</div>
              </div>
            )}

            {/* Help note */}
            <div className="help-note" id="otpHelp">
              <span className="help-note-icon">ℹ️</span>
              Check your inbox and spam folder. The code is valid for{' '}
              <strong>5 minutes</strong> and can only be used once.
            </div>

            {/* Divider */}
            <div className="otp-divider" />

            {/* Footer */}
            <div className="otp-footer" id="otpFooter">
              <button
                className="btn-verify"
                id="btnVerify"
                onClick={handleVerify}
                disabled={!allFilled || loading || modalState === 'expired'}
              >
                {loading ? 'Verifying…' : 'Verify Email'}
              </button>

              <div className="resend-row">
                <span>Didn't receive a code?</span>
                <button
                  className="resend-btn"
                  id="btnResend"
                  onClick={handleResend}
                  disabled={resendDisabled || loading}
                >
                  Resend
                </button>
                {resendDisabled && (
                  <span className="resend-countdown">(wait {formatTime(resendRemaining)})</span>
                )}
              </div>

              <div className="change-email-row">
                <button className="change-email-btn" id="btnChangeEmail" onClick={onClose}>
                  Wrong email? Change it
                </button>
              </div>
            </div>
          </>
        )}

        {/* Flag strip */}
        <div className="otp-flag">
          <div style={{ background: 'var(--blue)' }} />
          <div style={{ background: 'var(--red)' }} />
          <div style={{ background: 'var(--gold)' }} />
        </div>

      </div>
    </div>
  );
};

export default OTPModal;
