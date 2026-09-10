import { apiFetch, apiMutate } from "../../apiFetch";
import { publicPostForm, publicRequest } from "../../transport/public-request";

export interface HrJob {
  id: number;
  title: string;
  department: string;
  location: string;
  description: string;
  requirements: string;
  salary_min_kobo?: number | null;
  salary_max_kobo?: number | null;
  status: "open" | "closed" | "filled";
  created_at?: string;
}

export interface HrApplication {
  id: number;
  job_id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  cover_letter?: string | null;
  cv_url?: string | null;
  status: string;
  created_at?: string;
}

export interface HrInterview {
  id: number;
  application_id: number;
  scheduled_at: string;
  mode?: string | null;
  location?: string | null;
  status?: string;
  feedback?: string | null;
}

export interface HrOffer {
  id: number;
  application_id: number;
  position: string;
  salary_kobo: number;
  start_date: string;
  expires_at: string;
  status: string;
  benefits?: string | null;
  letter_snapshot?: string | null;
}

export interface CreateJobPayload {
  title: string;
  department: string;
  location: string;
  description: string;
  requirements: string;
  salary_min_kobo?: number | null;
  salary_max_kobo?: number | null;
}

export interface ApplyJobFields {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  cover_letter?: string;
  password: string;
  confirm_password: string;
  cv?: File | null;
}

export function listOpenJobs(): Promise<HrJob[]> {
  return publicRequest<HrJob[]>("/hr/jobs");
}

export function getOpenJob(id: number): Promise<HrJob> {
  return publicRequest<HrJob>(`/hr/jobs/${id}`);
}

export function applyToJob(
  jobId: number,
  fields: ApplyJobFields,
): Promise<HrApplication> {
  const form = new FormData();
  form.append("first_name", fields.first_name);
  form.append("last_name", fields.last_name);
  form.append("email", fields.email);
  form.append("phone", fields.phone);
  form.append("password", fields.password);
  form.append("confirm_password", fields.confirm_password);
  if (fields.cover_letter) form.append("cover_letter", fields.cover_letter);
  if (fields.cv) form.append("cv", fields.cv);
  return publicPostForm<HrApplication>(`/hr/jobs/${jobId}/applications`, form);
}

export function listJobsForHr(): Promise<HrJob[]> {
  return apiFetch<HrJob[]>("/hr/admin/jobs");
}

export function createJob(payload: CreateJobPayload): Promise<HrJob> {
  return apiMutate<HrJob>("/hr/admin/jobs", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateJob(
  id: number,
  payload: Partial<CreateJobPayload> & { status?: HrJob["status"] },
): Promise<HrJob> {
  return apiMutate<HrJob>(`/hr/admin/jobs/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function listApplications(jobId?: number): Promise<HrApplication[]> {
  const q = jobId !== undefined ? `?job_id=${jobId}` : "";
  return apiFetch<HrApplication[]>(`/hr/admin/applications${q}`);
}

export function getApplicationCvUrl(
  applicationId: number,
): Promise<{ url: string }> {
  return apiFetch<{ url: string }>(
    `/hr/admin/applications/${applicationId}/cv`,
  );
}

export function screenApplication(
  id: number,
  payload: {
    status: "screening" | "passed" | "rejected";
    notes?: string;
    rejection_feedback?: string;
  },
): Promise<HrApplication> {
  return apiMutate<HrApplication>(`/hr/admin/applications/${id}/screen`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function scheduleInterview(
  applicationId: number,
  payload: {
    scheduled_at: string;
    location: string;
    interviewer_user_id?: number | null;
  },
): Promise<HrInterview> {
  return apiMutate<HrInterview>(
    `/hr/admin/applications/${applicationId}/interviews`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function scheduleMyInterview(
  applicationId: number,
  payload: {
    scheduled_at: string;
    location: string;
  },
): Promise<HrInterview> {
  return apiMutate<HrInterview>(
    `/hr/me/applications/${applicationId}/interviews`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function createOffer(
  applicationId: number,
  payload: {
    position: string;
    engagement?: "team" | "intern" | "volunteer";
    salary_kobo: number;
    start_date: string;
    expires_at: string;
    benefits?: string;
    employment_type?: "full_time" | "part_time" | "contract" | "agent";
    department?: string;
    manager_user_id?: number | null;
  },
): Promise<HrOffer> {
  return apiMutate<HrOffer>(`/hr/admin/applications/${applicationId}/offers`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function listMyApplications(): Promise<
  { application: HrApplication; job: HrJob; interview: HrInterview | null }[]
> {
  return apiFetch("/hr/me/applications");
}

export function listMyOffers(): Promise<
  { offer: HrOffer; application: HrApplication; job: HrJob }[]
> {
  return apiFetch("/hr/me/offers");
}

export function acceptOffer(offerId: number): Promise<unknown> {
  return apiMutate(`/hr/offers/${offerId}/accept`, { method: "POST" });
}

export function rejectOffer(offerId: number): Promise<unknown> {
  return apiMutate(`/hr/offers/${offerId}/reject`, { method: "POST" });
}

export function hrAcceptOffer(offerId: number): Promise<unknown> {
  return apiMutate(`/hr/admin/offers/${offerId}/accept`, { method: "POST" });
}

export interface HrSignRequest {
  id: number;
  kind: string;
  status: string;
  title: string;
  sign_url?: string | null;
  signed_document_url?: string | null;
  subject_user_id: number;
}

export function listMySignRequests(): Promise<HrSignRequest[]> {
  return apiFetch("/hr/sign-requests");
}

export interface HrEmployeeProfile {
  id: number;
  user_id: number;
  job_title: string;
  department: string;
  status: string;
  contract_url?: string | null;
  start_date?: string;
}

export interface HrMyEmployeeProfileResponse {
  employee: HrEmployeeProfile;
  user: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string | null;
    role: string;
    avatar_url?: string | null;
  };
}

export function getMyEmployeeProfile(): Promise<HrMyEmployeeProfileResponse> {
  return apiFetch("/hr/employees/me");
}
