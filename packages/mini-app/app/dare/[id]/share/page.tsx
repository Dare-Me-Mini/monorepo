import ShareClient from './shareClient'

export default function Page({ params }: { params: { id: string } }) {
  return <ShareClient id={params.id} />
}


