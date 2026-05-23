import { useState, useEffect, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Modal } from "../../shared/Modal";

export type InvestigationType =
  | "rti"
  | "audit"
  | "procurement"
  | "whistleblower"
  | "general"
  | "criminal"
  | "missing_persons"
  | "financial_crime"
  | "cyber"
  | "internal_affairs";

export type CreateCaseForm = {
  investigationType: InvestigationType;
  title: string;
  priority: "critical" | "high" | "medium" | "low";
  filedDate: string;
  isSensitive: boolean;
  crimeNumber?: string;
  firNumber?: string;
  station?: string;
};

const defaultForm = (): CreateCaseForm => ({
  investigationType: "general",
  title: "",
  priority: "medium",
  filedDate: new Date().toISOString().slice(0, 10),
  isSensitive: false,
});

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (form: CreateCaseForm) => void;
  isPending: boolean;
  error: string | null;
};

export function CreateCaseModal({ open, onClose, onSubmit, isPending, error }: Props) {
  const { t } = useTranslation();
  const [form, setForm] = useState<CreateCaseForm>(defaultForm);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof CreateCaseForm, string>>>({});

  useEffect(() => {
    if (open) {
      setForm(defaultForm());
      setFieldErrors({});
    }
  }, [open]);

  function handleClose() {
    setForm(defaultForm());
    setFieldErrors({});
    onClose();
  }

  function validate(): boolean {
    const errs: Partial<Record<keyof CreateCaseForm, string>> = {};
    if (!form.title.trim()) errs.title = t("caseCreate.titleRequired");
    if (!form.filedDate) errs.filedDate = t("caseCreate.dateRequired");
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({ ...form, title: form.title.trim() });
  }

  return (
    <Modal
      open={open}
      title={t("caseCreate.title")}
      onClose={handleClose}
      footer={
        <>
          <button type="button" className="secondary" onClick={handleClose} disabled={isPending}>
            {t("caseCreate.cancel")}
          </button>
          <button type="submit" form="create-case-form" disabled={isPending}>
            {isPending ? t("caseCreate.saving") : t("caseCreate.submit")}
          </button>
        </>
      }
    >
      <form id="create-case-form" onSubmit={handleSubmit} className="form-stack">
        {error && <div className="form-error-banner">{error}</div>}

        <div className="form-field">
          <label htmlFor="case-type">{t("caseCreate.fieldType")}</label>
          <select
            id="case-type"
            value={form.investigationType}
            onChange={(e) => setForm({ ...form, investigationType: e.target.value as InvestigationType })}
          >
            <option value="general">{t("caseCreate.typeGeneral")}</option>
            <option value="rti">{t("caseCreate.typeRti")}</option>
            <option value="audit">{t("caseCreate.typeAudit")}</option>
            <option value="procurement">{t("caseCreate.typeProcurement")}</option>
            <option value="whistleblower">{t("caseCreate.typeWhistleblower")}</option>
            <option value="criminal">Criminal</option>
            <option value="missing_persons">Missing persons</option>
            <option value="financial_crime">Financial crime</option>
            <option value="cyber">Cyber</option>
            <option value="internal_affairs">Internal affairs</option>
          </select>
        </div>

        {["criminal", "missing_persons", "financial_crime", "cyber", "internal_affairs"].includes(
          form.investigationType
        ) && (
          <div className="form-row">
            <div className="form-field">
              <label>FIR / Crime #</label>
              <input
                value={form.firNumber ?? form.crimeNumber ?? ""}
                onChange={(e) => setForm({ ...form, firNumber: e.target.value, crimeNumber: e.target.value })}
              />
            </div>
            <div className="form-field">
              <label>Station</label>
              <input value={form.station ?? ""} onChange={(e) => setForm({ ...form, station: e.target.value })} />
            </div>
          </div>
        )}

        <div className="form-field">
          <label htmlFor="case-title">{t("caseCreate.fieldTitle")} *</label>
          <input
            id="case-title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder={t("caseCreate.titlePlaceholder")}
            autoFocus
          />
          {fieldErrors.title && <span className="field-error">{fieldErrors.title}</span>}
        </div>

        <div className="form-row">
          <div className="form-field">
            <label htmlFor="case-filed">{t("caseCreate.fieldStarted")} *</label>
            <input
              id="case-filed"
              type="date"
              value={form.filedDate}
              onChange={(e) => setForm({ ...form, filedDate: e.target.value })}
            />
            {fieldErrors.filedDate && <span className="field-error">{fieldErrors.filedDate}</span>}
          </div>
          <div className="form-field">
            <label htmlFor="case-priority">{t("caseCreate.fieldPriority")}</label>
            <select
              id="case-priority"
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value as CreateCaseForm["priority"] })}
            >
              <option value="critical">{t("caseCreate.priorityCritical")}</option>
              <option value="high">{t("caseCreate.priorityHigh")}</option>
              <option value="medium">{t("caseCreate.priorityMedium")}</option>
              <option value="low">{t("caseCreate.priorityLow")}</option>
            </select>
          </div>
        </div>

        <label className="form-checkbox">
          <input
            type="checkbox"
            checked={form.isSensitive}
            onChange={(e) => setForm({ ...form, isSensitive: e.target.checked })}
          />
          {t("caseCreate.sensitive")}
        </label>
      </form>
    </Modal>
  );
}
