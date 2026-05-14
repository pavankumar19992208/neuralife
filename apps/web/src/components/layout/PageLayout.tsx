interface PageLayoutProps {
  children: React.ReactNode
}

export default function PageLayout({ children }: PageLayoutProps) {
  return (
    <div className="p-6 max-w-7xl mx-auto w-full">
      {children}
    </div>
  )
}
