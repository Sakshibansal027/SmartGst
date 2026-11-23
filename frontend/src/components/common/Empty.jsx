import { ReceiptIndianRupee } from 'lucide-react';
import { translate as tr } from '../../locales/i18n.js';

export default function Empty({ title, desc, action, onClick }) { return <div className="empty"><div className="empty-icon"><ReceiptIndianRupee size={21} /></div><b>{tr(title)}</b><p>{tr(desc)}</p>{action && <button className="btn btn-outline" onClick={onClick}>{tr(action)}</button>}</div> }
