import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BriefcaseBusiness, CalendarDays, FileBadge, FileText, HandHelping, Home, IdCard, Package, User } from 'lucide-react';
import apiService from '../../../shared/services/api';
import { useAuth } from '../../../shared/context/AuthContext';
import { useModal } from '../../../shared/context/ModalContext';
import ResidentSidebar from '../../../users/components/ResidentSidebar';
import './SubmitRequestPage.css';

const DOC_OPTIONS = [
  { value: 'BARANGAY_CLEARANCE', label: 'Barangay Clearance', icon: FileText, days: '3-5 days' },
  { value: 'CERTIFICATE_OF_RESIDENCY', label: 'Certificate of Residency', icon: Home, days: '2-3 days' },
  { value: 'CERTIFICATE_OF_INDIGENCY', label: 'Certificate of Indigency', icon: HandHelping, days: '3-5 days' },
  { value: 'BUSINESS_CLEARANCE', label: 'Business Clearance', icon: BriefcaseBusiness, days: '5-7 days' },
  { value: 'CERTIFICATE_OF_GOOD_MORAL', label: 'Certificate of Good Moral', icon: FileBadge, days: '2-3 days' },
  { value: 'BARANGAY_ID', label: 'Barangay ID', icon: IdCard, days: '5-7 days' },
];

const PURPOSE_OPTIONS = [
  'Employment / Job Application',
  'Bank / Financial Requirement',
  'School / Educational Enrollment',
  'Travel / Visa Application',
  'Medical / Health Services',
  'Government Transaction',
  'Other',
];

const DEFAULT_FORM = {
  documentType: 'BARANGAY_CLEARANCE',
  purpose: PURPOSE_OPTIONS[0],
  additionalDetails: '',
  copies: 1,
};

const DRAFT_STORAGE_KEY = 'pirmaph-submit-request-draft';

const formatResidentName = (user) => {
  if (!user) {
    return 'Juan Dela Cruz';
  }

  return [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Juan Dela Cruz';
};

const parseDayRange = (daysText) => {
  const match = daysText.match(/(\d+)\s*[–-]\s*(\d+)/);
  if (match) {
    return {
      min: Number(match[1]),
      max: Number(match[2]),
    };
  }

  const singleMatch = daysText.match(/(\d+)/);
  const value = singleMatch ? Number(singleMatch[1]) : 0;

  return {
    min: value,
    max: value,
  };
};

const addDays = (baseDate, days) => {
  const result = new Date(baseDate);
  result.setDate(result.getDate() + days);
  return result;
};

const formatDate = (date) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date);

const buildEstimatedReleaseText = (daysText) => {
  const { min, max } = parseDayRange(daysText);
  const baseDate = new Date();
  const startDate = addDays(baseDate, min);
  const endDate = addDays(baseDate, max);

  if (min === max) {
    return formatDate(startDate);
  }

  const startLabel = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
  }).format(startDate);

  return `${startLabel} - ${formatDate(endDate)}`;
};

export default function SubmitRequestPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showModal } = useModal();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState(DEFAULT_FORM);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const rawDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!rawDraft) {
      return;
    }

    try {
      const draft = JSON.parse(rawDraft);
      setForm({
        documentType: draft.documentType || DEFAULT_FORM.documentType,
        purpose: draft.purpose || DEFAULT_FORM.purpose,
        additionalDetails: draft.additionalDetails || '',
        copies: Number(draft.copies) || DEFAULT_FORM.copies,
      });
    } catch {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    }
  }, []);

  const selectedDoc = useMemo(() => DOC_OPTIONS.find((item) => item.value === form.documentType), [form.documentType]);
  const residentName = formatResidentName(user);
  const copiesLabel = `${form.copies} ${form.copies === 1 ? 'copy' : 'copies'}`;
  const estimatedReleaseText = selectedDoc ? buildEstimatedReleaseText(selectedDoc.days) : '';

  const setField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleDocSelection = (documentType) => {
    setField('documentType', documentType);
  };

  const handleFileSelection = (file) => {
    if (!file) {
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const triggerFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleSaveDraft = () => {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(form));
    showModal({
      context: 'success',
      title: 'Draft Saved',
      message: 'Your request draft has been saved locally on this device.',
      confirmText: 'Continue Editing',
      showCancel: false,
    });
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    if (loading) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const created = await apiService.submitDocumentRequest({
        documentType: form.documentType,
        purpose: form.purpose,
        additionalDetails: form.additionalDetails,
        copies: Number(form.copies),
      });

      if (selectedFile) {
        await apiService.uploadRequestAttachment(created.id, selectedFile);
      }

      localStorage.removeItem(DRAFT_STORAGE_KEY);
      showModal({
        context: 'success',
        title: 'Request Submitted',
        message: `Your ${selectedDoc?.label || 'document'} request has been submitted successfully.`,
        detail: `Request ID: ${created.id}\nStatus: ${created.status}`,
        confirmText: 'View My Requests',
        showCancel: false,
        onConfirm: () => navigate('/requests/mine'),
      });
    } catch (e) {
      setError(e.message || 'Unable to submit request');
    } finally {
      setLoading(false);
    }
  };

  const handleFormDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);

    const droppedFile = event.dataTransfer.files?.[0];
    if (droppedFile) {
      handleFileSelection(droppedFile);
    }
  };

  return (
    <div className="submit-request-shell">
      <ResidentSidebar activeItem="submit" />

      <div className="main">
        <header className="header">
          <button type="button" className="header-back" onClick={() => navigate('/dashboard/resident')} aria-label="Back">
            <ArrowLeft size={16} strokeWidth={2} />
          </button>
          <div>
            <div className="header-title">Submit Document Request</div>
            <div className="header-breadcrumb">Dashboard / Submit Request</div>
          </div>
        </header>

        <div className="progress-bar">
          <div className="step done">
            <div className="step-circle">✓</div>
            <div>
              <div className="step-label">Document Type</div>
              <div className="step-sub">Selected</div>
            </div>
          </div>
          <div className="step active">
            <div className="step-circle">2</div>
            <div>
              <div className="step-label">Details & Purpose</div>
              <div className="step-sub">Fill in info</div>
            </div>
          </div>
          <div className="step">
            <div className="step-circle">3</div>
            <div>
              <div className="step-label">Upload ID</div>
              <div className="step-sub">Verification</div>
            </div>
          </div>
          <div className="step">
            <div className="step-circle">4</div>
            <div>
              <div className="step-label">Review & Submit</div>
              <div className="step-sub">Confirm details</div>
            </div>
          </div>
        </div>

        <div className="content">
          <form className="form-card" onSubmit={onSubmit}>
            <div className="form-card-header">
              <div className="form-card-title"><FileText size={18} strokeWidth={2} /> Request Details</div>
              <div className="form-card-sub">Step 2 of 4 - Provide details for your document request</div>
            </div>

            <div className="form-body">
              <div className="form-section-title">Select Document Type</div>
              <div className="doc-grid">
                {DOC_OPTIONS.map((doc) => (
                  <button
                    key={doc.value}
                    type="button"
                    className={`doc-option ${form.documentType === doc.value ? 'selected' : ''}`}
                    onClick={() => handleDocSelection(doc.value)}
                  >
                      <div className="doc-icon"><doc.icon size={26} strokeWidth={2} /></div>
                    <div className="doc-name">{doc.label}</div>
                    <div className="doc-days">{doc.days}</div>
                  </button>
                ))}
              </div>

              <div className="form-section-title">Request Information</div>

              <div className="form-group">
                <label className="form-label" htmlFor="purpose-select">
                  Purpose of Request <span className="required">*</span>
                </label>
                <select
                  id="purpose-select"
                  className="form-select"
                  value={form.purpose}
                  onChange={(event) => setField('purpose', event.target.value)}
                  required
                >
                  <option value="">- Select a purpose -</option>
                  {PURPOSE_OPTIONS.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="additional-details">
                  Additional Details / Remarks
                </label>
                <textarea
                  id="additional-details"
                  className="form-textarea"
                  value={form.additionalDetails}
                  onChange={(event) => setField('additionalDetails', event.target.value)}
                  placeholder="Provide any additional context about your request (optional)..."
                />
                <div className="form-hint">e.g., specific company name, school, or institution requiring the document</div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="copies-select">
                  Number of Copies <span className="required">*</span>
                </label>
                <select
                  id="copies-select"
                  className="form-select"
                  value={form.copies}
                  onChange={(event) => setField('copies', Number(event.target.value))}
                >
                  {[1, 2, 3].map((count) => (
                    <option key={count} value={count}>{count} {count === 1 ? 'copy' : 'copies'}</option>
                  ))}
                </select>
              </div>

              <div className="form-section-title">Valid ID Upload</div>
              <div
                className={`upload-zone ${isDragging ? 'dragging' : ''}`}
                role="button"
                tabIndex={0}
                onClick={triggerFilePicker}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    triggerFilePicker();
                  }
                }}
                onDragEnter={(event) => {
                  event.preventDefault();
                  setIsDragging(true);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleFormDrop}
              >
                <div className="upload-icon"><IdCard size={34} strokeWidth={2} /></div>
                <div className="upload-title">
                  {selectedFile ? selectedFile.name : 'Drag & drop your valid government ID here'}
                </div>
                <div className="upload-sub">Accepted: JPG, PNG, PDF - Max size: 5MB</div>
                <div className="upload-btn-fake">Browse Files</div>
              </div>
              <input
                ref={fileInputRef}
                className="visually-hidden"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(event) => handleFileSelection(event.target.files?.[0] || null)}
              />
              <div className="form-hint form-hint-spaced">Accepted IDs: SSS, PhilHealth, Passport, Driver's License, UMID, Voter's ID, National ID</div>

              {error && <div className="error-text">{error}</div>}

              <div className="submit-row">
                <button type="button" className="btn-secondary" onClick={() => navigate('/dashboard/resident')}><ArrowLeft size={16} strokeWidth={2} /> Back</button>
                <button type="button" className="btn-secondary" onClick={handleSaveDraft}>Save Draft</button>
                <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Submitting...' : <><span>Continue</span> <ArrowRight size={16} strokeWidth={2} /></>}</button>
              </div>
            </div>
          </form>

          <div>
            <div className="summary-card">
              <div className="summary-header">
                <div className="summary-title">Request Summary</div>
                <div className="summary-sub">Your request details</div>
              </div>

              <div className="summary-body">
                <div className="summary-row">
                  <div className="summary-icon">{selectedDoc ? <selectedDoc.icon size={16} strokeWidth={2} /> : <FileText size={16} strokeWidth={2} />}</div>
                  <div>
                    <div className="summary-key">Document Type</div>
                    <div className="summary-val">{selectedDoc?.label || 'Barangay Clearance'}</div>
                  </div>
                </div>

                <div className="summary-row">
                  <div className="summary-icon"><BriefcaseBusiness size={16} strokeWidth={2} /></div>
                  <div>
                    <div className="summary-key">Purpose</div>
                    <div className="summary-val">{form.purpose}</div>
                  </div>
                </div>

                <div className="summary-row">
                  <div className="summary-icon"><Package size={16} strokeWidth={2} /></div>
                  <div>
                    <div className="summary-key">Copies</div>
                    <div className="summary-val">{copiesLabel}</div>
                  </div>
                </div>

                <div className="summary-row">
                  <div className="summary-icon"><User size={16} strokeWidth={2} /></div>
                  <div>
                    <div className="summary-key">Resident</div>
                    <div className="summary-val">{residentName}</div>
                  </div>
                </div>

                <div className="summary-row">
                  <div className="summary-icon"><CalendarDays size={16} strokeWidth={2} /></div>
                  <div>
                    <div className="summary-key">Estimated Release</div>
                    <div className="summary-val">{estimatedReleaseText}</div>
                  </div>
                </div>

                <hr className="summary-divider" />

                <div className="summary-section-label">Process Timeline</div>
                <div className="timeline-item">
                  <div className="tl-dot active"></div>
                  <div>
                    <div className="tl-label">Submitted</div>
                    <div className="tl-sub">Request received</div>
                  </div>
                </div>
                <div className="timeline-item">
                  <div className="tl-dot"></div>
                  <div>
                    <div className="tl-label">Under Review</div>
                    <div className="tl-sub">Officer reviewing</div>
                  </div>
                </div>
                <div className="timeline-item">
                  <div className="tl-dot"></div>
                  <div>
                    <div className="tl-label">Approved / Rejected</div>
                    <div className="tl-sub">Decision made</div>
                  </div>
                </div>
                <div className="timeline-item">
                  <div className="tl-dot"></div>
                  <div>
                    <div className="tl-label">Ready for Release</div>
                    <div className="tl-sub">Visit barangay hall</div>
                  </div>
                </div>

                <div className="info-box">
                  <p><strong>Walk-in pickup required.</strong> You'll be notified when your document is ready for release at the barangay hall.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
