import { PageHeader } from '@/components/feedback/PageHeader'
import { ManagerContactCard } from './ManagerContactCard'

export function ManagerContactPage() {
  return (
    <>
      <PageHeader title="Контакти менеджера" description="Звʼяжіться з менеджером щодо замовлення або доставки" />
      <ManagerContactCard />
    </>
  )
}
