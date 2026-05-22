// Root Template: Fade-in animation for redirecting between pages

export default function RootTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="animate-in fade-in duration-500 ease-in-out w-full h-full flex-1 flex flex-col">
      {children}
    </div>
  );
}
