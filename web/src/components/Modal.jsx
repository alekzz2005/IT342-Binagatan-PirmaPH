import { useModal } from '../context/ModalContext';
import './Modal.css';

const Modal = () => {
  const { modal, closeModal } = useModal();

  if (!modal.isOpen) return null;

  const contextConfig = {
    confirmation: {
      icon: '📋',
      label: 'Confirmation',
      colors: {
        iconBg: '#EEF2FC',
        accent: '#0038A8',
        button: '#0038A8',
        buttonHover: '#1a50c8',
      }
    },
    success: {
      icon: '✅',
      label: 'Success',
      colors: {
        iconBg: '#EDFAF3',
        accent: '#1a8a4a',
        button: '#1a8a4a',
        buttonHover: '#177a40',
      }
    },
    error: {
      icon: '❌',
      label: 'Error',
      colors: {
        iconBg: '#FEF0F2',
        accent: '#CE1126',
        button: '#CE1126',
        buttonHover: '#a80e1f',
      }
    },
    warning: {
      icon: '⚠️',
      label: 'Warning',
      colors: {
        iconBg: '#FFFBEA',
        accent: '#b07800',
        button: '#e6a800',
        buttonHover: '#cc9400',
      }
    },
    info: {
      icon: 'ℹ️',
      label: 'Information',
      colors: {
        iconBg: '#F0F7FF',
        accent: '#1a6fa8',
        button: '#1a6fa8',
        buttonHover: '#155e8f',
      }
    }
  };

  const config = contextConfig[modal.context] || contextConfig.confirmation;

  const handleConfirm = () => {
    if (modal.onConfirm) {
      modal.onConfirm();
    }
    closeModal();
  };

  const handleCancel = () => {
    if (modal.onCancel) {
      modal.onCancel();
    }
    closeModal();
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      handleCancel();
    }
  };

  return (
    <div 
      className="pirma-modal-overlay open" 
      id="pirma-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pirma-modal-title"
      onClick={handleOverlayClick}
    >
      <div className="pirma-modal">
        {/* Tricolor stripe */}
        <div className="modal-stripe">
          <span className="flag-blue"></span>
          <span className="flag-red"></span>
          <span className="flag-gold"></span>
        </div>

        {/* Header band */}
        <div className={`modal-header-band modal-ctx-${modal.context}`}>
          <div 
            className="modal-icon-wrap" 
            id="pirma-modal-icon"
            aria-hidden="true"
            style={{
              backgroundColor: config.colors.iconBg,
              color: config.colors.accent,
            }}
          >
            {config.icon}
          </div>
          <div className="modal-title-block">
            <div className="modal-context-label" style={{ color: config.colors.accent }}>
              {config.label}
            </div>
            <h2 className="modal-title" id="pirma-modal-title">
              {modal.title}
            </h2>
          </div>
          <button 
            className="modal-close" 
            id="pirma-modal-close"
            aria-label="Close modal"
            onClick={closeModal}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          <p className="modal-message" id="pirma-modal-message">
            {modal.message}
          </p>
          {modal.detail && (
            <div 
              className="modal-detail-box visible"
              id="pirma-modal-detail"
              style={{
                borderColor: config.colors.accent,
                backgroundColor: config.colors.iconBg,
                color: config.colors.accent,
              }}
            >
              {modal.detail.split('\n').map((line, idx) => (
                <div key={idx}>{line}</div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer" id="pirma-modal-footer">
          {modal.showCancel && (
            <button 
              className="modal-btn modal-btn-secondary"
              id="pirma-modal-cancel"
              onClick={handleCancel}
            >
              {modal.cancelText}
            </button>
          )}
          <button 
            className="modal-btn modal-btn-primary"
            id="pirma-modal-confirm"
            style={{
              backgroundColor: config.colors.button,
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = config.colors.buttonHover}
            onMouseLeave={(e) => e.target.style.backgroundColor = config.colors.button}
            onClick={handleConfirm}
          >
            {modal.confirmText}
          </button>
        </div>

        {/* Sun decoration */}
        <div className="modal-sun-deco" aria-hidden="true">
          <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="40" cy="40" r="12" stroke="currentColor" strokeWidth="2"/>
            <line x1="40" y1="8" x2="40" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <line x1="40" y1="64" x2="40" y2="72" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <line x1="8" y1="40" x2="16" y2="40" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <line x1="64" y1="40" x2="72" y2="40" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <line x1="17" y1="17" x2="22.6" y2="22.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <line x1="57.4" y1="57.4" x2="63" y2="63" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <line x1="63" y1="17" x2="57.4" y2="22.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <line x1="22.6" y1="57.4" x2="17" y2="63" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
      </div>
    </div>
  );
};

export default Modal;
