import React, { useState } from 'react'
import { Download, Info, RefreshCw, Upload } from 'lucide-react'
import { useTranslation } from '../../../lib/useTranslation'
import ImportProductsModal from './ImportProductsModal'

const DataManagement: React.FC = () => {
  const { t } = useTranslation()
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const filePath = await window.electronAPI.app.showSaveDialog({
        title: t('set.exportDatabase'),
        defaultPath: `soostori-backup-${new Date().toISOString().split('T')[0]}.json`,
        filters: [{ name: 'JSON', extensions: ['json'] }],
      })
      if (filePath) await window.electronAPI.app.exportDatabase(filePath)
    } catch (err) { console.error('Export failed:', err) }
    finally { setIsExporting(false) }
  }

  const handleImport = async () => {
    setIsImporting(true)
    try {
      const files = await window.electronAPI.app.showOpenDialog({
        title: t('set.importDatabase'),
        filters: [{ name: 'JSON', extensions: ['json'] }],
        properties: ['openFile'],
      })
      if (files?.length) await window.electronAPI.app.importDatabase(files[0])
    } catch (err) { console.error('Import failed:', err) }
    finally { setIsImporting(false) }
  }

  return (
    <div className="space-y-4">
      <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-3">
        <Info size={18} className="text-amber-600 mt-0.5" />
        <div><p className="font-bold text-sm text-amber-800">{t('set.backupDataRegularly')}</p><p className="text-xs text-amber-700 mt-0.5">{t('set.exportCreatesBackup')}</p></div>
      </div>
      <button onClick={handleExport} disabled={isExporting} className="w-full py-4 bg-brand-orange text-white rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-orange-200">
        {isExporting ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />}
        {isExporting ? t('set.exporting') : t('set.exportData')}
      </button>
      <button onClick={handleImport} disabled={isImporting} className="w-full py-4 bg-white border-2 border-slate-200 text-slate-600 rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2 hover:border-brand-orange transition-colors">
        {isImporting ? <RefreshCw size={16} className="animate-spin" /> : <Upload size={16} />}
        {isImporting ? t('set.importing') : t('set.importData')}
      </button>
      <button onClick={() => setShowImportModal(true)} className="w-full py-4 bg-white border-2 border-slate-200 text-slate-600 rounded-xl font-bold flex items-center justify-center gap-2 hover:border-brand-orange transition-colors">
        <Upload size={16} />
        {t('set.importProducts')}
      </button>
      {showImportModal && <ImportProductsModal onClose={() => setShowImportModal(false)} />}
      <div className="pt-4 border-t border-slate-100">
        <p className="text-xs text-slate-400 text-center">{t('set.dataStoredLocally')}</p>
      </div>
    </div>
  )
}

export default DataManagement
