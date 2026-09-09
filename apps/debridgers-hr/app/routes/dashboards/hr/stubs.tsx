function StubPage({ title, body }: { title: string; body: string }) {
  return (
    <div className="border-line rounded-2xl border bg-white p-8">
      <h2 className="font-syne text-heading text-xl font-bold">{title}</h2>
      <p className="font-open-sans text-body mt-2 text-sm">{body}</p>
      <p className="font-open-sans text-body mt-4 text-xs tracking-wide uppercase">
        Coming next
      </p>
    </div>
  );
}

export function PeopleStub() {
  return (
    <StubPage
      title="People directory"
      body="Employee directory, leave requests, and work activity reports will land here."
    />
  );
}

export function PerformanceStub() {
  return (
    <StubPage
      title="Performance"
      body="Annual and probation reviews, PIP, and confirm/terminate flows."
    />
  );
}

export function ReportsStub() {
  return (
    <StubPage
      title="Reports"
      body="Expense, incident, and project status reports."
    />
  );
}

export function PoliciesStub() {
  return (
    <StubPage
      title="Policies"
      body="Policy library, acknowledgments, and Jotform Sign tracking."
    />
  );
}

export function AnalyticsStub() {
  return (
    <StubPage
      title="Analytics"
      body="Time-to-hire, conversion, headcount, and queue metrics from /hr/admin/analytics."
    />
  );
}
