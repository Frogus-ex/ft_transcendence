import Card from "./Card";

type LegalLayoutProps = {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
};

function LegalLayout({ title, lastUpdated, children }: LegalLayoutProps) {
  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-3xl font-bold text-white mb-2">{title}</h1>
      <p className="text-gray-500 text-sm mb-6">Last updated: {lastUpdated}</p>
      <Card padding="large">
        <div className="flex flex-col gap-6 text-gray-400 text-sm leading-relaxed">
          {children}
        </div>
      </Card>
    </div>
  );
}

export default LegalLayout;