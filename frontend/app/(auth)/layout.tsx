export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full flex items-center justify-center" style={{ backgroundColor: "#fef7fa" }}>
      {children}
    </div>
  );
}
