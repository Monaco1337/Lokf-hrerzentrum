import { InquiryList } from "@/features/fairtrain-funnel/crm/InquiryList";
import { contactInquiryService } from "@/server/services/ContactInquiryService";

export const dynamic = "force-dynamic";

export default async function InquiriesPage() {
  const inquiries = await contactInquiryService.list(200);
  return <InquiryList inquiries={inquiries} />;
}
