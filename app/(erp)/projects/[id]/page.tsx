import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Edit2, FolderKanban, Calendar, User,
  Package, CheckCircle2, Circle, Link as LinkIcon,
  Clock, MapPin, FileText, Receipt
} from 'lucide-react'
import { formatDate, formatCurrency, getProjectStatusClass, formatLabel } from '@/lib/utils/format'
import ProjectStatusActions from '@/components/modules/projects/ProjectStatusActions'
import ProjectChecklist from '@/components/modules/projects/ProjectChecklist'
import ProjectFileUpload from '@/components/modules/projects/ProjectFileUpload'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('projects').select('project_number, project_name').eq('id', id).single()
  return { title: `${data?.project_number ?? 'Project'} — Aura Plus ERP` }
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: currentUser } = await supabase.from('users').select('role').eq('id', authUser.id).single()

  const { data: project } = await supabase
    .from('projects')
    .select(`
      *,
      customer:customer_id(id, company_name, contact_person, phone, physical_address),
      project_technicians(
        id, role, assigned_at,
        technician:technician_id(id, full_name, email, avatar_url)
      ),
      project_products(
        id, quantity_used,
        product:product_id(id, sku, product_name, selling_price, quantity_in_stock)
      ),
      project_files(id, file_type, file_name, file_url, file_size, created_at,
        uploaded_by_user:uploaded_by(full_name)
      ),
      quotation:quotation_id(quote_number),
      invoice:invoice_id(invoice_number)
    `)
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (!project) notFound()

  const isTechnician = currentUser?.role === 'technician'
  const isCompleted = project.status === 'completed'
  const canEdit = !isCompleted && ['super_admin', 'sales', 'manager'].includes(currentUser?.role ?? '')

  const customer = project.customer as Record<string, string> | null
  const techs = (project.project_technicians ?? []) as Array<{
    id: string; role: string; assigned_at: string
    technician: { id: string; full_name: string; email: string; avatar_url: string | null }
  }>
  const productItems = (project.project_products ?? []) as Array<{
    id: string; quantity_used: number
    product: { id: string; sku: string; product_name: string; selling_price: number; quantity_in_stock: number }
  }>
  const files = (project.project_files ?? []) as Array<{
    id: string; file_type: string; file_name: string; file_url: string
    file_size: number | null; created_at: string
    uploaded_by_user: { full_name: string } | null
  }>
  const checklist = project.checklist as Record<string, boolean>
  const checkCount = Object.values(checklist).filter(Boolean).length
  const checkTotal = Object.keys(checklist).length
  const allChecked = checkCount === checkTotal

  const beforePhotos = files.filter(f => f.file_type === 'before')
  const afterPhotos = files.filter(f => f.file_type === 'after')
  const documents = files.filter(f => f.file_type === 'document')

  const productsTotal = productItems.reduce((s, p) => s + (p.product?.selling_price ?? 0) * p.quantity_used, 0)

  return (
    <div className="max-w-6xl space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <Link href="/projects" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-[#0066FF] mb-2 transition-colors">
            <ArrowLeft className="w-4 h-4" /> All Projects
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-[#0A1628] dark:text-white font-mono">{project.project_number}</h1>
            <span className={`badge ${getProjectStatusClass(project.status)} text-sm px-3 py-1`}>
              {formatLabel(project.status)}
            </span>
          </div>
          <p className="text-lg font-semibold text-slate-600 dark:text-slate-300 mt-1">{project.project_name}</p>
          <p className="text-sm text-slate-400 mt-0.5">Created {formatDate(project.created_at)}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {canEdit && (
            <Link href={`/projects/${id}/edit`} className="btn-secondary">
              <Edit2 className="w-4 h-4" /> Edit
            </Link>
          )}
          {!isTechnician && (
            <ProjectStatusActions
              projectId={id}
              currentStatus={project.status}
              allChecklistComplete={allChecked}
            />
          )}
        </div>
      </div>

      {/* Completion banner */}
      {isCompleted && (
        <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-xl px-4 py-3 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-700 dark:text-green-400">Project completed</p>
            <p className="text-xs text-green-600 dark:text-green-500">
              {formatDate(project.completed_at)}
              {project.stock_deducted_at && ` · Stock deducted ${formatDate(project.stock_deducted_at)}`}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: main content */}
        <div className="lg:col-span-2 space-y-5">

          {/* Completion Checklist */}
          <ProjectChecklist
            projectId={id}
            checklist={checklist}
            isCompleted={isCompleted}
          />

          {/* Photo uploads */}
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E2E8F0] dark:border-[#1E2A3B]">
              <h2 className="font-semibold text-sm text-[#0A1628] dark:text-white">Site Photos & Documents</h2>
              <p className="text-xs text-slate-400 mt-0.5">Upload before/after photos and project documents</p>
            </div>

            <div className="p-5 space-y-5">
              {/* Before photos */}
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Before Photos</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                  {beforePhotos.map(file => (
                    <PhotoCard key={file.id} file={file} />
                  ))}
                </div>
                <ProjectFileUpload projectId={id} fileType="before" label="Upload Before Photo" />
              </div>

              {/* After photos */}
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">After Photos</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                  {afterPhotos.map(file => (
                    <PhotoCard key={file.id} file={file} />
                  ))}
                </div>
                <ProjectFileUpload projectId={id} fileType="after" label="Upload After Photo" />
              </div>

              {/* Documents */}
              {documents.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Documents</h3>
                  <div className="space-y-2">
                    {documents.map(file => (
                      <a
                        key={file.id}
                        href={file.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-[#1E2A3B] rounded-lg hover:bg-slate-100 dark:hover:bg-[#253548] transition-colors"
                      >
                        <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-[#0A1628] dark:text-white truncate">{file.file_name}</div>
                          <div className="text-xs text-slate-400">{formatDate(file.created_at)}</div>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Products used */}
          {productItems.length > 0 && (
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E8F0] dark:border-[#1E2A3B]">
                <h2 className="font-semibold text-sm text-[#0A1628] dark:text-white">Products / Equipment Used</h2>
                {!isTechnician && (
                  <span className="text-sm font-semibold text-[#0066FF]">{formatCurrency(productsTotal)}</span>
                )}
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>SKU</th>
                    <th>Qty Used</th>
                    {!isTechnician && <th>Unit Price</th>}
                    {!isTechnician && <th>Total</th>}
                  </tr>
                </thead>
                <tbody>
                  {productItems.map(item => (
                    <tr key={item.id}>
                      <td className="font-medium text-sm text-[#0A1628] dark:text-white">{item.product?.product_name}</td>
                      <td className="font-mono text-xs text-slate-400">{item.product?.sku}</td>
                      <td className="text-sm">{item.quantity_used}</td>
                      {!isTechnician && <td className="text-sm text-slate-500">{formatCurrency(item.product?.selling_price ?? 0)}</td>}
                      {!isTechnician && <td className="text-sm font-semibold">{formatCurrency((item.product?.selling_price ?? 0) * item.quantity_used)}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Notes */}
          {project.notes && (
            <div className="card p-5">
              <h2 className="font-semibold text-sm text-[#0A1628] dark:text-white mb-2">Project Notes</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 whitespace-pre-wrap">{project.notes}</p>
            </div>
          )}
        </div>

        {/* Right column: metadata */}
        <div className="space-y-4">
          {/* Customer info */}
          <div className="card p-5">
            <h3 className="font-semibold text-sm text-[#0A1628] dark:text-white mb-3">Customer</h3>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <User className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <Link href={`/customers/${customer?.id}`} className="text-sm font-medium text-[#0066FF] hover:underline">
                    {customer?.company_name}
                  </Link>
                  {customer?.contact_person && (
                    <div className="text-xs text-slate-400">{customer.contact_person}</div>
                  )}
                </div>
              </div>
              {customer?.phone && (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <span className="text-slate-400 w-4 text-center">📞</span>
                  <a href={`tel:${customer.phone}`} className="hover:text-[#0066FF]">{customer.phone}</a>
                </div>
              )}
              {customer?.physical_address && (
                <div className="flex items-start gap-2 text-sm text-slate-500">
                  <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                  <span>{customer.physical_address}</span>
                </div>
              )}
            </div>
          </div>

          {/* Schedule */}
          <div className="card p-5">
            <h3 className="font-semibold text-sm text-[#0A1628] dark:text-white mb-3">Schedule</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span className="text-slate-400">Scheduled:</span>
                <span className="text-[#0A1628] dark:text-white font-medium">
                  {project.scheduled_date ? formatDate(project.scheduled_date) : 'Not set'}
                </span>
              </div>
              {project.completed_at && (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span className="text-slate-400">Completed:</span>
                  <span className="text-green-600 font-medium">{formatDate(project.completed_at)}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-slate-400" />
                <span className="text-slate-400">Created:</span>
                <span className="text-[#0A1628] dark:text-white">{formatDate(project.created_at)}</span>
              </div>
            </div>
          </div>

          {/* Technicians */}
          <div className="card p-5">
            <h3 className="font-semibold text-sm text-[#0A1628] dark:text-white mb-3">
              Technicians ({techs.length})
            </h3>
            {techs.length === 0 ? (
              <p className="text-sm text-slate-400">No technicians assigned</p>
            ) : (
              <div className="space-y-2.5">
                {techs.map(t => (
                  <div key={t.id} className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#0066FF]/10 rounded-full flex items-center justify-center text-[#0066FF] font-bold text-sm flex-shrink-0">
                      {t.technician?.full_name?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[#0A1628] dark:text-white">{t.technician?.full_name}</div>
                      <div className="text-xs text-slate-400">{t.technician?.email}</div>
                    </div>
                    <span className={`badge text-xs ${t.role === 'lead' ? 'badge-primary' : 'badge-default'}`}>
                      {t.role === 'lead' ? 'Lead' : 'Asst.'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Linked records */}
          {(project.quotation_id || project.invoice_id) && !isTechnician && (
            <div className="card p-5">
              <h3 className="font-semibold text-sm text-[#0A1628] dark:text-white mb-3 flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-slate-400" /> Linked Records
              </h3>
              <div className="space-y-2">
                {project.quotation_id && (
                  <Link href={`/quotations/${project.quotation_id}`} className="flex items-center gap-2 text-sm text-[#0066FF] hover:underline">
                    <FileText className="w-4 h-4" />
                    {(project.quotation as { quote_number: string } | null)?.quote_number ?? 'View Quote'}
                  </Link>
                )}
                {project.invoice_id && (
                  <Link href={`/invoices/${project.invoice_id}`} className="flex items-center gap-2 text-sm text-[#0066FF] hover:underline">
                    <Receipt className="w-4 h-4" />
                    {(project.invoice as { invoice_number: string } | null)?.invoice_number ?? 'View Invoice'}
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Checklist summary */}
          <div className="card p-5">
            <h3 className="font-semibold text-sm text-[#0A1628] dark:text-white mb-3">Completion Progress</h3>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400">{checkCount} of {checkTotal} items</span>
              <span className="text-xs font-semibold text-[#0066FF]">{Math.round((checkCount / checkTotal) * 100)}%</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-[#1E2A3B] rounded-full h-2">
              <div
                className="rounded-full h-2 transition-all duration-500"
                style={{
                  width: `${(checkCount / checkTotal) * 100}%`,
                  backgroundColor: allChecked ? '#00C853' : '#0066FF'
                }}
              />
            </div>
            {allChecked && !isCompleted && (
              <p className="text-xs text-green-600 mt-2">✓ All items complete — ready to mark as completed</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Photo card component
function PhotoCard({ file }: {
  file: { id: string; file_url: string; file_name: string; created_at: string; uploaded_by_user: { full_name: string } | null }
}) {
  return (
    <a
      href={file.file_url}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-lg overflow-hidden border border-[#E2E8F0] dark:border-[#1E2A3B] hover:border-[#0066FF]/40 transition-colors group"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={file.file_url}
        alt={file.file_name}
        className="w-full h-28 object-cover group-hover:opacity-90 transition-opacity"
        onError={e => {
          (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22 width%3D%22100%22 height%3D%22100%22%3E%3Crect fill%3D%22%23f1f5f9%22 width%3D%22100%22 height%3D%22100%22%2F%3E%3C%2Fsvg%3E'
        }}
      />
      <div className="px-2 py-1.5 bg-white dark:bg-[#0F1C2E]">
        <div className="text-xs text-slate-500 truncate">{file.file_name}</div>
        <div className="text-[10px] text-slate-400">{file.uploaded_by_user?.full_name ?? 'Unknown'}</div>
      </div>
    </a>
  )
}
