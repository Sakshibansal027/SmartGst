import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { translate as tr } from '../../locales/i18n.js';

export default function Stat({ label, value, change, Icon, color, sub, negative, onClick }) { return <div className="stat-card" onClick={onClick} onKeyDown={e=>{if(onClick&&(e.key==="Enter"||e.key===" "))onClick()}} role={onClick ? "button" : undefined} tabIndex={onClick ? 0 : undefined}><div className="stat-top"><span>{tr(label)}</span><span className={`stat-icon ${color}`}><Icon size={18} /></span></div><div className="stat-value">{value}</div><div className="stat-bottom"><span className={negative ? 'negative' : 'positive'}>{negative ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />} {tr(change)}</span><span>{tr(sub)}</span></div></div> }
