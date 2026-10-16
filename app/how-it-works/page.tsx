import { createPublicInfoRoute } from "@/lib/public-info-route";
const route = createPublicInfoRoute("how-it-works");
export const generateMetadata = route.generateMetadata;
export default route.Page;
