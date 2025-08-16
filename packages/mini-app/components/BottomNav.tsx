'use client'

import Link from 'next/link'
import { HomeIcon, PlusIcon, UserCircleIcon } from '@heroicons/react/24/solid'

export default function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto w-full max-w-xl px-3">
        <div className="h-16 rounded-t-3xl bg-[#7C3AED] flex items-center justify-around shadow-2xl">
          <Link href="/" className="p-3 bg-white rounded-full text-[#7C3AED] focus:outline-none active:opacity-80">
            <HomeIcon className="h-6 w-6" />
          </Link>
          <Link href="/create" className="p-4 bg-white rounded-full text-[#7C3AED] focus:outline-none active:opacity-80">
            <PlusIcon className="h-8 w-8" />
          </Link>
          <Link href="/profile" className="p-3 bg-white rounded-full text-[#7C3AED] focus:outline-none active:opacity-80">
            <UserCircleIcon className="h-6 w-6" />
          </Link>
        </div>
      </div>
    </nav>
  )
}


