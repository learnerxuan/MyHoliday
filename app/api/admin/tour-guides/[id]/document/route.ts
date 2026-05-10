import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const GUIDE_DOCUMENT_BUCKET = 'guide-documents'

function extractStoragePath(documentRef: string) {
  if (!documentRef.startsWith('http')) return documentRef

  const url = new URL(documentRef)
  const publicPrefix = `/storage/v1/object/public/${GUIDE_DOCUMENT_BUCKET}/`
  const signedPrefix = `/storage/v1/object/sign/${GUIDE_DOCUMENT_BUCKET}/`
  const matchingPrefix = [publicPrefix, signedPrefix].find(prefix => url.pathname.startsWith(prefix))

  if (!matchingPrefix) return null

  return decodeURIComponent(url.pathname.slice(matchingPrefix.length))
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: guide, error } = await supabase
    .from('tour_guides')
    .select('document_url')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!guide?.document_url) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  const storagePath = extractStoragePath(guide.document_url)
  if (!storagePath) {
    return NextResponse.json({ error: 'Invalid document reference' }, { status: 400 })
  }

  const { data, error: signedUrlError } = await supabase.storage
    .from(GUIDE_DOCUMENT_BUCKET)
    .createSignedUrl(storagePath, 60)

  if (signedUrlError || !data?.signedUrl) {
    return NextResponse.json({ error: signedUrlError?.message ?? 'Unable to open document' }, { status: 500 })
  }

  const documentResponse = await fetch(data.signedUrl, { cache: 'no-store' })
  if (!documentResponse.ok || !documentResponse.body) {
    return NextResponse.json({ error: 'Unable to load document' }, { status: 502 })
  }

  const contentType = documentResponse.headers.get('content-type') ?? 'application/octet-stream'
  const fileName = storagePath.split('/').pop() ?? 'document'

  return new NextResponse(documentResponse.body, {
    status: 200,
    headers: {
      'content-type': contentType,
      'content-disposition': `inline; filename="${fileName.replaceAll('"', '')}"`,
      'cache-control': 'private, no-store, max-age=0',
      'x-content-type-options': 'nosniff',
    },
  })
}
