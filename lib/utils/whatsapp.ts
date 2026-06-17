export function buildWhatsAppMessage(params: {
  customerName: string
  invoiceNumber: string
  amount: string
  dueDate: string
  daysOverdue: number
  companyName?: string
  companyPhone?: string
}): string {
  const { customerName, invoiceNumber, amount, dueDate, daysOverdue, companyName, companyPhone } = params

  if (daysOverdue <= 0) {
    return `Dear ${customerName},\n\nThis is a friendly reminder that Invoice *${invoiceNumber}* for *${amount}* is due on *${dueDate}*.\n\nKindly arrange payment before the due date.\n\nThank you.\n${companyName ?? 'Aura Plus Technologies'}`
  }

  if (daysOverdue <= 7) {
    return `Dear ${customerName},\n\nWe wish to bring to your attention that Invoice *${invoiceNumber}* for *${amount}* was due on *${dueDate}* and is now *${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue*.\n\nKindly arrange payment at your earliest convenience.\n\nFor any queries, please contact us on ${companyPhone ?? '0974 018 157'}.\n\nThank you.\n${companyName ?? 'Aura Plus Technologies'}`
  }

  return `Dear ${customerName},\n\n⚠️ *OVERDUE NOTICE*\n\nInvoice *${invoiceNumber}* for *${amount}* remains unpaid and is now *${daysOverdue} days overdue* (due date: ${dueDate}).\n\nImmediate payment is required to avoid service interruption.\n\nPlease contact us urgently on ${companyPhone ?? '0974 018 157'} or settle via bank transfer.\n\nThank you.\n${companyName ?? 'Aura Plus Technologies'}`
}