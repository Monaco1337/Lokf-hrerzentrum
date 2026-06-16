import { notFound } from "next/navigation";

import { InquiryDetail } from "@/features/fairtrain-funnel/crm/InquiryDetail";
import { contactInquiryService } from "@/server/services/ContactInquiryService";

export const dynamic = "force-dynamic";

export default async function InquiryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const inquiry = await contactInquiryService.findById(id);
  if (!inquiry) notFound();
  return <InquiryDetail inquiry={inquiry} />;
}
