import { ArrowLeft } from 'lucide-react';
import { translate as tr } from '../../src/locales/i18n.js';
export default function NotFoundPage({go}){return <section className="panel content-panel"><h2>{tr('Page not found')}</h2><p>{tr('This page is not part of your SmartGST workspace.')}</p><button className="btn btn-primary" onClick={()=>go('/') }><ArrowLeft size={16}/>{tr('Return to dashboard')}</button></section>}
