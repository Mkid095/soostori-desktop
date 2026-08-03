import { FormField } from '../../../components/shared/FormField'

interface ProductFormDistributorProps {
  distributorName: string
  distributorPhone: string
  onNameChange: (v: string) => void
  onPhoneChange: (v: string) => void
}

const inputClass = "bg-white dark:bg-slate-800 border border-border-color dark:border-slate-600 rounded-xl py-2.5 px-3.5 font-semibold text-text-primary dark:text-slate-100 focus:border-brand-orange focus:ring-2 focus:ring-orange-100 dark:focus:ring-orange-900/30 outline-none text-sm"

export const ProductFormDistributor: React.FC<ProductFormDistributorProps> = ({
  distributorName, distributorPhone, onNameChange, onPhoneChange
}) => {
  return (
    <div className="grid grid-cols-2 gap-3">
      <FormField label="Distributor / Supplier">
        <input type="text" value={distributorName}
          onChange={(e) => onNameChange(e.target.value)}
          className={inputClass} placeholder="Supplier name" />
      </FormField>
      <FormField label="Distributor Phone">
        <input type="tel" value={distributorPhone}
          onChange={(e) => onPhoneChange(e.target.value)}
          className={inputClass} placeholder="Phone number" />
      </FormField>
    </div>
  )
}
