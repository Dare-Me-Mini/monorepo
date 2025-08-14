import ProofClient from './proofClient'

export default function Page({ params }: { params: { id: string } }) {
  return <ProofClient id={params.id} />
}


