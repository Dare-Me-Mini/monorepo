import ReviewClient from './reviewClient'

export default function Page({ params }: { params: { id: string } }) {
  return <ReviewClient id={params.id} />
}


