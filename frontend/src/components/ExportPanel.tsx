import Button from "./Button";

function ExportPanel() {
  function handleExportCsv() {
    console.log("Mock: export CSV");
  }

  function handleExportPdf() {
    console.log("Mock: export PDF");
  }

  function handleGdprRequest() {
    console.log("Mock: GDPR data export request");
  }

  return (
    <div className="bg-[#050505] border border-[#1f1f1f] rounded-md p-4 flex flex-col gap-2 h-full">
      <span className="text-gray-500 text-xs uppercase tracking-wide mb-1">Export & GDPR</span>
      <Button variant="secondary" size="small" type="button" icon={false} shape="square" onClick={handleExportCsv}>
        Export CSV
      </Button>
      <Button variant="secondary" size="small" type="button" icon={false} shape="square" onClick={handleExportPdf}>
        Export PDF
      </Button>
      <Button variant="secondary" size="small" type="button" icon={false} shape="square" onClick={handleGdprRequest}>
        Request my data (GDPR)
      </Button>
    </div>
  );
}

export default ExportPanel;