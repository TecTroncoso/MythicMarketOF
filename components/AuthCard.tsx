export function AuthCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="w-full max-w-md bg-[#121824] rounded-2xl p-8 border border-[#1c2534] shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#ffaa00] to-[#ff5d00]" />
      <h2 className="text-3xl font-black mb-6 text-center">{title}</h2>
      {children}
    </div>
  );
}
