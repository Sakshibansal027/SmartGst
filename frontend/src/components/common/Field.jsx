import { translate as tr } from '../../locales/i18n.js';

export default function Field({ label, required, children }) { return <label className="field"><span>{tr(label)}{required && <i> *</i>}</span>{children}</label> }
